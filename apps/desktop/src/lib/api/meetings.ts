import apiClient from './client';

// ============================================================================
// Types
// ============================================================================

export interface Transcript {
  id: string;
  meetingTitle: string | null;
  meetingDate: string;
  durationSeconds: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  transcriptionText: string | null;
  wordCount: number;
  speakersDetected: number;
  apiCost: number;
  createdAt: string;
}

export interface MeetingAnalysis {
  id: string;
  transcriptId: string | null;
  summary: string | null;
  keyPoints: string[];
  actionItems: Array<{
    task: string;
    assignee: string | null;
    priority: 'high' | 'medium' | 'low';
  }>;
  actionItemsCount: number;
  decisions: string[];
  followUps: string[];
  topics: Array<{ topic: string; importance: string }>;
  keywords: string[];
  meetingScore: number | null;
  meetingTypeDetected: string | null;
  couldBeEmail: boolean;
  overallSentiment: 'positive' | 'neutral' | 'negative' | null;
  status: string;
  apiCost: number;
  createdAt: string;
}

export interface MeetingCostSettings {
  hourlyRate: number;
  currency: string;
  includePrepTime: boolean;
  includeRecoveryTime: boolean;
}

export interface MeetingCostResult {
  durationMinutes: number;
  attendeeCount: number;
  hourlyRate: number;
  currency: string;
  baseCost: number;
  prepCost: number;
  recoveryCost: number;
  totalCost: number;
  totalPersonHours: number;
  breakdown: {
    meetingTime: string;
    prepTime: string;
    recoveryTime: string;
  };
  opportunityCost: {
    couldHaveWritten: string;
    couldHaveFixed: string;
    couldHaveReviewed: string;
  };
}

export interface PeriodCostResult {
  periodStart: string;
  periodEnd: string;
  totalMeetings: number;
  totalMinutes: number;
  totalHours: number;
  totalCost: number;
  currency: string;
  avgMeetingCost: number;
  avgMeetingDuration: number;
}

export interface QuickAnalysisResult {
  transcript: {
    id: string;
    text: string;
    durationSeconds: number;
    wordCount: number;
  };
  analysis: {
    id: string;
    summary: string;
    actionItems: Array<{ task: string; assignee: string | null; priority: string }>;
    decisions: string[];
    meetingScore: number;
    couldBeEmail: boolean;
  };
  totalCost: number;
}

// ============================================================================
// Transcription API
// ============================================================================

export async function transcribeAudio(
  audioFile: File,
  meetingTitle?: string,
  calendarEventId?: string,
  language: string = 'en'
): Promise<Transcript> {
  const formData = new FormData();
  formData.append('audio', audioFile);

  const params = new URLSearchParams();
  if (meetingTitle) params.append('meeting_title', meetingTitle);
  if (calendarEventId) params.append('calendar_event_id', calendarEventId);
  params.append('language', language);

  const response = await apiClient.post(`/api/meetings/transcribe?${params.toString()}`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return transformTranscript(response.data);
}

export async function listTranscripts(limit: number = 20, offset: number = 0): Promise<Transcript[]> {
  const response = await apiClient.get('/api/meetings/transcripts', {
    params: { limit, offset },
  });

  return response.data.transcripts.map(transformTranscriptSummary);
}

export async function getTranscript(transcriptId: string): Promise<Transcript> {
  const response = await apiClient.get(`/api/meetings/transcripts/${transcriptId}`);
  return transformTranscript(response.data);
}

// ============================================================================
// Analysis API
// ============================================================================

export async function analyzeTranscript(transcriptId: string): Promise<MeetingAnalysis> {
  const response = await apiClient.post(`/api/meetings/analyze/transcript/${transcriptId}`);
  return transformAnalysis(response.data);
}

export async function analyzeText(
  text: string,
  meetingTitle?: string,
  attendees?: string[]
): Promise<MeetingAnalysis> {
  const response = await apiClient.post('/api/meetings/analyze/text', {
    text,
    meeting_title: meetingTitle,
    attendees,
  });
  return transformAnalysis(response.data);
}

export async function getAnalysis(analysisId: string): Promise<MeetingAnalysis> {
  const response = await apiClient.get(`/api/meetings/analysis/${analysisId}`);
  return transformAnalysis(response.data);
}

// ============================================================================
// Quick Actions
// ============================================================================

export async function quickTranscribeAndAnalyze(
  audioFile: File,
  meetingTitle?: string
): Promise<QuickAnalysisResult> {
  const formData = new FormData();
  formData.append('audio', audioFile);

  const params = new URLSearchParams();
  if (meetingTitle) params.append('meeting_title', meetingTitle);

  const response = await apiClient.post(
    `/api/meetings/quick-transcribe-analyze?${params.toString()}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );

  return {
    transcript: {
      id: response.data.transcript.id,
      text: response.data.transcript.text,
      durationSeconds: response.data.transcript.duration_seconds,
      wordCount: response.data.transcript.word_count,
    },
    analysis: {
      id: response.data.analysis.id,
      summary: response.data.analysis.summary,
      actionItems: response.data.analysis.action_items,
      decisions: response.data.analysis.decisions,
      meetingScore: response.data.analysis.meeting_score,
      couldBeEmail: response.data.analysis.could_be_email,
    },
    totalCost: response.data.total_cost,
  };
}

// ============================================================================
// Cost Calculator API
// ============================================================================

export async function getCostSettings(): Promise<MeetingCostSettings> {
  const response = await apiClient.get('/api/meetings/cost/settings');
  return {
    hourlyRate: response.data.hourly_rate,
    currency: response.data.currency,
    includePrepTime: response.data.include_prep_time,
    includeRecoveryTime: response.data.include_recovery_time,
  };
}

export async function updateCostSettings(
  settings: Partial<MeetingCostSettings>
): Promise<MeetingCostSettings> {
  const response = await apiClient.put('/api/meetings/cost/settings', {
    hourly_rate: settings.hourlyRate,
    currency: settings.currency,
    include_prep_time: settings.includePrepTime,
    include_recovery_time: settings.includeRecoveryTime,
  });
  return {
    hourlyRate: response.data.hourly_rate,
    currency: response.data.currency,
    includePrepTime: response.data.include_prep_time,
    includeRecoveryTime: response.data.include_recovery_time,
  };
}

export async function calculateMeetingCost(
  durationMinutes: number,
  attendeeCount: number,
  customHourlyRate?: number
): Promise<MeetingCostResult> {
  const response = await apiClient.post('/api/meetings/cost/calculate', {
    duration_minutes: durationMinutes,
    attendee_count: attendeeCount,
    custom_hourly_rate: customHourlyRate,
  });

  return {
    durationMinutes: response.data.duration_minutes,
    attendeeCount: response.data.attendee_count,
    hourlyRate: response.data.hourly_rate,
    currency: response.data.currency,
    baseCost: response.data.base_cost,
    prepCost: response.data.prep_cost,
    recoveryCost: response.data.recovery_cost,
    totalCost: response.data.total_cost,
    totalPersonHours: response.data.total_person_hours,
    breakdown: response.data.breakdown,
    opportunityCost: {
      couldHaveWritten: response.data.opportunity_cost.could_have_written,
      couldHaveFixed: response.data.opportunity_cost.could_have_fixed,
      couldHaveReviewed: response.data.opportunity_cost.could_have_reviewed,
    },
  };
}

export async function getPeriodMeetingCost(days: number = 7): Promise<PeriodCostResult> {
  const response = await apiClient.get('/api/meetings/cost/period', {
    params: { days },
  });

  return {
    periodStart: response.data.period_start,
    periodEnd: response.data.period_end,
    totalMeetings: response.data.total_meetings,
    totalMinutes: response.data.total_minutes,
    totalHours: response.data.total_hours,
    totalCost: response.data.total_cost,
    currency: response.data.currency,
    avgMeetingCost: response.data.avg_meeting_cost,
    avgMeetingDuration: response.data.avg_meeting_duration,
  };
}

// ============================================================================
// Transform Functions
// ============================================================================

function transformTranscript(data: Record<string, unknown>): Transcript {
  return {
    id: data.id as string,
    meetingTitle: data.meeting_title as string | null,
    meetingDate: data.meeting_date as string,
    durationSeconds: data.duration_seconds as number,
    status: data.status as Transcript['status'],
    transcriptionText: data.transcription_text as string | null,
    wordCount: data.word_count as number,
    speakersDetected: data.speakers_detected as number,
    apiCost: data.api_cost as number,
    createdAt: data.created_at as string,
  };
}

function transformTranscriptSummary(data: Record<string, unknown>): Transcript {
  return {
    id: data.id as string,
    meetingTitle: data.meeting_title as string | null,
    meetingDate: data.meeting_date as string,
    durationSeconds: data.duration_seconds as number,
    status: data.status as Transcript['status'],
    transcriptionText: null,
    wordCount: data.word_count as number,
    speakersDetected: 0,
    apiCost: 0,
    createdAt: data.created_at as string,
  };
}

function transformAnalysis(data: Record<string, unknown>): MeetingAnalysis {
  return {
    id: data.id as string,
    transcriptId: data.transcript_id as string | null,
    summary: data.summary as string | null,
    keyPoints: data.key_points as string[],
    actionItems: data.action_items as MeetingAnalysis['actionItems'],
    actionItemsCount: data.action_items_count as number,
    decisions: data.decisions as string[],
    followUps: data.follow_ups as string[],
    topics: data.topics as MeetingAnalysis['topics'],
    keywords: data.keywords as string[],
    meetingScore: data.meeting_score as number | null,
    meetingTypeDetected: data.meeting_type_detected as string | null,
    couldBeEmail: data.could_be_email as boolean,
    overallSentiment: data.overall_sentiment as MeetingAnalysis['overallSentiment'],
    status: data.status as string,
    apiCost: data.api_cost as number,
    createdAt: data.created_at as string,
  };
}
