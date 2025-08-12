import asyncio
import re
from fastapi import APIRouter, Depends, HTTPException
from ..db import get_collection_open5e
from ..users import User
from ..auth import current_user

router = APIRouter()

async def fetch_collection_data(collection_name: str, query: dict):
    """Helper to fetch data from a single collection."""
    try:
        collection = get_collection_open5e(collection_name)
        # Fetch all documents that match the query
        cursor = collection.find(query)
        return await cursor.to_list(length=None)
    except Exception:
        # If a collection doesn't exist or another error occurs, return an empty list
        return []

@router.get("/{resource_type}")
async def search_open5e_resource(
    resource_type: str,
    search: str = "",
    page: int = 1,
    limit: int = 10,
    user: User = Depends(current_user)
):
    allowed_resources = [
        "species", "classes", "backgrounds", "spells", "weapons",
        "armor", "items", "feats", "alignments", "conditions",
        "languages", "skills", "equipment"
    ]
    if resource_type not in allowed_resources:
        raise HTTPException(status_code=404, detail="Resource type not found")

    query = {}
    if search:
        query["name"] = {"$regex": search, "$options": "i"}

    results = []
    if resource_type == "equipment":
        equipment_collections = ["armor", "items", "weapons"]

        # The search query will be applied at the database level for each collection.
        tasks = [fetch_collection_data(name, query) for name in equipment_collections]
        collection_results = await asyncio.gather(*tasks)

        # Flatten the list of lists into a single list
        all_equipment = [item for sublist in collection_results for item in sublist]

        # Sort the combined results by name
        all_equipment.sort(key=lambda x: x.get("name", ""))

        # Apply pagination to the in-memory list
        start = (page - 1) * limit
        end = start + limit
        results = all_equipment[start:end]

    else:
        collection = get_collection_open5e(resource_type)
        cursor = collection.find(query).sort("name", 1).skip((page - 1) * limit).limit(limit)
        results = await cursor.to_list(length=limit)

    # Convert ObjectId to string for JSON serialization
    for doc in results:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])

    return results
