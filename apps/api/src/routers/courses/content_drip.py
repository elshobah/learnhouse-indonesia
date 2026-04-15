"""Router for content drip (scheduled content release) management"""

from datetime import datetime
from typing import List, Optional
from sqlmodel import Session, select
from fastapi import APIRouter, Depends, HTTPException, Request
from src.db.courses.courses import Course
from src.db.courses.activities import Activity
from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.content_drip import ContentDrip, ContentDripCreate, ContentDripRead
from src.db.users import PublicUser
from src.security.rbac import check_resource_access, AccessAction
from src.services.courses.content_drip import get_drip_statuses_for_course
from src.security.auth import get_current_user
from src.core.events.database import get_db_session

router = APIRouter(prefix="/courses", tags=["content_drip"])


@router.get("/{course_uuid}/drip", response_model=dict)
async def get_course_drip_config(
    request: Request,
    course_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Get the current drip configuration for a course"""
    # Get course
    stmt = select(Course).where(Course.course_uuid == course_uuid)
    course = db_session.exec(stmt).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check admin/contributor access
    await check_resource_access(request, db_session, current_user, course_uuid, AccessAction.UPDATE)

    # Get all ContentDrip configs for this course
    stmt = select(ContentDrip).where(ContentDrip.course_id == course.id)
    drip_configs = db_session.exec(stmt).all()

    # Get all ChapterActivity records to map drip configs
    stmt = select(ChapterActivity).where(ChapterActivity.course_id == course.id).order_by(
        ChapterActivity.chapter_id, ChapterActivity.order
    )
    chapter_activities = db_session.exec(stmt).all()

    # Get activity names
    activity_ids = [ca.activity_id for ca in chapter_activities]
    stmt = select(Activity).where(Activity.id.in_(activity_ids))
    activities = {a.id: a for a in db_session.exec(stmt).all()}

    # Build response
    activity_drips = {}
    for ca in chapter_activities:
        drip = next((d for d in drip_configs if d.chapter_activity_id == ca.id), None)
        activity = activities.get(ca.activity_id)
        activity_drips[activity.activity_uuid if activity else f"activity_{ca.activity_id}"] = {
            "chapter_activity_id": ca.id,
            "available_from": drip.available_from if drip else None,
            "days_after_enrollment": drip.days_after_enrollment if drip else None,
            "prerequisite_activity_id": drip.prerequisite_activity_id if drip else None,
        }

    return {
        "drip_mode": course.drip_mode,
        "activities": activity_drips,
    }


@router.put("/{course_uuid}/drip/mode")
async def update_course_drip_mode(
    request: Request,
    course_uuid: str,
    payload: dict,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Set or update the drip mode for a course"""
    # Get course
    stmt = select(Course).where(Course.course_uuid == course_uuid)
    course = db_session.exec(stmt).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check admin/contributor access
    await check_resource_access(request, db_session, current_user, course_uuid, AccessAction.UPDATE)

    # Validate drip_mode
    drip_mode = payload.get("drip_mode")
    if drip_mode is not None and drip_mode not in ["BY_DATE", "DAYS_AFTER_ENROLLMENT", "SEQUENTIAL", "PREREQUISITE"]:
        raise HTTPException(status_code=400, detail="Invalid drip_mode value")

    course.drip_mode = drip_mode
    course.update_date = datetime.utcnow().isoformat()
    db_session.add(course)
    db_session.commit()
    db_session.refresh(course)

    return {"drip_mode": course.drip_mode}


@router.put("/{course_uuid}/drip/activity/{activity_uuid}")
async def upsert_activity_drip(
    request: Request,
    course_uuid: str,
    activity_uuid: str,
    payload: dict,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Create or update drip configuration for a specific activity"""
    # Get course
    stmt = select(Course).where(Course.course_uuid == course_uuid)
    course = db_session.exec(stmt).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check admin/contributor access
    await check_resource_access(request, db_session, current_user, course_uuid, AccessAction.UPDATE)

    # Get activity
    stmt = select(Activity).where(Activity.activity_uuid == activity_uuid, Activity.course_id == course.id)
    activity = db_session.exec(stmt).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found in this course")

    # Get ChapterActivity linking activity to course
    stmt = select(ChapterActivity).where(
        ChapterActivity.activity_id == activity.id,
        ChapterActivity.course_id == course.id,
    )
    chapter_activity = db_session.exec(stmt).first()
    if not chapter_activity:
        raise HTTPException(status_code=404, detail="Activity not found in course structure")

    # Find or create ContentDrip
    stmt = select(ContentDrip).where(ContentDrip.chapter_activity_id == chapter_activity.id)
    drip = db_session.exec(stmt).first()

    if not drip:
        drip = ContentDrip(
            chapter_activity_id=chapter_activity.id,
            course_id=course.id,
            org_id=course.org_id,
            creation_date=datetime.utcnow().isoformat(),
        )

    # Update fields from payload
    if "available_from" in payload:
        available_from = payload["available_from"]
        drip.available_from = datetime.fromisoformat(available_from) if available_from else None

    if "days_after_enrollment" in payload:
        drip.days_after_enrollment = payload["days_after_enrollment"]

    if "prerequisite_activity_id" in payload:
        prereq_id = payload["prerequisite_activity_id"]
        if prereq_id:
            # Validate prerequisite activity exists in the course
            stmt = select(Activity).where(
                Activity.id == prereq_id,
                Activity.course_id == course.id,
            )
            if not db_session.exec(stmt).first():
                raise HTTPException(status_code=400, detail="Prerequisite activity not found in this course")
        drip.prerequisite_activity_id = prereq_id

    drip.update_date = datetime.utcnow().isoformat()
    db_session.add(drip)
    db_session.commit()
    db_session.refresh(drip)

    return ContentDripRead.from_orm(drip)


@router.delete("/{course_uuid}/drip/activity/{activity_uuid}")
async def delete_activity_drip(
    request: Request,
    course_uuid: str,
    activity_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """Remove drip configuration from an activity"""
    # Get course
    stmt = select(Course).where(Course.course_uuid == course_uuid)
    course = db_session.exec(stmt).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check admin/contributor access
    await check_resource_access(request, db_session, current_user, course_uuid, AccessAction.UPDATE)

    # Get activity
    stmt = select(Activity).where(Activity.activity_uuid == activity_uuid, Activity.course_id == course.id)
    activity = db_session.exec(stmt).first()
    if not activity:
        raise HTTPException(status_code=404, detail="Activity not found in this course")

    # Get ChapterActivity
    stmt = select(ChapterActivity).where(
        ChapterActivity.activity_id == activity.id,
        ChapterActivity.course_id == course.id,
    )
    chapter_activity = db_session.exec(stmt).first()
    if not chapter_activity:
        raise HTTPException(status_code=404, detail="Activity not found in course structure")

    # Delete ContentDrip if exists
    stmt = select(ContentDrip).where(ContentDrip.chapter_activity_id == chapter_activity.id)
    drip = db_session.exec(stmt).first()
    if drip:
        db_session.delete(drip)
        db_session.commit()

    return {"status": "deleted"}


@router.get("/{course_uuid}/drip/status", response_model=dict)
async def get_course_drip_status(
    request: Request,
    course_uuid: str,
    current_user: PublicUser = Depends(get_current_user),
    db_session: Session = Depends(get_db_session),
):
    """
    Get drip lock status for all activities in a course for the current user.
    Student-facing endpoint.
    """
    # Get course
    stmt = select(Course).where(Course.course_uuid == course_uuid)
    course = db_session.exec(stmt).first()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    # Check read access
    await check_resource_access(request, db_session, current_user, course_uuid, AccessAction.READ)

    if not course.drip_mode:
        # No drip configured — all activities unlocked
        return {
            "drip_mode": None,
            "activities": {},
        }

    # Get all activities for the course
    stmt = select(Activity).where(Activity.course_id == course.id, Activity.published == True)
    activities = db_session.exec(stmt).all()
    activity_ids = [a.id for a in activities]

    if not activity_ids:
        return {
            "drip_mode": course.drip_mode,
            "activities": {},
        }

    # Get drip statuses for all activities
    drip_statuses = await get_drip_statuses_for_course(
        activity_ids,
        course.id,
        current_user.id if current_user.id else 0,
        course.drip_mode,
        db_session,
    )

    # Map activity_uuid to drip status
    activities_status = {}
    for activity in activities:
        status = drip_statuses.get(activity.id, {"is_locked": False, "available_at": None, "reason": ""})
        activities_status[activity.activity_uuid] = status

    return {
        "drip_mode": course.drip_mode,
        "activities": activities_status,
    }
