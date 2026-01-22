"""
Authentication service for user management and JWT tokens
"""
from datetime import datetime, timedelta
from typing import Optional
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, UserSettingsNew, PlanType
from app.core.config import settings

# JWT Configuration
SECRET_KEY = settings.jwt_secret_key
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_DAYS = 30


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against a hashed password"""
    # bcrypt has a 72 byte limit
    password_bytes = plain_password.encode('utf-8')[:72]
    return bcrypt.checkpw(password_bytes, hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """Hash a password"""
    # bcrypt has a 72 byte limit
    password_bytes = password.encode('utf-8')[:72]
    return bcrypt.hashpw(password_bytes, bcrypt.gensalt()).decode('utf-8')


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """Create a JWT access token"""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=ACCESS_TOKEN_EXPIRE_DAYS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def verify_token(token: str) -> Optional[dict]:
    """Verify and decode a JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except JWTError:
        return None


async def get_user_by_email(db: AsyncSession, email: str) -> Optional[User]:
    """Get a user by email"""
    result = await db.execute(select(User).where(User.email == email))
    return result.scalar_one_or_none()


async def get_user_by_id(db: AsyncSession, user_id: int) -> Optional[User]:
    """Get a user by ID"""
    result = await db.execute(select(User).where(User.id == user_id))
    return result.scalar_one_or_none()


async def get_user_by_google_id(db: AsyncSession, google_id: str) -> Optional[User]:
    """Get a user by Google ID"""
    result = await db.execute(select(User).where(User.google_id == google_id))
    return result.scalar_one_or_none()


async def create_user(
    db: AsyncSession,
    email: str,
    password: Optional[str] = None,
    name: Optional[str] = None,
    auth_provider: str = "email",
    google_id: Optional[str] = None,
    avatar_url: Optional[str] = None
) -> User:
    """Create a new user"""
    hashed_password = get_password_hash(password) if password else None

    user = User(
        email=email,
        hashed_password=hashed_password,
        name=name or email.split("@")[0],
        auth_provider=auth_provider,
        google_id=google_id,
        avatar_url=avatar_url,
        plan=PlanType.FREE,
        trial_started_at=datetime.utcnow(),
        trial_ends_at=datetime.utcnow() + timedelta(days=7)
    )

    db.add(user)
    await db.commit()
    await db.refresh(user)

    # Create default settings
    settings = UserSettingsNew(user_id=user.id)
    db.add(settings)
    await db.commit()

    return user


async def authenticate_user(db: AsyncSession, email: str, password: str) -> Optional[User]:
    """Authenticate a user with email and password"""
    user = await get_user_by_email(db, email)
    if not user or not user.hashed_password:
        return None
    if not verify_password(password, user.hashed_password):
        return None
    return user


async def update_user_last_login(db: AsyncSession, user: User) -> User:
    """Update user's last login timestamp"""
    user.last_login_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_password(db: AsyncSession, user: User, new_password: str) -> User:
    """Update user's password"""
    user.hashed_password = get_password_hash(new_password)
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user


async def update_user_profile(
    db: AsyncSession,
    user: User,
    name: Optional[str] = None,
    avatar_url: Optional[str] = None
) -> User:
    """Update user's profile"""
    if name is not None:
        user.name = name
    if avatar_url is not None:
        user.avatar_url = avatar_url
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user


async def verify_user_email(db: AsyncSession, user: User) -> User:
    """Mark user's email as verified"""
    user.is_verified = True
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user


async def deactivate_user(db: AsyncSession, user: User) -> User:
    """Deactivate a user account"""
    user.is_active = False
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    return user
