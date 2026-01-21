"""
Email Service using Resend
Handles all transactional emails: welcome, password reset, team invites, etc.
"""

from typing import Optional
from app.core.config import settings

# Try to import resend, but don't fail if not installed
try:
    import resend
    RESEND_AVAILABLE = True
except ImportError:
    RESEND_AVAILABLE = False
    resend = None


class EmailService:
    """Email service using Resend"""

    def __init__(self):
        self.from_email = settings.from_email or "noreply@productifypro.com"
        self.app_name = "Productify Pro"
        self.frontend_url = settings.frontend_url or "http://localhost:1420"

        if RESEND_AVAILABLE and settings.resend_api_key:
            resend.api_key = settings.resend_api_key
            self.enabled = True
        else:
            self.enabled = False

    async def send_email(
        self,
        to: str,
        subject: str,
        html: str,
        text: Optional[str] = None
    ) -> bool:
        """Send an email"""
        if not self.enabled:
            print(f"[EMAIL-DEV] Would send to {to}: {subject}")
            print(f"[EMAIL-DEV] Content preview: {html[:200]}...")
            return True

        try:
            resend.Emails.send({
                "from": f"{self.app_name} <{self.from_email}>",
                "to": to,
                "subject": subject,
                "html": html,
                "text": text or ""
            })
            print(f"[EMAIL] Sent to {to}: {subject}")
            return True
        except Exception as e:
            print(f"[EMAIL] Failed to send to {to}: {e}")
            return False

    async def send_welcome_email(self, to: str, name: str) -> bool:
        """Send welcome email to new user"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f0f0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #2a2a4a;">
                    <h1 style="color: #8B5CF6; margin: 0 0 20px 0; font-size: 28px;">Welcome to Productify Pro!</h1>
                    <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Hi {name or 'there'},
                    </p>
                    <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Thanks for signing up! We're excited to help you boost your productivity and understand how you spend your time.
                    </p>
                    <p style="color: #a0a0a0; font-size: 14px; margin: 0 0 10px 0;">Here's what you can do next:</p>
                    <ul style="color: #e0e0e0; font-size: 14px; line-height: 1.8; margin: 0 0 30px 0; padding-left: 20px;">
                        <li>Download the desktop app</li>
                        <li>Set up your productivity goals</li>
                        <li>Start tracking your work</li>
                        <li>Get AI-powered insights</li>
                    </ul>
                    <a href="{self.frontend_url}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                        Open Productify Pro
                    </a>
                    <p style="color: #888; font-size: 13px; margin: 30px 0 0 0;">
                        If you have any questions, just reply to this email.<br>
                        Happy tracking!<br>
                        <strong style="color: #a0a0a0;">The Productify Pro Team</strong>
                    </p>
                </div>
                <p style="color: #555; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
                    © 2024 Productify Pro. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """
        return await self.send_email(to, "Welcome to Productify Pro! 🚀", html)

    async def send_password_reset(self, to: str, reset_token: str) -> bool:
        """Send password reset email"""
        reset_url = f"{self.frontend_url}/reset-password?token={reset_token}"
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f0f0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #2a2a4a;">
                    <h1 style="color: #8B5CF6; margin: 0 0 20px 0; font-size: 28px;">Reset Your Password</h1>
                    <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        You requested a password reset for your Productify Pro account.
                    </p>
                    <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Click the button below to create a new password:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{reset_url}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                            Reset Password
                        </a>
                    </div>
                    <p style="color: #888; font-size: 13px; margin: 20px 0 0 0;">
                        This link expires in <strong>1 hour</strong>.
                    </p>
                    <p style="color: #666; font-size: 12px; margin: 20px 0 0 0;">
                        If you didn't request this password reset, you can safely ignore this email.
                    </p>
                </div>
                <p style="color: #555; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
                    © 2024 Productify Pro. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """
        return await self.send_email(to, "Reset Your Password - Productify Pro", html)

    async def send_team_invite(
        self,
        to: str,
        team_name: str,
        inviter_name: str,
        invite_token: str,
        role: str = "member"
    ) -> bool:
        """Send team invitation email"""
        invite_url = f"{self.frontend_url}/invite/{invite_token}"
        role_display = role.capitalize()
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f0f0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #2a2a4a;">
                    <h1 style="color: #8B5CF6; margin: 0 0 20px 0; font-size: 28px;">You're Invited! 🎉</h1>
                    <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        <strong>{inviter_name}</strong> has invited you to join <strong style="color: #8B5CF6;">{team_name}</strong> on Productify Pro as a <strong>{role_display}</strong>.
                    </p>
                    <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 0 0 30px 0;">
                        Join your team to track productivity together and gain insights into how your team works.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{invite_url}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                            Join Team
                        </a>
                    </div>
                    <p style="color: #666; font-size: 12px; margin: 20px 0 0 0;">
                        This invitation expires in <strong>7 days</strong>.
                    </p>
                </div>
                <p style="color: #555; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
                    © 2024 Productify Pro. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """
        return await self.send_email(to, f"Join {team_name} on Productify Pro", html)

    async def send_weekly_report(self, to: str, name: str, stats: dict) -> bool:
        """Send weekly productivity report"""
        total_hours = stats.get('total_hours', 0)
        productive_hours = stats.get('productive_hours', 0)
        productivity_score = stats.get('productivity_score', 0)
        top_app = stats.get('top_app', 'N/A')
        goals_completed = stats.get('goals_completed', 0)

        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f0f0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #2a2a4a;">
                    <h1 style="color: #8B5CF6; margin: 0 0 20px 0; font-size: 28px;">Your Weekly Report 📊</h1>
                    <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Hi {name or 'there'}, here's your productivity summary for this week:
                    </p>

                    <div style="background: #0d0d1a; border-radius: 12px; padding: 24px; margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
                            <div style="text-align: center; flex: 1;">
                                <p style="color: #888; font-size: 12px; margin: 0 0 4px 0;">Total Time</p>
                                <p style="color: #8B5CF6; font-size: 24px; font-weight: bold; margin: 0;">{total_hours}h</p>
                            </div>
                            <div style="text-align: center; flex: 1;">
                                <p style="color: #888; font-size: 12px; margin: 0 0 4px 0;">Productive</p>
                                <p style="color: #10B981; font-size: 24px; font-weight: bold; margin: 0;">{productive_hours}h</p>
                            </div>
                            <div style="text-align: center; flex: 1;">
                                <p style="color: #888; font-size: 12px; margin: 0 0 4px 0;">Score</p>
                                <p style="color: #F59E0B; font-size: 24px; font-weight: bold; margin: 0;">{productivity_score}%</p>
                            </div>
                        </div>
                        <div style="border-top: 1px solid #2a2a4a; padding-top: 16px; margin-top: 8px;">
                            <p style="color: #888; font-size: 12px; margin: 0 0 4px 0;">Top App</p>
                            <p style="color: #e0e0e0; font-size: 16px; margin: 0;">{top_app}</p>
                        </div>
                        <div style="border-top: 1px solid #2a2a4a; padding-top: 16px; margin-top: 16px;">
                            <p style="color: #888; font-size: 12px; margin: 0 0 4px 0;">Goals Completed</p>
                            <p style="color: #10B981; font-size: 16px; margin: 0;">{goals_completed} goals</p>
                        </div>
                    </div>

                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{self.frontend_url}/analytics" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                            View Full Report
                        </a>
                    </div>
                </div>
                <p style="color: #555; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
                    © 2024 Productify Pro. All rights reserved.<br>
                    <a href="{self.frontend_url}/settings" style="color: #555;">Unsubscribe from weekly reports</a>
                </p>
            </div>
        </body>
        </html>
        """
        return await self.send_email(to, "Your Weekly Productivity Report 📊", html)

    async def send_account_deleted_confirmation(self, to: str) -> bool:
        """Send confirmation that account has been deleted (GDPR compliance)"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f0f0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #2a2a4a;">
                    <h1 style="color: #8B5CF6; margin: 0 0 20px 0; font-size: 28px;">Account Deleted</h1>
                    <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Your Productify Pro account has been permanently deleted as requested.
                    </p>
                    <p style="color: #a0a0a0; font-size: 14px; line-height: 1.6; margin: 0 0 20px 0;">
                        The following data has been removed:
                    </p>
                    <ul style="color: #e0e0e0; font-size: 14px; line-height: 1.8; margin: 0 0 20px 0; padding-left: 20px;">
                        <li>Your profile and account information</li>
                        <li>All activity tracking data</li>
                        <li>All screenshots and media</li>
                        <li>Goals, streaks, and achievements</li>
                        <li>Settings and preferences</li>
                        <li>Team memberships</li>
                    </ul>
                    <p style="color: #888; font-size: 13px; margin: 20px 0 0 0;">
                        This action is irreversible. If you wish to use Productify Pro again in the future, you'll need to create a new account.
                    </p>
                    <p style="color: #888; font-size: 13px; margin: 20px 0 0 0;">
                        Thank you for using Productify Pro. We're sorry to see you go!
                    </p>
                </div>
                <p style="color: #555; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
                    © 2024 Productify Pro. All rights reserved.<br>
                    <span style="color: #666;">This is a confirmation email. No further action is required.</span>
                </p>
            </div>
        </body>
        </html>
        """
        return await self.send_email(to, "Your Productify Pro Account Has Been Deleted", html)

    async def send_data_export_ready(self, to: str, name: str, download_url: str) -> bool:
        """Send notification that data export is ready for download"""
        html = f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #0f0f0f; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                <div style="background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 16px; padding: 40px; border: 1px solid #2a2a4a;">
                    <h1 style="color: #8B5CF6; margin: 0 0 20px 0; font-size: 28px;">Your Data Export is Ready 📦</h1>
                    <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Hi {name or 'there'},
                    </p>
                    <p style="color: #e0e0e0; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Your data export request has been processed and is ready for download.
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="{download_url}" style="display: inline-block; background: linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 14px;">
                            Download Your Data
                        </a>
                    </div>
                    <p style="color: #888; font-size: 13px; margin: 20px 0 0 0;">
                        This download link expires in <strong>24 hours</strong> for security reasons.
                    </p>
                    <p style="color: #666; font-size: 12px; margin: 20px 0 0 0;">
                        If you didn't request this export, please contact our support team immediately.
                    </p>
                </div>
                <p style="color: #555; font-size: 12px; text-align: center; margin: 20px 0 0 0;">
                    © 2024 Productify Pro. All rights reserved.
                </p>
            </div>
        </body>
        </html>
        """
        return await self.send_email(to, "Your Data Export is Ready - Productify Pro", html)


# Singleton instance
email_service = EmailService()
