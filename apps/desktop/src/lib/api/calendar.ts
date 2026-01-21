/**
 * Calendar API client for Google Calendar integration
 */
import { apiClient } from './client';

// Types
export interface CalendarConnection {
  id: string;
  provider: string;
  provider_email: string | null;
  is_active: boolean;
  last_sync_at: string | null;
  sync_status: string;
  sync_error: string | null;
  calendars_to_sync: string[];
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string | null;
  location: string | null;
  start_time: string;
  end_time: string;
  duration_minutes: number;
  is_all_day: boolean;
  is_recurring: boolean;
  attendee_count: number;
  organizer_email: string | null;
  is_organizer: boolean;
  status: string;
  response_status: string;
  meeting_url: string | null;
  meeting_type: string | null;
  is_focus_time: boolean;
  meeting_cost: number | null;
}

export interface CalendarListItem {
  id: string;
  summary: string;
  primary: boolean;
  access_role: string;
}

export interface MeetingStats {
  total_meetings: number;
  total_meeting_hours: number;
  avg_meeting_duration: number;
  meetings_as_organizer: number;
  meetings_declined: number;
  focus_time_blocks: number;
  busiest_day: string | null;
  meeting_free_hours: number;
}

// API Functions

/**
 * Get the Google Calendar authorization URL
 */
export async function getCalendarAuthUrl(): Promise<{ authorization_url: string }> {
  const response = await apiClient.get('/api/calendar/connect/google');
  return response.data;
}

/**
 * Get current calendar connection status
 */
export async function getCalendarConnection(): Promise<CalendarConnection | null> {
  const response = await apiClient.get('/api/calendar/connection');
  return response.data;
}

/**
 * Disconnect calendar
 */
export async function disconnectCalendar(): Promise<void> {
  await apiClient.delete('/api/calendar/connection');
}

/**
 * Get list of available calendars
 */
export async function getCalendarList(): Promise<CalendarListItem[]> {
  const response = await apiClient.get('/api/calendar/calendars');
  return response.data;
}

/**
 * Select which calendars to sync
 */
export async function selectCalendarsToSync(calendarIds: string[]): Promise<void> {
  await apiClient.post('/api/calendar/calendars/select', { calendar_ids: calendarIds });
}

/**
 * Trigger calendar sync
 */
export async function syncCalendar(): Promise<{
  message: string;
  events_synced: number;
  created: number;
  updated: number;
}> {
  const response = await apiClient.post('/api/calendar/sync');
  return response.data;
}

/**
 * Get calendar events for a date range
 */
export async function getCalendarEvents(
  startDate?: string,
  endDate?: string
): Promise<CalendarEvent[]> {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await apiClient.get(`/api/calendar/events?${params}`);
  return response.data;
}

/**
 * Get today's calendar events
 */
export async function getTodayEvents(): Promise<CalendarEvent[]> {
  const response = await apiClient.get('/api/calendar/events/today');
  return response.data;
}

/**
 * Get this week's calendar events
 */
export async function getWeekEvents(): Promise<CalendarEvent[]> {
  const response = await apiClient.get('/api/calendar/events/week');
  return response.data;
}

/**
 * Get meeting statistics
 */
export async function getMeetingStats(
  startDate?: string,
  endDate?: string
): Promise<MeetingStats> {
  const params = new URLSearchParams();
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await apiClient.get(`/api/calendar/stats?${params}`);
  return response.data;
}

/**
 * Mark an event as focus time
 */
export async function markAsFocusTime(eventId: string, isFocus: boolean): Promise<void> {
  await apiClient.patch(`/api/calendar/events/${eventId}/focus?is_focus=${isFocus}`);
}
