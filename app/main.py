from fastapi import FastAPI, Request, HTTPException, Response
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from .db import database, characters

app = FastAPI()

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

@app.on_event("startup")
async def startup():
    await database.connect()

@app.on_event("shutdown")
async def shutdown():
    await database.disconnect()

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})

@app.get("/api/characters")
async def get_characters():
    query = characters.select()
    results = await database.fetch_all(query)
    return [result['data'] for result in results]

@app.get("/api/characters/{character_id}")
async def get_character(character_id: str):
    query = characters.select().where(characters.c.id == character_id)
    result = await database.fetch_one(query)
    if result is None:
        raise HTTPException(status_code=404, detail="Character not found")
    return result['data']

@app.post("/api/characters", status_code=201)
async def create_character(character_data: dict):
    character_id = character_data.get("id")
    if not character_id:
        raise HTTPException(status_code=400, detail="Character data must include an id")

    query = characters.select().where(characters.c.id == character_id)
    exists = await database.fetch_one(query)
    if exists:
        # This is an update, not a creation
        query = characters.update().where(characters.c.id == character_id).values(data=character_data)
        await database.execute(query)
        return character_data

    query = characters.insert().values(id=character_id, data=character_data)
    await database.execute(query)
    return character_data

@app.put("/api/characters/{character_id}")
async def update_character(character_id: str, character_data: dict):
    query = characters.select().where(characters.c.id == character_id)
    exists = await database.fetch_one(query)
    if not exists:
        raise HTTPException(status_code=404, detail="Character not found")

    query = characters.update().where(characters.c.id == character_id).values(data=character_data)
    await database.execute(query)
    return character_data

@app.delete("/api/characters/{character_id}", status_code=204)
async def delete_character(character_id: str):
    query = characters.select().where(characters.c.id == character_id)
    exists = await database.fetch_one(query)
    if not exists:
        raise HTTPException(status_code=404, detail="Character not found")

    query = characters.delete().where(characters.c.id == character_id)
    await database.execute(query)
    return Response(status_code=204)
