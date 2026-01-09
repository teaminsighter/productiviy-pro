import stripe
import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User, PlanType

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")

PRICE_IDS = {
    "personal_monthly": os.getenv("STRIPE_PRICE_PERSONAL_MONTHLY", "price_xxx"),
    "personal_yearly": os.getenv("STRIPE_PRICE_PERSONAL_YEARLY", "price_xxx"),
    "pro_monthly": os.getenv("STRIPE_PRICE_PRO_MONTHLY", "price_xxx"),
    "pro_yearly": os.getenv("STRIPE_PRICE_PRO_YEARLY", "price_xxx"),
    "team_monthly": os.getenv("STRIPE_PRICE_TEAM_MONTHLY", "price_xxx"),
    "team_yearly": os.getenv("STRIPE_PRICE_TEAM_YEARLY", "price_xxx"),
}

class StripeService:
    @staticmethod
    async def create_customer(user: User) -> str:
        """Create Stripe customer for user"""
        customer = stripe.Customer.create(
            email=user.email,
            name=user.name,
            metadata={"user_id": str(user.id)}
        )
        return customer.id

    @staticmethod
    async def create_checkout_session(
        user: User,
        plan: str,
        billing_cycle: str = "monthly",
        success_url: str = None,
        cancel_url: str = None
    ) -> Dict[str, Any]:
        """Create Stripe Checkout session"""
        price_key = f"{plan}_{billing_cycle}"
        price_id = PRICE_IDS.get(price_key)

        if not price_id:
            raise ValueError(f"Invalid plan: {plan} {billing_cycle}")

        # Get or create customer
        if not user.stripe_customer_id:
            customer_id = await StripeService.create_customer(user)
        else:
            customer_id = user.stripe_customer_id

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": price_id,
                "quantity": 1,
            }],
            mode="subscription",
            success_url=success_url or "http://localhost:1420/settings/billing?success=true",
            cancel_url=cancel_url or "http://localhost:1420/settings/billing?canceled=true",
            metadata={
                "user_id": str(user.id),
                "plan": plan,
            },
            subscription_data={
                "trial_period_days": 7 if user.plan == PlanType.FREE else None,
                "metadata": {
                    "user_id": str(user.id),
                    "plan": plan,
                }
            }
        )

        return {
            "session_id": session.id,
            "url": session.url
        }

    @staticmethod
    async def create_portal_session(user: User, return_url: str = None) -> Dict[str, Any]:
        """Create Stripe Customer Portal session for subscription management"""
        if not user.stripe_customer_id:
            raise ValueError("User has no Stripe customer ID")

        session = stripe.billing_portal.Session.create(
            customer=user.stripe_customer_id,
            return_url=return_url or "http://localhost:1420/settings/billing"
        )

        return {
            "url": session.url
        }

    @staticmethod
    async def cancel_subscription(subscription_id: str) -> bool:
        """Cancel a subscription at period end"""
        try:
            stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=True
            )
            return True
        except Exception as e:
            print(f"Error canceling subscription: {e}")
            return False

    @staticmethod
    async def reactivate_subscription(subscription_id: str) -> bool:
        """Reactivate a canceled subscription"""
        try:
            stripe.Subscription.modify(
                subscription_id,
                cancel_at_period_end=False
            )
            return True
        except Exception as e:
            print(f"Error reactivating subscription: {e}")
            return False

    @staticmethod
    def get_subscription_status(subscription_id: str) -> Dict[str, Any]:
        """Get subscription details"""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return {
                "id": subscription.id,
                "status": subscription.status,
                "current_period_end": datetime.fromtimestamp(subscription.current_period_end),
                "cancel_at_period_end": subscription.cancel_at_period_end,
                "plan": subscription.metadata.get("plan", "unknown"),
            }
        except Exception as e:
            print(f"Error getting subscription: {e}")
            return None


stripe_service = StripeService()
