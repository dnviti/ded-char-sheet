import os
from fastapi import Depends
from fastapi_users import FastAPIUsers, BaseUserManager
from fastapi_users.authentication import (
    AuthenticationBackend,
    CookieTransport,
    JWTStrategy,
)
from fastapi_users.db import BeanieUserDatabase, ObjectIDIDMixin
from beanie import PydanticObjectId

from .users import User, get_user_db

SECRET = os.getenv("SECRET")
if SECRET is None:
    raise ValueError("SECRET environment variable is not set")

class UserManager(ObjectIDIDMixin, BaseUserManager[User, PydanticObjectId]):
    reset_password_token_secret = SECRET
    verification_token_secret = SECRET

async def get_user_manager(user_db: BeanieUserDatabase = Depends(get_user_db)):
    yield UserManager(user_db)

cookie_transport = CookieTransport(cookie_name="dnd_token", cookie_max_age=3600)

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET, lifetime_seconds=3600)

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, PydanticObjectId](get_user_manager, [auth_backend])

current_user = fastapi_users.current_user(active=True)
admin_user = fastapi_users.current_user(active=True, superuser=True)
