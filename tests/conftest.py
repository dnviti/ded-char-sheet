import pytest
import os
from fastapi.testclient import TestClient
from motor.motor_asyncio import AsyncIOMotorClient
from app.main import app
from app.db import get_database
from app.auth import current_user
from app.users import User

# Test database connection
MONGODB_URL = os.getenv("MONGODB_URL", "mongodb+srv://dnviti:2N5Ec2xUc2NrzqQ4@development.atn4rbh.mongodb.net/")
DB_NAME = "dedchar"

# Create a test client for the database
@pytest.fixture(scope="session")
def db_client():
    client = AsyncIOMotorClient(MONGODB_URL)
    yield client
    client.close()

# Override the get_database dependency to use the test database
@pytest.fixture(scope="session")
def test_db(db_client):
    return db_client[DB_NAME]

# A fixture to get a test client for the app
@pytest.fixture(scope="module")
def client(test_db):
    # Mock user for authentication
    def override_current_user():
        return User(
            id="60c72b9f9b1e8a001f8e4c5e",
            email="test@example.com",
            hashed_password="hashed_password",
            is_active=True,
            is_superuser=False,
            is_verified=True,
        )

    app.dependency_overrides[get_database] = lambda: test_db
    app.dependency_overrides[current_user] = override_current_user

    with TestClient(app) as c:
        yield c

    app.dependency_overrides = {}
