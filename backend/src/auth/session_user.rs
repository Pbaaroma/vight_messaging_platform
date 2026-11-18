use axum::{
    http::StatusCode,
};

use axum_extra::extract::cookie::CookieJar;

use mongodb::Database;

use crate::session::handler::verify_session;

// Retrieve the authenticated user ID from a session cookie.
pub async fn authenticated_user(
    database: &Database,
    jar: &CookieJar,
) -> Result<String, (StatusCode, String)> {
    let token = jar
        .get("vight_session")
        .ok_or((
            StatusCode::UNAUTHORIZED,
            "Authentication required".to_string(),
        ))?
        .value();

    let user_id = verify_session(database, token)
        .await
        .map_err(|error| {
            eprintln!("Authentication verification error: {error}");

            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "Authentication verification failed".to_string(),
            )
        })?
        .ok_or((
            StatusCode::UNAUTHORIZED,
            "Invalid or expired session".to_string(),
        ))?;

    Ok(user_id)
}