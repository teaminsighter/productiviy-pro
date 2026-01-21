"""
PDF Report Generation Service
Creates beautiful productivity reports with charts and analytics
"""
import io
import os
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
from enum import Enum

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4, letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch, mm
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, HRFlowable
)
from reportlab.graphics.shapes import Drawing, Rect, String, Circle, Line
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.barcharts import VerticalBarChart
from reportlab.graphics.charts.linecharts import HorizontalLineChart
from reportlab.graphics.widgets.markers import makeMarker

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload


class ReportPeriod(str, Enum):
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"


@dataclass
class ReportData:
    """Container for all report data"""
    user_name: str
    user_email: str
    period: ReportPeriod
    start_date: datetime
    end_date: datetime

    # Summary metrics
    total_tracked_hours: float
    productive_hours: float
    meeting_hours: float
    deep_work_score: int
    productivity_percentage: float

    # Trends
    score_trend: float  # vs previous period
    productivity_trend: float

    # Daily breakdown
    daily_stats: List[Dict[str, Any]]

    # Category breakdown
    category_breakdown: List[Dict[str, Any]]

    # Top apps
    top_apps: List[Dict[str, Any]]

    # Top websites
    top_websites: List[Dict[str, Any]]

    # Focus blocks
    focus_blocks: List[Dict[str, Any]]

    # Meeting stats
    meeting_count: int
    avg_meeting_duration: float
    meetings_organized: int

    # AI insights
    insights: List[str]
    recommendations: List[str]


class ProductivityReportGenerator:
    """Generates beautiful PDF productivity reports"""

    # Brand colors
    PRIMARY_COLOR = colors.HexColor('#6366f1')  # Indigo
    SECONDARY_COLOR = colors.HexColor('#8b5cf6')  # Purple
    SUCCESS_COLOR = colors.HexColor('#22c55e')  # Green
    WARNING_COLOR = colors.HexColor('#f59e0b')  # Amber
    DANGER_COLOR = colors.HexColor('#ef4444')  # Red
    TEXT_COLOR = colors.HexColor('#1f2937')  # Gray 800
    TEXT_LIGHT = colors.HexColor('#6b7280')  # Gray 500
    BG_LIGHT = colors.HexColor('#f3f4f6')  # Gray 100

    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Setup custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=28,
            textColor=self.TEXT_COLOR,
            spaceAfter=20,
            alignment=TA_CENTER,
        ))

        self.styles.add(ParagraphStyle(
            name='SectionTitle',
            parent=self.styles['Heading2'],
            fontSize=16,
            textColor=self.PRIMARY_COLOR,
            spaceBefore=20,
            spaceAfter=12,
            borderPadding=5,
        ))

        self.styles.add(ParagraphStyle(
            name='SubTitle',
            parent=self.styles['Normal'],
            fontSize=12,
            textColor=self.TEXT_LIGHT,
            alignment=TA_CENTER,
            spaceAfter=30,
        ))

        self.styles.add(ParagraphStyle(
            name='MetricValue',
            parent=self.styles['Normal'],
            fontSize=36,
            textColor=self.TEXT_COLOR,
            alignment=TA_CENTER,
        ))

        self.styles.add(ParagraphStyle(
            name='MetricLabel',
            parent=self.styles['Normal'],
            fontSize=10,
            textColor=self.TEXT_LIGHT,
            alignment=TA_CENTER,
        ))

        self.styles.add(ParagraphStyle(
            name='InsightText',
            parent=self.styles['Normal'],
            fontSize=11,
            textColor=self.TEXT_COLOR,
            leftIndent=20,
            spaceBefore=5,
            spaceAfter=5,
        ))

    def generate_report(self, data: ReportData) -> bytes:
        """Generate a complete PDF report"""
        buffer = io.BytesIO()

        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=50,
            leftMargin=50,
            topMargin=50,
            bottomMargin=50,
        )

        story = []

        # Header
        story.extend(self._create_header(data))

        # Executive Summary
        story.extend(self._create_executive_summary(data))

        # Deep Work Score Section
        story.extend(self._create_deep_work_section(data))

        # Daily Breakdown Chart
        story.extend(self._create_daily_breakdown(data))

        # Category Breakdown
        story.extend(self._create_category_breakdown(data))

        # Top Apps & Websites
        story.extend(self._create_top_apps_section(data))

        # Meeting Analytics
        story.extend(self._create_meeting_section(data))

        # AI Insights & Recommendations
        story.extend(self._create_insights_section(data))

        # Footer
        story.extend(self._create_footer(data))

        doc.build(story)
        buffer.seek(0)
        return buffer.getvalue()

    def _create_header(self, data: ReportData) -> List:
        """Create report header"""
        elements = []

        # Logo placeholder (you can replace with actual logo)
        elements.append(Spacer(1, 10))

        # Title
        period_text = {
            ReportPeriod.DAILY: "Daily",
            ReportPeriod.WEEKLY: "Weekly",
            ReportPeriod.MONTHLY: "Monthly"
        }

        title = Paragraph(
            f"<b>Productivity Report</b>",
            self.styles['ReportTitle']
        )
        elements.append(title)

        # Subtitle with date range
        date_format = "%B %d, %Y"
        subtitle = Paragraph(
            f"{period_text[data.period]} Report for {data.user_name}<br/>"
            f"{data.start_date.strftime(date_format)} - {data.end_date.strftime(date_format)}",
            self.styles['SubTitle']
        )
        elements.append(subtitle)

        # Divider
        elements.append(HRFlowable(
            width="100%",
            thickness=2,
            color=self.PRIMARY_COLOR,
            spaceAfter=20,
        ))

        return elements

    def _create_executive_summary(self, data: ReportData) -> List:
        """Create executive summary section with key metrics"""
        elements = []

        elements.append(Paragraph("Executive Summary", self.styles['SectionTitle']))

        # Create metrics cards table
        metrics_data = [
            [
                self._create_metric_cell(f"{data.total_tracked_hours:.1f}h", "Total Tracked"),
                self._create_metric_cell(f"{data.productive_hours:.1f}h", "Productive Time"),
                self._create_metric_cell(f"{data.productivity_percentage:.0f}%", "Productivity"),
                self._create_metric_cell(str(data.deep_work_score), "Deep Work Score"),
            ]
        ]

        metrics_table = Table(metrics_data, colWidths=[120, 120, 120, 120])
        metrics_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (0, 0), 1, self.BG_LIGHT),
            ('BOX', (1, 0), (1, 0), 1, self.BG_LIGHT),
            ('BOX', (2, 0), (2, 0), 1, self.BG_LIGHT),
            ('BOX', (3, 0), (3, 0), 1, self.BG_LIGHT),
            ('BACKGROUND', (0, 0), (-1, -1), self.BG_LIGHT),
            ('TOPPADDING', (0, 0), (-1, -1), 15),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 15),
        ]))

        elements.append(metrics_table)
        elements.append(Spacer(1, 20))

        # Trend indicators
        trend_text = []
        if data.score_trend > 0:
            trend_text.append(f"<font color='green'>↑ {data.score_trend:.0f}%</font> Deep Work Score vs last period")
        elif data.score_trend < 0:
            trend_text.append(f"<font color='red'>↓ {abs(data.score_trend):.0f}%</font> Deep Work Score vs last period")

        if data.productivity_trend > 0:
            trend_text.append(f"<font color='green'>↑ {data.productivity_trend:.0f}%</font> Productivity vs last period")
        elif data.productivity_trend < 0:
            trend_text.append(f"<font color='red'>↓ {abs(data.productivity_trend):.0f}%</font> Productivity vs last period")

        for text in trend_text:
            elements.append(Paragraph(text, self.styles['Normal']))

        elements.append(Spacer(1, 10))

        return elements

    def _create_metric_cell(self, value: str, label: str) -> List:
        """Create a metric cell for the summary table"""
        return [
            Paragraph(f"<b>{value}</b>", self.styles['MetricValue']),
            Paragraph(label, self.styles['MetricLabel']),
        ]

    def _create_deep_work_section(self, data: ReportData) -> List:
        """Create Deep Work Score visualization"""
        elements = []

        elements.append(Paragraph("Deep Work Analysis", self.styles['SectionTitle']))

        # Score visualization
        score_drawing = Drawing(400, 150)

        # Background circle
        score_drawing.add(Circle(200, 75, 60, fillColor=self.BG_LIGHT, strokeColor=None))

        # Score arc (simplified representation)
        score_color = self.SUCCESS_COLOR if data.deep_work_score >= 70 else \
                     self.WARNING_COLOR if data.deep_work_score >= 40 else self.DANGER_COLOR

        # Score text
        score_drawing.add(String(200, 85, str(data.deep_work_score),
                                fontSize=36, fillColor=score_color,
                                textAnchor='middle'))
        score_drawing.add(String(200, 55, "Deep Work Score",
                                fontSize=12, fillColor=self.TEXT_LIGHT,
                                textAnchor='middle'))

        # Status text
        status = "Excellent" if data.deep_work_score >= 80 else \
                "Good" if data.deep_work_score >= 60 else \
                "Fair" if data.deep_work_score >= 40 else "Needs Improvement"
        score_drawing.add(String(200, 30, status,
                                fontSize=14, fillColor=score_color,
                                textAnchor='middle'))

        elements.append(score_drawing)
        elements.append(Spacer(1, 10))

        # Focus metrics table
        focus_data = [
            ["Metric", "Value", "Status"],
            ["Deep Work Hours", f"{data.productive_hours - data.meeting_hours:.1f}h",
             "Good" if (data.productive_hours - data.meeting_hours) > 4 else "Low"],
            ["Meeting Hours", f"{data.meeting_hours:.1f}h",
             "High" if data.meeting_hours > 3 else "Balanced"],
            ["Longest Focus Block", f"{max([b.get('duration', 0) for b in data.focus_blocks] or [0])}m",
             "Great" if max([b.get('duration', 0) for b in data.focus_blocks] or [0]) > 90 else "Build more"],
        ]

        focus_table = Table(focus_data, colWidths=[180, 100, 100])
        focus_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), self.PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), self.BG_LIGHT),
            ('GRID', (0, 0), (-1, -1), 1, colors.white),
            ('TOPPADDING', (0, 1), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 8),
        ]))

        elements.append(focus_table)
        elements.append(Spacer(1, 20))

        return elements

    def _create_daily_breakdown(self, data: ReportData) -> List:
        """Create daily breakdown chart"""
        elements = []

        elements.append(Paragraph("Daily Breakdown", self.styles['SectionTitle']))

        if not data.daily_stats:
            elements.append(Paragraph("No daily data available", self.styles['Normal']))
            return elements

        # Create bar chart
        drawing = Drawing(500, 200)

        bc = VerticalBarChart()
        bc.x = 50
        bc.y = 50
        bc.height = 120
        bc.width = 400

        # Prepare data
        productive_data = [d.get('productive_hours', 0) for d in data.daily_stats[-7:]]
        meeting_data = [d.get('meeting_hours', 0) for d in data.daily_stats[-7:]]

        bc.data = [productive_data, meeting_data]
        bc.categoryAxis.categoryNames = [d.get('day_name', '')[:3] for d in data.daily_stats[-7:]]

        bc.bars[0].fillColor = self.SUCCESS_COLOR
        bc.bars[1].fillColor = self.DANGER_COLOR

        bc.valueAxis.valueMin = 0
        bc.valueAxis.valueMax = max(max(productive_data or [0]), max(meeting_data or [0])) + 2
        bc.valueAxis.valueStep = 2

        bc.categoryAxis.labels.fontName = 'Helvetica'
        bc.categoryAxis.labels.fontSize = 9
        bc.valueAxis.labels.fontName = 'Helvetica'
        bc.valueAxis.labels.fontSize = 9

        drawing.add(bc)

        # Legend
        drawing.add(Rect(60, 180, 10, 10, fillColor=self.SUCCESS_COLOR, strokeColor=None))
        drawing.add(String(75, 182, "Productive", fontSize=9, fillColor=self.TEXT_COLOR))
        drawing.add(Rect(150, 180, 10, 10, fillColor=self.DANGER_COLOR, strokeColor=None))
        drawing.add(String(165, 182, "Meetings", fontSize=9, fillColor=self.TEXT_COLOR))

        elements.append(drawing)
        elements.append(Spacer(1, 20))

        return elements

    def _create_category_breakdown(self, data: ReportData) -> List:
        """Create category breakdown pie chart"""
        elements = []

        elements.append(Paragraph("Activity Categories", self.styles['SectionTitle']))

        if not data.category_breakdown:
            elements.append(Paragraph("No category data available", self.styles['Normal']))
            return elements

        # Create pie chart
        drawing = Drawing(400, 200)

        pie = Pie()
        pie.x = 100
        pie.y = 25
        pie.width = 150
        pie.height = 150

        pie.data = [c.get('hours', 0) for c in data.category_breakdown[:6]]
        pie.labels = [c.get('category', 'Other')[:12] for c in data.category_breakdown[:6]]

        category_colors = [
            self.PRIMARY_COLOR, self.SECONDARY_COLOR, self.SUCCESS_COLOR,
            self.WARNING_COLOR, self.DANGER_COLOR, self.TEXT_LIGHT
        ]

        for i, color in enumerate(category_colors[:len(pie.data)]):
            pie.slices[i].fillColor = color
            pie.slices[i].strokeColor = colors.white
            pie.slices[i].strokeWidth = 2

        pie.slices.fontName = 'Helvetica'
        pie.slices.fontSize = 8

        drawing.add(pie)

        # Legend on right side
        y_pos = 170
        for i, cat in enumerate(data.category_breakdown[:6]):
            color = category_colors[i] if i < len(category_colors) else self.TEXT_LIGHT
            drawing.add(Rect(300, y_pos, 10, 10, fillColor=color, strokeColor=None))
            drawing.add(String(315, y_pos + 2, f"{cat.get('category', 'Other')} ({cat.get('hours', 0):.1f}h)",
                              fontSize=9, fillColor=self.TEXT_COLOR))
            y_pos -= 20

        elements.append(drawing)
        elements.append(Spacer(1, 20))

        return elements

    def _create_top_apps_section(self, data: ReportData) -> List:
        """Create top apps and websites tables"""
        elements = []

        elements.append(Paragraph("Top Applications & Websites", self.styles['SectionTitle']))

        # Create side-by-side tables
        apps_data = [["Application", "Time", "Type"]]
        for app in data.top_apps[:5]:
            apps_data.append([
                app.get('name', 'Unknown')[:20],
                f"{app.get('hours', 0):.1f}h",
                "Productive" if app.get('is_productive') else "Other"
            ])

        websites_data = [["Website", "Time", "Type"]]
        for site in data.top_websites[:5]:
            websites_data.append([
                site.get('domain', 'Unknown')[:20],
                f"{site.get('hours', 0):.1f}h",
                "Productive" if site.get('is_productive') else "Other"
            ])

        # Style for both tables
        table_style = TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), self.PRIMARY_COLOR),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
            ('BACKGROUND', (0, 1), (-1, -1), self.BG_LIGHT),
            ('GRID', (0, 0), (-1, -1), 1, colors.white),
            ('TOPPADDING', (0, 1), (-1, -1), 6),
            ('BOTTOMPADDING', (0, 1), (-1, -1), 6),
        ])

        apps_table = Table(apps_data, colWidths=[120, 50, 70])
        apps_table.setStyle(table_style)

        websites_table = Table(websites_data, colWidths=[120, 50, 70])
        websites_table.setStyle(table_style)

        # Combine tables side by side
        combined = Table([[apps_table, Spacer(20, 1), websites_table]])
        combined.setStyle(TableStyle([
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))

        elements.append(combined)
        elements.append(Spacer(1, 20))

        return elements

    def _create_meeting_section(self, data: ReportData) -> List:
        """Create meeting analytics section"""
        elements = []

        elements.append(Paragraph("Meeting Analytics", self.styles['SectionTitle']))

        meeting_metrics = [
            ["Total Meetings", str(data.meeting_count)],
            ["Total Meeting Hours", f"{data.meeting_hours:.1f}h"],
            ["Average Duration", f"{data.avg_meeting_duration:.0f} min"],
            ["Meetings Organized", str(data.meetings_organized)],
            ["Meeting Load", f"{(data.meeting_hours / max(data.total_tracked_hours, 1) * 100):.0f}%"],
        ]

        meeting_table = Table(meeting_metrics, colWidths=[200, 100])
        meeting_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), self.BG_LIGHT),
            ('ALIGN', (0, 0), (0, -1), 'LEFT'),
            ('ALIGN', (1, 0), (1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.white),
            ('TOPPADDING', (0, 0), (-1, -1), 8),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
            ('LEFTPADDING', (0, 0), (-1, -1), 12),
            ('RIGHTPADDING', (0, 0), (-1, -1), 12),
        ]))

        elements.append(meeting_table)
        elements.append(Spacer(1, 20))

        return elements

    def _create_insights_section(self, data: ReportData) -> List:
        """Create AI insights and recommendations section"""
        elements = []

        elements.append(Paragraph("Insights & Recommendations", self.styles['SectionTitle']))

        # Insights
        if data.insights:
            elements.append(Paragraph("<b>Key Insights:</b>", self.styles['Normal']))
            for insight in data.insights:
                elements.append(Paragraph(f"• {insight}", self.styles['InsightText']))
            elements.append(Spacer(1, 10))

        # Recommendations
        if data.recommendations:
            elements.append(Paragraph("<b>Recommendations:</b>", self.styles['Normal']))
            for rec in data.recommendations:
                elements.append(Paragraph(f"→ {rec}", self.styles['InsightText']))

        elements.append(Spacer(1, 20))

        return elements

    def _create_footer(self, data: ReportData) -> List:
        """Create report footer"""
        elements = []

        elements.append(HRFlowable(
            width="100%",
            thickness=1,
            color=self.BG_LIGHT,
            spaceBefore=20,
            spaceAfter=10,
        ))

        footer_text = Paragraph(
            f"<font size='9' color='#9ca3af'>"
            f"Generated by Productify Pro on {datetime.now().strftime('%B %d, %Y at %H:%M')}<br/>"
            f"This report contains confidential productivity data for {data.user_email}"
            f"</font>",
            self.styles['Normal']
        )
        elements.append(footer_text)

        return elements


class ReportDataAggregator:
    """Aggregates data from database for report generation"""

    def __init__(self, db: AsyncSession):
        self.db = db

    async def get_report_data(
        self,
        user_id: int,
        period: ReportPeriod,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None,
    ) -> ReportData:
        """Aggregate all data needed for a report"""
        from app.models.user import User
        from app.models import Activity, CalendarEvent, DeepWorkScore

        # Calculate date range
        if not end_date:
            end_date = datetime.now()

        if not start_date:
            if period == ReportPeriod.DAILY:
                start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)
            elif period == ReportPeriod.WEEKLY:
                start_date = end_date - timedelta(days=7)
            else:  # monthly
                start_date = end_date - timedelta(days=30)

        # Get user info
        user_result = await self.db.execute(
            select(User).where(User.id == user_id)
        )
        user = user_result.scalar_one_or_none()

        if not user:
            raise ValueError("User not found")

        # Get activities in date range
        activities_result = await self.db.execute(
            select(Activity).where(
                and_(
                    Activity.user_id == user_id,
                    Activity.start_time >= start_date,
                    Activity.start_time <= end_date
                )
            )
        )
        activities = activities_result.scalars().all()

        # Calculate totals
        total_seconds = sum(a.duration for a in activities)
        productive_seconds = sum(a.duration for a in activities if a.is_productive)

        # Get calendar events
        events_result = await self.db.execute(
            select(CalendarEvent).where(
                and_(
                    CalendarEvent.user_id == user_id,
                    CalendarEvent.start_time >= start_date,
                    CalendarEvent.end_time <= end_date
                )
            )
        )
        events = events_result.scalars().all()

        meeting_minutes = sum(e.duration_minutes for e in events if not e.is_focus_time)
        meeting_count = len([e for e in events if not e.is_focus_time])
        meetings_organized = len([e for e in events if e.is_organizer and not e.is_focus_time])

        # Get deep work scores
        scores_result = await self.db.execute(
            select(DeepWorkScore).where(
                and_(
                    DeepWorkScore.user_id == user_id,
                    DeepWorkScore.date >= start_date,
                    DeepWorkScore.date <= end_date
                )
            ).order_by(DeepWorkScore.date)
        )
        scores = scores_result.scalars().all()

        avg_score = sum(s.deep_work_score for s in scores) / len(scores) if scores else 0

        # Calculate daily stats
        daily_stats = await self._calculate_daily_stats(user_id, start_date, end_date)

        # Calculate category breakdown
        category_breakdown = await self._calculate_category_breakdown(activities)

        # Get top apps
        top_apps = await self._get_top_apps(activities)

        # Get top websites
        top_websites = await self._get_top_websites(activities)

        # Get focus blocks
        focus_blocks = [
            {"duration": s.longest_focus_block_minutes, "date": s.date.isoformat()}
            for s in scores if s.longest_focus_block_minutes and s.longest_focus_block_minutes > 0
        ]

        # Generate insights
        insights, recommendations = self._generate_insights(
            total_seconds / 3600,
            productive_seconds / 3600,
            meeting_minutes / 60,
            avg_score,
            category_breakdown
        )

        # Calculate trends (simplified - compare to previous period)
        score_trend = 0
        productivity_trend = 0

        return ReportData(
            user_name=user.name or user.email.split('@')[0],
            user_email=user.email,
            period=period,
            start_date=start_date,
            end_date=end_date,
            total_tracked_hours=total_seconds / 3600,
            productive_hours=productive_seconds / 3600,
            meeting_hours=meeting_minutes / 60,
            deep_work_score=int(avg_score),
            productivity_percentage=(productive_seconds / total_seconds * 100) if total_seconds > 0 else 0,
            score_trend=score_trend,
            productivity_trend=productivity_trend,
            daily_stats=daily_stats,
            category_breakdown=category_breakdown,
            top_apps=top_apps,
            top_websites=top_websites,
            focus_blocks=focus_blocks,
            meeting_count=meeting_count,
            avg_meeting_duration=meeting_minutes / meeting_count if meeting_count > 0 else 0,
            meetings_organized=meetings_organized,
            insights=insights,
            recommendations=recommendations,
        )

    async def _calculate_daily_stats(
        self,
        user_id: int,
        start_date: datetime,
        end_date: datetime
    ) -> List[Dict[str, Any]]:
        """Calculate daily statistics"""
        from app.models import Activity, CalendarEvent

        daily_stats = []
        current_date = start_date

        while current_date <= end_date:
            next_date = current_date + timedelta(days=1)

            # Get activities for this day
            result = await self.db.execute(
                select(Activity).where(
                    and_(
                        Activity.user_id == user_id,
                        Activity.start_time >= current_date,
                        Activity.start_time < next_date
                    )
                )
            )
            day_activities = result.scalars().all()

            # Get events for this day
            events_result = await self.db.execute(
                select(CalendarEvent).where(
                    and_(
                        CalendarEvent.user_id == user_id,
                        CalendarEvent.start_time >= current_date,
                        CalendarEvent.start_time < next_date
                    )
                )
            )
            day_events = events_result.scalars().all()

            productive_seconds = sum(a.duration for a in day_activities if a.is_productive)
            meeting_minutes = sum(e.duration_minutes for e in day_events if not e.is_focus_time)

            daily_stats.append({
                "date": current_date.isoformat(),
                "day_name": current_date.strftime("%A"),
                "productive_hours": productive_seconds / 3600,
                "meeting_hours": meeting_minutes / 60,
                "total_hours": sum(a.duration for a in day_activities) / 3600,
            })

            current_date = next_date

        return daily_stats

    async def _calculate_category_breakdown(
        self,
        activities: List
    ) -> List[Dict[str, Any]]:
        """Calculate time breakdown by category"""
        category_times = {}

        for activity in activities:
            category = activity.category or "Other"
            if category not in category_times:
                category_times[category] = 0
            category_times[category] += activity.duration

        breakdown = [
            {"category": cat, "hours": seconds / 3600, "percentage": 0}
            for cat, seconds in sorted(category_times.items(), key=lambda x: x[1], reverse=True)
        ]

        total = sum(b["hours"] for b in breakdown)
        for b in breakdown:
            b["percentage"] = (b["hours"] / total * 100) if total > 0 else 0

        return breakdown

    async def _get_top_apps(self, activities: List) -> List[Dict[str, Any]]:
        """Get top applications by time"""
        app_times = {}
        app_productive = {}

        for activity in activities:
            app = activity.app_name or "Unknown"
            if app not in app_times:
                app_times[app] = 0
                app_productive[app] = activity.is_productive
            app_times[app] += activity.duration

        return [
            {"name": app, "hours": seconds / 3600, "is_productive": app_productive.get(app, False)}
            for app, seconds in sorted(app_times.items(), key=lambda x: x[1], reverse=True)[:10]
        ]

    async def _get_top_websites(self, activities: List) -> List[Dict[str, Any]]:
        """Get top websites by time"""
        site_times = {}
        site_productive = {}

        for activity in activities:
            if activity.app_name and 'browser' in activity.app_name.lower():
                # Extract domain from title or URL
                domain = activity.window_title.split(' - ')[-1] if activity.window_title else "Unknown"
                if domain not in site_times:
                    site_times[domain] = 0
                    site_productive[domain] = activity.is_productive
                site_times[domain] += activity.duration

        return [
            {"domain": domain, "hours": seconds / 3600, "is_productive": site_productive.get(domain, False)}
            for domain, seconds in sorted(site_times.items(), key=lambda x: x[1], reverse=True)[:10]
        ]

    def _generate_insights(
        self,
        total_hours: float,
        productive_hours: float,
        meeting_hours: float,
        avg_score: float,
        categories: List[Dict[str, Any]]
    ) -> tuple[List[str], List[str]]:
        """Generate AI insights and recommendations"""
        insights = []
        recommendations = []

        productivity_pct = (productive_hours / total_hours * 100) if total_hours > 0 else 0
        meeting_pct = (meeting_hours / total_hours * 100) if total_hours > 0 else 0

        # Insights
        if productivity_pct >= 70:
            insights.append(f"Excellent productivity! You spent {productivity_pct:.0f}% of your time on productive work.")
        elif productivity_pct >= 50:
            insights.append(f"Good productivity at {productivity_pct:.0f}%, but there's room for improvement.")
        else:
            insights.append(f"Productivity is at {productivity_pct:.0f}% - consider identifying and reducing distractions.")

        if meeting_hours > 0:
            insights.append(f"You spent {meeting_hours:.1f} hours in meetings ({meeting_pct:.0f}% of tracked time).")

        if avg_score >= 70:
            insights.append(f"Your Deep Work Score of {avg_score:.0f} indicates strong focus habits.")
        elif avg_score >= 40:
            insights.append(f"Your Deep Work Score of {avg_score:.0f} shows moderate focus - meetings may be fragmenting your day.")
        else:
            insights.append(f"Deep Work Score of {avg_score:.0f} suggests high fragmentation - protect more focus time.")

        if categories:
            top_cat = categories[0]
            insights.append(f"Most time spent on {top_cat['category']} ({top_cat['hours']:.1f}h, {top_cat['percentage']:.0f}%).")

        # Recommendations
        if meeting_pct > 40:
            recommendations.append("Consider declining or shortening some meetings to protect deep work time.")

        if productivity_pct < 60:
            recommendations.append("Try time-blocking techniques to dedicate specific hours for focused work.")

        if avg_score < 50:
            recommendations.append("Block 2-3 hour focus sessions in your calendar to reduce fragmentation.")

        if meeting_hours > 4:
            recommendations.append("Review recurring meetings - can any be replaced with async updates?")

        recommendations.append("Schedule your most important work during your peak energy hours (typically morning).")

        return insights, recommendations
