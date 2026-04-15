"""Add payment indonesia (manual transfer/QRIS payment system)

Revision ID: z5a6b7c8d9e0
Revises: y4z5a6b7c8d9
Create Date: 2026-04-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = 'z5a6b7c8d9e0'
down_revision: Union[str, None] = 'y4z5a6b7c8d9'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Create org_payment_config table
    op.create_table(
        'org_payment_config',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organization.id', ondelete='CASCADE'), nullable=False),
        sa.Column('bank_name', sa.String(), nullable=True),
        sa.Column('account_number', sa.String(), nullable=True),
        sa.Column('account_holder', sa.String(), nullable=True),
        sa.Column('qris_image_url', sa.String(), nullable=True),
        sa.Column('instruction_text', sa.String(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # Create indexes for org_payment_config
    op.create_index('ix_org_payment_config_org_id', 'org_payment_config', ['org_id'])

    # Create manual_transaction table
    op.create_table(
        'manual_transaction',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('transaction_id', sa.String(), nullable=False, unique=True),
        sa.Column('student_user_id', sa.String(), nullable=False),
        sa.Column('course_id', sa.String(), nullable=False),
        sa.Column('org_id', sa.Integer(), sa.ForeignKey('organization.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Integer(), nullable=False),  # Harga dalam IDR
        sa.Column('unique_code', sa.Integer(), nullable=False),  # 3 digit suffix
        sa.Column('final_amount', sa.Integer(), nullable=False),  # amount + unique_code
        sa.Column('status', sa.String(), nullable=False, server_default='pending'),  # pending, verified, expired, rejected
        sa.Column('payment_method', sa.String(), nullable=False),  # transfer, qris
        sa.Column('verified_by', sa.String(), nullable=True),
        sa.Column('verified_at', sa.DateTime(), nullable=True),
        sa.Column('proof_image_url', sa.String(), nullable=True),
        sa.Column('rejection_reason', sa.String(), nullable=True),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # Create indexes for manual_transaction
    op.create_index('ix_manual_transaction_transaction_id', 'manual_transaction', ['transaction_id'])
    op.create_index('ix_manual_transaction_student_user_id', 'manual_transaction', ['student_user_id'])
    op.create_index('ix_manual_transaction_course_id', 'manual_transaction', ['course_id'])
    op.create_index('ix_manual_transaction_org_id', 'manual_transaction', ['org_id'])
    op.create_index('ix_manual_transaction_status', 'manual_transaction', ['status'])
    op.create_index('ix_manual_transaction_expires_at', 'manual_transaction', ['expires_at'])


def downgrade() -> None:
    # Drop manual_transaction indexes and table
    op.drop_index('ix_manual_transaction_expires_at')
    op.drop_index('ix_manual_transaction_status')
    op.drop_index('ix_manual_transaction_org_id')
    op.drop_index('ix_manual_transaction_course_id')
    op.drop_index('ix_manual_transaction_student_user_id')
    op.drop_index('ix_manual_transaction_transaction_id')
    op.drop_table('manual_transaction')

    # Drop org_payment_config indexes and table
    op.drop_index('ix_org_payment_config_org_id')
    op.drop_table('org_payment_config')
