from fastapi import APIRouter, Request, Depends

from api.handlers import auth as auth_handlers
from api.handlers.auth import RegisterRequest, LoginRequest

router = APIRouter(prefix="/api/auth")

@router.post("/register")
async def register(request: Request, data: RegisterRequest):
    return await auth_handlers.register(data)

@router.post("/login")
async def login(request: Request, data: LoginRequest):
    return await auth_handlers.login(data)

@router.get("/session")
async def get_session(request: Request):
    return await auth_handlers.get_session(request)

@router.post("/logout")
async def logout(request: Request):
    return await auth_handlers.logout(request)
