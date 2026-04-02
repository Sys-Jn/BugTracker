import logging
from flask import Blueprint, request, jsonify
from .. import db
from ..models import Bug, BugStatus, BugPriority, BugHistory, User

logger = logging.getLogger(__name__)
bugs_bp = Blueprint("bugs", __name__)

VALID_STATUSES = {s.value for s in BugStatus}
VALID_PRIORITIES = {p.value for p in BugPriority}


def _record_history(bug, field, old_val, new_val, changed_by_id=None):
    if str(old_val) != str(new_val):
        entry = BugHistory(
            bug_id=bug.id,
            field_changed=field,
            old_value=str(old_val) if old_val is not None else None,
            new_value=str(new_val) if new_val is not None else None,
            changed_by_id=changed_by_id,
        )
        db.session.add(entry)


@bugs_bp.route("", methods=["GET"])
def list_bugs():
    status = request.args.get("status")
    priority = request.args.get("priority")
    assignee_id = request.args.get("assignee_id", type=int)
    search = request.args.get("search", "").strip()

    query = Bug.query

    if status:
        if status not in VALID_STATUSES:
            return jsonify({"error": f"Invalid status '{status}'"}), 400
        query = query.filter(Bug.status == BugStatus(status))

    if priority:
        if priority not in VALID_PRIORITIES:
            return jsonify({"error": f"Invalid priority '{priority}'"}), 400
        query = query.filter(Bug.priority == BugPriority(priority))

    if assignee_id:
        query = query.filter(Bug.assignee_id == assignee_id)

    if search:
        query = query.filter(
            Bug.title.ilike(f"%{search}%") | Bug.description.ilike(f"%{search}%")
        )

    bugs = query.order_by(Bug.created_at.desc()).all()
    logger.info("Listed %d bugs (status=%s, priority=%s)", len(bugs), status, priority)
    return jsonify([b.to_dict() for b in bugs])


@bugs_bp.route("", methods=["POST"])
def create_bug():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    title = (data.get("title") or "").strip()
    description = (data.get("description") or "").strip()
    reporter_id = data.get("reporter_id")

    errors = {}
    if not title:
        errors["title"] = "Title is required."
    if len(title) > 200:
        errors["title"] = "Title must be 200 characters or fewer."
    if not description:
        errors["description"] = "Description is required."
    if not reporter_id:
        errors["reporter_id"] = "reporter_id is required."

    priority_val = data.get("priority", BugPriority.MEDIUM.value)
    if priority_val not in VALID_PRIORITIES:
        errors["priority"] = f"Must be one of: {', '.join(VALID_PRIORITIES)}"

    if errors:
        return jsonify({"errors": errors}), 422

    reporter = User.query.get(reporter_id)
    if not reporter:
        return jsonify({"error": "Reporter user not found"}), 404

    assignee_id = data.get("assignee_id")
    if assignee_id and not User.query.get(assignee_id):
        return jsonify({"error": "Assignee user not found"}), 404

    bug = Bug(
        title=title,
        description=description,
        priority=BugPriority(priority_val),
        reporter_id=reporter_id,
        assignee_id=assignee_id,
        status=BugStatus.OPEN,
    )
    db.session.add(bug)
    db.session.commit()
    logger.info("Created bug id=%d title='%s'", bug.id, bug.title)
    return jsonify(bug.to_dict()), 201


@bugs_bp.route("/<int:bug_id>", methods=["GET"])
def get_bug(bug_id):
    bug = Bug.query.get_or_404(bug_id, description=f"Bug {bug_id} not found")
    result = bug.to_dict()
    result["history"] = [h.to_dict() for h in bug.history]
    return jsonify(result)


@bugs_bp.route("/<int:bug_id>", methods=["PATCH"])
def update_bug(bug_id):
    bug = Bug.query.get_or_404(bug_id, description=f"Bug {bug_id} not found")
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    changed_by_id = data.get("changed_by_id")
    errors = {}

    if "status" in data:
        new_status_val = data["status"]
        if new_status_val not in VALID_STATUSES:
            errors["status"] = f"Must be one of: {', '.join(VALID_STATUSES)}"
        else:
            new_status = BugStatus(new_status_val)
            if new_status != bug.status and not bug.can_transition_to(new_status):
                errors["status"] = (
                    f"Cannot transition from '{bug.status.value}' to '{new_status_val}'. "
                    f"Allowed: {[s.value for s in ALLOWED_TRANSITIONS_FOR_RESPONSE(bug.status)]}"
                )

    if "priority" in data:
        if data["priority"] not in VALID_PRIORITIES:
            errors["priority"] = f"Must be one of: {', '.join(VALID_PRIORITIES)}"

    if "title" in data:
        if not data["title"].strip():
            errors["title"] = "Title cannot be empty."
        elif len(data["title"]) > 200:
            errors["title"] = "Title must be 200 characters or fewer."

    if errors:
        return jsonify({"errors": errors}), 422

    if "title" in data:
        _record_history(bug, "title", bug.title, data["title"].strip(), changed_by_id)
        bug.title = data["title"].strip()

    if "description" in data:
        _record_history(bug, "description", bug.description, data["description"], changed_by_id)
        bug.description = data["description"]

    if "status" in data:
        new_status = BugStatus(data["status"])
        _record_history(bug, "status", bug.status.value, new_status.value, changed_by_id)
        bug.status = new_status

    if "priority" in data:
        new_priority = BugPriority(data["priority"])
        _record_history(bug, "priority", bug.priority.value, new_priority.value, changed_by_id)
        bug.priority = new_priority

    if "assignee_id" in data:
        assignee_id = data["assignee_id"]
        if assignee_id and not User.query.get(assignee_id):
            return jsonify({"error": "Assignee user not found"}), 404
        _record_history(bug, "assignee_id", bug.assignee_id, assignee_id, changed_by_id)
        bug.assignee_id = assignee_id

    db.session.commit()
    logger.info("Updated bug id=%d", bug.id)
    return jsonify(bug.to_dict())


@bugs_bp.route("/<int:bug_id>", methods=["DELETE"])
def delete_bug(bug_id):
    bug = Bug.query.get_or_404(bug_id, description=f"Bug {bug_id} not found")
    db.session.delete(bug)
    db.session.commit()
    logger.info("Deleted bug id=%d", bug_id)
    return "", 204


def ALLOWED_TRANSITIONS_FOR_RESPONSE(status):
    from ..models import ALLOWED_TRANSITIONS
    return ALLOWED_TRANSITIONS.get(status, set())
