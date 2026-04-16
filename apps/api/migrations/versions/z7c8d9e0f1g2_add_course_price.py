"""Add price field to course for Payment Indonesia

Revision ID: z7c8d9e0f1g2
Revises: z6b7c8d9e0f1
Create Date: 2026-04-16 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = 'z7c8d9e0f1g2'
down_revision: Union[str, None] = 'z6b7c8d9e0f1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add price column to course table
    # price in IDR for Payment Indonesia integration
    op.add_column('course', sa.Column('price', sa.Integer(), nullable=True))


def downgrade() -> None:
    # Drop price column from course table
    op.drop_column('course', 'price')
