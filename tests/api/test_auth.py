import pytest

from helpers import register

def test_register_logs_the_user_in(client):
    user = register(client, email="  Someone@Example.com ")
    assert user["email"] == "someone@example.com"  # trimmed and lower-cased
    assert client.get("/api/v1/auth/me").json() == user

def test_login_and_logout(client):
    register(client)
    client.post("/api/v1/auth/logout")
    assert client.get("/api/v1/auth/me").status_code == 401

    response = client.post("/api/v1/auth/login", json={"email": "someone@example.com", "password": "password123"})
    assert response.status_code == 200
    assert client.get("/api/v1/auth/me").status_code == 200

@pytest.mark.parametrize("email, password", [
    ("someone@example.com", "wrong-password"),
    ("nobody@example.com", "password123"),
])
def test_login_gives_the_same_error_for_wrong_email_or_password(client, email, password):
    register(client)
    client.post("/api/v1/auth/logout")
    response = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 401
    assert response.json()["detail"] == "Wrong email or password"

def test_register_rejects_a_taken_email(client):
    register(client)
    response = client.post("/api/v1/auth/register", json={"email": "someone@example.com", "password": "password123"})
    assert response.status_code == 409

@pytest.mark.parametrize("body", [
    {"email": "not-an-email", "password": "password123"},
    {"email": "someone@example.com", "password": "short"},
])
def test_register_validates_input(client, body):
    assert client.post("/api/v1/auth/register", json=body).status_code == 422

@pytest.mark.parametrize("method, path", [
    ("get", "/api/v1/history/searches"),
    ("get", "/api/v1/history/papers"),
    ("post", "/api/v1/search"),
    ("post", "/api/v1/ask"),
])
def test_feature_routes_need_a_login(client, method, path):
    assert getattr(client, method)(path).status_code == 401

def test_writes_without_the_csrf_header_are_refused(client):
    register(client)
    response = client.post("/api/v1/auth/logout", headers={"X-Requested-With": ""})
    assert response.status_code == 403
    assert response.json()["detail"] == "Missing CSRF header"
