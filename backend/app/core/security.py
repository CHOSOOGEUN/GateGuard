from datetime import datetime, timedelta
from typing import Optional

from jose import JWTError, jwt, ExpiredSignatureError
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


def create_access_token(data: dict) -> str:
    payload = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_access_token(token: str) -> dict:
    """
    토큰을 디코딩하고 검증합니다. 비즈니스 로직 에러를 ValueError로 반환하여 deps에서 처리하도록 합니다.
    """
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except ExpiredSignatureError:
        raise ValueError("토큰 인증이 만료되었습니다. 다시 로그인해주세요.")
    except JWTError:
        raise ValueError("유효하지 않은 보안 토큰입니다.")
