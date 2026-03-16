import os
from datetime import date
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from database import get_db
from models import Plan, User
from routers.auth import get_current_user
from services import calendar_service, claude_service, gmail_service

router = APIRouter()

FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:3000")


class CreatePlanRequest(BaseModel):
    goals: str
    needs: str
    duration_days: int
    start_date: str       # ISO format: YYYY-MM-DD
    workout_time: str     # HH:MM format, e.g. "07:00"
    timezone: str         # IANA timezone string, e.g. "America/New_York"


def plan_to_dict(plan: Plan) -> dict:
    return {
        "id": plan.id,
        "goals": plan.goals,
        "needs": plan.needs,
        "duration_days": plan.duration_days,
        "start_date": plan.start_date,
        "plan_json": plan.plan_json,
        "calendar_event_ids": plan.calendar_event_ids,
        "created_at": plan.created_at.isoformat(),
    }


@router.post("")
async def create_plan(
    body: CreatePlanRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Generate a workout plan with Claude, create Google Calendar events,
    and send a confirmation email. Streams the Claude response via SSE.
    """
    if not current_user.access_token:
        raise HTTPException(status_code=400, detail="No Google access token found")

    # Validate start_date
    try:
        date.fromisoformat(body.start_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid start_date format (use YYYY-MM-DD)")

    if body.duration_days < 1 or body.duration_days > 90:
        raise HTTPException(status_code=400, detail="duration_days must be between 1 and 90")

    async def event_stream():
        plan_data = None

        try:
            # Stream Claude plan generation
            async for chunk in claude_service.generate_plan_stream(
                goals=body.goals,
                needs=body.needs,
                duration_days=body.duration_days,
                start_date=body.start_date,
            ):
                # chunk is already SSE-formatted
                yield chunk

                # Extract plan from done event
                import json
                if chunk.startswith("data: "):
                    payload = json.loads(chunk[6:])
                    if payload.get("type") == "done":
                        plan_data = payload["plan"]

            if plan_data is None:
                import json
                yield f"data: {json.dumps({'type': 'error', 'message': 'Plan generation failed'})}\n\n"
                return

            # Save plan to DB
            plan = Plan(
                user_id=current_user.id,
                goals=body.goals,
                needs=body.needs,
                duration_days=body.duration_days,
                start_date=body.start_date,
                plan_json=plan_data,
            )
            db.add(plan)
            db.commit()
            db.refresh(plan)

            import json
            yield f"data: {json.dumps({'type': 'status', 'message': 'Creating calendar events...'})}\n\n"

            # Create Google Calendar events
            try:
                event_ids = calendar_service.create_workout_events(
                    access_token=current_user.access_token,
                    refresh_token=current_user.refresh_token,
                    plan_json=plan_data,
                    workout_time=body.workout_time,
                    timezone=body.timezone,
                )
                plan.calendar_event_ids = event_ids
                db.commit()
                yield f"data: {json.dumps({'type': 'status', 'message': f'{len(event_ids)} calendar events created!'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'warning', 'message': f'Calendar creation failed: {str(e)}'})}\n\n"

            yield f"data: {json.dumps({'type': 'status', 'message': 'Sending confirmation email...'})}\n\n"

            # Send confirmation email
            try:
                gmail_service.send_plan_confirmation(
                    access_token=current_user.access_token,
                    refresh_token=current_user.refresh_token,
                    to_email=current_user.email,
                    user_name=current_user.name,
                    plan_json=plan_data,
                    frontend_url=FRONTEND_URL,
                )
                yield f"data: {json.dumps({'type': 'status', 'message': 'Confirmation email sent!'})}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'warning', 'message': f'Email sending failed: {str(e)}'})}\n\n"

            yield f"data: {json.dumps({'type': 'complete', 'plan_id': plan.id})}\n\n"

        except Exception as e:
            import json
            yield f"data: {json.dumps({'type': 'error', 'message': str(e)})}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@router.get("/current")
def get_current_plan(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = (
        db.query(Plan)
        .filter(Plan.user_id == current_user.id)
        .order_by(Plan.created_at.desc())
        .first()
    )
    if not plan:
        raise HTTPException(status_code=404, detail="No active plan found")
    return plan_to_dict(plan)


@router.get("/{plan_id}")
def get_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")
    return plan_to_dict(plan)


@router.delete("/{plan_id}")
def delete_plan(
    plan_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    plan = db.query(Plan).filter(Plan.id == plan_id, Plan.user_id == current_user.id).first()
    if not plan:
        raise HTTPException(status_code=404, detail="Plan not found")

    # Delete calendar events if they exist
    if plan.calendar_event_ids and current_user.access_token:
        calendar_service.delete_workout_events(
            access_token=current_user.access_token,
            refresh_token=current_user.refresh_token,
            event_ids=plan.calendar_event_ids,
        )

    db.delete(plan)
    db.commit()
    return {"message": "Plan deleted"}
