"""Content Drip models for scheduled course content release"""

from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field


class ContentDripBase(SQLModel):
    """Base model for content drip configuration"""
    available_from: Optional[datetime] = Field(default=None, description="Date when content becomes available (BY_DATE mode)")
    days_after_enrollment: Optional[int] = Field(default=None, description="Days after enrollment when content becomes available (DAYS_AFTER_ENROLLMENT mode)")
    prerequisite_activity_id: Optional[int] = Field(default=None, description="Activity that must be completed first (PREREQUISITE mode)")


class ContentDrip(ContentDripBase, table=True):
    """Database model for content drip settings per activity"""
    __tablename__ = "contentdrip"

    id: Optional[int] = Field(default=None, primary_key=True)
    chapter_activity_id: int = Field(..., foreign_key="chapteractivity.id", description="FK to ChapterActivity")
    course_id: int = Field(..., foreign_key="course.id", description="FK to Course")
    org_id: int = Field(..., foreign_key="organization.id", description="FK to Organization")
    creation_date: str = Field(default="", description="ISO datetime string when created")
    update_date: str = Field(default="", description="ISO datetime string when last updated")


class ContentDripCreate(ContentDripBase):
    """Model for creating/updating content drip settings"""
    chapter_activity_id: Optional[int] = None
    activity_uuid: Optional[str] = None  # For API input (resolved to chapter_activity_id server-side)


class ContentDripRead(ContentDripBase):
    """Model for reading content drip settings"""
    id: int
    chapter_activity_id: int
    available_from: Optional[datetime]
    days_after_enrollment: Optional[int]
    prerequisite_activity_id: Optional[int]


class ContentDripStatus(SQLModel):
    """Model for drip status response to client"""
    is_locked: bool = Field(..., description="Whether the content is currently locked for this user")
    available_at: Optional[datetime] = Field(default=None, description="When the content will become available")
    reason: str = Field(default="", description="Human-readable reason why content is locked (if locked)")
