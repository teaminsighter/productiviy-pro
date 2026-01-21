"""
Meeting Intelligence Service
Handles audio transcription with Whisper and AI analysis with GPT
"""
import os
import json
import tempfile
from datetime import datetime
from typing import Optional, Dict, Any, List
from openai import AsyncOpenAI
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_

from app.core.config import settings
from app.models.calendar import (
    CalendarEvent, MeetingTranscript, MeetingAnalysis, MeetingCostSettings
)


class MeetingIntelligenceService:
    """Service for meeting transcription and AI analysis"""

    def __init__(self, db: AsyncSession):
        self.db = db
        self.client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        # Whisper pricing: $0.006 per minute
        self.whisper_cost_per_minute = 0.006
        # GPT-4 pricing: ~$0.03 per 1K input tokens, $0.06 per 1K output tokens
        self.gpt_input_cost_per_1k = 0.03
        self.gpt_output_cost_per_1k = 0.06

    # =========================================================================
    # Transcription
    # =========================================================================

    async def transcribe_audio(
        self,
        user_id: int,
        audio_data: bytes,
        audio_format: str = "webm",
        meeting_title: Optional[str] = None,
        calendar_event_id: Optional[str] = None,
        language: str = "en",
    ) -> MeetingTranscript:
        """
        Transcribe audio using OpenAI Whisper API

        Args:
            user_id: User ID
            audio_data: Raw audio bytes
            audio_format: Audio format (webm, mp3, wav, m4a)
            meeting_title: Optional meeting title
            calendar_event_id: Optional linked calendar event
            language: Language code (default: en)

        Returns:
            MeetingTranscript with transcription
        """
        # Create transcript record
        transcript = MeetingTranscript(
            user_id=user_id,
            calendar_event_id=calendar_event_id,
            meeting_title=meeting_title or "Untitled Meeting",
            meeting_date=datetime.utcnow(),
            audio_file_size=len(audio_data),
            audio_format=audio_format,
            language=language,
            status="processing",
            processing_started_at=datetime.utcnow(),
        )
        self.db.add(transcript)
        await self.db.commit()
        await self.db.refresh(transcript)

        try:
            # Write audio to temp file (Whisper API requires file)
            with tempfile.NamedTemporaryFile(
                suffix=f".{audio_format}",
                delete=False
            ) as temp_file:
                temp_file.write(audio_data)
                temp_file_path = temp_file.name

            # Call Whisper API
            with open(temp_file_path, "rb") as audio_file:
                # Use verbose_json to get timestamps
                response = await self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file,
                    language=language,
                    response_format="verbose_json",
                    timestamp_granularities=["segment"],
                )

            # Clean up temp file
            os.unlink(temp_file_path)

            # Extract transcription data
            transcription_text = response.text
            segments = []

            if hasattr(response, 'segments'):
                for seg in response.segments:
                    segments.append({
                        "start": seg.start,
                        "end": seg.end,
                        "text": seg.text,
                    })

            # Calculate duration and cost
            duration_seconds = response.duration if hasattr(response, 'duration') else 0
            api_cost = (duration_seconds / 60) * self.whisper_cost_per_minute

            # Update transcript
            transcript.transcription_text = transcription_text
            transcript.transcription_segments = segments
            transcript.duration_seconds = int(duration_seconds)
            transcript.word_count = len(transcription_text.split())
            transcript.api_cost = api_cost
            transcript.status = "completed"
            transcript.processing_completed_at = datetime.utcnow()

            await self.db.commit()
            await self.db.refresh(transcript)

            return transcript

        except Exception as e:
            # Update transcript with error
            transcript.status = "failed"
            transcript.error_message = str(e)
            await self.db.commit()
            raise

    async def get_transcript(
        self,
        user_id: int,
        transcript_id: str,
    ) -> Optional[MeetingTranscript]:
        """Get a transcript by ID"""
        result = await self.db.execute(
            select(MeetingTranscript).where(
                and_(
                    MeetingTranscript.id == transcript_id,
                    MeetingTranscript.user_id == user_id,
                )
            )
        )
        return result.scalar_one_or_none()

    async def list_transcripts(
        self,
        user_id: int,
        limit: int = 20,
        offset: int = 0,
    ) -> List[MeetingTranscript]:
        """List user's transcripts"""
        result = await self.db.execute(
            select(MeetingTranscript)
            .where(MeetingTranscript.user_id == user_id)
            .order_by(MeetingTranscript.meeting_date.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(result.scalars().all())

    # =========================================================================
    # AI Analysis
    # =========================================================================

    async def analyze_meeting(
        self,
        user_id: int,
        transcript_id: Optional[str] = None,
        transcript_text: Optional[str] = None,
        meeting_title: Optional[str] = None,
        attendees: Optional[List[str]] = None,
        calendar_event_id: Optional[str] = None,
    ) -> MeetingAnalysis:
        """
        Analyze meeting transcript using GPT

        Args:
            user_id: User ID
            transcript_id: ID of existing transcript
            transcript_text: Raw transcript text (if no transcript_id)
            meeting_title: Meeting title for context
            attendees: List of attendee names
            calendar_event_id: Linked calendar event

        Returns:
            MeetingAnalysis with AI insights
        """
        # Get transcript text
        if transcript_id:
            transcript = await self.get_transcript(user_id, transcript_id)
            if not transcript:
                raise ValueError("Transcript not found")
            text = transcript.transcription_text
            calendar_event_id = transcript.calendar_event_id
        elif transcript_text:
            text = transcript_text
        else:
            raise ValueError("Either transcript_id or transcript_text required")

        # Create analysis record
        analysis = MeetingAnalysis(
            user_id=user_id,
            transcript_id=transcript_id,
            calendar_event_id=calendar_event_id,
            status="processing",
        )
        self.db.add(analysis)
        await self.db.commit()
        await self.db.refresh(analysis)

        try:
            # Build context
            context = f"Meeting: {meeting_title or 'Untitled'}\n"
            if attendees:
                context += f"Attendees: {', '.join(attendees)}\n"
            context += f"\nTranscript:\n{text}"

            # Call GPT for analysis
            response = await self.client.chat.completions.create(
                model="gpt-4-turbo-preview",
                messages=[
                    {
                        "role": "system",
                        "content": """You are an expert meeting analyst. Analyze the meeting transcript and provide:
1. A concise summary (3-5 bullet points)
2. Key action items with assignees if mentioned
3. Important decisions made
4. Follow-up items needed
5. Main topics discussed
6. Overall meeting quality score (0-100)
7. Whether this meeting could have been an email

Respond in JSON format:
{
    "summary": "...",
    "key_points": ["point1", "point2"],
    "action_items": [{"task": "...", "assignee": "...", "priority": "high/medium/low"}],
    "decisions": ["decision1", "decision2"],
    "follow_ups": ["item1", "item2"],
    "topics": [{"topic": "...", "importance": "high/medium/low"}],
    "keywords": ["keyword1", "keyword2"],
    "meeting_score": 75,
    "meeting_type": "standup/brainstorm/1on1/review/planning/other",
    "could_be_email": false,
    "sentiment": "positive/neutral/negative"
}"""
                    },
                    {
                        "role": "user",
                        "content": context
                    }
                ],
                response_format={"type": "json_object"},
                max_tokens=2000,
            )

            # Parse response
            result = json.loads(response.choices[0].message.content)

            # Calculate costs
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
            api_cost = (
                (input_tokens / 1000) * self.gpt_input_cost_per_1k +
                (output_tokens / 1000) * self.gpt_output_cost_per_1k
            )

            # Update analysis
            analysis.summary = result.get("summary", "")
            analysis.key_points = result.get("key_points", [])
            analysis.action_items = result.get("action_items", [])
            analysis.action_items_count = len(analysis.action_items)
            analysis.decisions = result.get("decisions", [])
            analysis.follow_ups = result.get("follow_ups", [])
            analysis.topics = result.get("topics", [])
            analysis.keywords = result.get("keywords", [])
            analysis.meeting_score = result.get("meeting_score")
            analysis.meeting_type_detected = result.get("meeting_type")
            analysis.could_be_email = result.get("could_be_email", False)
            analysis.overall_sentiment = result.get("sentiment")
            analysis.model_used = "gpt-4-turbo-preview"
            analysis.api_cost = api_cost
            analysis.tokens_used = input_tokens + output_tokens
            analysis.status = "completed"

            await self.db.commit()
            await self.db.refresh(analysis)

            return analysis

        except Exception as e:
            analysis.status = "failed"
            await self.db.commit()
            raise

    async def get_analysis(
        self,
        user_id: int,
        analysis_id: str,
    ) -> Optional[MeetingAnalysis]:
        """Get analysis by ID"""
        result = await self.db.execute(
            select(MeetingAnalysis).where(
                and_(
                    MeetingAnalysis.id == analysis_id,
                    MeetingAnalysis.user_id == user_id,
                )
            )
        )
        return result.scalar_one_or_none()

    # =========================================================================
    # Meeting Cost Calculator
    # =========================================================================

    async def get_cost_settings(self, user_id: int) -> MeetingCostSettings:
        """Get or create cost settings for user"""
        result = await self.db.execute(
            select(MeetingCostSettings).where(
                MeetingCostSettings.user_id == user_id
            )
        )
        settings = result.scalar_one_or_none()

        if not settings:
            settings = MeetingCostSettings(user_id=user_id)
            self.db.add(settings)
            await self.db.commit()
            await self.db.refresh(settings)

        return settings

    async def update_cost_settings(
        self,
        user_id: int,
        hourly_rate: Optional[float] = None,
        currency: Optional[str] = None,
        include_prep_time: Optional[bool] = None,
        include_recovery_time: Optional[bool] = None,
    ) -> MeetingCostSettings:
        """Update meeting cost settings"""
        settings = await self.get_cost_settings(user_id)

        if hourly_rate is not None:
            settings.default_hourly_rate = hourly_rate
        if currency is not None:
            settings.currency = currency
        if include_prep_time is not None:
            settings.include_prep_time = include_prep_time
        if include_recovery_time is not None:
            settings.include_recovery_time = include_recovery_time

        await self.db.commit()
        await self.db.refresh(settings)
        return settings

    async def calculate_meeting_cost(
        self,
        user_id: int,
        duration_minutes: int,
        attendee_count: int,
        custom_hourly_rate: Optional[float] = None,
    ) -> Dict[str, Any]:
        """
        Calculate the cost of a meeting

        Returns breakdown:
        - base_cost: Duration * Attendees * Hourly Rate
        - prep_cost: 10% of base for prep time
        - recovery_cost: 15 min per person for context switching
        - total_cost: All inclusive
        - opportunity_cost: What else could have been done
        """
        settings = await self.get_cost_settings(user_id)
        hourly_rate = custom_hourly_rate or settings.default_hourly_rate

        # Base calculation
        hours = duration_minutes / 60
        base_cost = hours * attendee_count * hourly_rate

        # Prep time (10% additional)
        prep_cost = base_cost * 0.10 if settings.include_prep_time else 0

        # Recovery time (15 min per person)
        recovery_hours = (15 * attendee_count) / 60 if settings.include_recovery_time else 0
        recovery_cost = recovery_hours * hourly_rate

        total_cost = base_cost + prep_cost + recovery_cost

        # Opportunity cost: What could have been built/done
        # Assuming 1 engineer hour = 0.1 features, 2 bug fixes, etc.
        engineering_hours = hours * attendee_count

        return {
            "duration_minutes": duration_minutes,
            "attendee_count": attendee_count,
            "hourly_rate": hourly_rate,
            "currency": settings.currency,
            "base_cost": round(base_cost, 2),
            "prep_cost": round(prep_cost, 2),
            "recovery_cost": round(recovery_cost, 2),
            "total_cost": round(total_cost, 2),
            "total_person_hours": round(engineering_hours, 1),
            "breakdown": {
                "meeting_time": f"{duration_minutes} min x {attendee_count} people",
                "prep_time": f"{round(duration_minutes * 0.1)} min" if settings.include_prep_time else "N/A",
                "recovery_time": f"15 min x {attendee_count} people" if settings.include_recovery_time else "N/A",
            },
            "opportunity_cost": {
                "could_have_written": f"~{int(engineering_hours * 200)} lines of code",
                "could_have_fixed": f"~{int(engineering_hours * 2)} bugs",
                "could_have_reviewed": f"~{int(engineering_hours * 3)} PRs",
            }
        }

    async def calculate_period_meeting_cost(
        self,
        user_id: int,
        start_date: datetime,
        end_date: datetime,
    ) -> Dict[str, Any]:
        """Calculate total meeting cost for a time period"""
        # Get all meetings in period
        result = await self.db.execute(
            select(CalendarEvent).where(
                and_(
                    CalendarEvent.user_id == user_id,
                    CalendarEvent.start_time >= start_date,
                    CalendarEvent.start_time <= end_date,
                    CalendarEvent.status != "cancelled",
                )
            )
        )
        meetings = result.scalars().all()

        settings = await self.get_cost_settings(user_id)

        total_cost = 0
        total_minutes = 0
        total_meetings = len(meetings)

        for meeting in meetings:
            cost = await self.calculate_meeting_cost(
                user_id,
                meeting.duration_minutes,
                meeting.attendee_count,
            )
            total_cost += cost["total_cost"]
            total_minutes += meeting.duration_minutes

            # Update meeting cost in database
            meeting.meeting_cost = cost["total_cost"]

        await self.db.commit()

        return {
            "period_start": start_date.isoformat(),
            "period_end": end_date.isoformat(),
            "total_meetings": total_meetings,
            "total_minutes": total_minutes,
            "total_hours": round(total_minutes / 60, 1),
            "total_cost": round(total_cost, 2),
            "currency": settings.currency,
            "avg_meeting_cost": round(total_cost / total_meetings, 2) if total_meetings > 0 else 0,
            "avg_meeting_duration": round(total_minutes / total_meetings, 0) if total_meetings > 0 else 0,
        }
