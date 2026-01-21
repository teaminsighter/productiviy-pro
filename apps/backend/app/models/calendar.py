"""
Calendar and Deep Work models for meeting tracking and focus analytics
"""
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, ForeignKey, Text, Enum
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.core.database import Base
from datetime import datetime
import uuid
import enum


class CalendarProvider(str, enum.Enum):
    GOOGLE = "google"
    OUTLOOK = "outlook"
    APPLE = "apple"


class CalendarConnection(Base):
    """Stores OAuth connections to calendar providers"""
    __tablename__ = "calendar_connections"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Provider info
    provider = Column(Enum(CalendarProvider, name='calendar_provider'), default=CalendarProvider.GOOGLE)
    provider_account_id = Column(String(255), nullable=True)  # Google account ID
    provider_email = Column(String(255), nullable=True)  # Calendar account email

    # OAuth tokens (encrypted in production)
    access_token = Column(Text, nullable=True)
    refresh_token = Column(Text, nullable=True)
    token_expires_at = Column(DateTime, nullable=True)

    # Sync settings
    is_active = Column(Boolean, default=True)
    calendars_to_sync = Column(JSON, default=["primary"])  # List of calendar IDs to sync
    last_sync_at = Column(DateTime, nullable=True)
    sync_status = Column(String(50), default="pending")  # pending, syncing, success, error
    sync_error = Column(Text, nullable=True)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    events = relationship("CalendarEvent", back_populates="calendar_connection", cascade="all, delete-orphan")


class CalendarEvent(Base):
    """Stores synced calendar events (meetings)"""
    __tablename__ = "calendar_events"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    calendar_connection_id = Column(String, ForeignKey("calendar_connections.id"), nullable=False)

    # Provider identifiers
    provider_event_id = Column(String(255), nullable=False)  # Google event ID
    provider_calendar_id = Column(String(255), default="primary")

    # Event details
    title = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    location = Column(String(500), nullable=True)

    # Time
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=0)
    is_all_day = Column(Boolean, default=False)
    timezone = Column(String(50), default="UTC")

    # Recurrence
    is_recurring = Column(Boolean, default=False)
    recurrence_rule = Column(String(500), nullable=True)  # RRULE format
    recurring_event_id = Column(String(255), nullable=True)  # Parent event ID for recurring

    # Attendees
    attendee_count = Column(Integer, default=1)
    attendees = Column(JSON, default=[])  # List of {email, name, response_status}
    organizer_email = Column(String(255), nullable=True)
    is_organizer = Column(Boolean, default=False)

    # Status
    status = Column(String(50), default="confirmed")  # confirmed, tentative, cancelled
    response_status = Column(String(50), default="accepted")  # accepted, declined, tentative, needsAction

    # Meeting info
    meeting_url = Column(String(500), nullable=True)  # Zoom, Meet, Teams link
    meeting_type = Column(String(50), nullable=True)  # zoom, meet, teams, in_person

    # Deep Work Analysis
    is_focus_time = Column(Boolean, default=False)  # User marked as focus time
    meeting_cost = Column(Float, nullable=True)  # Calculated cost (attendees * duration * hourly_rate)

    # Metadata
    raw_data = Column(JSON, nullable=True)  # Store original API response
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
    synced_at = Column(DateTime, server_default=func.now())

    # Relationships
    calendar_connection = relationship("CalendarConnection", back_populates="events")


class MeetingTranscript(Base):
    """Stores meeting audio transcriptions"""
    __tablename__ = "meeting_transcripts"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    calendar_event_id = Column(String, ForeignKey("calendar_events.id"), nullable=True, index=True)

    # Meeting info (if not linked to calendar)
    meeting_title = Column(String(500), nullable=True)
    meeting_date = Column(DateTime, nullable=False, index=True)
    duration_seconds = Column(Integer, default=0)

    # Audio file info
    audio_file_path = Column(String(500), nullable=True)
    audio_file_size = Column(Integer, default=0)  # bytes
    audio_format = Column(String(50), default="webm")  # webm, mp3, wav, m4a

    # Transcription
    transcription_text = Column(Text, nullable=True)
    transcription_segments = Column(JSON, default=[])  # [{start, end, text, speaker}]
    language = Column(String(10), default="en")
    word_count = Column(Integer, default=0)

    # Speaker diarization
    speakers_detected = Column(Integer, default=1)
    speaker_names = Column(JSON, default={})  # {speaker_1: "John", speaker_2: "Sarah"}

    # Processing status
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    error_message = Column(Text, nullable=True)
    processing_started_at = Column(DateTime, nullable=True)
    processing_completed_at = Column(DateTime, nullable=True)

    # Costs
    api_cost = Column(Float, default=0)  # Cost of Whisper API call

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    analysis = relationship("MeetingAnalysis", back_populates="transcript", uselist=False, cascade="all, delete-orphan")


class MeetingAnalysis(Base):
    """AI-generated meeting analysis and summaries"""
    __tablename__ = "meeting_analyses"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    transcript_id = Column(String, ForeignKey("meeting_transcripts.id"), nullable=True, index=True)
    calendar_event_id = Column(String, ForeignKey("calendar_events.id"), nullable=True)

    # Summary
    summary = Column(Text, nullable=True)  # 3-5 bullet point summary
    key_points = Column(JSON, default=[])  # List of main discussion points

    # Action items
    action_items = Column(JSON, default=[])  # [{task, assignee, due_date, priority}]
    action_items_count = Column(Integer, default=0)

    # Decisions made
    decisions = Column(JSON, default=[])  # List of decisions made in meeting

    # Follow-ups
    follow_ups = Column(JSON, default=[])  # Things needing follow-up

    # Topics discussed
    topics = Column(JSON, default=[])  # Main topics with time spent
    keywords = Column(JSON, default=[])  # Key terms mentioned

    # Sentiment & Engagement
    overall_sentiment = Column(String(50), nullable=True)  # positive, neutral, negative
    engagement_score = Column(Integer, nullable=True)  # 0-100
    participation_breakdown = Column(JSON, default={})  # {speaker: percentage}

    # Meeting quality assessment
    meeting_score = Column(Integer, nullable=True)  # 0-100 "was this productive?"
    meeting_type_detected = Column(String(50), nullable=True)  # standup, brainstorm, 1on1, review, etc
    could_be_email = Column(Boolean, default=False)  # AI assessment: could this have been an email?

    # Processing
    status = Column(String(50), default="pending")  # pending, processing, completed, failed
    model_used = Column(String(50), default="gpt-4")
    api_cost = Column(Float, default=0)
    tokens_used = Column(Integer, default=0)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())

    # Relationships
    transcript = relationship("MeetingTranscript", back_populates="analysis")


class MeetingCostSettings(Base):
    """User/team settings for meeting cost calculations"""
    __tablename__ = "meeting_cost_settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)

    # Hourly rates
    default_hourly_rate = Column(Float, default=50.0)  # Default rate per person
    custom_rates = Column(JSON, default={})  # {email: hourly_rate} for specific people
    currency = Column(String(10), default="USD")

    # Calculation settings
    include_prep_time = Column(Boolean, default=True)  # Add 10% for meeting prep
    include_recovery_time = Column(Boolean, default=True)  # Add 15min recovery after meetings
    work_hours_per_day = Column(Float, default=8.0)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class DeepWorkScore(Base):
    """Daily calculated deep work metrics"""
    __tablename__ = "deep_work_scores"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    date = Column(DateTime, nullable=False, index=True)  # Date for this score (start of day)

    # Core Metrics
    deep_work_score = Column(Integer, default=0)  # 0-100 overall score
    deep_work_minutes = Column(Integer, default=0)  # Minutes of uninterrupted productive work
    total_tracked_minutes = Column(Integer, default=0)  # Total minutes tracked

    # Meeting Metrics
    total_meeting_minutes = Column(Integer, default=0)
    meeting_count = Column(Integer, default=0)
    meeting_load_percent = Column(Float, default=0)  # % of work hours in meetings

    # Fragmentation Metrics
    fragmentation_score = Column(Integer, default=0)  # 0-100 (lower is better, inverted for display)
    context_switches = Column(Integer, default=0)  # Number of app/task switches
    longest_focus_block_minutes = Column(Integer, default=0)  # Longest uninterrupted work period
    average_focus_block_minutes = Column(Float, default=0)
    focus_blocks_count = Column(Integer, default=0)  # Number of focus blocks > 30 min

    # Productivity Breakdown
    productive_minutes = Column(Integer, default=0)
    neutral_minutes = Column(Integer, default=0)
    distracting_minutes = Column(Integer, default=0)
    focus_efficiency = Column(Float, default=0)  # productive_time / available_focus_time

    # Time Analysis
    work_start_time = Column(DateTime, nullable=True)  # First activity
    work_end_time = Column(DateTime, nullable=True)  # Last activity
    best_focus_hour = Column(Integer, nullable=True)  # Hour with highest productivity (0-23)

    # Comparisons
    vs_yesterday = Column(Float, nullable=True)  # % change from yesterday
    vs_week_avg = Column(Float, nullable=True)  # % change from 7-day average
    vs_month_avg = Column(Float, nullable=True)  # % change from 30-day average

    # AI Insights
    ai_summary = Column(Text, nullable=True)  # AI-generated daily summary
    ai_recommendations = Column(JSON, default=[])  # List of recommendations

    # Metadata
    calculated_at = Column(DateTime, server_default=func.now())
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class FocusBlock(Base):
    """Scheduled or detected focus time blocks"""
    __tablename__ = "focus_blocks"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)

    # Time
    start_time = Column(DateTime, nullable=False, index=True)
    end_time = Column(DateTime, nullable=False)
    duration_minutes = Column(Integer, default=0)

    # Type
    block_type = Column(String(50), default="manual")  # manual, auto_detected, calendar_sync
    source = Column(String(50), nullable=True)  # "user", "ai_suggestion", "calendar"

    # Status
    status = Column(String(50), default="scheduled")  # scheduled, active, completed, cancelled
    completed_minutes = Column(Integer, default=0)  # Actual focus time achieved
    success_rate = Column(Float, nullable=True)  # completed_minutes / duration_minutes

    # Blocking settings
    blocking_enabled = Column(Boolean, default=False)
    blocked_apps = Column(JSON, default=[])
    blocked_websites = Column(JSON, default=[])
    distractions_blocked = Column(Integer, default=0)  # Count of blocked attempts

    # Calendar sync
    calendar_event_id = Column(String, ForeignKey("calendar_events.id"), nullable=True)
    synced_to_calendar = Column(Boolean, default=False)

    # Metadata
    title = Column(String(255), default="Focus Time")
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())


class FocusSettings(Base):
    """User's focus mode preferences and blocking settings"""
    __tablename__ = "focus_settings"

    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, unique=True, index=True)

    # Default blocking lists
    default_blocked_apps = Column(JSON, default=[
        "Slack", "Discord", "Messages", "Mail", "Telegram",
        "WhatsApp", "Messenger", "Twitter", "Facebook"
    ])
    default_blocked_websites = Column(JSON, default=[
        "twitter.com", "x.com", "facebook.com", "instagram.com",
        "reddit.com", "youtube.com", "tiktok.com", "netflix.com",
        "twitch.tv", "discord.com"
    ])

    # Allowed during focus (exceptions)
    allowed_apps = Column(JSON, default=[])
    allowed_websites = Column(JSON, default=[])

    # Auto-focus settings
    auto_start_from_calendar = Column(Boolean, default=True)  # Auto-start when calendar focus event starts
    auto_detect_gaps = Column(Boolean, default=True)  # Suggest focus for calendar gaps
    min_gap_minutes = Column(Integer, default=30)  # Minimum gap to suggest as focus time

    # Break settings (Pomodoro)
    focus_duration_minutes = Column(Integer, default=50)  # Default focus session length
    break_duration_minutes = Column(Integer, default=10)  # Break length
    long_break_duration_minutes = Column(Integer, default=30)  # Long break after X sessions
    sessions_before_long_break = Column(Integer, default=4)
    break_reminders_enabled = Column(Boolean, default=True)

    # Notification settings
    focus_start_notification = Column(Boolean, default=True)
    focus_end_notification = Column(Boolean, default=True)
    distraction_blocked_notification = Column(Boolean, default=True)

    # Blocking behavior
    blocking_mode = Column(String(50), default="soft")  # soft (warning), hard (blocked), nuclear (no bypass)
    bypass_password = Column(String(255), nullable=True)  # Optional password to bypass
    bypass_cooldown_minutes = Column(Integer, default=5)  # Wait time before allowing bypass

    # Work schedule (for auto-suggestions)
    work_start_time = Column(String(10), default="09:00")  # HH:MM format
    work_end_time = Column(String(10), default="18:00")
    work_days = Column(JSON, default=[1, 2, 3, 4, 5])  # Monday=1, Sunday=7

    # Stats
    total_focus_minutes = Column(Integer, default=0)
    total_distractions_blocked = Column(Integer, default=0)
    current_streak_days = Column(Integer, default=0)
    longest_streak_days = Column(Integer, default=0)
    last_focus_date = Column(DateTime, nullable=True)

    # Metadata
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
