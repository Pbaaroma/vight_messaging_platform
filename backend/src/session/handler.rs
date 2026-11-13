use mongodb::{
    bson::{doc, DateTime, Document},
    Database,
};


use sha2::{Digest, Sha256};

const SESSION_DURATION_HOURS: i64 = 24;

// Generate a cryptographically secure random session token.
pub fn generate_session_token() -> Result<String, String> {
    let mut bytes = [0u8; 32];

    getrandom::fill(&mut bytes)
        .map_err(|error| {
            eprintln!("Session token generation failed: {error}");
            "Failed to generate secure session token".to_string()
        })?;

    Ok(bytes
        .iter()
        .map(|byte| format!("{byte:02x}"))
        .collect())
}

// Hash the session token before storing it in MongoDB.
pub fn hash_session_token(token: &str) -> String {
    let hash = Sha256::digest(token.as_bytes());

    hash.iter()
        .map(|byte| format!("{byte:02x}"))
        .collect()
}

// Create a MongoDB session for an authenticated user.
pub async fn create_session(
    database: &Database,
    user_id: &str,
) -> Result<String, String> {
    let token = generate_session_token()?;
    let token_hash = hash_session_token(&token);

    let now = DateTime::now();

    let expires_at = DateTime::from_millis(
        now.timestamp_millis() + SESSION_DURATION_HOURS * 60 * 60 * 1000,
    );

    let sessions = database.collection::<Document>("sessions");

    sessions
        .insert_one(doc! {
            "tokenHash": token_hash,
            "userId": user_id,
            "createdAt": now,
            "expiresAt": expires_at,
        })
        .await
        .map_err(|error| {
            eprintln!("Failed to create session: {error}");
            "Failed to create session".to_string()
        })?;

    Ok(token)
}

// Verify a session token and return the authenticated user's ID.
pub async fn verify_session(
    database: &Database,
    token: &str,
) -> Result<Option<String>, String> {
    if token.len() != 64
        || !token.bytes().all(|byte| byte.is_ascii_hexdigit())
    {
        return Ok(None);
    }

    let token_hash = hash_session_token(token);

    let sessions = database.collection::<Document>("sessions");

    let session = sessions
        .find_one(doc! {
            "tokenHash": token_hash,
            "expiresAt": { "$gt": DateTime::now() }
        })
        .await
        .map_err(|error| {
            eprintln!("Session verification database error: {error}");
            "Session verification failed".to_string()
        })?;

    match session {
        Some(document) => {
            let user_id = document
                .get_str("userId")
                .map_err(|_| "Invalid session record".to_string())?;

            Ok(Some(user_id.to_string()))
        }
        None => Ok(None),
    }
}

// Revoke a session by deleting its token hash from MongoDB.
pub async fn revoke_session(
    database: &Database,
    token: &str,
) -> Result<(), String> {
    if token.len() != 64
        || !token.bytes().all(|byte| byte.is_ascii_hexdigit())
    {
        return Ok(());
    }

    let token_hash = hash_session_token(token);

    let sessions = database.collection::<Document>("sessions");

    sessions
        .delete_one(doc! {
            "tokenHash": token_hash
        })
        .await
        .map_err(|error| {
            eprintln!("Session revocation database error: {error}");
            "Failed to revoke session".to_string()
        })?;

    Ok(())
}