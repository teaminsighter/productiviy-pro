"""
Meeting Intelligence API Routes
Endpoints for meeting transcription, AI analysis, and cost calculation
"""
from datetime import datetime, timedelta
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.services.meeting_intelligence import MeetingIntelligenceService


router = APIRouter(tags=["Meeting Intelligence"])


# ============================================================================
# Request/Response Models
# ============================================================================


class TranscriptResponse(BaseModel):
    id: str
    meeting_title: Optional[str]
    meeting_date: str
    duration_seconds: int
    status: str
    transcription_text: Optional[str]
    word_count: int
    speakers_detected: int
    api_cost: float
    created_at: str


class AnalysisResponse(BaseModel):
    id: str
    transcript_id: Optional[str]
    summary: Optional[str]
    key_points: list
    action_items: list
    action_items_count: int
    decisions: list
    follow_ups: list
    topics: list
    keywords: list
    meeting_score: Optional[int]
    meeting_type_detected: Optional[str]
    could_be_email: bool
    overall_sentiment: Optional[str]
    status: str
    api_cost: float
    created_at: str


class AnalyzeTextRequest(BaseModel):
    text: str
    meeting_title: Optional[str] = None
    attendees: Optional[List[str]] = None


class CostSettingsRequest(BaseModel):
    hourly_rate: Optional[float] = None
    currency: Optional[str] = None
    include_prep_time: Optional[bool] = None
    include_recovery_time: Optional[bool] = None


class CostCalculateRequest(BaseModel):
    duration_minutes: int
    attendee_count: int
    custom_hourly_rate: Optional[float] = None


# ============================================================================
# Transcription Endpoints
# ============================================================================


@router.post("/transcribe")
async def transcribe_audio(
    audio: UploadFile = File(...),
    meeting_title: Optional[str] = Query(default=None),
    calendar_event_id: Optional[str] = Query(default=None),
    language: str = Query(default="en"),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TranscriptResponse:
    """
    Transcribe audio file using OpenAI Whisper

    Supported formats: webm, mp3, wav, m4a, mp4, mpeg, mpga, oga, ogg
    Max file size: 25MB
    Cost: ~$0.006 per minute
    """
    # Validate file
    allowed_formats = ["webm", "mp3", "wav", "m4a", "mp4", "mpeg", "mpga", "oga", "ogg"]
    file_ext = audio.filename.split(".")[-1].lower() if audio.filename else "webm"

    if file_ext not in allowed_formats:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported audio format. Allowed: {', '.join(allowed_formats)}"
        )

    # Read audio data
    audio_data = await audio.read()

    # Check file size (25MB max for Whisper)
    if len(audio_data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 25MB.")

    service = MeetingIntelligenceService(db)

    try:
        transcript = await service.transcribe_audio(
            user_id=current_user.id,
            audio_data=audio_data,
            audio_format=file_ext,
            meeting_title=meeting_title,
            calendar_event_id=calendar_event_id,
            language=language,
        )

        return TranscriptResponse(
            id=transcript.id,
            meeting_title=transcript.meeting_title,
            meeting_date=transcript.meeting_date.isoformat(),
            duration_seconds=transcript.duration_seconds,
            status=transcript.status,
            transcription_text=transcript.transcription_text,
            word_count=transcript.word_count,
            speakers_detected=transcript.speakers_detected,
            api_cost=transcript.api_cost,
            created_at=transcript.created_at.isoformat(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/transcripts")
async def list_transcripts(
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """List all transcripts for the current user"""
    service = MeetingIntelligenceService(db)
    transcripts = await service.list_transcripts(
        user_id=current_user.id,
        limit=limit,
        offset=offset,
    )

    return {
        "transcripts": [
            {
                "id": t.id,
                "meeting_title": t.meeting_title,
                "meeting_date": t.meeting_date.isoformat(),
                "duration_seconds": t.duration_seconds,
                "status": t.status,
                "word_count": t.word_count,
                "created_at": t.created_at.isoformat(),
            }
            for t in transcripts
        ]
    }


@router.get("/transcripts/{transcript_id}")
async def get_transcript(
    transcript_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TranscriptResponse:
    """Get a specific transcript"""
    service = MeetingIntelligenceService(db)
    transcript = await service.get_transcript(current_user.id, transcript_id)

    if not transcript:
        raise HTTPException(status_code=404, detail="Transcript not found")

    return TranscriptResponse(
        id=transcript.id,
        meeting_title=transcript.meeting_title,
        meeting_date=transcript.meeting_date.isoformat(),
        duration_seconds=transcript.duration_seconds,
        status=transcript.status,
        transcription_text=transcript.transcription_text,
        word_count=transcript.word_count,
        speakers_detected=transcript.speakers_detected,
        api_cost=transcript.api_cost,
        created_at=transcript.created_at.isoformat(),
    )


# ============================================================================
# Analysis Endpoints
# ============================================================================


@router.post("/analyze/transcript/{transcript_id}")
async def analyze_transcript(
    transcript_id: str,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalysisResponse:
    """
    Analyze an existing transcript using GPT

    Extracts: summary, action items, decisions, follow-ups, meeting score
    Cost: ~$0.02-0.05 per analysis
    """
    service = MeetingIntelligenceService(db)

    try:
        analysis = await service.analyze_meeting(
            user_id=current_user.id,
            transcript_id=transcript_id,
        )

        return AnalysisResponse(
            id=analysis.id,
            transcript_id=analysis.transcript_id,
            summary=analysis.summary,
            key_points=analysis.key_points,
            action_items=analysis.action_items,
            action_items_count=analysis.action_items_count,
            decisions=analysis.decisions,
            follow_ups=analysis.follow_ups,
            topics=analysis.topics,
            keywords=analysis.keywords,
            meeting_score=analysis.meeting_score,
            meeting_type_detected=analysis.meeting_type_detected,
            could_be_email=analysis.could_be_email,
            overall_sentiment=analysis.overall_sentiment,
            status=analysis.status,
            api_cost=analysis.api_cost,
            created_at=analysis.created_at.isoformat(),
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze/text")
async def analyze_text(
    request: AnalyzeTextRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalysisResponse:
    """
    Analyze raw meeting notes or transcript text

    Useful for manually entered meeting notes or external transcripts
    """
    service = MeetingIntelligenceService(db)

    try:
        analysis = await service.analyze_meeting(
            user_id=current_user.id,
            transcript_text=request.text,
            meeting_title=request.meeting_title,
            attendees=request.attendees,
        )

        return AnalysisResponse(
            id=analysis.id,
            transcript_id=analysis.transcript_id,
            summary=analysis.summary,
            key_points=analysis.key_points,
            action_items=analysis.action_items,
            action_items_count=analysis.action_items_count,
            decisions=analysis.decisions,
            follow_ups=analysis.follow_ups,
            topics=analysis.topics,
            keywords=analysis.keywords,
            meeting_score=analysis.meeting_score,
            meeting_type_detected=analysis.meeting_type_detected,
            could_be_email=analysis.could_be_email,
            overall_sentiment=analysis.overall_sentiment,
            status=analysis.status,
            api_cost=analysis.api_cost,
            created_at=analysis.created_at.isoformat(),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analysis/{analysis_id}")
async def get_analysis(
    analysis_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> AnalysisResponse:
    """Get a specific meeting analysis"""
    service = MeetingIntelligenceService(db)
    analysis = await service.get_analysis(current_user.id, analysis_id)

    if not analysis:
        raise HTTPException(status_code=404, detail="Analysis not found")

    return AnalysisResponse(
        id=analysis.id,
        transcript_id=analysis.transcript_id,
        summary=analysis.summary,
        key_points=analysis.key_points,
        action_items=analysis.action_items,
        action_items_count=analysis.action_items_count,
        decisions=analysis.decisions,
        follow_ups=analysis.follow_ups,
        topics=analysis.topics,
        keywords=analysis.keywords,
        meeting_score=analysis.meeting_score,
        meeting_type_detected=analysis.meeting_type_detected,
        could_be_email=analysis.could_be_email,
        overall_sentiment=analysis.overall_sentiment,
        status=analysis.status,
        api_cost=analysis.api_cost,
        created_at=analysis.created_at.isoformat(),
    )


# ============================================================================
# Cost Calculator Endpoints
# ============================================================================


@router.get("/cost/settings")
async def get_cost_settings(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get meeting cost calculation settings"""
    service = MeetingIntelligenceService(db)
    settings = await service.get_cost_settings(current_user.id)

    return {
        "hourly_rate": settings.default_hourly_rate,
        "currency": settings.currency,
        "include_prep_time": settings.include_prep_time,
        "include_recovery_time": settings.include_recovery_time,
        "work_hours_per_day": settings.work_hours_per_day,
    }


@router.put("/cost/settings")
async def update_cost_settings(
    request: CostSettingsRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update meeting cost calculation settings"""
    service = MeetingIntelligenceService(db)
    settings = await service.update_cost_settings(
        user_id=current_user.id,
        hourly_rate=request.hourly_rate,
        currency=request.currency,
        include_prep_time=request.include_prep_time,
        include_recovery_time=request.include_recovery_time,
    )

    return {
        "hourly_rate": settings.default_hourly_rate,
        "currency": settings.currency,
        "include_prep_time": settings.include_prep_time,
        "include_recovery_time": settings.include_recovery_time,
    }


@router.post("/cost/calculate")
async def calculate_meeting_cost(
    request: CostCalculateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate the cost of a meeting

    Returns:
    - Base cost (duration * attendees * hourly rate)
    - Prep time cost (10% additional)
    - Recovery cost (15 min context switching per person)
    - Total cost
    - Opportunity cost (what could have been done instead)
    """
    service = MeetingIntelligenceService(db)

    result = await service.calculate_meeting_cost(
        user_id=current_user.id,
        duration_minutes=request.duration_minutes,
        attendee_count=request.attendee_count,
        custom_hourly_rate=request.custom_hourly_rate,
    )

    return result


@router.get("/cost/period")
async def get_period_meeting_cost(
    days: int = Query(default=7, ge=1, le=90),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Calculate total meeting cost for a time period

    Returns aggregate costs for all meetings in the period
    """
    service = MeetingIntelligenceService(db)

    end_date = datetime.utcnow()
    start_date = end_date - timedelta(days=days)

    result = await service.calculate_period_meeting_cost(
        user_id=current_user.id,
        start_date=start_date,
        end_date=end_date,
    )

    return result


# ============================================================================
# Quick Actions
# ============================================================================


@router.post("/quick-transcribe-analyze")
async def quick_transcribe_and_analyze(
    audio: UploadFile = File(...),
    meeting_title: Optional[str] = Query(default=None),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    One-click: Upload audio, transcribe, and analyze

    Returns both transcript and AI analysis in one call
    Total cost: ~$0.01-0.10 depending on audio length
    """
    # Validate file
    allowed_formats = ["webm", "mp3", "wav", "m4a", "mp4"]
    file_ext = audio.filename.split(".")[-1].lower() if audio.filename else "webm"

    if file_ext not in allowed_formats:
        raise HTTPException(status_code=400, detail="Unsupported format")

    audio_data = await audio.read()
    if len(audio_data) > 25 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Max 25MB.")

    service = MeetingIntelligenceService(db)

    # Step 1: Transcribe
    transcript = await service.transcribe_audio(
        user_id=current_user.id,
        audio_data=audio_data,
        audio_format=file_ext,
        meeting_title=meeting_title,
    )

    # Step 2: Analyze
    analysis = await service.analyze_meeting(
        user_id=current_user.id,
        transcript_id=transcript.id,
        meeting_title=meeting_title,
    )

    return {
        "transcript": {
            "id": transcript.id,
            "text": transcript.transcription_text,
            "duration_seconds": transcript.duration_seconds,
            "word_count": transcript.word_count,
        },
        "analysis": {
            "id": analysis.id,
            "summary": analysis.summary,
            "action_items": analysis.action_items,
            "decisions": analysis.decisions,
            "meeting_score": analysis.meeting_score,
            "could_be_email": analysis.could_be_email,
        },
        "total_cost": round(transcript.api_cost + analysis.api_cost, 4),
    }
