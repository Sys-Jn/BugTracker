# AI Guidance — BugTracker

This file contains constraints and standards used when working with AI agents on this codebase.

## Project Context

A bug tracking tool built with Flask, React, and SQLite. The core domain rule is that bugs
follow a strict status workflow. Any AI assistance must respect this.

## Hard Rules

- Never remove or bypass the status transition validation in `models.py`
- `ALLOWED_TRANSITIONS` is the single source of truth — do not duplicate this logic in routes or frontend
- All user input must be validated server-side before touching the database
- Never expose raw SQLAlchemy exceptions to the client; always return a structured JSON error

## Code Style

- Python: follow PEP 8, keep functions under 40 lines, prefer explicit over implicit
- React: functional components only, no class components
- No inline business logic in route handlers — keep routes thin
- All API responses must be JSON; never return HTML errors from the API layer

## Testing

- Every new endpoint needs at least one happy-path and one sad-path test
- Tests use an in-memory SQLite database — never point tests at the dev database
- Do not mock the database in unit tests; use the real ORM against in-memory SQLite

## What AI Should Not Do

- Do not add new dependencies without noting the reason in a comment
- Do not generate code that silently swallows exceptions
- Do not generate frontend code that trusts the server response without checking for error fields
- Do not alter the database schema without a corresponding migration plan

## Workflow

When adding a new feature:
1. Define or update the model first
2. Add or update the route with validation
3. Write tests before wiring up the frontend
4. Frontend calls API; it does not duplicate validation logic
