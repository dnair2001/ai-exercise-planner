import os
import json
from datetime import date, timedelta
from typing import AsyncIterator

import anthropic

client = anthropic.AsyncAnthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))

PLAN_SCHEMA = {
    "type": "object",
    "properties": {
        "plan_title": {"type": "string"},
        "summary": {"type": "string"},
        "days": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "day": {"type": "integer"},
                    "date": {"type": "string", "format": "date"},
                    "title": {"type": "string"},
                    "duration_minutes": {"type": "integer"},
                    "exercises": {
                        "type": "array",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string"},
                                "sets": {"type": "integer"},
                                "reps": {"type": "string"},
                                "notes": {"type": "string"},
                                "youtube_search_query": {"type": "string"},
                            },
                            "required": ["name", "youtube_search_query"],
                            "additionalProperties": False,
                        },
                    },
                    "notes": {"type": "string"},
                },
                "required": ["day", "date", "title", "duration_minutes", "exercises", "notes"],
                "additionalProperties": False,
            },
        },
    },
    "required": ["plan_title", "summary", "days"],
    "additionalProperties": False,
}

SYSTEM_PROMPT = """You are an expert personal fitness trainer and exercise planner.
Your task is to create personalized, day-by-day workout plans based on the user's goals,
fitness level, needs, and available time.

Create realistic, progressive workout plans that:
- Match the user's current fitness level
- Build progressively in intensity
- Include proper rest days
- Are achievable within the specified duration
- Include clear exercise instructions in the notes field
- For each exercise, provide a concise youtube_search_query (e.g. "how to do a barbell squat tutorial") so users can find a follow-along video

Return your response as valid JSON matching the provided schema exactly."""


async def generate_plan_stream(
    goals: str,
    needs: str,
    duration_days: int,
    start_date: str,
) -> AsyncIterator[str]:
    """
    Stream the plan generation. Yields SSE-formatted strings.
    The final yield will be the complete JSON plan prefixed with 'data: [DONE]'.
    """
    # Build the date list for each day
    start = date.fromisoformat(start_date)
    day_dates = [(start + timedelta(days=i)).isoformat() for i in range(duration_days)]

    user_message = f"""Create a {duration_days}-day personalized workout plan starting {start_date}.

Fitness Goals: {goals}

Current Fitness Level & Needs: {needs}

Duration: {duration_days} days
Start Date: {start_date}
Day Dates (use exactly these): {json.dumps(day_dates)}

Please create a comprehensive, realistic plan for all {duration_days} days."""

    full_text = ""

    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=8192,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
        output_config={
            "format": {
                "type": "json_schema",
                "schema": PLAN_SCHEMA,
            }
        },
    ) as stream:
        async for event in stream:
            if event.type == "content_block_delta":
                if hasattr(event.delta, "text"):
                    chunk = event.delta.text
                    full_text += chunk
                    yield f"data: {json.dumps({'type': 'chunk', 'text': chunk})}\n\n"

    # Yield the complete plan
    yield f"data: {json.dumps({'type': 'done', 'plan': json.loads(full_text)})}\n\n"


async def generate_plan(
    goals: str,
    needs: str,
    duration_days: int,
    start_date: str,
) -> dict:
    """Generate a complete plan (non-streaming) and return as dict."""
    start = date.fromisoformat(start_date)
    day_dates = [(start + timedelta(days=i)).isoformat() for i in range(duration_days)]

    user_message = f"""Create a {duration_days}-day personalized workout plan starting {start_date}.

Fitness Goals: {goals}

Current Fitness Level & Needs: {needs}

Duration: {duration_days} days
Start Date: {start_date}
Day Dates (use exactly these): {json.dumps(day_dates)}

Please create a comprehensive, realistic plan for all {duration_days} days."""

    async with client.messages.stream(
        model="claude-sonnet-4-6",
        max_tokens=8192,
        system=SYSTEM_PROMPT,
        messages=[{"role": "user", "content": user_message}],
        output_config={
            "format": {
                "type": "json_schema",
                "schema": PLAN_SCHEMA,
            }
        },
    ) as stream:
        final = await stream.get_final_message()

    text_content = next(
        (block.text for block in final.content if block.type == "text"), ""
    )
    return json.loads(text_content)
