from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from utils.jwt import decode_access_token
from database.repositories.users import user_repository

class AuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request.state.user = None
        auth_header = request.headers.get("Authorization")

        if auth_header and auth_header.startswith("Bearer "):
            token = auth_header.split(" ", 1)[1]
            payload = decode_access_token(token)
            print("Decoded JWT payload:", payload)

            if payload and "user_id" in payload:
                try:
                    user_id = payload["user_id"]
                    print(f"Looking for user with ID: {user_id}")
                    user = await user_repository.fetch_by_id(user_id)
                    print(f"Found user: {user}")

                    if user:
                        request.state.user = user
                        print(f"Set request.state.user to: {request.state.user}")
                    else:
                        print(f"No user found with ID: {user_id}")
                except Exception as e:
                    print(f"Error fetching user: {e}")

        response = await call_next(request)
        return response
