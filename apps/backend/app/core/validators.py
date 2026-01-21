"""
Input Validation Utilities

Comprehensive validators for API inputs to prevent injection attacks,
ensure data integrity, and provide clear error messages.
"""
import re
from typing import Optional, List, Tuple, Any
from pydantic import field_validator, model_validator, EmailStr
from datetime import datetime, time
import html


# ============================================================================
# Constants
# ============================================================================

# Password requirements
MIN_PASSWORD_LENGTH = 8
MAX_PASSWORD_LENGTH = 128

# Username requirements
MIN_USERNAME_LENGTH = 2
MAX_USERNAME_LENGTH = 50

# Text field limits
MAX_SHORT_TEXT = 100
MAX_MEDIUM_TEXT = 500
MAX_LONG_TEXT = 5000

# Common dangerous patterns
SQL_INJECTION_PATTERNS = [
    r"(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)",
    r"(--|\#|\/\*|\*\/)",
    r"(\b(OR|AND)\b\s+\d+\s*=\s*\d+)",
    r"(;|\bEXEC\b|\bEXECUTE\b)",
]

XSS_PATTERNS = [
    r"<script[^>]*>",
    r"javascript:",
    r"on\w+\s*=",
    r"<iframe[^>]*>",
    r"<object[^>]*>",
    r"<embed[^>]*>",
]

# Valid characters for different field types
USERNAME_PATTERN = r"^[a-zA-Z0-9_-]+$"
SLUG_PATTERN = r"^[a-z0-9-]+$"
APP_NAME_PATTERN = r"^[\w\s\-\.]+$"
TIME_PATTERN = r"^([01]?[0-9]|2[0-3]):[0-5][0-9]$"


# ============================================================================
# Validation Functions
# ============================================================================

def sanitize_string(value: str, max_length: int = MAX_MEDIUM_TEXT) -> str:
    """
    Sanitize a string by escaping HTML and limiting length.

    Args:
        value: Input string
        max_length: Maximum allowed length

    Returns:
        Sanitized string
    """
    if not value:
        return value

    # Trim whitespace
    value = value.strip()

    # Limit length
    if len(value) > max_length:
        value = value[:max_length]

    # Escape HTML entities
    value = html.escape(value)

    return value


def validate_email(email: str) -> Tuple[bool, str]:
    """
    Validate email format.

    Args:
        email: Email address to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not email:
        return False, "Email is required"

    email = email.strip().lower()

    # Length check
    if len(email) > 254:
        return False, "Email address is too long"

    # Basic format check
    email_pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    if not re.match(email_pattern, email):
        return False, "Invalid email format"

    # Check for common typos
    common_domains = ["gmail.com", "yahoo.com", "hotmail.com", "outlook.com"]
    domain = email.split("@")[1] if "@" in email else ""

    # Suggest corrections for typos
    typo_patterns = {
        r"gmal\.com$": "gmail.com",
        r"gmial\.com$": "gmail.com",
        r"gamil\.com$": "gmail.com",
        r"yaho\.com$": "yahoo.com",
        r"hotmal\.com$": "hotmail.com",
    }

    for pattern, suggestion in typo_patterns.items():
        if re.search(pattern, domain):
            return False, f"Did you mean @{suggestion}?"

    return True, ""


def validate_password(password: str, check_strength: bool = True) -> Tuple[bool, str]:
    """
    Validate password strength.

    Args:
        password: Password to validate
        check_strength: Whether to check password strength requirements

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not password:
        return False, "Password is required"

    if len(password) < MIN_PASSWORD_LENGTH:
        return False, f"Password must be at least {MIN_PASSWORD_LENGTH} characters"

    if len(password) > MAX_PASSWORD_LENGTH:
        return False, f"Password must be less than {MAX_PASSWORD_LENGTH} characters"

    if check_strength:
        errors = []

        if not re.search(r"[a-z]", password):
            errors.append("lowercase letter")

        if not re.search(r"[A-Z]", password):
            errors.append("uppercase letter")

        if not re.search(r"\d", password):
            errors.append("number")

        if not re.search(r"[!@#$%^&*(),.?\":{}|<>]", password):
            errors.append("special character")

        if errors:
            return False, f"Password must contain at least one: {', '.join(errors)}"

    # Check for common weak passwords
    weak_passwords = [
        "password", "123456", "12345678", "qwerty", "abc123",
        "password1", "password123", "admin", "letmein", "welcome"
    ]
    if password.lower() in weak_passwords:
        return False, "Password is too common. Please choose a stronger password."

    return True, ""


def validate_username(username: str) -> Tuple[bool, str]:
    """
    Validate username format.

    Args:
        username: Username to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not username:
        return False, "Username is required"

    username = username.strip()

    if len(username) < MIN_USERNAME_LENGTH:
        return False, f"Username must be at least {MIN_USERNAME_LENGTH} characters"

    if len(username) > MAX_USERNAME_LENGTH:
        return False, f"Username must be less than {MAX_USERNAME_LENGTH} characters"

    if not re.match(USERNAME_PATTERN, username):
        return False, "Username can only contain letters, numbers, underscores, and hyphens"

    # Check for reserved usernames
    reserved = ["admin", "root", "system", "api", "www", "mail", "support", "help"]
    if username.lower() in reserved:
        return False, "This username is reserved"

    return True, ""


def validate_url(url: str, allowed_schemes: List[str] = None) -> Tuple[bool, str]:
    """
    Validate URL format and safety.

    Args:
        url: URL to validate
        allowed_schemes: List of allowed URL schemes (default: http, https)

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not url:
        return True, ""  # URLs are often optional

    if allowed_schemes is None:
        allowed_schemes = ["http", "https"]

    url = url.strip()

    # Length check
    if len(url) > 2048:
        return False, "URL is too long"

    # Scheme check
    url_pattern = r"^(https?):\/\/[^\s/$.?#].[^\s]*$"
    if not re.match(url_pattern, url, re.IGNORECASE):
        return False, "Invalid URL format"

    scheme = url.split("://")[0].lower()
    if scheme not in allowed_schemes:
        return False, f"URL scheme must be one of: {', '.join(allowed_schemes)}"

    # Check for dangerous patterns
    dangerous_patterns = ["javascript:", "data:", "vbscript:"]
    for pattern in dangerous_patterns:
        if pattern in url.lower():
            return False, "URL contains potentially dangerous content"

    return True, ""


def validate_time_string(time_str: str) -> Tuple[bool, str]:
    """
    Validate time string in HH:MM format.

    Args:
        time_str: Time string to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not time_str:
        return False, "Time is required"

    if not re.match(TIME_PATTERN, time_str):
        return False, "Time must be in HH:MM format (e.g., 09:00)"

    return True, ""


def validate_list_items(
    items: List[str],
    max_items: int = 100,
    max_item_length: int = MAX_SHORT_TEXT,
    pattern: str = None
) -> Tuple[bool, str]:
    """
    Validate a list of string items.

    Args:
        items: List of items to validate
        max_items: Maximum number of items allowed
        max_item_length: Maximum length per item
        pattern: Optional regex pattern each item must match

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not items:
        return True, ""  # Empty lists are often valid

    if len(items) > max_items:
        return False, f"Maximum {max_items} items allowed"

    for i, item in enumerate(items):
        if not isinstance(item, str):
            return False, f"Item {i + 1} must be a string"

        if len(item) > max_item_length:
            return False, f"Item {i + 1} exceeds maximum length of {max_item_length}"

        if pattern and not re.match(pattern, item):
            return False, f"Item {i + 1} has invalid format"

    return True, ""


def check_sql_injection(value: str) -> Tuple[bool, str]:
    """
    Check for potential SQL injection patterns.

    Args:
        value: String to check

    Returns:
        Tuple of (is_safe, warning_message)
    """
    if not value:
        return True, ""

    for pattern in SQL_INJECTION_PATTERNS:
        if re.search(pattern, value, re.IGNORECASE):
            return False, "Input contains potentially dangerous SQL patterns"

    return True, ""


def check_xss(value: str) -> Tuple[bool, str]:
    """
    Check for potential XSS patterns.

    Args:
        value: String to check

    Returns:
        Tuple of (is_safe, warning_message)
    """
    if not value:
        return True, ""

    for pattern in XSS_PATTERNS:
        if re.search(pattern, value, re.IGNORECASE):
            return False, "Input contains potentially dangerous script content"

    return True, ""


def validate_date_range(
    start_date: datetime,
    end_date: datetime,
    max_range_days: int = 365
) -> Tuple[bool, str]:
    """
    Validate a date range.

    Args:
        start_date: Start of the range
        end_date: End of the range
        max_range_days: Maximum allowed range in days

    Returns:
        Tuple of (is_valid, error_message)
    """
    if end_date < start_date:
        return False, "End date must be after start date"

    range_days = (end_date - start_date).days
    if range_days > max_range_days:
        return False, f"Date range cannot exceed {max_range_days} days"

    return True, ""


def validate_positive_int(value: int, max_value: int = None, field_name: str = "Value") -> Tuple[bool, str]:
    """
    Validate a positive integer.

    Args:
        value: Integer to validate
        max_value: Optional maximum allowed value
        field_name: Name of the field for error messages

    Returns:
        Tuple of (is_valid, error_message)
    """
    if value < 0:
        return False, f"{field_name} must be positive"

    if max_value is not None and value > max_value:
        return False, f"{field_name} cannot exceed {max_value}"

    return True, ""


# ============================================================================
# Pydantic Validator Decorators
# ============================================================================

def email_validator(cls, v: str) -> str:
    """Pydantic validator for email fields."""
    is_valid, error = validate_email(v)
    if not is_valid:
        raise ValueError(error)
    return v.strip().lower()


def password_validator(cls, v: str) -> str:
    """Pydantic validator for password fields."""
    is_valid, error = validate_password(v)
    if not is_valid:
        raise ValueError(error)
    return v


def username_validator(cls, v: str) -> str:
    """Pydantic validator for username fields."""
    is_valid, error = validate_username(v)
    if not is_valid:
        raise ValueError(error)
    return v.strip()


def sanitize_validator(max_length: int = MAX_MEDIUM_TEXT):
    """Create a Pydantic validator that sanitizes string input."""
    def validator(cls, v: str) -> str:
        if v is None:
            return v
        return sanitize_string(v, max_length)
    return validator


def safe_string_validator(cls, v: str) -> str:
    """Pydantic validator that checks for SQL injection and XSS."""
    if v is None:
        return v

    is_safe, error = check_sql_injection(v)
    if not is_safe:
        raise ValueError(error)

    is_safe, error = check_xss(v)
    if not is_safe:
        raise ValueError(error)

    return v


def time_string_validator(cls, v: str) -> str:
    """Pydantic validator for time strings."""
    is_valid, error = validate_time_string(v)
    if not is_valid:
        raise ValueError(error)
    return v


def url_validator(cls, v: str) -> str:
    """Pydantic validator for URLs."""
    if v is None or v == "":
        return v
    is_valid, error = validate_url(v)
    if not is_valid:
        raise ValueError(error)
    return v


# ============================================================================
# API Key Validation (from settings.py, consolidated here)
# ============================================================================

OPENAI_KEY_PATTERNS = [
    r'^sk-[A-Za-z0-9]{32,}$',          # Legacy keys
    r'^sk-proj-[A-Za-z0-9_-]{32,}$',   # Project-scoped keys
    r'^sk-svcacct-[A-Za-z0-9_-]{32,}$' # Service account keys
]


def validate_openai_api_key(api_key: str) -> Tuple[bool, str]:
    """
    Validate OpenAI API key format.

    Args:
        api_key: The API key to validate

    Returns:
        Tuple of (is_valid, error_message)
    """
    if not api_key:
        return False, "API key is required"

    if len(api_key) < 20:
        return False, "API key is too short"

    if len(api_key) > 200:
        return False, "API key is too long"

    if not api_key.startswith("sk-"):
        return False, "Invalid API key format. Key must start with 'sk-'"

    for pattern in OPENAI_KEY_PATTERNS:
        if re.match(pattern, api_key):
            return True, ""

    # Allow unknown formats that start with sk- and are long enough
    if api_key.startswith("sk-") and len(api_key) >= 32:
        return True, ""

    return False, "Invalid API key format"
