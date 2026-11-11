use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        State,
    },
    response::Response,
};

use futures_util::{SinkExt, StreamExt};
use mongodb::bson::{doc, DateTime, Document};
use serde::{Deserialize, Serialize};


use crate::AppState;

#[derive(Debug, Deserialize)]
struct IncomingMessage {
    sender: String,
    receiver: String,
    content: String,
}

#[derive(Debug, Clone, Serialize)]
struct OutgoingMessage {
    sender: String,
    receiver: String,
    content: String,
    created_at: String,
}

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    State(state): State<AppState>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state))
}

async fn handle_socket(socket: WebSocket, state: AppState) {
    println!("VIGHT: A WebSocket client connected.");

    let (mut sender, mut receiver) = socket.split();

    let mut broadcast_receiver = state.broadcast_tx.subscribe();

    let send_task = tokio::spawn(async move {
        while let Ok(message) = broadcast_receiver.recv().await {
            if sender.send(Message::Text(message.into())).await.is_err() {
                break;
            }
        }
    });

    let database = state.database.clone();
    let broadcast_tx = state.broadcast_tx.clone();

    let receive_task = tokio::spawn(async move {
        while let Some(Ok(message)) = receiver.next().await {
            if let Message::Text(text) = message {
                let incoming = match serde_json::from_str::<IncomingMessage>(&text) {
                    Ok(message) => message,
                    Err(error) => {
                        eprintln!("Invalid WebSocket message: {error}");
                        continue;
                    }
                };

                if incoming.sender.trim().is_empty()
                    || incoming.receiver.trim().is_empty()
                    || incoming.content.trim().is_empty()
                    || incoming.sender.len() > 100
                    || incoming.receiver.len() > 100
                    || incoming.content.len() > 5000
                {
                    eprintln!("Rejected invalid WebSocket message");
                    continue;
                }

                let collection = database.collection::<Document>("messages");

                let created_at = DateTime::now();

                let document = doc! {
                    "sender": &incoming.sender,
                    "receiver": &incoming.receiver,
                    "content": &incoming.content,
                    "createdAt": created_at,
                    "status": "sent",
                };

                match collection.insert_one(document).await {
                    Ok(_) => {
                        let outgoing = OutgoingMessage {
                            sender: incoming.sender,
                            receiver: incoming.receiver,
                            content: incoming.content,
                            created_at: created_at.to_string(),
                        };

                        if let Ok(json) = serde_json::to_string(&outgoing) {
                            let _ = broadcast_tx.send(json);
                        }
                    }
                    Err(error) => {
                        eprintln!("WebSocket message database error: {error}");
                    }
                }
            }
        }
    });

   let mut send_task = send_task;
let mut receive_task = receive_task;

tokio::select! {
    _ = &mut send_task => {
        receive_task.abort();
    }
    _ = &mut receive_task => {
        send_task.abort();
    }
}

    println!("VIGHT: A WebSocket client disconnected.");
}