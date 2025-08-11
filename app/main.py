import os
from fastapi import FastAPI, Request, HTTPException, Response, BackgroundTasks
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from .db import connect_to_mongo, close_mongo_connection, get_collection_characters, get_collection_open5e
from scripts.load_open5e_data import main as cache_open5e_data_main
from apscheduler.schedulers.asyncio import AsyncIOScheduler

app = FastAPI()

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

scheduler = AsyncIOScheduler()

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()
    scheduler.add_job(cache_open5e_data_main, 'cron', hour=3, minute=0, name="Daily Cache Job")
    scheduler.add_job(cache_open5e_data_main, name="Initial Startup Cache Job")
    scheduler.start()
    print("Scheduler started. Caching job is scheduled to run daily at 3:00 AM UTC and once on startup.")


@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()
    scheduler.shutdown()

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/gemini-key")
async def get_gemini_key():
    gemini_api_key = os.getenv("GEMINI_API_KEY")
    if not gemini_api_key:
        raise HTTPException(status_code=500, detail="Gemini API key not configured on the server")
    return {"apiKey": gemini_api_key}

@app.get("/api/open5e/{resource_type}")
async def search_open5e_resource(resource_type: str, search: str = ""):
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
async def get_characters():
    characters_collection = get_collection_characters()
    characters = await characters_collection.find().to_list(1000)
    for char in characters:
        char["_id"] = str(char["_id"])
    return characters

@app.get("/api/characters/{character_id}")
async def get_character(character_id: str):
    characters_collection = get_collection_characters()
    character = await characters_collection.find_one({"id": character_id})
    if character is None:
        raise HTTPException(status_code=404, detail="Character not found")
    character["_id"] = str(character["_id"])
    return character

@app.post("/api/characters", status_code=201)
async def create_character(character_data: dict):
    character_id = character_data.get("id")
    if not character_id:
        raise HTTPException(status_code=400, detail="Character data must include an id")

    characters_collection = get_collection_characters()

    if await characters_collection.find_one({"id": character_id}):
        raise HTTPException(status_code=409, detail=f"Character with id {character_id} already exists.")

    # The client might send an _id if it's stale data from a previous fetch.
    # We remove it before inserting to let MongoDB generate a fresh one.
    if '_id' in character_data:
        del character_data['_id']

    insert_result = await characters_collection.insert_one(character_data)

    created_character = await characters_collection.find_one({"_id": insert_result.inserted_id})

    created_character["_id"] = str(created_character["_id"])
    return created_character

@app.put("/api/characters/{character_id}")
async def update_character(character_id: str, character_data: dict):
    # The _id from the client response is a string representation and must not be part
    # of the update payload, as the _id field is immutable.
    if '_id' in character_data:
        del character_data['_id']

    characters_collection = get_collection_characters()

    result = await characters_collection.update_one(
        {"id": character_id}, {"$set": character_data}
    )

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail=f"Character with id {character_id} not found.")

    # Fetch the updated character to ensure data is fresh and serializable
    updated_character = await characters_collection.find_one({"id": character_id})

    updated_character["_id"] = str(updated_character["_id"])
    return updated_character

@app.delete("/api/characters/{character_id}", status_code=204)
async def delete_character(character_id: str):
    characters_collection = get_collection_characters()
    result = await characters_collection.delete_one({"id": character_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Character not found")
    return Response(status_code=204)
