from fastapi import APIRouter, Depends, HTTPException, status
from beanie import PydanticObjectId
from pydantic import BaseModel
from typing import List, Optional

from ..users import User, UserRead, UserCreate
from ..auth import admin_user, UserManager, get_user_manager
from fastapi_users.exceptions import UserAlreadyExists

router = APIRouter()

QUOTAS = {
    "free": 10,
    "premium": 100,
}

class AdminUserUpdate(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    package: Optional[str] = None
    is_active: Optional[bool] = None
    is_superuser: Optional[bool] = None

@router.get("/users", response_model=List[UserRead])
async def get_all_users(user: User = Depends(admin_user)):
    """
    Get all users.
    """
    users = await User.find_all().to_list()
    return users

@router.post("/users", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_create: UserCreate,
    user: User = Depends(admin_user),
    user_manager: UserManager = Depends(get_user_manager),
):
    """
    Create a new user.
    """
    try:
        created_user = await user_manager.create(user_create, safe=True)
    except UserAlreadyExists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User with this email already exists.",
        )
    return created_user

@router.patch("/users/{user_id}", response_model=UserRead)
async def update_user(
    user_id: PydanticObjectId,
    user_update: AdminUserUpdate,
    user: User = Depends(admin_user),
    user_manager: UserManager = Depends(get_user_manager),
):
    """
    Update a user.
    """
    user_to_update = await User.get(user_id)
    if user_to_update is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_update.package is not None and user_update.package not in QUOTAS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid package name. Valid packages are: {list(QUOTAS.keys())}",
        )

    if user_to_update.id == user.id and user_update.is_superuser is False:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins cannot remove their own superuser status."
        )

    try:
        updated_user = await user_manager.update(user_update, user_to_update)
        return updated_user
    except Exception as e:
        # This can happen if the email is already taken, for example.
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)
        )

@router.delete("/users/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: PydanticObjectId,
    user: User = Depends(admin_user),
    user_manager: UserManager = Depends(get_user_manager),
):
    """
    Delete a user.
    """
    user_to_delete = await User.get(user_id)
    if user_to_delete is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")

    if user_to_delete.id == user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins cannot delete themselves."
        )

    await user_manager.delete(user_to_delete)
