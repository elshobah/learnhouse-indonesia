"""
Payment Indonesia Service - Manual Transfer/QRIS Payment System

Handles:
- Generation of unique 3-digit codes for transaction verification
- Transaction creation and management
- Admin verification of transactions
- Expiration of old transactions
"""

import random
from datetime import datetime, timedelta
from typing import Optional
from sqlmodel import Session, select
from fastapi import HTTPException, status

from src.db.payment_indonesia import (
    OrgPaymentConfig,
    ManualTransaction,
    ManualTransactionCreate,
    ManualTransactionRead,
    TransactionStatus,
    PaymentMethod,
)
from src.db.organizations import Organization
from src.db.courses.courses import Course


def generate_unique_code(db_session: Session, org_id: int, date_str: str) -> int:
    """
    Generate a unique 3-digit code for a transaction.

    The code is unique per org per day to avoid collision with other transactions.
    Returns a random integer between 100-999 (always 3 digits).

    Args:
        db_session: Database session
        org_id: Organization ID
        date_str: Date string (YYYY-MM-DD) to check collision for that day

    Returns:
        A unique 3-digit integer (100-999)
    """
    while True:
        code = random.randint(100, 999)

        # Check if this code is already used today for this org
        existing = db_session.exec(
            select(ManualTransaction).where(
                ManualTransaction.org_id == org_id,
                ManualTransaction.unique_code == code,
                ManualTransaction.status != TransactionStatus.REJECTED,  # Ignore rejected transactions
            )
        ).first()

        if not existing:
            return code


async def create_transaction(
    db_session: Session,
    org_id: int,
    student_user_id: str,
    course_id: str,
    course_price: int,
    payment_method: PaymentMethod,
) -> ManualTransactionRead:
    """
    Create a new payment transaction.

    Args:
        db_session: Database session
        org_id: Organization ID
        student_user_id: Student user ID
        course_id: Course ID
        course_price: Course price in IDR (Rp)
        payment_method: Payment method (TRANSFER or QRIS)

    Returns:
        Created transaction as ManualTransactionRead

    Raises:
        HTTPException: If organization or course not found, or org doesn't have payment config
    """
    # Verify org exists
    org = db_session.exec(
        select(Organization).where(Organization.id == org_id)
    ).first()

    if not org:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Organization with id {org_id} not found"
        )

    # Verify payment config exists for this org
    payment_config = db_session.exec(
        select(OrgPaymentConfig).where(
            OrgPaymentConfig.org_id == org_id,
            OrgPaymentConfig.is_active == True
        )
    ).first()

    if not payment_config:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization does not have active payment configuration"
        )

    # Generate unique code
    today = datetime.utcnow().strftime("%Y-%m-%d")
    unique_code = generate_unique_code(db_session, org_id, today)
    final_amount = course_price + unique_code

    # Create transaction
    now = datetime.utcnow()
    expires_at = now + timedelta(hours=24)

    transaction = ManualTransaction(
        student_user_id=student_user_id,
        course_id=course_id,
        org_id=org_id,
        amount=course_price,
        unique_code=unique_code,
        final_amount=final_amount,
        status=TransactionStatus.PENDING,
        payment_method=payment_method,
        expires_at=expires_at,
        created_at=now,
        updated_at=now,
    )

    db_session.add(transaction)
    db_session.commit()
    db_session.refresh(transaction)

    return ManualTransactionRead.from_orm(transaction)


async def get_transaction(
    db_session: Session,
    transaction_id: str,
    org_id: int,
) -> ManualTransactionRead:
    """
    Get a transaction by ID, scoped to organization.

    Args:
        db_session: Database session
        transaction_id: Transaction ID
        org_id: Organization ID (for security)

    Returns:
        Transaction as ManualTransactionRead

    Raises:
        HTTPException: If transaction not found
    """
    transaction = db_session.exec(
        select(ManualTransaction).where(
            ManualTransaction.transaction_id == transaction_id,
            ManualTransaction.org_id == org_id,
        )
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    return ManualTransactionRead.from_orm(transaction)


async def list_pending_transactions(
    db_session: Session,
    org_id: int,
    limit: int = 50,
    offset: int = 0,
) -> tuple[list[ManualTransactionRead], int]:
    """
    List pending transactions for an organization (admin view).

    Args:
        db_session: Database session
        org_id: Organization ID
        limit: Pagination limit
        offset: Pagination offset

    Returns:
        Tuple of (transactions list, total count)
    """
    # Get total count
    total = db_session.exec(
        select(ManualTransaction).where(
            ManualTransaction.org_id == org_id,
            ManualTransaction.status == TransactionStatus.PENDING,
        ).with_entities(ManualTransaction.id)
    ).all().__len__()

    # Get paginated results
    transactions = db_session.exec(
        select(ManualTransaction)
        .where(
            ManualTransaction.org_id == org_id,
            ManualTransaction.status == TransactionStatus.PENDING,
        )
        .order_by(ManualTransaction.created_at.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    return [ManualTransactionRead.from_orm(tx) for tx in transactions], total


async def verify_transaction(
    db_session: Session,
    transaction_id: str,
    org_id: int,
    admin_user_id: str,
    proof_image_url: Optional[str] = None,
) -> ManualTransactionRead:
    """
    Admin verifies a transaction and marks it as verified.

    This is where you would trigger enrollment creation.

    Args:
        db_session: Database session
        transaction_id: Transaction ID
        org_id: Organization ID
        admin_user_id: Admin user ID doing the verification
        proof_image_url: Optional proof image URL

    Returns:
        Updated transaction as ManualTransactionRead

    Raises:
        HTTPException: If transaction not found or already processed
    """
    transaction = db_session.exec(
        select(ManualTransaction).where(
            ManualTransaction.transaction_id == transaction_id,
            ManualTransaction.org_id == org_id,
        )
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    if transaction.status != TransactionStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot verify transaction with status '{transaction.status}'"
        )

    # Update transaction
    now = datetime.utcnow()
    transaction.status = TransactionStatus.VERIFIED
    transaction.verified_by = admin_user_id
    transaction.verified_at = now
    if proof_image_url:
        transaction.proof_image_url = proof_image_url
    transaction.updated_at = now

    db_session.add(transaction)
    db_session.commit()
    db_session.refresh(transaction)

    # TODO: Create enrollment here
    # await create_enrollment(db_session, org_id, transaction.student_user_id, transaction.course_id)

    return ManualTransactionRead.from_orm(transaction)


async def reject_transaction(
    db_session: Session,
    transaction_id: str,
    org_id: int,
    admin_user_id: str,
    reason: str,
) -> ManualTransactionRead:
    """
    Admin rejects a transaction.

    Args:
        db_session: Database session
        transaction_id: Transaction ID
        org_id: Organization ID
        admin_user_id: Admin user ID doing the rejection
        reason: Rejection reason

    Returns:
        Updated transaction as ManualTransactionRead

    Raises:
        HTTPException: If transaction not found or already processed
    """
    transaction = db_session.exec(
        select(ManualTransaction).where(
            ManualTransaction.transaction_id == transaction_id,
            ManualTransaction.org_id == org_id,
        )
    ).first()

    if not transaction:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Transaction not found"
        )

    if transaction.status != TransactionStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Cannot reject transaction with status '{transaction.status}'"
        )

    # Update transaction
    now = datetime.utcnow()
    transaction.status = TransactionStatus.REJECTED
    transaction.verified_by = admin_user_id
    transaction.verified_at = now
    transaction.rejection_reason = reason
    transaction.updated_at = now

    db_session.add(transaction)
    db_session.commit()
    db_session.refresh(transaction)

    return ManualTransactionRead.from_orm(transaction)


async def expire_old_transactions(db_session: Session) -> int:
    """
    Background task: Mark pending transactions older than 24 hours as EXPIRED.

    This should be called periodically (e.g., every hour via a background task/cron).

    Args:
        db_session: Database session

    Returns:
        Number of transactions expired
    """
    now = datetime.utcnow()

    # Find all pending transactions that have expired
    expired_transactions = db_session.exec(
        select(ManualTransaction).where(
            ManualTransaction.status == TransactionStatus.PENDING,
            ManualTransaction.expires_at <= now,
        )
    ).all()

    count = 0
    for transaction in expired_transactions:
        transaction.status = TransactionStatus.EXPIRED
        transaction.updated_at = now
        db_session.add(transaction)
        count += 1

    db_session.commit()

    return count
