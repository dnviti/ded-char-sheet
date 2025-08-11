from fastapi import APIRouter, Depends, HTTPException
from ..db import get_collection_open5e
from ..users import User
from ..auth import current_user

router = APIRouter()

@router.get("/{resource_type}")
async def search_open5e_resource(resource_type: str, search: str = "", user: User = Depends(current_user)):
    # Basic validation to prevent access to arbitrary collections
    allowed_resources = [
        "species", "classes", "backgrounds", "spells", "weapons",
        "armor", "items", "feats", "alignments", "conditions",
        "languages", "skills"
    ]
    if resource_type not in allowed_resources:
        raise HTTPException(status_code=404, detail="Resource type not found")

    collection = get_collection_open5e(resource_type)

    query = {}
    if search:
        # Using a case-insensitive regex for searching the 'name' field
        query["name"] = {"$regex": search, "$options": "i"}

    # Limit the number of results to keep the response size manageable for autocomplete
    cursor = collection.find(query).limit(20)
    results = await cursor.to_list(length=20)

    # Convert ObjectId to string for JSON serialization
    for doc in results:
        if "_id" in doc:
            doc["_id"] = str(doc["_id"])

    return results
