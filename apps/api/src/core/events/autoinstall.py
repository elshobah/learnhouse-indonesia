import logging
import sys
import os
from sqlalchemy import create_engine
from sqlmodel import SQLModel, Session, select

from config.config import get_learnhouse_config
from src.db.organizations import Organization

# Add parent directory to path to allow importing cli module
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

try:
    from cli import install
except ImportError:
    # Fallback: define install locally if import fails
    def install(short=True):
        from src.db.organizations import OrganizationCreate
        from src.db.users import UserCreate
        from src.services.setup.setup import (
            install_create_organization,
            install_create_organization_user,
            install_default_elements,
        )

        learnhouse_config = get_learnhouse_config()
        engine = create_engine(
            learnhouse_config.database_config.sql_connection_string, echo=False, pool_pre_ping=True
        )
        SQLModel.metadata.create_all(engine)
        db_session = Session(engine)

        try:
            # Install the default elements
            logger.info("Installing default elements...")
            install_default_elements(db_session)

            # Create the Organization
            logger.info("Creating default organization...")
            org = OrganizationCreate(
                name="Default Organization",
                description="Default Organization",
                slug="default",
                email="",
                logo_image="",
                thumbnail_image="",
                about="",
                label="",
            )
            install_create_organization(org, db_session)

            # Create Organization User
            logger.info("Creating default organization user...")
            email = os.environ.get("LEARNHOUSE_INITIAL_ADMIN_EMAIL", "admin@school.dev")
            password = os.environ.get("LEARNHOUSE_INITIAL_ADMIN_PASSWORD", "admin123")

            user = UserCreate(username="admin", email=email, password=password)
            install_create_organization_user(user, "default", db_session)

            logger.info("Auto-installation completed ✅")
        finally:
            db_session.close()

logger = logging.getLogger(__name__)


def auto_install():
    # Get the database session
    learnhouse_config = get_learnhouse_config()
    engine = create_engine(
        learnhouse_config.database_config.sql_connection_string, echo=False, pool_pre_ping=True  # type: ignore
    )
    SQLModel.metadata.create_all(engine)

    db_session = Session(engine)

    default_org = db_session.exec(
        select(Organization).where(Organization.slug == 'default')
    ).first()

    if not default_org:
        logger.info("No default organization found. Starting auto-installation 🏗️")
        install(short=True)
    else:
        logger.info("Organizations found. Skipping auto-installation 🚀")
