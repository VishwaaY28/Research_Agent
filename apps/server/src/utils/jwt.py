import jwt
from datetime import datetime, timedelta

from config.env import env

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, env["SECRET_KEY"], algorithm=ALGORITHM)

def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, env["SECRET_KEY"], algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        return None
