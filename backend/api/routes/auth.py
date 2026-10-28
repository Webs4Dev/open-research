import sqlite3

from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, Field, field_validator

from backend.auth import (
    DUMMY_HASH, SESSION_COOKIE, User, clear_session_cookie, create_session, current_user,
    delete_session, hash_password, set_session_cookie, verify_password,
)
from backend.db import get_db

router = APIRouter()

class Credentials(BaseModel):
    email: str = Field(max_length=254, pattern=r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
    password: str = Field(min_length=8, max_length=128)

    # "before" so stray spaces are stripped before the pattern check runs.
    @field_validator("email", mode="before")
    @classmethod
    def normalise_email(cls, value):
        return value.strip().lower() if isinstance(value, str) else value

@router.post("/auth/register", response_model=User)
def register(credentials: Credentials, response: Response):
    try:
        with get_db() as db:
            user_id = db.execute(
                "INSERT INTO users (email, password_hash) VALUES (?, ?)",
                (credentials.email, hash_password(credentials.password)),
            ).lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail="An account with this email already exists")

    set_session_cookie(response, create_session(user_id))
    return User(id=user_id, email=credentials.email)

@router.post("/auth/login", response_model=User)
def login(credentials: Credentials, response: Response):
    with get_db() as db:
        row = db.execute(
            "SELECT id, password_hash FROM users WHERE email = ?", (credentials.email,)
        ).fetchone()

    # Same error (and same hashing work) for a wrong email or a wrong password.
    if not verify_password(credentials.password, row["password_hash"] if row else DUMMY_HASH) or not row:
        raise HTTPException(status_code=401, detail="Wrong email or password")

    set_session_cookie(response, create_session(row["id"]))
    return User(id=row["id"], email=credentials.email)

@router.post("/auth/logout", status_code=204)
def logout(request: Request, response: Response):
    token = request.cookies.get(SESSION_COOKIE)
    if token:
        delete_session(token)
    clear_session_cookie(response)

@router.get("/auth/me", response_model=User)
def me(user: User = Depends(current_user)):
    return user
