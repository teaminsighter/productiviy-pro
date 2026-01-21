"""
Google OAuth Service
Handles Google authentication flow and user verification
"""

from typing import Optional
import httpx
from pydantic import BaseModel
from app.core.config import settings


class GoogleUserInfo(BaseModel):
    """Google user profile data"""
    id: str
    email: str
    name: Optional[str] = None
    picture: Optional[str] = None
    verified_email: bool = False


class GoogleOAuthService:
    """Service for Google OAuth authentication"""

    def __init__(self):
        self.client_id = settings.google_client_id
        self.client_secret = settings.google_client_secret
        self.token_url = "https://oauth2.googleapis.com/token"
        self.userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        self.enabled = bool(self.client_id and self.client_secret)

    async def verify_id_token(self, id_token: str) -> Optional[GoogleUserInfo]:
        """
        Verify a Google ID token and return user info.
        Used when frontend does the OAuth flow and sends back the token.
        """
        if not self.enabled:
            print("[GOOGLE-AUTH] Google OAuth not configured")
            return None

        try:
            # Verify token with Google
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"https://oauth2.googleapis.com/tokeninfo?id_token={id_token}"
                )

                if response.status_code != 200:
                    print(f"[GOOGLE-AUTH] Token verification failed: {response.text}")
                    return None

                data = response.json()

                # Verify the token is for our app
                if data.get("aud") != self.client_id:
                    print(f"[GOOGLE-AUTH] Token audience mismatch")
                    return None

                return GoogleUserInfo(
                    id=data.get("sub"),
                    email=data.get("email"),
                    name=data.get("name"),
                    picture=data.get("picture"),
                    verified_email=data.get("email_verified", "false").lower() == "true"
                )

        except Exception as e:
            print(f"[GOOGLE-AUTH] Error verifying token: {e}")
            return None

    async def exchange_code_for_tokens(self, code: str, redirect_uri: str) -> Optional[dict]:
        """
        Exchange authorization code for tokens.
        Used for server-side OAuth flow.
        """
        if not self.enabled:
            return None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.post(
                    self.token_url,
                    data={
                        "code": code,
                        "client_id": self.client_id,
                        "client_secret": self.client_secret,
                        "redirect_uri": redirect_uri,
                        "grant_type": "authorization_code"
                    }
                )

                if response.status_code != 200:
                    print(f"[GOOGLE-AUTH] Token exchange failed: {response.text}")
                    return None

                return response.json()

        except Exception as e:
            print(f"[GOOGLE-AUTH] Error exchanging code: {e}")
            return None

    async def get_user_info(self, access_token: str) -> Optional[GoogleUserInfo]:
        """Get user info using an access token"""
        if not self.enabled:
            return None

        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    self.userinfo_url,
                    headers={"Authorization": f"Bearer {access_token}"}
                )

                if response.status_code != 200:
                    print(f"[GOOGLE-AUTH] User info request failed: {response.text}")
                    return None

                data = response.json()

                return GoogleUserInfo(
                    id=data.get("id"),
                    email=data.get("email"),
                    name=data.get("name"),
                    picture=data.get("picture"),
                    verified_email=data.get("verified_email", False)
                )

        except Exception as e:
            print(f"[GOOGLE-AUTH] Error getting user info: {e}")
            return None


# Singleton instance
google_oauth_service = GoogleOAuthService()
