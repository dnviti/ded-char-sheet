from fastapi import APIRouter, Depends, HTTPException
from beanie import PydanticObjectId
from pydantic import BaseModel
from typing import List

from ..users import User, UserRead
from ..auth import admin_user

router = APIRouter()

QUOTAS = {
    "free": 10,
    "premium": 100,
}

class UserPackageUpdate(BaseModel):
    package: str

@router.get("/users", response_model=List[UserRead])
async def get_all_users(user: User = Depends(admin_user)):
    users = await User.find_all().to_list()
    return users

@router.patch("/users/{user_id}/package", response_model=UserRead)
async def update_user_package(user_id: PydanticObjectId, update: UserPackageUpdate, user: User = Depends(admin_user)):
    user_to_update = await User.get(user_id)
    if not user_to_update:
        raise HTTPException(status_code=404, detail="User not found")

    if update.package not in QUOTAS:
        raise HTTPException(status_code=400, detail=f"Invalid package name. Valid packages are: {list(QUOTAS.keys())}")

    user_to_update.package = update.package
    await user_to_update.save()
    return user_to_update
