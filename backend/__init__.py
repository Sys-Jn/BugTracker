from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
import logging
import os

db = SQLAlchemy()


def create_app(config_name="default"):
    app = Flask(__name__)

    from .config import config
    app.config.from_object(config[config_name])

    # Logging setup
    log_level = getattr(logging, app.config.get("LOG_LEVEL", "INFO"))
    logging.basicConfig(
        level=log_level,
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    )

    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    from .routes.bugs import bugs_bp
    from .routes.users import users_bp

    app.register_blueprint(bugs_bp, url_prefix="/api/bugs")
    app.register_blueprint(users_bp, url_prefix="/api/users")

    @app.route("/api/health")
    def health():
        return {"status": "ok"}

    with app.app_context():
        db.create_all()
        _seed_users()

    return app


def _seed_users():
    from .models import User
    if User.query.count() == 0:
        seed_users = [
            User(username="alice", email="alice@example.com"),
            User(username="bob", email="bob@example.com"),
            User(username="carol", email="carol@example.com"),
        ]
        db.session.add_all(seed_users)
        db.session.commit()
        logging.getLogger(__name__).info("Seeded default users.")
