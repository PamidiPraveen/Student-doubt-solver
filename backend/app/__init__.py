
from pathlib import Path

from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.engine import make_url
from werkzeug.exceptions import HTTPException
from werkzeug.middleware.proxy_fix import ProxyFix

from app.config import Config

db = SQLAlchemy()
migrate = Migrate()
jwt = JWTManager()
limiter = Limiter(
    key_func=get_remote_address,
    default_limits=[],
)


def _error(code, message, status):
    return jsonify({
        "success": False,
        "error": {"code": code, "message": message},
    }), status


def _register_error_handlers(app):
    """Every error the API returns uses the same JSON envelope."""

    @jwt.unauthorized_loader
    def missing_token(_reason):
        return _error("AUTH_REQUIRED", "Sign in to continue.", 401)

    @jwt.invalid_token_loader
    def invalid_token(_reason):
        return _error("TOKEN_INVALID", "Your session is not valid.", 401)

    @jwt.expired_token_loader
    def expired_token(_header, _payload):
        return _error("TOKEN_EXPIRED", "Your session has expired.", 401)

    @app.errorhandler(HTTPException)
    def http_error(exc):
        code = exc.name.upper().replace(" ", "_")
        if exc.code == 429:
            code = "RATE_LIMITED"
        if exc.code == 413:
            code = "REQUEST_TOO_LARGE"
        return _error(code, exc.description, exc.code)

    @app.errorhandler(Exception)
    def unhandled_error(_exc):
        app.logger.exception("Unhandled error")
        return _error("INTERNAL_ERROR", "Something went wrong.", 500)


def create_app(test_config=None):
    app = Flask(__name__)
    app.config.from_object(Config)

    if test_config:
        app.config.update(test_config)

    if not app.config.get("SECRET_KEY"):
        raise RuntimeError(
            "SECRET_KEY must be configured before starting the application."
        )

    if not app.config.get("JWT_SECRET_KEY"):
        app.config["JWT_SECRET_KEY"] = app.config["SECRET_KEY"]

    database_url = make_url(app.config["SQLALCHEMY_DATABASE_URI"])
    if database_url.get_backend_name() == "sqlite":
        database = database_url.database
        if database and database != ":memory:" and not database.startswith("file:"):
            database_path = Path(database)
            if not database_path.is_absolute():
                database_path = Path(app.instance_path) / database_path
            database_path.parent.mkdir(parents=True, exist_ok=True)

    if app.config.get("TRUST_PROXY"):
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    limiter.init_app(app)
    CORS(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}},
        allow_headers=["Authorization", "Content-Type"],
        max_age=600,
    )
    _register_error_handlers(app)

    # Import models after initializing the extensions.
    with app.app_context():
        from app import models  # noqa: F401

    # Import and register blueprints inside the app factory
    # to avoid circular imports.
    from app.routes.ai import ai_bp
    from app.routes.answers import answers_bp
    from app.routes.auth import auth_bp
    from app.routes.library import library_bp
    from app.routes.notifications import notifications_bp
    from app.routes.questions import questions_bp
    from app.routes.stats import stats_bp
    from app.routes.subjects import subjects_bp

    app.register_blueprint(auth_bp, url_prefix="/api/v1/auth")
    app.register_blueprint(questions_bp, url_prefix="/api/v1/questions")
    app.register_blueprint(answers_bp, url_prefix="/api/v1/questions")
    app.register_blueprint(library_bp, url_prefix="/api/v1/library")
    app.register_blueprint(subjects_bp, url_prefix="/api/v1/subjects")
    app.register_blueprint(ai_bp, url_prefix="/api/v1/ai")
    app.register_blueprint(
        notifications_bp, url_prefix="/api/v1/notifications"
    )
    app.register_blueprint(stats_bp, url_prefix="/api/v1/stats")

    @app.get("/api/health")
    def health_check():
        try:
            db.session.execute(db.text("SELECT 1"))
        except Exception:
            app.logger.exception("Database health check failed")
            return jsonify({
                "success": False,
                "error": {
                    "code": "DATABASE_UNAVAILABLE",
                    "message": "The service is temporarily unavailable.",
                },
            }), 503

        return jsonify({
            "success": True,
            "data": {
                "status": "healthy",
                "database": "connected",
                "ai": "enabled" if app.config["AI_ENABLED"] else "disabled",
                "service": "student-doubt-solving-backend",
            },
        }), 200

    return app
