from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from .db import database, notes

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
    query = notes.select()
    return templates.TemplateResponse("index.html", {"request": request, "notes": await database.fetch_all(query)})

@app.get("/notes")
async def read_notes():
    query = notes.select()
    return await database.fetch_all(query)

@app.post("/notes")
async def create_note(request: Request):
    data = await request.json()
    query = notes.insert().values(text=data["text"], completed=data["completed"])
    last_record_id = await database.execute(query)
    return {"id": last_record_id}
