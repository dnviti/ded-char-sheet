import os
import uuid
import httpx
import datetime
from fastapi import FastAPI, Request, HTTPException, Response, BackgroundTasks, Depends
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from beanie import init_beanie
from pydantic import BaseModel
from typing import Optional, Dict, Any

from .db import connect_to_mongo, close_mongo_connection, get_collection_characters, get_collection_open5e, get_database, get_collection_gemini_usage
from .users import User, get_user_db, UserRead, UserCreate, UserUpdate

from scripts.load_open5e_data import main as cache_open5e_data_main
from apscheduler.schedulers.asyncio import AsyncIOScheduler

from fastapi_users import FastAPIUsers
from fastapi_users.authentication import JWTStrategy, AuthenticationBackend, CookieTransport

SECRET = os.getenv("SECRET")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

app = FastAPI()

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

scheduler = AsyncIOScheduler()

cookie_transport = CookieTransport(cookie_name="dnd_token", cookie_max_age=3600)

def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=SECRET, lifetime_seconds=3600)

auth_backend = AuthenticationBackend(
    name="jwt",
    transport=cookie_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[User, uuid.UUID](
    get_user_db,
    [auth_backend],
)

current_user = fastapi_users.current_user()
admin_user = fastapi_users.current_user(active=True, superuser=True)

class UserPackageUpdate(BaseModel):
    package: str

class GeminiRequest(BaseModel):
    prompt: str
    json_schema: Optional[Dict[str, Any]] = None
    is_image: bool = False

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()
    await init_beanie(database=get_database(), document_models=[User])
    scheduler.add_job(cache_open5e_data_main, 'cron', hour=3, minute=0, name="Daily Cache Job")
    scheduler.add_job(cache_open5e_data_main, name="Initial Startup Cache Job")
    scheduler.start()
    print("Scheduler started. Caching job is scheduled to run daily at 3:00 AM UTC and once on startup.")


@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()
    scheduler.shutdown()

app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)

app.include_router(
    fastapi_users.get_register_router(UserRead, UserCreate),
    prefix="/auth",
    tags=["auth"],
)

app.include_router(
    fastapi_users.get_users_router(UserRead, UserUpdate),
    prefix="/users",
    tags=["users"],
)

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

QUOTAS = {
    "free": 10,
    "premium": 100,
}

@app.post("/api/gemini/proxy")
async def gemini_proxy(request: GeminiRequest, user: User = Depends(current_user)):
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured on the server")

    # Quota Check
    user_package = user.package or "free"
    quota = QUOTAS.get(user_package, 0)
    if user.generation_count >= quota:
        raise HTTPException(status_code=429, detail=f"Usage limit of {quota} generations for '{user_package}' package exceeded.")

    if request.is_image:
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key={GEMINI_API_KEY}"
        payload = {"instances": [{"prompt": request.prompt}], "parameters": {"sampleCount": 1}}
    else:
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-latest:generateContent?key={GEMINI_API_KEY}"
        payload = {
            "contents": [{"parts": [{"text": request.prompt}]}]
        }
        if request.json_schema:
            payload["generationConfig"] = {
                "responseMimeType": "application/json",
                "responseSchema": request.json_schema
            }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(api_url, json=payload, timeout=45.0)
            response.raise_for_status()
        except httpx.RequestError as exc:
            raise HTTPException(status_code=503, detail=f"Error contacting Gemini API: {exc}")
        except httpx.HTTPStatusError as exc:
            raise HTTPException(status_code=exc.response.status_code, detail=f"Error from Gemini API: {exc.response.text}")

    # Log successful usage and increment user's count
    usage_collection = get_collection_gemini_usage()
    await usage_collection.insert_one({
        "user_id": user.id,
        "timestamp": datetime.datetime.utcnow(),
        "type": "image" if request.is_image else "text",
    })

    user.generation_count += 1
    await user.save()

    return response.json()


@app.get("/api/open5e/{resource_type}")
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

@app.get("/api/characters")
async def get_characters(user: User = Depends(current_user)):
    characters_collection = get_collection_characters()
    characters = await characters_collection.find({"user_id": user.id}).to_list(1000)
    for char in characters:
        char["_id"] = str(char["_id"])
    return characters

@app.get("/api/characters/{character_id}")
async def get_character(character_id: str, user: User = Depends(current_user)):
    characters_collection = get_collection_characters()
    character = await characters_collection.find_one({"id": character_id, "user_id": user.id})
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found or you don't have permission to view it")
    character["_id"] = str(character["_id"])
    return character

@app.post("/api/characters", status_code=201)
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

@app.put("/api/characters/{character_id}")
async def update_character(character_id: str, character_data: dict, user: User = Depends(current_user)):
    if '_id' in character_data:
        del character_data['_id']
    if 'user_id' in character_data:
        del character_data['user_id']

    characters_collection = get_collection_characters()

    # First, verify the character exists and belongs to the user before updating
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

@app.delete("/api/characters/{character_id}", status_code=204)
async def delete_character(character_id: str, user: User = Depends(current_user)):
    characters_collection = get_collection_characters()
    result = await characters_collection.delete_one({"id": character_id, "user_id": user.id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Character not found or you don't have permission to delete it")
    return Response(status_code=204)

# Admin endpoints
@app.get("/api/admin/users", response_model=list[UserRead])
async def get_all_users(user: User = Depends(admin_user)):
    users = await User.find_all().to_list()
    return users

@app.patch("/api/admin/users/{user_id}/package", response_model=UserRead)
async def update_user_package(user_id: uuid.UUID, update: UserPackageUpdate, user: User = Depends(admin_user)):
    user_to_update = await User.get(user_id)
    if not user_to_update:
        raise HTTPException(status_code=404, detail="User not found")

    if update.package not in QUOTAS:
        raise HTTPException(status_code=400, detail=f"Invalid package name. Valid packages are: {list(QUOTAS.keys())}")

    user_to_update.package = update.package
    await user_to_update.save()
    return user_to_update
