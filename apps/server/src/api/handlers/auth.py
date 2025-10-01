from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel, EmailStr

from database.repositories.users import user_repository
from utils.hash import hash_password, verify_password
from utils.jwt import create_access_token

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

async def register(data: RegisterRequest):
    existing = await user_repository.fetch_by_email(data.email)
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    hashed = hash_password(data.password)
    user = await user_repository.insert(data.name, data.email, hashed)
    return JSONResponse({"id": user.id, "email": user.email, "name": user.name})

async def login(data: LoginRequest):
    user = await user_repository.fetch_by_email(data.email)
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_access_token({"user_id": user.id})
    return JSONResponse({"access_token": token, "token_type": "bearer"})

async def get_session(request: Request):
    user = request.state.user
    print("Fetched session user:", user)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated")
    return JSONResponse({"id": user.id, "email": user.email, "name": user.name})
