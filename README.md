# BugTracker

A small bug tracking tool. You report bugs, assign them to people, and move them through a workflow — open, in progress, resolved, closed. That's it.

## Stack

- **Backend:** Python 3.11, Flask, SQLAlchemy, SQLite
- **Frontend:** React 18
- **Tests:** pytest

## Running It

Backend

cd backend
pip install -r requirements.txt
cd ..
python run.py

Server starts at http://localhost:5000.

Frontend

cd frontend
npm install
npm start

Opens at http://localhost:3000.

Tests

cd bugtracker
pytest backend/tests/ -v

---

## Key Technical Decisions

### Status transitions are enforced in the model, not the route

ALLOWED_TRANSITIONS in models.py is a dict that maps each status to the set of states it can move to. The Bug.can_transition_to() method checks this before any update goes through.

This means the rule lives in one place. The route calls it, the test exercises it, and no part of the system can accidentally skip it. The frontend reflects the same rules but doesn't enforce them — the server is the authority.

### SQLite with SQLAlchemy

SQLite is enough for this scope and keeps setup to zero. SQLAlchemy means switching to Postgres later is a config change, not a rewrite.

### Change history is a first-class table

Every field change writes a row to bug_history. This makes the audit trail automatic — there's nothing to remember to call. The route helper _record_history() is called explicitly at each update point, which keeps it obvious and easy to trace.

### Validation before the ORM

All input is validated and errors are collected before any database call. The API returns a structured errors object on 422 so the client can display field-level messages without parsing error strings.

### Seeded users on startup

Three default users (alice, bob, carol) are seeded if the users table is empty. This means the app is usable immediately after first run without a separate setup step.

---

## Tradeoffs and Weaknesses

No authentication. Anyone can report or update any bug. For a real product this would be the first thing to add — session tokens or JWT, with the current user injected into history records automatically.

No pagination. GET /api/bugs returns all bugs. Fine at small scale; would need a limit/offset parameter before going to production.

SQLite is single-writer. Concurrent writes under load would need Postgres. The switch is straightforward via DATABASE_URL.

Frontend state is not cached. Every page interaction refetches from the API. A real app would add React Query or SWR.

No migrations. Schema changes mean dropping and recreating the database. Flask-Migrate would fix this.

---

## API Reference

Method | Path | Description
------ | ---- | -----------
GET | /api/bugs | List bugs. Filter by status, priority, search
POST | /api/bugs | Create a bug
GET | /api/bugs/:id | Get a bug with history
PATCH | /api/bugs/:id | Update status, priority, title, assignee
DELETE | /api/bugs/:id | Delete a bug
GET | /api/users | List users
POST | /api/users | Create a user
GET | /api/health | Health check

---

## Project Structure

bugtracker/
├── run.py
├── claude.md
├── backend/
│   ├── __init__.py
│   ├── config.py
│   ├── models.py
│   ├── routes/
│   │   ├── bugs.py
│   │   └── users.py
│   ├── requirements.txt
│   └── tests/
│       └── test_bugs.py
└── frontend/
    ├── package.json
    └── src/
        ├── App.js
        ├── api/client.js
        └── components/
            ├── BugList.js
            ├── BugForm.js
            └── BugDetail.js
