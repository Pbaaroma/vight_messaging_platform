use tokio::sync::broadcast;

mod websocket;
mod auth;
mod session;

use axum::{
    extract::State,
    http::StatusCode,
    routing::get,
    Json,
    Router,
};

use futures_util::TryStreamExt;

use mongodb::{
    bson::{doc, oid::ObjectId, Document},
    options::IndexOptions,
    Client,
    Database,
    IndexModel,
};

use axum_extra::extract::cookie::CookieJar;
use auth::session_user::authenticated_user;

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

#[derive(Serialize)]
struct ContactUser {
    user_id: String,
    name: String,
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
    receiver: String,
    content: String,
}

// New MongoDB message history endpoint
async fn get_messages(
    State(state): State<AppState>,
    jar: CookieJar,
) -> Result<Json<Vec<Document>>, (StatusCode, String)> {

    let user_id =authenticated_user(&state.database, &jar).await?;
    let collection = state.database.collection::<Document>("messages");

    let cursor = collection
        .find(doc! {
    "$or": [
        { "sender": &user_id },
        { "receiver": &user_id }
    ]
})
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

async fn get_users(
    State(state): State<AppState>,
    jar: CookieJar,
) -> Result<Json<Vec<ContactUser>>, (StatusCode, String)> {
    let current_user =
        authenticated_user(&state.database, &jar).await?;

    let current_object_id =
        ObjectId::parse_str(&current_user).map_err(|_| {
            (
                StatusCode::UNAUTHORIZED,
                "Invalid authenticated user".to_string(),
            )
        })?;

    let users_collection =
        state.database.collection::<Document>("users");

    let cursor = users_collection
        .find(doc! {
            "_id": { "$ne": current_object_id }
        })
        .await
        .map_err(|error| {
            eprintln!("Failed to retrieve users: {error}");

            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to retrieve users".to_string(),
            )
        })?;

    let documents: Vec<Document> = cursor
        .try_collect()
        .await
        .map_err(|error| {
            eprintln!("Failed to read users: {error}");

            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to read users".to_string(),
            )
        })?;

    let contacts = documents
        .into_iter()
        .filter_map(|document| {
            let id = document.get_object_id("_id").ok()?;
            let name = document.get_str("name").ok()?;

            Some(ContactUser {
                user_id: id.to_hex(),
                name: name.to_string(),
            })
        })
        .collect();

    Ok(Json(contacts))
}


async fn send_message(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(message): Json<NewMessage>,
) -> Result<(StatusCode, Json<Document>), (StatusCode, String)> {
    let sender = authenticated_user(&state.database, &jar).await?;
    let receiver = message.receiver.trim();
    let content = message.content.trim();

    if receiver.is_empty() || content.is_empty() {
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
        "sender": &sender,
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

    let database = client.database(&database_name);

let users = database.collection::<Document>("users");

let email_index = IndexModel::builder()
    .keys(doc! { "email": 1 })
    .options(
        IndexOptions::builder()
            .unique(true)
            .build(),
    )
    .build();

users
    .create_index(email_index)
    .await
    .expect("Failed to create unique email index");

println!("VIGHT unique email index verified!");

    let (broadcast_tx, _) = broadcast::channel::<String>(100);

    let state = AppState {
        database,
        broadcast_tx,
    };

    let app = Router::new()
        .route("/api/health", get(health_check))
        .route("/api/users", get(get_users))
        .route("/api/messages", get(get_messages).post(send_message))
        .route(
            "/api/auth/register",
            axum::routing::post(auth::handler::register),
        )
.route(
    "/api/auth/login",
    axum::routing::post(auth::handler::login),
)

.route(
    "/api/auth/me",
    get(auth::handler::me),
)

.route(
    "/api/auth/logout",
    axum::routing::post(auth::handler::logout),
)

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