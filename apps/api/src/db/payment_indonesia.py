"""
Payment Indonesia Models - Manual Transfer/QRIS Payment System

Allows organizations to receive payments via bank transfer or QRIS with unique codes
for verification. No third-party payment gateway required (custom manual verification).
"""

from typing import Optional
from enum import Enum
from sqlmodel import Field, SQLModel, Column, Integer, ForeignKey
from sqlalchemy.dialects.postgresql import JSONB
import uuid
from datetime import datetime


class PaymentMethod(str, Enum):
    """Payment method enum"""
    TRANSFER = "transfer"  # Bank transfer
    QRIS = "qris"  # QRIS code


class TransactionStatus(str, Enum):
    """Transaction status enum"""
    PENDING = "pending"          # Waiting for payment verification
    VERIFIED = "verified"        # Admin verified, enrollment created
    EXPIRED = "expired"          # 24 hours passed without verification
    REJECTED = "rejected"        # Admin rejected the transaction


class OrgPaymentConfigBase(SQLModel):
    """Base model for organization payment configuration"""
    org_id: int = Field(foreign_key="organization.id", index=True)
    bank_name: Optional[str] = None           # "BCA", "Mandiri", "BNI", "CIMB", etc.
    account_number: Optional[str] = None      # Nomor rekening
    account_holder: Optional[str] = None      # Nama pemilik rekening
    qris_image_url: Optional[str] = None      # URL to QRIS image/code
    instruction_text: Optional[str] = None    # Custom instruction text (Markdown)
    is_active: bool = True


class OrgPaymentConfig(OrgPaymentConfigBase, table=True):
    """Organization payment configuration (stored in database)"""
    __tablename__ = "org_payment_config"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class OrgPaymentConfigRead(OrgPaymentConfigBase):
    """Read model for payment config"""
    id: int
    created_at: datetime
    updated_at: datetime


class OrgPaymentConfigCreate(OrgPaymentConfigBase):
    """Create model for payment config"""
    pass


class OrgPaymentConfigUpdate(SQLModel):
    """Update model for payment config"""
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    account_holder: Optional[str] = None
    qris_image_url: Optional[str] = None
    instruction_text: Optional[str] = None
    is_active: Optional[bool] = None


class ManualTransactionBase(SQLModel):
    """Base model for manual transaction"""
    transaction_id: str = Field(default_factory=lambda: str(uuid.uuid4()), index=True, unique=True)
    student_user_id: str = Field(index=True)
    course_id: str = Field(index=True)
    org_id: int = Field(foreign_key="organization.id", index=True)
    amount: int                           # Harga course dalam IDR (Rp)
    unique_code: int                      # 3 digit suffix (e.g. 123)
    final_amount: int                     # amount + unique_code (yang harus ditransfer)
    status: TransactionStatus = Field(default=TransactionStatus.PENDING)
    payment_method: PaymentMethod
    verified_by: Optional[str] = None     # Admin user_id yang verify
    verified_at: Optional[datetime] = None
    proof_image_url: Optional[str] = None # URL bukti pembayaran (jika ada)
    rejection_reason: Optional[str] = None
    expires_at: datetime


class ManualTransaction(ManualTransactionBase, table=True):
    """Manual transaction record (stored in database)"""
    __tablename__ = "manual_transaction"
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ManualTransactionRead(ManualTransactionBase):
    """Read model for transaction"""
    id: int
    created_at: datetime
    updated_at: datetime


class ManualTransactionCreate(SQLModel):
    """Create model for transaction - simplified"""
    student_user_id: str
    course_id: str
    amount: int
    payment_method: PaymentMethod


class ManualTransactionUpdate(SQLModel):
    """Update model for transaction - for admin verification"""
    status: Optional[TransactionStatus] = None
    verified_by: Optional[str] = None
    verified_at: Optional[datetime] = None
    proof_image_url: Optional[str] = None
    rejection_reason: Optional[str] = None
