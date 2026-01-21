"""
Real-Time Transcription Service
Uses Deepgram for live streaming transcription during meetings
"""
import asyncio
import json
from typing import Optional, Callable, Dict, Any, List
from datetime import datetime
import uuid

from deepgram import (
    DeepgramClient,
    DeepgramClientOptions,
    LiveTranscriptionEvents,
    LiveOptions,
)

from app.core.config import settings


class RealtimeTranscriptionSession:
    """Manages a single real-time transcription session"""

    def __init__(
        self,
        session_id: str,
        user_id: int,
        meeting_title: Optional[str] = None,
        on_transcript: Optional[Callable] = None,
        on_error: Optional[Callable] = None,
    ):
        self.session_id = session_id
        self.user_id = user_id
        self.meeting_title = meeting_title or "Live Meeting"
        self.on_transcript = on_transcript
        self.on_error = on_error

        self.is_active = False
        self.start_time: Optional[datetime] = None
        self.end_time: Optional[datetime] = None

        # Transcription results
        self.full_transcript: List[Dict[str, Any]] = []
        self.final_text = ""
        self.word_count = 0
        self.speakers: set = set()

        # Deepgram connection
        self.dg_connection = None
        self.client = None

        # Cost tracking (~$0.0043/min for Deepgram Nova-2)
        self.cost_per_minute = 0.0043
        self.total_audio_seconds = 0

    async def start(self) -> bool:
        """Start the real-time transcription session"""
        try:
            # Initialize Deepgram client
            config = DeepgramClientOptions(
                verbose=False,
            )
            self.client = DeepgramClient(settings.DEEPGRAM_API_KEY, config)

            # Configure live transcription options
            options = LiveOptions(
                model="nova-2",
                language="en-US",
                smart_format=True,
                punctuate=True,
                diarize=True,  # Speaker detection
                interim_results=True,  # Get partial results
                utterance_end_ms=1000,
                vad_events=True,
                encoding="linear16",
                sample_rate=16000,
                channels=1,
            )

            # Create live connection
            self.dg_connection = self.client.listen.asynclive.v("1")

            # Set up event handlers
            self.dg_connection.on(LiveTranscriptionEvents.Open, self._on_open)
            self.dg_connection.on(LiveTranscriptionEvents.Transcript, self._on_transcript)
            self.dg_connection.on(LiveTranscriptionEvents.Error, self._on_error)
            self.dg_connection.on(LiveTranscriptionEvents.Close, self._on_close)
            self.dg_connection.on(LiveTranscriptionEvents.SpeechStarted, self._on_speech_started)
            self.dg_connection.on(LiveTranscriptionEvents.UtteranceEnd, self._on_utterance_end)

            # Start connection
            if await self.dg_connection.start(options):
                self.is_active = True
                self.start_time = datetime.utcnow()
                return True

            return False

        except Exception as e:
            if self.on_error:
                await self.on_error({"error": str(e)})
            return False

    async def send_audio(self, audio_data: bytes) -> bool:
        """Send audio chunk to Deepgram for transcription"""
        if not self.is_active or not self.dg_connection:
            return False

        try:
            await self.dg_connection.send(audio_data)
            # Track audio duration (16-bit, 16kHz mono = 32000 bytes/sec)
            self.total_audio_seconds += len(audio_data) / 32000
            return True
        except Exception as e:
            if self.on_error:
                await self.on_error({"error": f"Failed to send audio: {str(e)}"})
            return False

    async def stop(self) -> Dict[str, Any]:
        """Stop the transcription session and return final results"""
        self.is_active = False
        self.end_time = datetime.utcnow()

        if self.dg_connection:
            try:
                await self.dg_connection.finish()
            except Exception:
                pass

        # Calculate final cost
        duration_minutes = self.total_audio_seconds / 60
        total_cost = duration_minutes * self.cost_per_minute

        return {
            "session_id": self.session_id,
            "meeting_title": self.meeting_title,
            "start_time": self.start_time.isoformat() if self.start_time else None,
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_seconds": int(self.total_audio_seconds),
            "transcript": self.final_text,
            "segments": self.full_transcript,
            "word_count": self.word_count,
            "speakers_detected": len(self.speakers),
            "api_cost": round(total_cost, 4),
        }

    # Event handlers
    async def _on_open(self, *args, **kwargs):
        """Called when connection opens"""
        pass

    async def _on_transcript(self, *args, **kwargs):
        """Called when transcript is received"""
        try:
            result = kwargs.get("result") or (args[1] if len(args) > 1 else None)
            if not result:
                return

            channel = result.channel
            alternatives = channel.alternatives

            if alternatives and len(alternatives) > 0:
                transcript = alternatives[0].transcript

                if not transcript:
                    return

                is_final = result.is_final
                speech_final = result.speech_final

                # Get speaker info if available
                speaker = None
                words = alternatives[0].words
                if words and len(words) > 0:
                    first_word = words[0]
                    if hasattr(first_word, 'speaker'):
                        speaker = first_word.speaker
                        self.speakers.add(speaker)

                # Build segment
                segment = {
                    "text": transcript,
                    "is_final": is_final,
                    "speaker": speaker,
                    "timestamp": datetime.utcnow().isoformat(),
                    "confidence": alternatives[0].confidence if hasattr(alternatives[0], 'confidence') else None,
                }

                # If final, add to full transcript
                if is_final and transcript.strip():
                    self.full_transcript.append(segment)
                    self.final_text += " " + transcript if self.final_text else transcript
                    self.word_count = len(self.final_text.split())

                # Send to callback
                if self.on_transcript:
                    await self.on_transcript({
                        "type": "transcript",
                        "session_id": self.session_id,
                        "is_final": is_final,
                        "speech_final": speech_final,
                        "text": transcript,
                        "speaker": speaker,
                        "word_count": self.word_count,
                        "speakers": list(self.speakers),
                    })

        except Exception as e:
            if self.on_error:
                await self.on_error({"error": f"Transcript processing error: {str(e)}"})

    async def _on_error(self, *args, **kwargs):
        """Called on error"""
        error = kwargs.get("error") or (args[1] if len(args) > 1 else "Unknown error")
        if self.on_error:
            await self.on_error({"error": str(error)})

    async def _on_close(self, *args, **kwargs):
        """Called when connection closes"""
        self.is_active = False

    async def _on_speech_started(self, *args, **kwargs):
        """Called when speech is detected"""
        if self.on_transcript:
            await self.on_transcript({
                "type": "speech_started",
                "session_id": self.session_id,
            })

    async def _on_utterance_end(self, *args, **kwargs):
        """Called when utterance ends"""
        if self.on_transcript:
            await self.on_transcript({
                "type": "utterance_end",
                "session_id": self.session_id,
            })


class RealtimeTranscriptionManager:
    """Manages multiple real-time transcription sessions"""

    def __init__(self):
        self.sessions: Dict[str, RealtimeTranscriptionSession] = {}

    def create_session(
        self,
        user_id: int,
        meeting_title: Optional[str] = None,
        on_transcript: Optional[Callable] = None,
        on_error: Optional[Callable] = None,
    ) -> str:
        """Create a new transcription session"""
        session_id = str(uuid.uuid4())

        session = RealtimeTranscriptionSession(
            session_id=session_id,
            user_id=user_id,
            meeting_title=meeting_title,
            on_transcript=on_transcript,
            on_error=on_error,
        )

        self.sessions[session_id] = session
        return session_id

    def get_session(self, session_id: str) -> Optional[RealtimeTranscriptionSession]:
        """Get a session by ID"""
        return self.sessions.get(session_id)

    async def start_session(self, session_id: str) -> bool:
        """Start a transcription session"""
        session = self.get_session(session_id)
        if not session:
            return False
        return await session.start()

    async def send_audio(self, session_id: str, audio_data: bytes) -> bool:
        """Send audio to a session"""
        session = self.get_session(session_id)
        if not session:
            return False
        return await session.send_audio(audio_data)

    async def stop_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Stop a session and get results"""
        session = self.get_session(session_id)
        if not session:
            return None

        result = await session.stop()

        # Keep session for a while for result retrieval
        # In production, you'd want to save to database and clean up

        return result

    def remove_session(self, session_id: str):
        """Remove a session"""
        if session_id in self.sessions:
            del self.sessions[session_id]


# Global manager instance
realtime_manager = RealtimeTranscriptionManager()
