use axum::{
    extract::{
        ws::{Message, WebSocket, WebSocketUpgrade},
        Path, State,
    },
    response::Response,
};

use futures_util::{SinkExt, StreamExt};
use mongodb::bson::{doc, DateTime, Document};
use serde::{Deserialize, Serialize};

use crate::AppState;

#[derive(Debug, Deserialize)]
struct IncomingMessage {
    receiver: String,
    content: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct OutgoingMessage {
    sender: String,
    receiver: String,
    content: String,
    created_at: String,
}

pub async fn websocket_handler(
    ws: WebSocketUpgrade,
    Path(user_id): Path<String>,
    State(state): State<AppState>,
) -> Response {
    ws.on_upgrade(move |socket| handle_socket(socket, state, user_id))
}

async fn handle_socket(
    socket: WebSocket,
    state: AppState,
    user_id: String,
) {
    println!("VIGHT: Client {user_id} connected.");

    let (mut sender, mut receiver) = socket.split();

    let mut broadcast_receiver = state.broadcast_tx.subscribe();

    let connected_user = user_id.clone();

    // Only forward messages involving this connected user.
    let send_task = tokio::spawn(async move {
        loop {
            let json = match broadcast_receiver.recv().await {
                Ok(json) => json,
                Err(tokio::sync::broadcast::error::RecvError::Lagged(_)) => {
                    continue;
                }
                Err(_) => break,
            };

            let outgoing =
                match serde_json::from_str::<OutgoingMessage>(&json) {
                    Ok(message) => message,
                    Err(_) => continue,
                };

            if outgoing.sender != connected_user
                && outgoing.receiver != connected_user
            {
                continue;
            }

            if sender.send(Message::Text(json.into())).await.is_err() {
                break;
            }
        }
    });

    let database = state.database.clone();
    let broadcast_tx = state.broadcast_tx.clone();

    let receive_task = tokio::spawn(async move {
        while let Some(Ok(message)) = receiver.next().await {
            if let Message::Text(text) = message {
                let incoming =
                    match serde_json::from_str::<IncomingMessage>(&text) {
                        Ok(message) => message,
                        Err(error) => {
                            eprintln!("Invalid WebSocket message: {error}");
                            continue;
                        }
                    };

                let receiver_id = incoming.receiver.trim();
                let content = incoming.content.trim();

                if receiver_id.is_empty()
                    || content.is_empty()
                    || receiver_id.len() > 100
                    || content.len() > 5000
                {
                    eprintln!("Rejected invalid WebSocket message");
                    continue;
                }

                let collection =
                    database.collection::<Document>("messages");

                let created_at = DateTime::now();

                let document = doc! {
                    "sender": &user_id,
                    "receiver": receiver_id,
                    "content": content,
                    "createdAt": created_at,
                    "status": "sent",
                };

                match collection.insert_one(document).await {
                    Ok(_) => {
                        let outgoing = OutgoingMessage {
                            sender: user_id.clone(),
                            receiver: receiver_id.to_string(),
                            content: content.to_string(),
                            created_at: created_at.to_string(),
                        };

                        if let Ok(json) = serde_json::to_string(&outgoing) {
                            let _ = broadcast_tx.send(json);
                        }
                    }
                    Err(error) => {
                        eprintln!("WebSocket database error: {error}");
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

    println!("VIGHT: Client disconnected.");
}