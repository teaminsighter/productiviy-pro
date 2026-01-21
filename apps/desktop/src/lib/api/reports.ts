/**
 * Reports API Client
 * Handles report generation, preview, and download
 */
import { apiClient } from './client';

export type ReportPeriod = 'daily' | 'weekly' | 'monthly';
export type ReportFormat = 'pdf' | 'json';

export interface DailyStat {
  date: string;
  day_name: string;
  productive_hours: number;
  meeting_hours: number;
  total_hours: number;
}

export interface ReportCategoryBreakdown {
  category: string;
  hours: number;
  percentage: number;
}

export interface ReportTopApp {
  name: string;
  hours: number;
  is_productive: boolean;
}

export interface ReportPreview {
  period: string;
  start_date: string;
  end_date: string;
  total_tracked_hours: number;
  productive_hours: number;
  meeting_hours: number;
  deep_work_score: number;
  productivity_percentage: number;
  score_trend: number;
  productivity_trend: number;
  meeting_count: number;
  avg_meeting_duration: number;
  insights: string[];
  recommendations: string[];
  daily_stats: DailyStat[];
  category_breakdown: ReportCategoryBreakdown[];
  top_apps: ReportTopApp[];
}

export interface EmailReportRequest {
  period: ReportPeriod;
  recipient_email?: string;
}

/**
 * Get report preview data (without generating PDF)
 */
export async function getReportPreview(
  period: ReportPeriod = 'weekly',
  startDate?: string,
  endDate?: string
): Promise<ReportPreview> {
  const params = new URLSearchParams({ period });
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  const response = await apiClient.get(`/api/reports/preview?${params.toString()}`);
  return response.data;
}

/**
 * Download report as PDF or JSON
 */
export async function downloadReport(
  period: ReportPeriod = 'weekly',
  format: ReportFormat = 'pdf',
  startDate?: string,
  endDate?: string
): Promise<Blob | object> {
  const params = new URLSearchParams({ period, format });
  if (startDate) params.append('start_date', startDate);
  if (endDate) params.append('end_date', endDate);

  if (format === 'pdf') {
    const response = await apiClient.get(`/api/reports/download?${params.toString()}`, {
      responseType: 'blob',
    });
    return response.data;
  } else {
    const response = await apiClient.get(`/api/reports/download?${params.toString()}`);
    return response.data;
  }
}

/**
 * Send report via email
 */
export async function sendReportEmail(request: EmailReportRequest): Promise<{ message: string; success: boolean }> {
  const response = await apiClient.post('/api/reports/email', request);
  return response.data;
}

/**
 * Helper to trigger PDF download in browser
 */
export async function downloadReportPDF(
  period: ReportPeriod = 'weekly',
  startDate?: string,
  endDate?: string
): Promise<void> {
  const blob = await downloadReport(period, 'pdf', startDate, endDate) as Blob;

  // Create download link
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;

  // Generate filename
  const date = new Date().toISOString().split('T')[0];
  link.download = `productivity_report_${period}_${date}.pdf`;

  // Trigger download
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Cleanup
  window.URL.revokeObjectURL(url);
}

/**
 * Get daily report preview (legacy)
 */
export async function getDailyReportPreview(date: string = 'today'): Promise<any> {
  const response = await apiClient.get(`/api/reports/preview/daily/${date}`);
  return response.data;
}
