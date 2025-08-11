import uuid
from beanie import Document
from fastapi_users.db import BeanieBaseUser, BeanieUserDatabase

from typing import Optional

class User(BeanieBaseUser[uuid.UUID], Document):
    package: Optional[str] = "free"
    generation_count: Optional[int] = 0

async def get_user_db():
    yield BeanieUserDatabase(User)
