import keyring
from typing import Optional

SERVICE_NAME = "productify-pro"


def store_api_key(key_name: str, key_value: str) -> bool:
    """Store API key securely using system keyring"""
    try:
        keyring.set_password(SERVICE_NAME, key_name, key_value)
        return True
    except Exception as e:
        print(f"Failed to store API key: {e}")
        return False


def get_api_key(key_name: str) -> Optional[str]:
    """Retrieve API key from system keyring"""
    try:
        return keyring.get_password(SERVICE_NAME, key_name)
    except Exception as e:
        print(f"Failed to retrieve API key: {e}")
        return None


def delete_api_key(key_name: str) -> bool:
    """Delete API key from system keyring"""
    try:
        keyring.delete_password(SERVICE_NAME, key_name)
        return True
    except Exception as e:
        print(f"Failed to delete API key: {e}")
        return False


def get_openai_api_key() -> Optional[str]:
    """Get OpenAI API key from secure storage or environment"""
    # First try keyring (secure storage)
    key = get_api_key("openai_api_key")
    if key:
        return key

    # Fallback to environment variable / .env file
    from app.core.config import settings
    if settings.openai_api_key:
        return settings.openai_api_key

    return None


def set_openai_api_key(api_key: str) -> bool:
    """Store OpenAI API key securely"""
    return store_api_key("openai_api_key", api_key)


def has_openai_key() -> bool:
    """Check if OpenAI API key exists"""
    return get_openai_api_key() is not None


def delete_openai_key() -> bool:
    """Delete OpenAI API key"""
    return delete_api_key("openai_api_key")
