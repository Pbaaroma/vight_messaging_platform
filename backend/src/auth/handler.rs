use axum_extra::extract::cookie::{Cookie, CookieJar, SameSite};

use crate::session::handler::{
    create_session,
    revoke_session,
    verify_session,
};
use time::Duration;

use axum::{
    extract::State,
    http::StatusCode,
    Json,
};

use mongodb::bson::{doc, DateTime, Document};
use serde::{Deserialize, Serialize};

use argon2::{
    password_hash::{
        phc::PasswordHash,
        PasswordHasher,
        PasswordVerifier,
    },
    Argon2,
};

use crate::AppState;

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    name: String,
    email: String,
    password: String,
}

#[derive(Debug, Serialize)]
pub struct RegisterResponse {
    message: String,
    user_id: String,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    email: String,
    password: String,
}

#[derive(Debug, Serialize)]
pub struct LoginResponse {
    message: String,
    user_id: String,
    name: String,
}

pub async fn login(
    State(state): State<AppState>,
    jar: CookieJar,
    Json(payload): Json<LoginRequest>,
) -> Result<(CookieJar, Json<LoginResponse>), (StatusCode, String)> {
    
    let email = payload.email.trim().to_lowercase();

    let invalid_credentials = || {
        (
            StatusCode::UNAUTHORIZED,
            "Invalid email or password".to_string(),
        )
    };

    if email.is_empty() || payload.password.is_empty() {
        return Err(invalid_credentials());
    }

    let users = state.database.collection::<Document>("users");

    let user = users
        .find_one(doc! { "email": &email })
        .await
        .map_err(|error| {
            eprintln!("Login database error: {error}");

            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Login temporarily unavailable".to_string(),
            )
        })?
        .ok_or_else(invalid_credentials)?;

    let stored_hash = user
        .get_str("passwordHash")
        .map_err(|_| invalid_credentials())?;

    let parsed_hash = PasswordHash::new(stored_hash)
        .map_err(|_| invalid_credentials())?;

    Argon2::default()
        .verify_password(payload.password.as_bytes(), &parsed_hash)
        .map_err(|_| invalid_credentials())?;

    let user_id = user
        .get_object_id("_id")
        .map_err(|_| invalid_credentials())?
        .to_hex();

    let name = user
        .get_str("name")
        .map_err(|_| invalid_credentials())?
        .to_string();

    let session_token = create_session(&state.database, &user_id).await
        .map_err(|error| {
            eprintln!("Session creation error: {error}");

            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to create login session".to_string(),
            )
        })?;

    let cookie = Cookie::build(("vight_session", session_token))
    .http_only(true)
    .secure(false)
    .same_site(SameSite::Lax)
    .path("/")
    .max_age(Duration::hours(24))
    .build();
    let jar = jar.add(cookie);

Ok((
    jar,
    Json(LoginResponse {
        message: "Login successful".to_string(),
        user_id,
        name,
    }),
))
}

pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> Result<(StatusCode, Json<RegisterResponse>), (StatusCode, String)> {
    let name = payload.name.trim();
    let email = payload.email.trim().to_lowercase();

    if name.is_empty()
        || name.len() > 100
        || email.len() > 254
        || !email.contains('@')
        || payload.password.len() < 12
        || payload.password.len() > 128
    {
        return Err((
            StatusCode::BAD_REQUEST,
            "Invalid registration details. Password must be 12–128 characters."
                .to_string(),
        ));
    }

    let users = state.database.collection::<Document>("users");

    let existing_user = users
        .find_one(doc! { "email": &email })
        .await
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Database error".to_string(),
            )
        })?;

    if existing_user.is_some() {
        return Err((
            StatusCode::CONFLICT,
            "An account with this email already exists".to_string(),
        ));
    }

    let password_hash = Argon2::default()
        .hash_password(payload.password.as_bytes())
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Password hashing failed".to_string(),
            )
        })?
        .to_string();

    let user = doc! {
        "name": name,
        "email": &email,
        "passwordHash": password_hash,
        "createdAt": DateTime::now(),
    };

    let result = users.insert_one(user).await.map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Failed to create account".to_string(),
        )
    })?;

    Ok((
        StatusCode::CREATED,
        Json(RegisterResponse {
            message: "VIGHT account created successfully".to_string(),
            user_id: result.inserted_id.to_string(),
        }),
    ))
}

#[derive(Debug, Serialize)]
pub struct MeResponse {
    user_id: String,
    name: String,
    email: String,
}

pub async fn me(
    State(state): State<AppState>,
    jar: CookieJar,
) -> Result<Json<MeResponse>, (StatusCode, String)> {
    let token = jar
        .get("vight_session")
        .ok_or((
            StatusCode::UNAUTHORIZED,
            "Not authenticated".to_string(),
        ))?
        .value();

    let user_id = verify_session(&state.database, token)
        .await
        .map_err(|error| {
            eprintln!("Session verification error: {error}");

            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Session verification failed".to_string(),
            )
        })?
        .ok_or((
            StatusCode::UNAUTHORIZED,
            "Invalid or expired session".to_string(),
        ))?;

    let object_id = mongodb::bson::oid::ObjectId::parse_str(&user_id)
        .map_err(|_| {
            (
                StatusCode::UNAUTHORIZED,
                "Invalid session user".to_string(),
            )
        })?;

    let users = state.database.collection::<Document>("users");

    let user = users
        .find_one(doc! { "_id": object_id })
        .await
        .map_err(|error| {
            eprintln!("User lookup error: {error}");

            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Failed to retrieve user".to_string(),
            )
        })?
        .ok_or((
            StatusCode::UNAUTHORIZED,
            "Session user no longer exists".to_string(),
        ))?;

    let name = user
        .get_str("name")
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Invalid user record".to_string(),
            )
        })?
        .to_string();

    let email = user
        .get_str("email")
        .map_err(|_| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Invalid user record".to_string(),
            )
        })?
        .to_string();

    Ok(Json(MeResponse {
        user_id,
        name,
        email,
    }))
}

#[derive(Debug, Serialize)]
pub struct LogoutResponse {
    message: String,
}

pub async fn logout(
    State(state): State<AppState>,
    jar: CookieJar,
) -> Result<(CookieJar, Json<LogoutResponse>), (StatusCode, String)> {
    if let Some(cookie) = jar.get("vight_session") {
        revoke_session(&state.database, cookie.value())
            .await
            .map_err(|error| {
                eprintln!("Logout error: {error}");

                (
                    StatusCode::INTERNAL_SERVER_ERROR,
                    "Failed to log out".to_string(),
                )
            })?;
    }

    // Remove the session cookie from the browser.
    let jar = jar.remove(
        Cookie::build(("vight_session", ""))
            .path("/")
            .build()
    );

    Ok((
        jar,
        Json(LogoutResponse {
            message: "Logout successful".to_string(),
        }),
    ))
}
