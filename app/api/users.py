from fastapi import APIRouter, Depends, HTTPException
from ..users import User, UserUpdate
from ..auth import current_user

router = APIRouter()

@router.put("/me/layout")
async def update_user_layout(layout: dict, user: User = Depends(current_user)):
    user.character_sheet_layout = layout
    await user.save()
    return {"message": "Layout updated successfully"}
