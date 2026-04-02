from datetime import datetime, timezone
from enum import Enum as PyEnum
from . import db


class BugStatus(str, PyEnum):
    OPEN = "open"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"


class BugPriority(str, PyEnum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# Valid state transitions — enforces workflow rules
ALLOWED_TRANSITIONS = {
    BugStatus.OPEN: {BugStatus.IN_PROGRESS},
    BugStatus.IN_PROGRESS: {BugStatus.RESOLVED, BugStatus.OPEN},
    BugStatus.RESOLVED: {BugStatus.CLOSED, BugStatus.IN_PROGRESS},
    BugStatus.CLOSED: set(),
}


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    assigned_bugs = db.relationship("Bug", back_populates="assignee", foreign_keys="Bug.assignee_id")
    reported_bugs = db.relationship("Bug", back_populates="reporter", foreign_keys="Bug.reporter_id")

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "created_at": self.created_at.isoformat(),
        }


class Bug(db.Model):
    __tablename__ = "bugs"

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    description = db.Column(db.Text, nullable=False)
    status = db.Column(db.Enum(BugStatus), nullable=False, default=BugStatus.OPEN)
    priority = db.Column(db.Enum(BugPriority), nullable=False, default=BugPriority.MEDIUM)

    reporter_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    assignee_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)

    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = db.Column(
        db.DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    reporter = db.relationship("User", back_populates="reported_bugs", foreign_keys=[reporter_id])
    assignee = db.relationship("User", back_populates="assigned_bugs", foreign_keys=[assignee_id])
    history = db.relationship("BugHistory", back_populates="bug", order_by="BugHistory.changed_at")

    def can_transition_to(self, new_status: BugStatus) -> bool:
        return new_status in ALLOWED_TRANSITIONS.get(self.status, set())

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "status": self.status.value,
            "priority": self.priority.value,
            "reporter": self.reporter.to_dict() if self.reporter else None,
            "assignee": self.assignee.to_dict() if self.assignee else None,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
        }


class BugHistory(db.Model):
    __tablename__ = "bug_history"

    id = db.Column(db.Integer, primary_key=True)
    bug_id = db.Column(db.Integer, db.ForeignKey("bugs.id"), nullable=False)
    field_changed = db.Column(db.String(50), nullable=False)
    old_value = db.Column(db.String(200))
    new_value = db.Column(db.String(200))
    changed_by_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=True)
    changed_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    bug = db.relationship("Bug", back_populates="history")
    changed_by = db.relationship("User")

    def to_dict(self):
        return {
            "id": self.id,
            "field_changed": self.field_changed,
            "old_value": self.old_value,
            "new_value": self.new_value,
            "changed_by": self.changed_by.username if self.changed_by else None,
            "changed_at": self.changed_at.isoformat(),
        }
