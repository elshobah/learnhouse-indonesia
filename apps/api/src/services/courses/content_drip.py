"""Service for managing content drip (scheduled content release)"""

from datetime import datetime, timedelta
from typing import Optional, Dict, List
from sqlmodel import Session, select
from src.db.courses.content_drip import ContentDrip, ContentDripStatus
from src.db.courses.chapter_activities import ChapterActivity
from src.db.courses.activities import Activity
from src.db.trail_runs import TrailRun
from src.db.trail_steps import TrailStep
from src.db.resource_authors import ResourceAuthor, ResourceAuthorshipEnum, ResourceAuthorshipStatusEnum


async def get_drip_status(
    activity_id: int,
    course_id: int,
    user_id: int,
    drip_mode: Optional[str],
    db_session: Session,
) -> Dict:
    """
    Calculate drip status for a single activity.

    Returns dict with keys:
    - is_locked: bool
    - available_at: Optional[datetime]
    - reason: str (human-readable reason if locked)
    """

    # Fast path: no drip mode = not locked
    if drip_mode is None:
        return {"is_locked": False, "available_at": None, "reason": ""}

    # Fast path: admin/author can always access
    is_admin_or_author = await _is_admin_or_author(course_id, user_id, db_session)
    if is_admin_or_author:
        return {"is_locked": False, "available_at": None, "reason": ""}

    # Dispatch to mode-specific handler
    if drip_mode == "BY_DATE":
        return await _check_by_date(activity_id, course_id, db_session)
    elif drip_mode == "DAYS_AFTER_ENROLLMENT":
        return await _check_days_after_enrollment(activity_id, course_id, user_id, db_session)
    elif drip_mode == "SEQUENTIAL":
        return await _check_sequential(activity_id, course_id, user_id, db_session)
    elif drip_mode == "PREREQUISITE":
        return await _check_prerequisite(activity_id, course_id, user_id, db_session)

    # Unknown mode = not locked (fail-open)
    return {"is_locked": False, "available_at": None, "reason": ""}


async def get_drip_statuses_for_course(
    activity_ids: List[int],
    course_id: int,
    user_id: int,
    drip_mode: Optional[str],
    db_session: Session,
) -> Dict[int, Dict]:
    """
    Batch get drip statuses for multiple activities in a course.

    Returns dict mapping activity_id -> drip status dict.
    Optimized with batch DB queries per mode to avoid N+1.
    """

    # Fast path: no drip mode = all unlocked
    if drip_mode is None:
        return {aid: {"is_locked": False, "available_at": None, "reason": ""} for aid in activity_ids}

    # Fast path: admin/author can always access
    is_admin_or_author = await _is_admin_or_author(course_id, user_id, db_session)
    if is_admin_or_author:
        return {aid: {"is_locked": False, "available_at": None, "reason": ""} for aid in activity_ids}

    # Dispatch to mode-specific batch handler
    if drip_mode == "BY_DATE":
        return await _check_by_date_batch(activity_ids, course_id, db_session)
    elif drip_mode == "DAYS_AFTER_ENROLLMENT":
        return await _check_days_after_enrollment_batch(activity_ids, course_id, user_id, db_session)
    elif drip_mode == "SEQUENTIAL":
        return await _check_sequential_batch(activity_ids, course_id, user_id, db_session)
    elif drip_mode == "PREREQUISITE":
        return await _check_prerequisite_batch(activity_ids, course_id, user_id, db_session)

    # Unknown mode = all unlocked (fail-open)
    return {aid: {"is_locked": False, "available_at": None, "reason": ""} for aid in activity_ids}


# ============ Private Helper Functions ============


async def _is_admin_or_author(course_id: int, user_id: int, db_session: Session) -> bool:
    """Check if user is admin/author of the course"""
    from src.db.courses.courses import Course

    # First get the course_uuid from course_id
    stmt = select(Course).where(Course.id == course_id)
    course = db_session.exec(stmt).first()
    if not course:
        return False

    # Now query ResourceAuthor with correct resource_uuid format
    stmt = select(ResourceAuthor).where(
        ResourceAuthor.resource_uuid == course.course_uuid,
        ResourceAuthor.user_id == user_id,
        ResourceAuthor.authorship.in_([ResourceAuthorshipEnum.CREATOR, ResourceAuthorshipEnum.MAINTAINER]),
        ResourceAuthor.authorship_status == ResourceAuthorshipStatusEnum.ACTIVE,
    )
    result = db_session.exec(stmt).first()
    return result is not None


async def _check_by_date(activity_id: int, course_id: int, db_session: Session) -> Dict:
    """Check BY_DATE mode: content available from a specific date"""

    # Get ChapterActivity linking this activity to the course
    stmt = select(ChapterActivity).where(
        ChapterActivity.activity_id == activity_id,
        ChapterActivity.course_id == course_id,
    )
    chapter_activity = db_session.exec(stmt).first()
    if not chapter_activity:
        return {"is_locked": False, "available_at": None, "reason": ""}

    # Get ContentDrip config for this chapter_activity
    stmt = select(ContentDrip).where(ContentDrip.chapter_activity_id == chapter_activity.id)
    drip_config = db_session.exec(stmt).first()

    if not drip_config or not drip_config.available_from:
        return {"is_locked": False, "available_at": None, "reason": ""}

    now = datetime.utcnow()
    if now < drip_config.available_from:
        return {
            "is_locked": True,
            "available_at": drip_config.available_from,
            "reason": f"Available from {drip_config.available_from.strftime('%B %d, %Y')}"
        }

    return {"is_locked": False, "available_at": None, "reason": ""}


async def _check_by_date_batch(
    activity_ids: List[int],
    course_id: int,
    db_session: Session,
) -> Dict[int, Dict]:
    """Batch version of BY_DATE check"""

    result = {}
    now = datetime.utcnow()

    # Get all ChapterActivity records for these activities
    stmt = select(ChapterActivity).where(
        ChapterActivity.activity_id.in_(activity_ids),
        ChapterActivity.course_id == course_id,
    )
    chapter_activities = db_session.exec(stmt).all()
    ca_map = {ca.activity_id: ca for ca in chapter_activities}

    # Get all ContentDrip configs for these chapter_activities
    ca_ids = [ca.id for ca in chapter_activities]
    if ca_ids:
        stmt = select(ContentDrip).where(ContentDrip.chapter_activity_id.in_(ca_ids))
        drip_configs = db_session.exec(stmt).all()
        drip_map = {dc.chapter_activity_id: dc for dc in drip_configs}
    else:
        drip_map = {}

    # Compute status for each activity
    for aid in activity_ids:
        ca = ca_map.get(aid)
        if not ca:
            result[aid] = {"is_locked": False, "available_at": None, "reason": ""}
            continue

        drip_config = drip_map.get(ca.id)
        if not drip_config or not drip_config.available_from:
            result[aid] = {"is_locked": False, "available_at": None, "reason": ""}
            continue

        if now < drip_config.available_from:
            result[aid] = {
                "is_locked": True,
                "available_at": drip_config.available_from,
                "reason": f"Available from {drip_config.available_from.strftime('%B %d, %Y')}"
            }
        else:
            result[aid] = {"is_locked": False, "available_at": None, "reason": ""}

    return result


async def _check_days_after_enrollment(
    activity_id: int,
    course_id: int,
    user_id: int,
    db_session: Session,
) -> Dict:
    """Check DAYS_AFTER_ENROLLMENT mode: content available X days after enrollment"""

    # Get user's enrollment date
    stmt = select(TrailRun).where(
        TrailRun.course_id == course_id,
        TrailRun.user_id == user_id,
    )
    trail_run = db_session.exec(stmt).first()
    if not trail_run:
        return {"is_locked": True, "available_at": None, "reason": "Enroll to access"}

    # Get ChapterActivity and ContentDrip config
    stmt = select(ChapterActivity).where(
        ChapterActivity.activity_id == activity_id,
        ChapterActivity.course_id == course_id,
    )
    chapter_activity = db_session.exec(stmt).first()
    if not chapter_activity:
        return {"is_locked": False, "available_at": None, "reason": ""}

    stmt = select(ContentDrip).where(ContentDrip.chapter_activity_id == chapter_activity.id)
    drip_config = db_session.exec(stmt).first()

    if not drip_config or drip_config.days_after_enrollment is None:
        return {"is_locked": False, "available_at": None, "reason": ""}

    # Parse enrollment date and compute unlock date
    try:
        enrollment_date = datetime.fromisoformat(trail_run.creation_date)
    except (ValueError, TypeError):
        # If can't parse, assume unlocked
        return {"is_locked": False, "available_at": None, "reason": ""}

    unlock_date = enrollment_date + timedelta(days=drip_config.days_after_enrollment)
    now = datetime.utcnow()

    if now < unlock_date:
        days_left = (unlock_date - now).days + 1
        return {
            "is_locked": True,
            "available_at": unlock_date,
            "reason": f"Available in {days_left} day(s)"
        }

    return {"is_locked": False, "available_at": None, "reason": ""}


async def _check_days_after_enrollment_batch(
    activity_ids: List[int],
    course_id: int,
    user_id: int,
    db_session: Session,
) -> Dict[int, Dict]:
    """Batch version of DAYS_AFTER_ENROLLMENT check"""

    result = {}
    now = datetime.utcnow()

    # Get user's enrollment date
    stmt = select(TrailRun).where(
        TrailRun.course_id == course_id,
        TrailRun.user_id == user_id,
    )
    trail_run = db_session.exec(stmt).first()

    if not trail_run:
        return {aid: {"is_locked": True, "available_at": None, "reason": "Enroll to access"} for aid in activity_ids}

    try:
        enrollment_date = datetime.fromisoformat(trail_run.creation_date)
    except (ValueError, TypeError):
        return {aid: {"is_locked": False, "available_at": None, "reason": ""} for aid in activity_ids}

    # Get all ChapterActivity and ContentDrip configs
    stmt = select(ChapterActivity).where(
        ChapterActivity.activity_id.in_(activity_ids),
        ChapterActivity.course_id == course_id,
    )
    chapter_activities = db_session.exec(stmt).all()
    ca_map = {ca.activity_id: ca for ca in chapter_activities}

    ca_ids = [ca.id for ca in chapter_activities]
    if ca_ids:
        stmt = select(ContentDrip).where(ContentDrip.chapter_activity_id.in_(ca_ids))
        drip_configs = db_session.exec(stmt).all()
        drip_map = {dc.chapter_activity_id: dc for dc in drip_configs}
    else:
        drip_map = {}

    for aid in activity_ids:
        ca = ca_map.get(aid)
        if not ca:
            result[aid] = {"is_locked": False, "available_at": None, "reason": ""}
            continue

        drip_config = drip_map.get(ca.id)
        if not drip_config or drip_config.days_after_enrollment is None:
            result[aid] = {"is_locked": False, "available_at": None, "reason": ""}
            continue

        unlock_date = enrollment_date + timedelta(days=drip_config.days_after_enrollment)
        if now < unlock_date:
            days_left = (unlock_date - now).days + 1
            result[aid] = {
                "is_locked": True,
                "available_at": unlock_date,
                "reason": f"Available in {days_left} day(s)"
            }
        else:
            result[aid] = {"is_locked": False, "available_at": None, "reason": ""}

    return result


async def _check_sequential(
    activity_id: int,
    course_id: int,
    user_id: int,
    db_session: Session,
) -> Dict:
    """Check SEQUENTIAL mode: activities unlock in order after completion"""

    # Get all activities for the course in order
    stmt = select(ChapterActivity).where(ChapterActivity.course_id == course_id).order_by(
        ChapterActivity.chapter_id, ChapterActivity.order
    )
    all_chapter_activities = db_session.exec(stmt).all()

    # Find the target activity's position
    target_position = None
    for idx, ca in enumerate(all_chapter_activities):
        if ca.activity_id == activity_id:
            target_position = idx
            break

    if target_position is None:
        return {"is_locked": False, "available_at": None, "reason": ""}

    # Check if all previous activities are completed
    for idx in range(target_position):
        prev_ca = all_chapter_activities[idx]
        stmt = select(TrailStep).where(
            TrailStep.activity_id == prev_ca.activity_id,
            TrailStep.user_id == user_id,
            TrailStep.complete == True,
        )
        completed = db_session.exec(stmt).first()
        if not completed:
            prev_activity_stmt = select(Activity).where(Activity.id == prev_ca.activity_id)
            prev_activity = db_session.exec(prev_activity_stmt).first()
            reason = f"Complete previous lesson first"
            if prev_activity:
                reason = f"Complete \"{prev_activity.name}\" first"
            return {
                "is_locked": True,
                "available_at": None,
                "reason": reason
            }

    return {"is_locked": False, "available_at": None, "reason": ""}


async def _check_sequential_batch(
    activity_ids: List[int],
    course_id: int,
    user_id: int,
    db_session: Session,
) -> Dict[int, Dict]:
    """Batch version of SEQUENTIAL check"""

    result = {}

    # Get all activities for the course in order
    stmt = select(ChapterActivity).where(ChapterActivity.course_id == course_id).order_by(
        ChapterActivity.chapter_id, ChapterActivity.order
    )
    all_chapter_activities = db_session.exec(stmt).all()

    # Map activity_id to position
    activity_positions = {}
    for idx, ca in enumerate(all_chapter_activities):
        if ca.activity_id not in activity_positions:
            activity_positions[ca.activity_id] = idx

    # Get all completed activities for user
    stmt = select(TrailStep).where(
        TrailStep.user_id == user_id,
        TrailStep.complete == True,
    ).with_entities(TrailStep.activity_id)
    completed_activity_ids = {row[0] for row in db_session.exec(stmt).all()}

    # Get activity names for all activities
    activity_names = {}
    stmt = select(Activity).where(Activity.id.in_([ca.activity_id for ca in all_chapter_activities]))
    for activity in db_session.exec(stmt).all():
        activity_names[activity.id] = activity.name

    # Compute status for each activity
    for aid in activity_ids:
        target_position = activity_positions.get(aid)
        if target_position is None:
            result[aid] = {"is_locked": False, "available_at": None, "reason": ""}
            continue

        # Check if all previous activities are completed
        is_locked = False
        blocker_name = None
        for idx in range(target_position):
            prev_ca = all_chapter_activities[idx]
            if prev_ca.activity_id not in completed_activity_ids:
                is_locked = True
                blocker_name = activity_names.get(prev_ca.activity_id, "previous lesson")
                break

        if is_locked:
            result[aid] = {
                "is_locked": True,
                "available_at": None,
                "reason": f"Complete \"{blocker_name}\" first"
            }
        else:
            result[aid] = {"is_locked": False, "available_at": None, "reason": ""}

    return result


async def _check_prerequisite(
    activity_id: int,
    course_id: int,
    user_id: int,
    db_session: Session,
) -> Dict:
    """Check PREREQUISITE mode: activity unlocks after completing a specific prerequisite"""

    # Get ChapterActivity and ContentDrip config
    stmt = select(ChapterActivity).where(
        ChapterActivity.activity_id == activity_id,
        ChapterActivity.course_id == course_id,
    )
    chapter_activity = db_session.exec(stmt).first()
    if not chapter_activity:
        return {"is_locked": False, "available_at": None, "reason": ""}

    stmt = select(ContentDrip).where(ContentDrip.chapter_activity_id == chapter_activity.id)
    drip_config = db_session.exec(stmt).first()

    if not drip_config or not drip_config.prerequisite_activity_id:
        return {"is_locked": False, "available_at": None, "reason": ""}

    # Check if user completed the prerequisite
    stmt = select(TrailStep).where(
        TrailStep.activity_id == drip_config.prerequisite_activity_id,
        TrailStep.user_id == user_id,
        TrailStep.complete == True,
    )
    completed = db_session.exec(stmt).first()

    if completed:
        return {"is_locked": False, "available_at": None, "reason": ""}

    # Get prerequisite activity name for better UX
    stmt = select(Activity).where(Activity.id == drip_config.prerequisite_activity_id)
    prerequisite = db_session.exec(stmt).first()
    reason = "Complete prerequisite lesson first"
    if prerequisite:
        reason = f"Complete \"{prerequisite.name}\" first"

    return {
        "is_locked": True,
        "available_at": None,
        "reason": reason
    }


async def _check_prerequisite_batch(
    activity_ids: List[int],
    course_id: int,
    user_id: int,
    db_session: Session,
) -> Dict[int, Dict]:
    """Batch version of PREREQUISITE check"""

    result = {}

    # Get all ChapterActivity and ContentDrip configs
    stmt = select(ChapterActivity).where(
        ChapterActivity.activity_id.in_(activity_ids),
        ChapterActivity.course_id == course_id,
    )
    chapter_activities = db_session.exec(stmt).all()
    ca_map = {ca.activity_id: ca for ca in chapter_activities}

    ca_ids = [ca.id for ca in chapter_activities]
    if ca_ids:
        stmt = select(ContentDrip).where(ContentDrip.chapter_activity_id.in_(ca_ids))
        drip_configs = db_session.exec(stmt).all()
        drip_map = {dc.chapter_activity_id: dc for dc in drip_configs}
    else:
        drip_map = {}

    # Get all prerequisites
    prerequisites = {}
    for dc in drip_map.values():
        if dc.prerequisite_activity_id:
            prerequisites[dc.prerequisite_activity_id] = None

    # Get activity names for prerequisites
    if prerequisites:
        stmt = select(Activity).where(Activity.id.in_(prerequisites.keys()))
        for activity in db_session.exec(stmt).all():
            prerequisites[activity.id] = activity.name

    # Get all completed activities for user
    stmt = select(TrailStep).where(
        TrailStep.user_id == user_id,
        TrailStep.complete == True,
    ).with_entities(TrailStep.activity_id)
    completed_activity_ids = {row[0] for row in db_session.exec(stmt).all()}

    # Compute status for each activity
    for aid in activity_ids:
        ca = ca_map.get(aid)
        if not ca:
            result[aid] = {"is_locked": False, "available_at": None, "reason": ""}
            continue

        drip_config = drip_map.get(ca.id)
        if not drip_config or not drip_config.prerequisite_activity_id:
            result[aid] = {"is_locked": False, "available_at": None, "reason": ""}
            continue

        if drip_config.prerequisite_activity_id in completed_activity_ids:
            result[aid] = {"is_locked": False, "available_at": None, "reason": ""}
        else:
            prereq_name = prerequisites.get(drip_config.prerequisite_activity_id, "prerequisite lesson")
            result[aid] = {
                "is_locked": True,
                "available_at": None,
                "reason": f"Complete \"{prereq_name}\" first"
            }

    return result
