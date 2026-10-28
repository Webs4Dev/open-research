import hashlib
import hmac
import os
import secrets
import threading

from fastapi import HTTPException, Request
from pydantic import BaseModel

from backend.db import NOW, get_db

SESSION_COOKIE = "session"
SESSION_DAYS = 30
# Frontend and backend on different sites (e.g. Netlify + Render) need SameSite=None; Secure.
# Locally both are on localhost (same site), so Lax works over plain http.
COOKIE_CROSS_SITE = os.getenv("COOKIE_CROSS_SITE", "false").lower() == "true"

# scrypt is a deliberately slow, memory-hard password hash from the standard library.
SCRYPT_PARAMS = dict(n=2**14, r=8, p=1)
# Each hash takes ~16 MB of RAM and /auth/* is public, so cap concurrent hashes
# (~64 MB) instead of letting a burst of logins exhaust memory.
SCRYPT_SLOTS = threading.BoundedSemaphore(4)

def scrypt(password: str, salt: bytes) -> bytes:
    with SCRYPT_SLOTS:
        return hashlib.scrypt(password.encode(), salt=salt, **SCRYPT_PARAMS)

class User(BaseModel):
    id: int
    email: str

def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = scrypt(password, salt)
    return f"scrypt${salt.hex()}${digest.hex()}"

def verify_password(password: str, stored: str) -> bool:
    _, salt, digest = stored.split("$")
    candidate = scrypt(password, bytes.fromhex(salt))
    return hmac.compare_digest(candidate.hex(), digest)

# Checked against when the email doesn't exist, so a login takes the same time either way
# and response timing doesn't reveal which emails have accounts.
DUMMY_HASH = hash_password(secrets.token_hex(16))

def hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()

def create_session(user_id: int) -> str:
    token = secrets.token_urlsafe(32)
    with get_db() as db:
        db.execute(f"DELETE FROM sessions WHERE expires_at < {NOW}")
        db.execute(
            f"INSERT INTO sessions (token_hash, user_id, expires_at) "
            f"VALUES (?, ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', '+{SESSION_DAYS} days'))",
            (hash_token(token), user_id),
        )
    return token

def delete_session(token: str):
    with get_db() as db:
        db.execute("DELETE FROM sessions WHERE token_hash = ?", (hash_token(token),))

def set_session_cookie(response, token: str):
    response.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=SESSION_DAYS * 24 * 3600,
        httponly=True,  # not readable from JavaScript, so XSS can't steal it
        secure=COOKIE_CROSS_SITE,
        samesite="none" if COOKIE_CROSS_SITE else "lax",
    )

def clear_session_cookie(response):
    response.delete_cookie(
        SESSION_COOKIE,
        httponly=True,
        secure=COOKIE_CROSS_SITE,
        samesite="none" if COOKIE_CROSS_SITE else "lax",
    )

def current_user(request: Request) -> User:
    """FastAPI dependency: the logged-in user, or 401."""
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        with get_db() as db:
            row = db.execute(
                f"SELECT users.id, users.email FROM sessions JOIN users ON users.id = sessions.user_id "
                f"WHERE sessions.token_hash = ? AND sessions.expires_at > {NOW}",
                (hash_token(token),),
            ).fetchone()
        if row:
            return User(id=row["id"], email=row["email"])
    raise HTTPException(status_code=401, detail="Please log in")
