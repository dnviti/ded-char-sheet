from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
import shutil
import os
from ..db import get_collection_characters
from ..users import User
from ..auth import current_user

router = APIRouter()

@router.get("/")
async def get_characters(user: User = Depends(current_user)):
    characters_collection = get_collection_characters()
    characters = await characters_collection.find({"user_id": user.id}).to_list(1000)
    for char in characters:
        char["_id"] = str(char["_id"])
    return characters

@router.get("/{character_id}")
async def get_character(character_id: str, user: User = Depends(current_user)):
    characters_collection = get_collection_characters()
    character = await characters_collection.find_one({"id": character_id, "user_id": user.id})
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found or you don't have permission to view it")
    character["_id"] = str(character["_id"])
    return character

@router.post("/", status_code=201)
async def create_character(character_data: dict, user: User = Depends(current_user)):
    character_id = character_data.get("id")
    if not character_id:
        raise HTTPException(status_code=400, detail="Character data must include an id")

    characters_collection = get_collection_characters()

    character_data["user_id"] = user.id

    if await characters_collection.find_one({"id": character_id, "user_id": user.id}):
        raise HTTPException(status_code=409, detail=f"Character with id {character_id} already exists.")

    if '_id' in character_data:
        del character_data['_id']

    insert_result = await characters_collection.insert_one(character_data)
    created_character = await characters_collection.find_one({"_id": insert_result.inserted_id})
    created_character["_id"] = str(created_character["_id"])
    return created_character

@router.put("/{character_id}")
async def update_character(character_id: str, character_data: dict, user: User = Depends(current_user)):
    if '_id' in character_data:
        del character_data['_id']
    if 'user_id' in character_data:
        del character_data['user_id']

    characters_collection = get_collection_characters()

    existing_character = await characters_collection.find_one({"id": character_id, "user_id": user.id})
    if existing_character is None:
        raise HTTPException(status_code=404, detail="Character not found or you don't have permission to edit it.")

    result = await characters_collection.update_one(
        {"id": character_id, "user_id": user.id}, {"$set": character_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Character with id {character_id} not found.")

    updated_character = await characters_collection.find_one({"id": character_id, "user_id": user.id})
    updated_character["_id"] = str(updated_character["_id"])
    return updated_character

@router.delete("/{character_id}", status_code=204)
async def delete_character(character_id: str, user: User = Depends(current_user)):
    characters_collection = get_collection_characters()
    result = await characters_collection.delete_one({"id": character_id, "user_id": user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Character not found or you don't have permission to delete it")
    return Response(status_code=204)

@router.put("/{character_id}/layout")
async def update_character_layout(character_id: str, layout: dict, user: User = Depends(current_user)):
    characters_collection = get_collection_characters()

    existing_character = await characters_collection.find_one({"id": character_id, "user_id": user.id})
    if existing_character is None:
        raise HTTPException(status_code=404, detail="Character not found or you don't have permission to edit it.")

    result = await characters_collection.update_one(
        {"id": character_id, "user_id": user.id}, {"$set": {"layout": layout}}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Character with id {character_id} not found.")

    return {"message": "Layout updated successfully"}

@router.post("/{character_id}/image")
async def upload_character_image(character_id: str, request: dict, user: User = Depends(current_user)):
    characters_collection = get_collection_characters()
    character = await characters_collection.find_one({"id": character_id, "user_id": user.id})
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found or you don't have permission to edit it.")

    image_data = request.get("image")
    if not image_data:
        raise HTTPException(status_code=400, detail="No image data provided.")

    # Update the character's imageUrl in the database with the base64 string
    await characters_collection.update_one(
        {"id": character_id, "user_id": user.id},
        {"$set": {"imageUrl": image_data}}
    )

    return {"imageUrl": image_data}
