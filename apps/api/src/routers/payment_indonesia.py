"""
Payment Indonesia Router - Manual Transfer/QRIS Payment Endpoints

Endpoints for:
- Creating payment transactions (student)
- Getting transaction status (student)
- Verifying/rejecting transactions (admin)
- Setting up payment configuration (admin)
"""

from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlmodel import Session

from src.db.payment_indonesia import (
    OrgPaymentConfig,
    OrgPaymentConfigCreate,
    OrgPaymentConfigRead,
    OrgPaymentConfigUpdate,
    ManualTransactionRead,
    PaymentMethod,
)
from src.core.database import get_session
from src.services import payment_indonesia as payment_service


router = APIRouter(prefix="/payment-id", tags=["payment-indonesia"])


# ============================================================================
# Student Endpoints
# ============================================================================

@router.post("/create", response_model=ManualTransactionRead)
async def create_transaction(
    org_id: int = Query(..., description="Organization ID"),
    student_user_id: str = Query(..., description="Student User ID"),
    course_id: str = Query(..., description="Course ID"),
    course_price: int = Query(..., description="Course price in IDR"),
    payment_method: PaymentMethod = Query(..., description="Payment method: transfer or qris"),
    db_session: Session = Depends(get_session),
):
    """
    Create a new payment transaction.

    Student initiates payment by providing course details. System generates unique code.
    Returns transaction details with final amount to transfer.
    """
    return await payment_service.create_transaction(
        db_session=db_session,
        org_id=org_id,
        student_user_id=student_user_id,
        course_id=course_id,
        course_price=course_price,
        payment_method=payment_method,
    )


@router.get("/{transaction_id}", response_model=ManualTransactionRead)
async def get_transaction_status(
    transaction_id: str,
    org_id: int = Query(..., description="Organization ID"),
    db_session: Session = Depends(get_session),
):
    """
    Get the status of a payment transaction.

    Student polls this endpoint to check if admin has verified the payment.
    """
    return await payment_service.get_transaction(
        db_session=db_session,
        transaction_id=transaction_id,
        org_id=org_id,
    )


# ============================================================================
# Admin Endpoints
# ============================================================================

@router.get("/pending", response_model=dict)
async def list_pending_transactions(
    org_id: int = Query(..., description="Organization ID"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db_session: Session = Depends(get_session),
):
    """
    List all pending payment transactions for an organization.

    Admin dashboard uses this to see transactions awaiting verification.
    """
    transactions, total = await payment_service.list_pending_transactions(
        db_session=db_session,
        org_id=org_id,
        limit=limit,
        offset=offset,
    )

    return {
        "transactions": transactions,
        "total": total,
        "limit": limit,
        "offset": offset,
    }


@router.post("/{transaction_id}/verify", response_model=ManualTransactionRead)
async def verify_transaction(
    transaction_id: str,
    org_id: int = Query(..., description="Organization ID"),
    admin_user_id: str = Query(..., description="Admin User ID"),
    proof_image_url: Optional[str] = Query(None, description="Optional proof image URL"),
    db_session: Session = Depends(get_session),
):
    """
    Admin verifies a payment transaction.

    Marks transaction as VERIFIED and triggers enrollment creation.
    """
    return await payment_service.verify_transaction(
        db_session=db_session,
        transaction_id=transaction_id,
        org_id=org_id,
        admin_user_id=admin_user_id,
        proof_image_url=proof_image_url,
    )


@router.post("/{transaction_id}/reject", response_model=ManualTransactionRead)
async def reject_transaction(
    transaction_id: str,
    org_id: int = Query(..., description="Organization ID"),
    admin_user_id: str = Query(..., description="Admin User ID"),
    reason: str = Query(..., description="Rejection reason"),
    db_session: Session = Depends(get_session),
):
    """
    Admin rejects a payment transaction.

    Marks transaction as REJECTED with reason. Student can create new transaction.
    """
    return await payment_service.reject_transaction(
        db_session=db_session,
        transaction_id=transaction_id,
        org_id=org_id,
        admin_user_id=admin_user_id,
        reason=reason,
    )


# ============================================================================
# Configuration Endpoints (Admin)
# ============================================================================

@router.get("/config", response_model=Optional[OrgPaymentConfigRead])
async def get_payment_config(
    org_id: int = Query(..., description="Organization ID"),
    db_session: Session = Depends(get_session),
):
    """
    Get payment configuration for an organization.

    Admin views bank/QRIS account details.
    """
    from sqlmodel import select

    config = db_session.exec(
        select(OrgPaymentConfig).where(OrgPaymentConfig.org_id == org_id)
    ).first()

    if not config:
        return None

    return OrgPaymentConfigRead.from_orm(config)


@router.put("/config", response_model=OrgPaymentConfigRead)
async def update_payment_config(
    org_id: int = Query(..., description="Organization ID"),
    config_data: OrgPaymentConfigUpdate = ...,
    db_session: Session = Depends(get_session),
):
    """
    Update or create payment configuration for an organization.

    Admin sets up bank account and QRIS details.
    """
    from sqlmodel import select
    from datetime import datetime

    # Try to find existing config
    existing_config = db_session.exec(
        select(OrgPaymentConfig).where(OrgPaymentConfig.org_id == org_id)
    ).first()

    if existing_config:
        # Update existing
        update_data = config_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if value is not None:
                setattr(existing_config, field, value)
        existing_config.updated_at = datetime.utcnow()
        db_session.add(existing_config)
    else:
        # Create new
        config = OrgPaymentConfig(
            org_id=org_id,
            bank_name=config_data.bank_name,
            account_number=config_data.account_number,
            account_holder=config_data.account_holder,
            qris_image_url=config_data.qris_image_url,
            instruction_text=config_data.instruction_text,
            is_active=config_data.is_active if config_data.is_active is not None else True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow(),
        )
        db_session.add(config)

    db_session.commit()
    db_session.refresh(existing_config or config)

    return OrgPaymentConfigRead.from_orm(existing_config or config)
