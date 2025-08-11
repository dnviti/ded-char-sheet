from fastapi import FastAPI, Request, HTTPException, Response
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from .db import connect_to_mongo, close_mongo_connection, get_collection_characters

app = FastAPI()

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

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
