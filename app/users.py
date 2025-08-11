import uuid
from typing import Optional

from beanie import Document, PydanticObjectId
from fastapi_users import schemas
from fastapi_users.db import BeanieBaseUser, BeanieUserDatabase

class User(BeanieBaseUser, Document):
    package: Optional[str] = "free"
    generation_count: Optional[int] = 0

class UserRead(schemas.BaseUser[PydanticObjectId]):
    package: Optional[str] = "free"
    generation_count: Optional[int] = 0

class UserCreate(schemas.BaseUserCreate):
    pass

class UserUpdate(schemas.BaseUserUpdate):
    package: Optional[str]
    generation_count: Optional[int]

async def get_user_db():
    yield BeanieUserDatabase(User)
