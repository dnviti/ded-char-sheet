import os
from databases import Database
from dotenv import load_dotenv
import sqlalchemy

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./test.db")

database = Database(DATABASE_URL)
metadata = sqlalchemy.MetaData()

characters = sqlalchemy.Table(
    "characters",
    metadata,
    sqlalchemy.Column("id", sqlalchemy.String(36), primary_key=True),
    sqlalchemy.Column("data", sqlalchemy.JSON),
)

engine = sqlalchemy.create_engine(
    DATABASE_URL
)
metadata.create_all(engine)
