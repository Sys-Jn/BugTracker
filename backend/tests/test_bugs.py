import pytest
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from backend import create_app, db as _db


@pytest.fixture
def app():
    app = create_app("testing")
    with app.app_context():
        _db.create_all()
        yield app
        _db.session.remove()
        _db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def seed_user(client):
    r = client.post("/api/users", json={"username": "tester", "email": "tester@example.com"})
    return r.get_json()


# ── Health ──────────────────────────────────────────────────────────────

def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.get_json()["status"] == "ok"


# ── Users ───────────────────────────────────────────────────────────────

def test_create_user(client):
    r = client.post("/api/users", json={"username": "alice", "email": "alice@example.com"})
    assert r.status_code == 201
    data = r.get_json()
    assert data["username"] == "alice"


def test_create_user_missing_fields(client):
    r = client.post("/api/users", json={"username": ""})
    assert r.status_code == 422
    assert "username" in r.get_json()["errors"]


def test_duplicate_username(client):
    client.post("/api/users", json={"username": "alice", "email": "a@example.com"})
    r = client.post("/api/users", json={"username": "alice", "email": "b@example.com"})
    assert r.status_code == 409


# ── Bugs ────────────────────────────────────────────────────────────────

def test_create_bug(client, seed_user):
    r = client.post("/api/bugs", json={
        "title": "Login page crashes",
        "description": "Crashes on submit",
        "reporter_id": seed_user["id"],
        "priority": "high",
    })
    assert r.status_code == 201
    data = r.get_json()
    assert data["status"] == "open"
    assert data["priority"] == "high"


def test_create_bug_missing_title(client, seed_user):
    r = client.post("/api/bugs", json={
        "description": "desc",
        "reporter_id": seed_user["id"],
    })
    assert r.status_code == 422
    assert "title" in r.get_json()["errors"]


def test_list_bugs(client, seed_user):
    for i in range(3):
        client.post("/api/bugs", json={
            "title": f"Bug {i}", "description": "desc", "reporter_id": seed_user["id"]
        })
    r = client.get("/api/bugs")
    assert r.status_code == 200
    assert len(r.get_json()) == 3


def test_filter_bugs_by_status(client, seed_user):
    client.post("/api/bugs", json={"title": "A", "description": "d", "reporter_id": seed_user["id"]})
    r = client.get("/api/bugs?status=open")
    assert r.status_code == 200
    assert all(b["status"] == "open" for b in r.get_json())


def test_invalid_status_filter(client):
    r = client.get("/api/bugs?status=banana")
    assert r.status_code == 400


def test_valid_status_transition(client, seed_user):
    bug = client.post("/api/bugs", json={
        "title": "T", "description": "d", "reporter_id": seed_user["id"]
    }).get_json()
    r = client.patch(f"/api/bugs/{bug['id']}", json={"status": "in_progress"})
    assert r.status_code == 200
    assert r.get_json()["status"] == "in_progress"


def test_invalid_status_transition(client, seed_user):
    bug = client.post("/api/bugs", json={
        "title": "T", "description": "d", "reporter_id": seed_user["id"]
    }).get_json()
    # Cannot go directly from open to resolved
    r = client.patch(f"/api/bugs/{bug['id']}", json={"status": "resolved"})
    assert r.status_code == 422


def test_closed_bug_cannot_transition(client, seed_user):
    bug = client.post("/api/bugs", json={
        "title": "T", "description": "d", "reporter_id": seed_user["id"]
    }).get_json()
    client.patch(f"/api/bugs/{bug['id']}", json={"status": "in_progress"})
    client.patch(f"/api/bugs/{bug['id']}", json={"status": "resolved"})
    client.patch(f"/api/bugs/{bug['id']}", json={"status": "closed"})
    r = client.patch(f"/api/bugs/{bug['id']}", json={"status": "open"})
    assert r.status_code == 422


def test_history_recorded(client, seed_user):
    bug = client.post("/api/bugs", json={
        "title": "T", "description": "d", "reporter_id": seed_user["id"]
    }).get_json()
    client.patch(f"/api/bugs/{bug['id']}", json={"status": "in_progress", "changed_by_id": seed_user["id"]})
    detail = client.get(f"/api/bugs/{bug['id']}").get_json()
    assert any(h["field_changed"] == "status" for h in detail["history"])


def test_delete_bug(client, seed_user):
    bug = client.post("/api/bugs", json={
        "title": "T", "description": "d", "reporter_id": seed_user["id"]
    }).get_json()
    r = client.delete(f"/api/bugs/{bug['id']}")
    assert r.status_code == 204
    assert client.get(f"/api/bugs/{bug['id']}").status_code == 404


def test_bug_not_found(client):
    r = client.get("/api/bugs/99999")
    assert r.status_code == 404


def test_search_bugs(client, seed_user):
    client.post("/api/bugs", json={"title": "Login crash", "description": "d", "reporter_id": seed_user["id"]})
    client.post("/api/bugs", json={"title": "Signup error", "description": "d", "reporter_id": seed_user["id"]})
    r = client.get("/api/bugs?search=login")
    assert r.status_code == 200
    results = r.get_json()
    assert len(results) == 1
    assert "Login" in results[0]["title"]
