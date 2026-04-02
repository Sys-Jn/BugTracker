import logging
from flask import Blueprint, request, jsonify
from .. import db
from ..models import User

logger = logging.getLogger(__name__)
users_bp = Blueprint("users", __name__)


@users_bp.route("", methods=["GET"])
def list_users():
    users = User.query.order_by(User.username).all()
    return jsonify([u.to_dict() for u in users])


@users_bp.route("", methods=["POST"])
def create_user():
    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Request body must be JSON"}), 400

    username = (data.get("username") or "").strip()
    email = (data.get("email") or "").strip()

    errors = {}
    if not username:
        errors["username"] = "Username is required."
    if not email or "@" not in email:
        errors["email"] = "A valid email is required."

    if errors:
        return jsonify({"errors": errors}), 422

    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already taken"}), 409
    if User.query.filter_by(email=email).first():
        return jsonify({"error": "Email already registered"}), 409

    user = User(username=username, email=email)
    db.session.add(user)
    db.session.commit()
    logger.info("Created user id=%d username='%s'", user.id, user.username)
    return jsonify(user.to_dict()), 201


@users_bp.route("/<int:user_id>", methods=["GET"])
def get_user(user_id):
    user = User.query.get_or_404(user_id, description=f"User {user_id} not found")
    return jsonify(user.to_dict())
