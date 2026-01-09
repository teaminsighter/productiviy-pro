"""
Secure Storage Service
Stores API keys securely in system keychain using keyring.
"""

import keyring
from typing import Optional

SERVICE_NAME = "productify-pro"


def store_api_key(key_name: str, api_key: str) -> bool:
    """Store API key securely in system keychain"""
    try:
        keyring.set_password(SERVICE_NAME, key_name, api_key)
        return True
    except Exception as e:
        print(f"Failed to store key: {e}")
        return False


def get_api_key(key_name: str) -> Optional[str]:
    """Retrieve API key from system keychain"""
    try:
        return keyring.get_password(SERVICE_NAME, key_name)
    except Exception as e:
        print(f"Failed to get key: {e}")
        return None


def delete_api_key(key_name: str) -> bool:
    """Delete API key from system keychain"""
    try:
        keyring.delete_password(SERVICE_NAME, key_name)
        return True
    except Exception as e:
        print(f"Failed to delete key: {e}")
        return False


def has_api_key(key_name: str) -> bool:
    """Check if API key exists"""
    return get_api_key(key_name) is not None


# Convenience functions for OpenAI
def store_openai_key(api_key: str) -> bool:
    return store_api_key("openai_api_key", api_key)


def get_openai_key() -> Optional[str]:
    return get_api_key("openai_api_key")


def has_openai_key() -> bool:
    return has_api_key("openai_api_key")


def delete_openai_key() -> bool:
    return delete_api_key("openai_api_key")
