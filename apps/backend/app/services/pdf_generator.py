"""
PDF Report Generator Service
Generates productivity reports as PDF documents.
"""

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from io import BytesIO
from datetime import datetime
from typing import Dict, Any, List


def format_duration(seconds: int) -> str:
    """Format seconds into human readable duration"""
    if seconds < 60:
        return f"{seconds}s"
    elif seconds < 3600:
        return f"{seconds // 60}m"
    else:
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        return f"{hours}h {minutes}m"


class ProductivityReportPDF:
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self.title_style = ParagraphStyle(
            'CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=24,
            spaceAfter=30,
            textColor=colors.HexColor('#6366f1')
        )
        self.heading_style = ParagraphStyle(
            'CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=16,
            spaceBefore=20,
            spaceAfter=10,
            textColor=colors.HexColor('#1f2937')
        )
        self.subheading_style = ParagraphStyle(
            'CustomSubheading',
            parent=self.styles['Heading3'],
            fontSize=12,
            spaceBefore=10,
            spaceAfter=5,
            textColor=colors.HexColor('#4b5563')
        )

    def generate_daily_report(self, data: Dict[str, Any]) -> bytes:
        """Generate daily productivity report PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch)
        story = []

        # Title
        story.append(Paragraph("Daily Productivity Report", self.title_style))
        story.append(Paragraph(f"Date: {data.get('date', 'Today')}", self.styles['Normal']))
        story.append(Spacer(1, 20))

        # Summary Stats
        story.append(Paragraph("Summary", self.heading_style))

        total_time = data.get('total_time', 0)
        productive_time = data.get('productive_time', 0)
        distracting_time = data.get('distracting_time', 0)
        neutral_time = data.get('neutral_time', 0)
        productivity_score = data.get('productivity_score', 0)
        focus_score = data.get('focus_score', 'N/A')

        summary_data = [
            ["Total Time", "Productive", "Distracting", "Productivity", "Focus"],
            [
                format_duration(total_time),
                format_duration(productive_time),
                format_duration(distracting_time),
                f"{productivity_score:.1f}%",
                focus_score
            ]
        ]
        summary_table = Table(summary_data, colWidths=[1.2*inch]*5)
        summary_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.HexColor('#f3f4f6')),
            ('FONTSIZE', (0, 1), (-1, -1), 12),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 1, colors.white)
        ]))
        story.append(summary_table)
        story.append(Spacer(1, 30))

        # Time Distribution
        story.append(Paragraph("Time Distribution", self.heading_style))
        if total_time > 0:
            prod_pct = (productive_time / total_time) * 100
            dist_pct = (distracting_time / total_time) * 100
            neut_pct = (neutral_time / total_time) * 100
        else:
            prod_pct = dist_pct = neut_pct = 0

        dist_data = [
            ["Category", "Time", "Percentage"],
            ["Productive", format_duration(productive_time), f"{prod_pct:.1f}%"],
            ["Distracting", format_duration(distracting_time), f"{dist_pct:.1f}%"],
            ["Neutral", format_duration(neutral_time), f"{neut_pct:.1f}%"],
        ]
        dist_table = Table(dist_data, colWidths=[2*inch, 1.5*inch, 1.5*inch])
        dist_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
        ]))
        story.append(dist_table)
        story.append(Spacer(1, 30))

        # Top Apps
        top_apps = data.get('top_apps', [])
        if top_apps:
            story.append(Paragraph("Top Applications", self.heading_style))
            app_data = [["Application", "Time", "Type"]]
            for app in top_apps[:10]:
                app_data.append([
                    app.get('app', 'Unknown'),
                    format_duration(app.get('duration', 0)),
                    app.get('productivity_type', 'neutral').title()
                ])

            app_table = Table(app_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
            app_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (2, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('PADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
            ]))
            story.append(app_table)
            story.append(Spacer(1, 30))

        # Categories
        categories = data.get('categories', [])
        if categories:
            story.append(Paragraph("Categories", self.heading_style))
            cat_data = [["Category", "Time", "Percentage"]]
            for cat in categories[:8]:
                cat_data.append([
                    cat.get('category', 'other').replace('_', ' ').title(),
                    format_duration(cat.get('duration', 0)),
                    f"{cat.get('percentage', 0):.1f}%"
                ])

            cat_table = Table(cat_data, colWidths=[2.5*inch, 1.5*inch, 1.5*inch])
            cat_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (2, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('PADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb')),
                ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f9fafb')])
            ]))
            story.append(cat_table)

        # Top Distractions
        top_distractions = data.get('top_distractions', [])
        if top_distractions:
            story.append(Spacer(1, 30))
            story.append(Paragraph("Top Distractions", self.heading_style))
            distr_data = [["Application", "Time"]]
            for d in top_distractions[:5]:
                distr_data.append([
                    d.get('app', 'Unknown'),
                    format_duration(d.get('duration', 0))
                ])

            distr_table = Table(distr_data, colWidths=[3*inch, 1.5*inch])
            distr_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#ef4444')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
                ('ALIGN', (1, 0), (1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('PADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#fecaca'))
            ]))
            story.append(distr_table)

        # Footer
        story.append(Spacer(1, 40))
        story.append(Paragraph(
            f"Generated by Productify Pro on {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            ParagraphStyle('Footer', parent=self.styles['Normal'], fontSize=8, textColor=colors.gray)
        ))

        doc.build(story)
        return buffer.getvalue()

    def generate_weekly_report(self, data: Dict[str, Any]) -> bytes:
        """Generate weekly productivity report PDF"""
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=letter, topMargin=0.5*inch)
        story = []

        # Title
        story.append(Paragraph("Weekly Productivity Report", self.title_style))
        story.append(Paragraph(
            f"Week of {data.get('week_start', '')} - {data.get('week_end', '')}",
            self.styles['Normal']
        ))
        story.append(Spacer(1, 20))

        # Weekly Overview
        story.append(Paragraph("Weekly Overview", self.heading_style))
        overview = data.get('overview', {})
        overview_data = [
            ["Total Hours", "Productive Hours", "Avg. Productivity", "Best Day"],
            [
                f"{overview.get('total_hours', 0):.1f}h",
                f"{overview.get('productive_hours', 0):.1f}h",
                f"{overview.get('avg_productivity', 0):.1f}%",
                overview.get('best_day', 'N/A')
            ]
        ]
        overview_table = Table(overview_data, colWidths=[1.5*inch]*4)
        overview_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('PADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -1), 1, colors.white)
        ]))
        story.append(overview_table)
        story.append(Spacer(1, 30))

        # Daily Breakdown
        daily_data = data.get('daily_breakdown', [])
        if daily_data:
            story.append(Paragraph("Daily Breakdown", self.heading_style))
            daily_table_data = [["Day", "Hours", "Productivity", "Focus Score"]]
            for day in daily_data:
                daily_table_data.append([
                    day.get('day', ''),
                    f"{day.get('hours', 0):.1f}h",
                    f"{day.get('productivity', 0):.1f}%",
                    day.get('focus_score', 'N/A')
                ])

            daily_table = Table(daily_table_data, colWidths=[1.5*inch]*4)
            daily_table.setStyle(TableStyle([
                ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#6366f1')),
                ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
                ('PADDING', (0, 0), (-1, -1), 8),
                ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#e5e7eb'))
            ]))
            story.append(daily_table)

        # Footer
        story.append(Spacer(1, 40))
        story.append(Paragraph(
            f"Generated by Productify Pro on {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            ParagraphStyle('Footer', parent=self.styles['Normal'], fontSize=8, textColor=colors.gray)
        ))

        doc.build(story)
        return buffer.getvalue()


# Singleton instance
pdf_generator = ProductivityReportPDF()
