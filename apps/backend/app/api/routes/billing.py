from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional

from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.user import User, PlanType
from app.services.stripe_service import stripe_service
from app.services.license_service import license_service
import stripe
import os

router = APIRouter()


class CheckoutRequest(BaseModel):
    plan: str  # personal, pro, team
    billing_cycle: str = "monthly"  # monthly, yearly


class DeviceActivation(BaseModel):
    device_id: str
    device_name: str


# Checkout
@router.post("/create-checkout-session")
async def create_checkout_session(
    request: CheckoutRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create Stripe Checkout session for subscription"""
    try:
        session = await stripe_service.create_checkout_session(
            user=current_user,
            plan=request.plan,
            billing_cycle=request.billing_cycle
        )
        return session
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/create-portal-session")
async def create_portal_session(
    current_user: User = Depends(get_current_user)
):
    """Create Stripe Customer Portal session"""
    try:
        session = await stripe_service.create_portal_session(current_user)
        return session
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


# Subscription Management
@router.get("/subscription")
async def get_subscription(
    current_user: User = Depends(get_current_user)
):
    """Get current subscription status"""
    if current_user.subscription_id:
        subscription = stripe_service.get_subscription_status(current_user.subscription_id)
        if subscription:
            return {
                "has_subscription": True,
                **subscription,
                "plan": current_user.plan.value,
            }

    return {
        "has_subscription": False,
        "plan": current_user.plan.value,
        "is_trial": current_user.is_trial_active,
        "trial_ends_at": current_user.trial_ends_at.isoformat() if current_user.trial_ends_at else None,
        "days_left": current_user.days_left_trial
    }


@router.post("/cancel")
async def cancel_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Cancel subscription at period end"""
    if not current_user.subscription_id:
        raise HTTPException(status_code=400, detail="No active subscription")

    success = await stripe_service.cancel_subscription(current_user.subscription_id)
    if success:
        current_user.subscription_status = "canceling"
        await db.commit()
        return {"message": "Subscription will be canceled at the end of the billing period"}

    raise HTTPException(status_code=400, detail="Failed to cancel subscription")


@router.post("/reactivate")
async def reactivate_subscription(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Reactivate canceled subscription"""
    if not current_user.subscription_id:
        raise HTTPException(status_code=400, detail="No subscription to reactivate")

    success = await stripe_service.reactivate_subscription(current_user.subscription_id)
    if success:
        current_user.subscription_status = "active"
        await db.commit()
        return {"message": "Subscription reactivated"}

    raise HTTPException(status_code=400, detail="Failed to reactivate subscription")


# License Validation
@router.post("/validate-license")
async def validate_license(
    device: Optional[DeviceActivation] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Validate license on app startup"""
    device_id = device.device_id if device else None
    result = await license_service.validate_license(db, current_user.id, device_id)
    return result


@router.post("/activate-device")
async def activate_device(
    device: DeviceActivation,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Activate a device for the user"""
    success = await license_service.activate_device(
        db, current_user.id, device.device_id, device.device_name
    )
    if success:
        return {"message": "Device activated", "device_name": device.device_name}
    raise HTTPException(status_code=400, detail="Failed to activate device")


@router.post("/deactivate-device")
async def deactivate_device(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Deactivate current device"""
    success = await license_service.deactivate_device(db, current_user.id)
    if success:
        return {"message": "Device deactivated"}
    raise HTTPException(status_code=400, detail="Failed to deactivate device")


# Stripe Webhook
@router.post("/webhook")
async def stripe_webhook(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    """Handle Stripe webhooks"""
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle events
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        await handle_checkout_completed(db, session)

    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        await handle_subscription_updated(db, subscription)

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        await handle_subscription_deleted(db, subscription)

    elif event["type"] == "invoice.payment_failed":
        invoice = event["data"]["object"]
        await handle_payment_failed(db, invoice)

    return {"received": True}


async def handle_checkout_completed(db: AsyncSession, session: dict):
    """Handle successful checkout"""
    user_id = int(session["metadata"]["user_id"])
    plan = session["metadata"]["plan"]
    subscription_id = session.get("subscription")

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user:
        user.subscription_id = subscription_id
        user.subscription_status = "active"
        user.plan = PlanType(plan)
        user.stripe_customer_id = session.get("customer")
        await db.commit()


async def handle_subscription_updated(db: AsyncSession, subscription: dict):
    """Handle subscription update"""
    user_id = int(subscription["metadata"].get("user_id", 0))
    if not user_id:
        return

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user:
        user.subscription_status = subscription["status"]
        if subscription["cancel_at_period_end"]:
            user.subscription_status = "canceling"
        await db.commit()


async def handle_subscription_deleted(db: AsyncSession, subscription: dict):
    """Handle subscription deletion"""
    user_id = int(subscription["metadata"].get("user_id", 0))
    if not user_id:
        return

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user:
        user.subscription_status = "canceled"
        user.plan = PlanType.FREE
        user.subscription_id = None
        await db.commit()


async def handle_payment_failed(db: AsyncSession, invoice: dict):
    """Handle failed payment"""
    customer_id = invoice.get("customer")

    result = await db.execute(select(User).where(User.stripe_customer_id == customer_id))
    user = result.scalar_one_or_none()

    if user:
        user.subscription_status = "past_due"
        await db.commit()
