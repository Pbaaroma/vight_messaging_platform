use tokio::sync::broadcast;

mod websocket;

use axum::{
    extract::State,
    http::StatusCode,
    routing::get,
    Json,
    Router,
};

use futures_util::TryStreamExt;

use mongodb::{
    bson::{doc, Document},
    Client,
    Database,
};

use serde::Serialize;
use std::{env, net::SocketAddr};

#[derive(Clone)]
struct AppState {
    database: Database,
    broadcast_tx: broadcast::Sender<String>,
}

#[derive(Serialize)]
struct HealthResponse {
    status: &'static str,
    service: &'static str,
}

// Existing health endpoint
async fn health_check() -> Json<HealthResponse> {
    Json(HealthResponse {
        status: "ok",
        service: "VIGHT Messaging API",
    })
}

#[derive(serde::Deserialize)]
struct NewMessage {
    sender: String,
    receiver: String,
    content: String,
}

// New MongoDB message history endpoint
async fn get_messages(
    State(state): State<AppState>,
) -> Result<Json<Vec<Document>>, (StatusCode, String)> {
    let collection = state.database.collection::<Document>("messages");

    let cursor = collection
        .find(doc! {})
        .await
        .map_err(|error| {
            eprintln!("MongoDB query failed: {error}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to retrieve messages".to_string(),
            )
        })?;

    let messages: Vec<Document> = cursor
        .try_collect()
        .await
        .map_err(|error| {
            eprintln!("MongoDB cursor failed: {error}");
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to read message results".to_string(),
            )
        })?;

    Ok(Json(messages))
}

async fn send_message(
    State(state): State<AppState>,
    Json(message): Json<NewMessage>,
) -> Result<(StatusCode, Json<Document>), (StatusCode, String)> {
    let sender = message.sender.trim();
    let receiver = message.receiver.trim();
    let content = message.content.trim();

    if sender.is_empty() || receiver.is_empty() || content.is_empty() {
        return Err((
            StatusCode::BAD_REQUEST,
            "Sender, receiver, and content cannot be empty".to_string(),
        ));
    }

    if sender.len() > 100 || receiver.len() > 100 || content.len() > 5000 {
        return Err((
            StatusCode::BAD_REQUEST,
            "Message fields exceed the allowed length".to_string(),
        ));
    }

    let collection = state.database.collection::<Document>("messages");

    let new_message = doc! {
        "sender": sender,
        "receiver": receiver,
        "content": content,
        "createdAt": mongodb::bson::DateTime::now(),
        "status": "sent",
    };

    let result = collection
        .insert_one(new_message.clone())
        .await
        .map_err(|error| {
            eprintln!("Failed to save message: {error}");

            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to save message".to_string(),
            )
        })?;

    let mut saved_message = new_message;

    saved_message.insert("_id", result.inserted_id);

    Ok((StatusCode::CREATED, Json(saved_message)))
}

#[tokio::main]
async fn main() {
    dotenvy::dotenv().ok();

    let mongodb_uri =
        env::var("MONGODB_URI").expect("MONGODB_URI is missing");

    let database_name =
        env::var("MONGODB_DATABASE")
            .unwrap_or_else(|_| "vight_db".to_string());

    println!("Connecting VIGHT to MongoDB...");

    let client = Client::with_uri_str(&mongodb_uri)
        .await
        .expect("Failed to initialize MongoDB client");

    // Verify the connection before starting the API.
    client
        .database("admin")
        .run_command(doc! { "ping": 1 })
        .await
        .expect("MongoDB connection or authentication failed");

    println!("VIGHT connected to MongoDB successfully!");

    let(broadcast_tx, _) = broadcast::channel::<String>(100);

    let state = AppState {
        database: client.database(&database_name),
        broadcast_tx,
    };

    let app = Router::new()
    .route("/api/health", get(health_check))
    .route("/api/messages", get(get_messages).post(send_message))
    .route(
        "/ws",
        get(websocket::handler::websocket_handler),
    )
    .with_state(state);

    let address = SocketAddr::from(([127, 0, 0, 1], 8000));

    let listener = tokio::net::TcpListener::bind(address)
        .await
        .expect("Failed to bind VIGHT API server");

    println!("VIGHT API running at http://{}", address);

    axum::serve(listener, app)
        .await
        .expect("VIGHT API server failed");
}