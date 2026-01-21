"""
Encryption Module for Productify Pro

Provides encryption/decryption for sensitive data using Fernet (AES-128-CBC).
"""
import base64
import secrets
from typing import Optional
from cryptography.fernet import Fernet, InvalidToken
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

from app.core.config import settings


def _get_encryption_key() -> bytes:
    """
    Get or generate the encryption key.

    If ENCRYPTION_KEY is set in config, derive a key from it.
    Otherwise, generate a warning and use a default (not recommended for production).
    """
    if settings.encryption_key:
        # Derive a proper Fernet key from the configured key
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=b"productify-pro-salt",  # Static salt is OK since key is unique
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(settings.encryption_key.encode()))
        return key
    else:
        # Development fallback - NOT SECURE FOR PRODUCTION
        print("⚠️ WARNING: No ENCRYPTION_KEY set. Using development key. Set ENCRYPTION_KEY in .env for production!")
        # Use a deterministic key for development so data persists across restarts
        dev_key = base64.urlsafe_b64encode(b"development-key-32bytes!")
        return dev_key


# Initialize Fernet cipher
_fernet: Optional[Fernet] = None


def _get_fernet() -> Fernet:
    """Get or initialize Fernet cipher"""
    global _fernet
    if _fernet is None:
        _fernet = Fernet(_get_encryption_key())
    return _fernet


def encrypt_value(plaintext: str) -> str:
    """
    Encrypt a string value.

    Args:
        plaintext: The value to encrypt

    Returns:
        Base64-encoded encrypted value
    """
    if not plaintext:
        return ""

    fernet = _get_fernet()
    encrypted = fernet.encrypt(plaintext.encode())
    return encrypted.decode()


def decrypt_value(ciphertext: str) -> Optional[str]:
    """
    Decrypt an encrypted string value.

    Args:
        ciphertext: Base64-encoded encrypted value

    Returns:
        Decrypted string or None if decryption fails
    """
    if not ciphertext:
        return None

    try:
        fernet = _get_fernet()
        decrypted = fernet.decrypt(ciphertext.encode())
        return decrypted.decode()
    except InvalidToken:
        print("⚠️ Failed to decrypt value - invalid token or wrong key")
        return None
    except Exception as e:
        print(f"⚠️ Decryption error: {e}")
        return None


def generate_encryption_key() -> str:
    """
    Generate a new random encryption key.

    Returns:
        A URL-safe base64-encoded 32-byte key
    """
    return secrets.token_urlsafe(32)


def mask_sensitive_value(value: str, show_chars: int = 4) -> str:
    """
    Mask a sensitive value for display.

    Args:
        value: The value to mask
        show_chars: Number of characters to show at the end

    Returns:
        Masked string like "****...abcd"
    """
    if not value:
        return ""

    if len(value) <= show_chars:
        return "*" * len(value)

    return f"****...{value[-show_chars:]}"
