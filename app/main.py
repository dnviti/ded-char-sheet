import os
from fastapi import FastAPI, Request, Depends
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from beanie import init_beanie
from bson import ObjectId
from beanie import PydanticObjectId
from fastapi.encoders import ENCODERS_BY_TYPE
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware

from .db import connect_to_mongo, close_mongo_connection, get_database
from .users import User, UserRead, UserCreate, UserUpdate
from .auth import auth_backend, fastapi_users, current_user
from .scheduler import setup_scheduler, shutdown_scheduler
from .api import characters, gemini, open5e, admin

ENCODERS_BY_TYPE[PydanticObjectId] = str
ENCODERS_BY_TYPE[ObjectId] = str

app = FastAPI()

# Add middleware for handling proxy headers
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

@app.on_event("startup")
async def startup_event():
    await connect_to_mongo()
    await init_beanie(database=get_database(), document_models=[User])
    setup_scheduler()

@app.on_event("shutdown")
async def shutdown_event():
    await close_mongo_connection()
    shutdown_scheduler()

# Auth routers
app.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth"],
)
# Conditionally add the register router
REGISTRATIONS_ENABLED = os.getenv("REGISTRATIONS_ENABLED", "False").lower() == "true"
if REGISTRATIONS_ENABLED:
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

# API routers
app.include_router(characters.router, prefix="/api/characters", tags=["characters"])
app.include_router(gemini.router, prefix="/api/gemini", tags=["gemini"])
app.include_router(open5e.router, prefix="/api/open5e", tags=["open5e"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])

@app.get("/login", response_class=HTMLResponse)
async def route_login(request: Request, user: User = Depends(fastapi_users.current_user(optional=True))):
    if user:
        return RedirectResponse(url="/")
    return templates.TemplateResponse(
        "login.html",
        {
            "request": request,
            "REGISTRATIONS_ENABLED": REGISTRATIONS_ENABLED,
        },
    )

@app.get("/", response_class=HTMLResponse)
async def read_root(request: Request, user: User = Depends(fastapi_users.current_user(optional=True))):
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse(
        "index.html",
        {
            "request": request,
            "REGISTRATIONS_ENABLED": REGISTRATIONS_ENABLED,
            "user": user,
        },
    )


@app.get("/character/sheet", response_class=RedirectResponse)
async def redirect_to_root():
    return RedirectResponse(url="/")


@app.get("/character/sheet/{character_id}", response_class=HTMLResponse)
async def read_character_sheet(request: Request, character_id: str, user: User = Depends(fastapi_users.current_user(optional=True))):
    if not user:
        return RedirectResponse(url="/login")
    return templates.TemplateResponse(
        "character_sheet.html",
        {
            "request": request,
            "character_id": character_id,
            "REGISTRATIONS_ENABLED": REGISTRATIONS_ENABLED,
            "user": user,
        },
    )


@app.get("/admin", response_class=HTMLResponse)
async def read_admin(request: Request, user: User = Depends(fastapi_users.current_user(active=True, superuser=True))):
    return templates.TemplateResponse("admin.html", {"request": request, "user": user})
