"""Add content drip feature for scheduled content release

Revision ID: z6b7c8d9e0f1
Revises: z5a6b7c8d9e0
Create Date: 2026-04-15 15:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa  # noqa: F401
import sqlmodel  # noqa: F401

# revision identifiers, used by Alembic.
revision: str = 'z6b7c8d9e0f1'
down_revision: Union[str, None] = 'z5a6b7c8d9e0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add drip_mode column to course table
    op.add_column('course', sa.Column('drip_mode', sa.String(), nullable=True))

    # Create contentdrip table
    op.create_table(
        'contentdrip',
        sa.Column('id', sa.Integer(), primary_key=True),
        sa.Column('chapter_activity_id', sa.Integer(), nullable=False),
        sa.Column('course_id', sa.Integer(), nullable=False),
        sa.Column('org_id', sa.Integer(), nullable=False),
        sa.Column('available_from', sa.DateTime(), nullable=True),
        sa.Column('days_after_enrollment', sa.Integer(), nullable=True),
        sa.Column('prerequisite_activity_id', sa.Integer(), nullable=True),
        sa.Column('creation_date', sa.String(), nullable=False),
        sa.Column('update_date', sa.String(), nullable=False),
        sa.ForeignKeyConstraint(['chapter_activity_id'], ['chapteractivity.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['course_id'], ['course.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['org_id'], ['organization.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['prerequisite_activity_id'], ['activity.id'], ondelete='SET NULL'),
    )

    # Create indexes for contentdrip
    op.create_index('ix_contentdrip_chapter_activity_id', 'contentdrip', ['chapter_activity_id'], unique=True)
    op.create_index('ix_contentdrip_course_id', 'contentdrip', ['course_id'])
    op.create_index('ix_contentdrip_org_id', 'contentdrip', ['org_id'])
    op.create_index('ix_contentdrip_prerequisite_activity_id', 'contentdrip', ['prerequisite_activity_id'])


def downgrade() -> None:
    # Drop contentdrip indexes and table
    op.drop_index('ix_contentdrip_prerequisite_activity_id')
    op.drop_index('ix_contentdrip_org_id')
    op.drop_index('ix_contentdrip_course_id')
    op.drop_index('ix_contentdrip_chapter_activity_id')
    op.drop_table('contentdrip')

    # Drop drip_mode column from course table
    op.drop_column('course', 'drip_mode')
