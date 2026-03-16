from datetime import datetime, timedelta
from typing import Optional

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build


def _build_calendar_service(access_token: str, refresh_token: Optional[str] = None):
    import os
    creds = Credentials(
        token=access_token,
        refresh_token=refresh_token,
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.getenv("GOOGLE_CLIENT_ID"),
        client_secret=os.getenv("GOOGLE_CLIENT_SECRET"),
        scopes=["https://www.googleapis.com/auth/calendar"],
    )
    return build("calendar", "v3", credentials=creds)


def create_workout_events(
    access_token: str,
    refresh_token: Optional[str],
    plan_json: dict,
    workout_time: str = "07:00",
    timezone: str = "America/New_York",
) -> list[str]:
    """
    Create Google Calendar events for each day in the plan.
    Returns a list of created event IDs.
    """
    service = _build_calendar_service(access_token, refresh_token)
    event_ids = []

    for day in plan_json.get("days", []):
        workout_date = day["date"]
        title = day["title"]
        duration_minutes = day.get("duration_minutes", 60)
        notes = day.get("notes", "")

        # Build exercise description
        exercises = day.get("exercises", [])
        exercise_lines = []
        for ex in exercises:
            line = f"• {ex['name']}"
            if ex.get("sets") and ex.get("reps"):
                line += f" — {ex['sets']} sets × {ex['reps']}"
            if ex.get("notes"):
                line += f"\n  {ex['notes']}"
            exercise_lines.append(line)

        description = f"🏋️ Day {day['day']} Workout\n\n"
        if exercise_lines:
            description += "Exercises:\n" + "\n".join(exercise_lines)
        if notes:
            description += f"\n\nNotes: {notes}"

        start_dt = datetime.fromisoformat(f"{workout_date}T{workout_time}:00")
        end_dt = start_dt + timedelta(minutes=duration_minutes)

        event = {
            "summary": f"💪 {title}",
            "description": description,
            "start": {
                "dateTime": start_dt.isoformat(),
                "timeZone": timezone,
            },
            "end": {
                "dateTime": end_dt.isoformat(),
                "timeZone": timezone,
            },
            "reminders": {
                "useDefault": False,
                "overrides": [
                    {"method": "popup", "minutes": 30},
                    {"method": "email", "minutes": 30},
                ],
            },
            "colorId": "9",  # Blueberry
        }

        created = service.events().insert(calendarId="primary", body=event).execute()
        event_ids.append(created["id"])

    return event_ids


def delete_workout_events(
    access_token: str,
    refresh_token: Optional[str],
    event_ids: list[str],
) -> None:
    """Delete Google Calendar events by ID. Silently skips missing events."""
    service = _build_calendar_service(access_token, refresh_token)
    for event_id in event_ids:
        try:
            service.events().delete(calendarId="primary", eventId=event_id).execute()
        except Exception:
            pass
