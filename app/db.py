import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("MONGO_INITDB_DATABASE", "dedchar")

class DataBase:
    client: AsyncIOMotorClient = None

db = DataBase()

def get_database() -> AsyncIOMotorClient:
    return db.client[DB_NAME]

async def connect_to_mongo():
    db.client = AsyncIOMotorClient(MONGODB_URL)

async def close_mongo_connection():
    db.client.close()

def get_collection_characters():
    database = get_database()
    return database.get_collection("characters")
