"""
Reports API Routes
Comprehensive endpoints for generating, previewing, and downloading productivity reports
"""
from datetime import datetime, timedelta
from typing import Optional, List
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query, Response
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from pydantic import BaseModel

from app.core.database import get_db
from app.api.routes.auth import get_current_user
from app.models.user import User
from app.models import Activity
from app.services.report_service import (
    ProductivityReportGenerator,
    ReportDataAggregator,
    ReportPeriod,
)
from app.models.team import Team, TeamMember, TeamRole

router = APIRouter(tags=["Reports"])


class ReportFormat(str, Enum):
    PDF = "pdf"
    JSON = "json"


class DailyStatItem(BaseModel):
    date: str
    day_name: str
    productive_hours: float
    meeting_hours: float
    total_hours: float


class CategoryItem(BaseModel):
    category: str
    hours: float
    percentage: float


class AppItem(BaseModel):
    name: str
    hours: float
    is_productive: bool


class ReportPreviewResponse(BaseModel):
    """Report preview data for frontend display"""
    period: str
    start_date: str
    end_date: str
    total_tracked_hours: float
    productive_hours: float
    meeting_hours: float
    deep_work_score: int
    productivity_percentage: float
    score_trend: float
    productivity_trend: float
    meeting_count: int
    avg_meeting_duration: float
    insights: List[str]
    recommendations: List[str]
    daily_stats: List[dict]
    category_breakdown: List[dict]
    top_apps: List[dict]


class EmailReportRequest(BaseModel):
    """Request to send report via email"""
    period: ReportPeriod = ReportPeriod.WEEKLY
    recipient_email: Optional[str] = None


class ScheduleReportRequest(BaseModel):
    """Request to schedule recurring reports"""
    period: ReportPeriod
    email: str
    day_of_week: int = 1  # Monday
    time_of_day: str = "09:00"
    enabled: bool = True


# ═══════════════════════════════════════════════════════════════════
# NEW ENHANCED ENDPOINTS
# ═══════════════════════════════════════════════════════════════════

@router.get("/preview")
async def get_report_preview(
    period: ReportPeriod = Query(default=ReportPeriod.WEEKLY),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> ReportPreviewResponse:
    """
    Get report data preview (without generating PDF)
    Useful for showing report preview in UI before download
    """
    try:
        # Parse dates
        end_dt = datetime.fromisoformat(end_date) if end_date else datetime.now()
        start_dt = None
        if start_date:
            start_dt = datetime.fromisoformat(start_date)

        # Aggregate data
        aggregator = ReportDataAggregator(db)
        data = await aggregator.get_report_data(
            user_id=current_user.id,
            period=period,
            start_date=start_dt,
            end_date=end_dt,
        )

        return ReportPreviewResponse(
            period=data.period.value,
            start_date=data.start_date.isoformat(),
            end_date=data.end_date.isoformat(),
            total_tracked_hours=round(data.total_tracked_hours, 2),
            productive_hours=round(data.productive_hours, 2),
            meeting_hours=round(data.meeting_hours, 2),
            deep_work_score=data.deep_work_score,
            productivity_percentage=round(data.productivity_percentage, 1),
            score_trend=data.score_trend,
            productivity_trend=data.productivity_trend,
            meeting_count=data.meeting_count,
            avg_meeting_duration=round(data.avg_meeting_duration, 0),
            insights=data.insights,
            recommendations=data.recommendations,
            daily_stats=data.daily_stats,
            category_breakdown=data.category_breakdown,
            top_apps=data.top_apps[:5],
        )
    except Exception as e:
        import traceback
        print(f"Report preview error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate report preview: {str(e)}")


@router.get("/download")
async def download_report(
    period: ReportPeriod = Query(default=ReportPeriod.WEEKLY),
    format: ReportFormat = Query(default=ReportFormat.PDF),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Download a productivity report as PDF or JSON
    """
    try:
        # Parse dates
        end_dt = datetime.fromisoformat(end_date) if end_date else datetime.now()
        start_dt = None
        if start_date:
            start_dt = datetime.fromisoformat(start_date)

        # Aggregate data
        aggregator = ReportDataAggregator(db)
        data = await aggregator.get_report_data(
            user_id=current_user.id,
            period=period,
            start_date=start_dt,
            end_date=end_dt,
        )

        if format == ReportFormat.PDF:
            # Generate PDF
            generator = ProductivityReportGenerator()
            pdf_bytes = generator.generate_report(data)

            # Create filename
            date_str = data.end_date.strftime("%Y-%m-%d")
            filename = f"productivity_report_{period.value}_{date_str}.pdf"

            return Response(
                content=pdf_bytes,
                media_type="application/pdf",
                headers={
                    "Content-Disposition": f"attachment; filename={filename}"
                }
            )
        else:
            # Return JSON
            return {
                "period": data.period.value,
                "start_date": data.start_date.isoformat(),
                "end_date": data.end_date.isoformat(),
                "user_name": data.user_name,
                "user_email": data.user_email,
                "metrics": {
                    "total_tracked_hours": round(data.total_tracked_hours, 2),
                    "productive_hours": round(data.productive_hours, 2),
                    "meeting_hours": round(data.meeting_hours, 2),
                    "deep_work_score": data.deep_work_score,
                    "productivity_percentage": round(data.productivity_percentage, 1),
                },
                "trends": {
                    "score_trend": data.score_trend,
                    "productivity_trend": data.productivity_trend,
                },
                "daily_stats": data.daily_stats,
                "category_breakdown": data.category_breakdown,
                "top_apps": data.top_apps,
                "top_websites": data.top_websites,
                "meetings": {
                    "count": data.meeting_count,
                    "total_hours": round(data.meeting_hours, 2),
                    "avg_duration": round(data.avg_meeting_duration, 0),
                    "organized": data.meetings_organized,
                },
                "insights": data.insights,
                "recommendations": data.recommendations,
            }

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.post("/email")
async def send_report_email(
    request: EmailReportRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Send a report via email
    """
    try:
        from app.services.email_service import EmailService

        # Parse dates
        end_dt = datetime.now()

        # Aggregate data
        aggregator = ReportDataAggregator(db)
        data = await aggregator.get_report_data(
            user_id=current_user.id,
            period=request.period,
            end_date=end_dt,
        )

        # Generate PDF
        generator = ProductivityReportGenerator()
        pdf_bytes = generator.generate_report(data)

        # Send email
        email_service = EmailService()
        email_to = request.recipient_email or current_user.email

        date_str = data.end_date.strftime("%B %d, %Y")
        subject = f"Your {request.period.value.title()} Productivity Report - {date_str}"

        html_content = f"""
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #6366f1;">Your Productivity Report is Ready!</h2>
            <p>Hi {data.user_name},</p>
            <p>Your {request.period.value} productivity report for {data.start_date.strftime('%B %d')} - {data.end_date.strftime('%B %d, %Y')} is attached.</p>

            <div style="background: #f3f4f6; padding: 20px; border-radius: 10px; margin: 20px 0;">
                <h3 style="margin: 0 0 15px 0; color: #1f2937;">Quick Summary</h3>
                <table style="width: 100%;">
                    <tr>
                        <td style="padding: 5px 0;"><strong>Deep Work Score:</strong></td>
                        <td style="text-align: right; color: {'#22c55e' if data.deep_work_score >= 70 else '#f59e0b' if data.deep_work_score >= 40 else '#ef4444'};">{data.deep_work_score}/100</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Productive Hours:</strong></td>
                        <td style="text-align: right;">{data.productive_hours:.1f}h</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Meeting Hours:</strong></td>
                        <td style="text-align: right;">{data.meeting_hours:.1f}h</td>
                    </tr>
                    <tr>
                        <td style="padding: 5px 0;"><strong>Productivity:</strong></td>
                        <td style="text-align: right;">{data.productivity_percentage:.0f}%</td>
                    </tr>
                </table>
            </div>

            <p style="color: #6b7280; font-size: 14px;">
                Open the attached PDF for detailed analytics, charts, and personalized recommendations.
            </p>

            <p style="margin-top: 30px;">Keep up the great work!</p>
            <p style="color: #6b7280;">- The Productify Pro Team</p>
        </div>
        """

        filename = f"productivity_report_{request.period.value}_{data.end_date.strftime('%Y-%m-%d')}.pdf"

        await email_service.send_email_with_attachment(
            to_email=email_to,
            subject=subject,
            html_content=html_content,
            attachment_data=pdf_bytes,
            attachment_filename=filename,
            attachment_type="application/pdf",
        )

        return {"message": f"Report sent to {email_to}", "success": True}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to send report: {str(e)}")


# ═══════════════════════════════════════════════════════════════════
# LEGACY ENDPOINTS (kept for backward compatibility)
# ═══════════════════════════════════════════════════════════════════

@router.get("/daily/{date_str}")
async def download_daily_report_legacy(
    date_str: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download daily report as PDF (legacy endpoint)"""
    try:
        if date_str == "today":
            end_date = datetime.now()
        else:
            end_date = datetime.strptime(date_str, "%Y-%m-%d")

        start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)

        aggregator = ReportDataAggregator(db)
        data = await aggregator.get_report_data(
            user_id=current_user.id,
            period=ReportPeriod.DAILY,
            start_date=start_date,
            end_date=end_date,
        )

        generator = ProductivityReportGenerator()
        pdf_bytes = generator.generate_report(data)

        filename = f"productivity-report-{data.end_date.strftime('%Y-%m-%d')}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("/daily")
async def download_today_report_legacy(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download today's report as PDF (legacy endpoint)"""
    return await download_daily_report_legacy("today", db, current_user)


@router.get("/weekly")
async def download_weekly_report_legacy(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Download weekly report as PDF (legacy endpoint)"""
    try:
        aggregator = ReportDataAggregator(db)
        data = await aggregator.get_report_data(
            user_id=current_user.id,
            period=ReportPeriod.WEEKLY,
        )

        generator = ProductivityReportGenerator()
        pdf_bytes = generator.generate_report(data)

        filename = f"productivity-report-week-{data.start_date.strftime('%Y-%m-%d')}.pdf"

        return Response(
            content=pdf_bytes,
            media_type="application/pdf",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate report: {str(e)}")


@router.get("/preview/daily/{date_str}")
async def preview_daily_report_legacy(
    date_str: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get daily report data without generating PDF (legacy preview endpoint)"""
    try:
        if date_str == "today":
            end_date = datetime.now()
        else:
            end_date = datetime.strptime(date_str, "%Y-%m-%d")

        start_date = end_date.replace(hour=0, minute=0, second=0, microsecond=0)

        aggregator = ReportDataAggregator(db)
        data = await aggregator.get_report_data(
            user_id=current_user.id,
            period=ReportPeriod.DAILY,
            start_date=start_date,
            end_date=end_date,
        )

        return {
            "date": data.end_date.strftime("%Y-%m-%d"),
            "total_time": data.total_tracked_hours * 3600,
            "productive_time": data.productive_hours * 3600,
            "productivity_score": data.productivity_percentage,
            "deep_work_score": data.deep_work_score,
            "meeting_hours": data.meeting_hours,
            "top_apps": data.top_apps[:10],
            "categories": data.category_breakdown,
            "insights": data.insights,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get report data: {str(e)}")


# ═══════════════════════════════════════════════════════════════════
# TEAM REPORT ENDPOINTS
# ═══════════════════════════════════════════════════════════════════


class TeamReportPreviewResponse(BaseModel):
    """Team report preview data"""
    team_name: str
    period: str
    start_date: str
    end_date: str
    member_count: int
    avg_deep_work_score: float
    avg_productive_hours: float
    avg_meeting_hours: float
    avg_productivity_percentage: float
    total_team_hours: float
    top_performers: List[dict]
    needs_attention: List[dict]
    team_trends: dict
    category_breakdown: List[dict]
    insights: List[str]
    recommendations: List[str]


async def get_team_with_admin_check(
    team_id: int,
    user: User,
    db: AsyncSession,
) -> Team:
    """Helper to verify user is admin/owner of team"""
    # Get team
    team_result = await db.execute(
        select(Team).where(Team.id == team_id)
    )
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Check membership
    member_result = await db.execute(
        select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user.id,
            )
        )
    )
    member = member_result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this team")

    if member.role not in [TeamRole.OWNER, TeamRole.ADMIN]:
        raise HTTPException(status_code=403, detail="Admin or owner role required")

    return team


@router.get("/team/{team_id}/preview")
async def get_team_report_preview(
    team_id: int,
    period: ReportPeriod = Query(default=ReportPeriod.WEEKLY),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> TeamReportPreviewResponse:
    """
    Get team report data preview
    Only available to team admins and owners
    """
    team = await get_team_with_admin_check(team_id, current_user, db)

    try:
        # Calculate date range
        end_dt = datetime.fromisoformat(end_date) if end_date else datetime.now()
        if start_date:
            start_dt = datetime.fromisoformat(start_date)
        else:
            if period == ReportPeriod.DAILY:
                start_dt = end_dt.replace(hour=0, minute=0, second=0, microsecond=0)
            elif period == ReportPeriod.WEEKLY:
                start_dt = end_dt - timedelta(days=7)
            else:  # MONTHLY
                start_dt = end_dt - timedelta(days=30)

        # Get team members
        members_result = await db.execute(
            select(TeamMember, User).join(User).where(TeamMember.team_id == team_id)
        )
        members = members_result.all()

        # Aggregate data for each member
        aggregator = ReportDataAggregator(db)
        member_data = []

        for member, user in members:
            try:
                data = await aggregator.get_report_data(
                    user_id=user.id,
                    period=period,
                    start_date=start_dt,
                    end_date=end_dt,
                )
                member_data.append({
                    "user_id": user.id,
                    "name": user.name or user.email,
                    "role": member.role.value,
                    "deep_work_score": data.deep_work_score,
                    "productive_hours": data.productive_hours,
                    "meeting_hours": data.meeting_hours,
                    "productivity_percentage": data.productivity_percentage,
                    "total_hours": data.total_tracked_hours,
                })
            except Exception:
                # Skip members with no data
                continue

        if not member_data:
            # Return empty report if no data
            return TeamReportPreviewResponse(
                team_name=team.name,
                period=period.value,
                start_date=start_dt.isoformat(),
                end_date=end_dt.isoformat(),
                member_count=len(members),
                avg_deep_work_score=0,
                avg_productive_hours=0,
                avg_meeting_hours=0,
                avg_productivity_percentage=0,
                total_team_hours=0,
                top_performers=[],
                needs_attention=[],
                team_trends={"score_trend": 0, "productivity_trend": 0},
                category_breakdown=[],
                insights=["No activity data available for this period."],
                recommendations=["Ensure team members are tracking their activities."],
            )

        # Calculate team averages
        avg_score = sum(m["deep_work_score"] for m in member_data) / len(member_data)
        avg_productive = sum(m["productive_hours"] for m in member_data) / len(member_data)
        avg_meeting = sum(m["meeting_hours"] for m in member_data) / len(member_data)
        avg_productivity = sum(m["productivity_percentage"] for m in member_data) / len(member_data)
        total_hours = sum(m["total_hours"] for m in member_data)

        # Sort for top performers and needs attention
        sorted_by_score = sorted(member_data, key=lambda x: x["deep_work_score"], reverse=True)
        top_performers = sorted_by_score[:3]
        needs_attention = [m for m in sorted_by_score if m["deep_work_score"] < 50][:3]

        # Generate insights
        insights = []
        if avg_score >= 70:
            insights.append(f"Excellent team focus! Average deep work score of {avg_score:.0f}.")
        elif avg_score >= 50:
            insights.append(f"Good team focus with room for improvement. Score: {avg_score:.0f}.")
        else:
            insights.append(f"Team focus needs attention. Current score: {avg_score:.0f}.")

        if avg_meeting > 15:  # 15 hours of meetings per week is high
            insights.append(f"High meeting load ({avg_meeting:.1f}h avg). Consider consolidating.")

        high_performers = len([m for m in member_data if m["deep_work_score"] >= 70])
        insights.append(f"{high_performers} of {len(member_data)} members achieved excellent focus.")

        # Generate recommendations
        recommendations = []
        if len(needs_attention) > 0:
            recommendations.append("Schedule 1-on-1s with team members showing focus challenges.")
        if avg_meeting > avg_productive:
            recommendations.append("Team is spending more time in meetings than deep work. Consider meeting-free days.")
        if avg_score < 60:
            recommendations.append("Implement team-wide focus blocks to improve deep work.")
        recommendations.append("Review the detailed member breakdowns to identify patterns.")

        # Calculate team trends by comparing with previous period
        period_days = (end_dt - start_dt).days or 1
        prev_end_dt = start_dt - timedelta(days=1)
        prev_start_dt = prev_end_dt - timedelta(days=period_days)

        prev_member_data = []
        for member, user in members:
            try:
                data = await aggregator.get_report_data(
                    user_id=user.id,
                    period=period,
                    start_date=prev_start_dt,
                    end_date=prev_end_dt,
                )
                prev_member_data.append({
                    "deep_work_score": data.deep_work_score,
                    "productivity_percentage": data.productivity_percentage,
                })
            except Exception:
                continue

        # Calculate trends
        score_trend = 0
        productivity_trend = 0
        if prev_member_data:
            prev_avg_score = sum(m["deep_work_score"] for m in prev_member_data) / len(prev_member_data)
            prev_avg_productivity = sum(m["productivity_percentage"] for m in prev_member_data) / len(prev_member_data)
            score_trend = round(avg_score - prev_avg_score, 1)
            productivity_trend = round(avg_productivity - prev_avg_productivity, 1)

        # Aggregate category breakdown from member data
        category_totals = {}
        for member, user in members:
            try:
                data = await aggregator.get_report_data(
                    user_id=user.id,
                    period=period,
                    start_date=start_dt,
                    end_date=end_dt,
                )
                for cat in data.category_breakdown:
                    if cat.category not in category_totals:
                        category_totals[cat.category] = {"hours": 0, "percentage": 0}
                    category_totals[cat.category]["hours"] += cat.hours
            except Exception:
                continue

        total_category_hours = sum(c["hours"] for c in category_totals.values())
        category_breakdown = []
        for cat_name, cat_data in sorted(category_totals.items(), key=lambda x: x[1]["hours"], reverse=True):
            percentage = (cat_data["hours"] / total_category_hours * 100) if total_category_hours > 0 else 0
            category_breakdown.append({
                "category": cat_name,
                "hours": round(cat_data["hours"], 2),
                "percentage": round(percentage, 1),
            })

        return TeamReportPreviewResponse(
            team_name=team.name,
            period=period.value,
            start_date=start_dt.isoformat(),
            end_date=end_dt.isoformat(),
            member_count=len(members),
            avg_deep_work_score=round(avg_score, 1),
            avg_productive_hours=round(avg_productive, 2),
            avg_meeting_hours=round(avg_meeting, 2),
            avg_productivity_percentage=round(avg_productivity, 1),
            total_team_hours=round(total_hours, 2),
            top_performers=top_performers,
            needs_attention=needs_attention,
            team_trends={"score_trend": score_trend, "productivity_trend": productivity_trend},
            category_breakdown=category_breakdown[:10],
            insights=insights,
            recommendations=recommendations,
        )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to generate team report: {str(e)}")


@router.get("/team/{team_id}/download")
async def download_team_report(
    team_id: int,
    period: ReportPeriod = Query(default=ReportPeriod.WEEKLY),
    format: ReportFormat = Query(default=ReportFormat.JSON),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Download team report as JSON (PDF support coming soon)
    Only available to team admins and owners
    """
    team = await get_team_with_admin_check(team_id, current_user, db)

    # Get preview data (reuse the preview endpoint logic)
    preview = await get_team_report_preview(
        team_id=team_id,
        period=period,
        start_date=start_date,
        end_date=end_date,
        db=db,
        current_user=current_user,
    )

    if format == ReportFormat.PDF:
        # PDF generation for team reports - return JSON for now
        return {
            "message": "PDF format for team reports coming soon",
            "data": preview.model_dump(),
        }

    return preview.model_dump()


@router.get("/team/{team_id}/members/{user_id}")
async def get_team_member_report(
    team_id: int,
    user_id: int,
    period: ReportPeriod = Query(default=ReportPeriod.WEEKLY),
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Get detailed report for a specific team member
    Only available to team admins/owners or the member themselves
    """
    # Get team
    team_result = await db.execute(
        select(Team).where(Team.id == team_id)
    )
    team = team_result.scalar_one_or_none()
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")

    # Check current user's membership
    current_member_result = await db.execute(
        select(TeamMember).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == current_user.id,
            )
        )
    )
    current_member = current_member_result.scalar_one_or_none()
    if not current_member:
        raise HTTPException(status_code=403, detail="Not a member of this team")

    # Allow if admin/owner OR viewing own data
    is_admin = current_member.role in [TeamRole.OWNER, TeamRole.ADMIN]
    is_self = current_user.id == user_id

    if not is_admin and not is_self:
        raise HTTPException(status_code=403, detail="Cannot view other member reports")

    # Get target member
    target_member_result = await db.execute(
        select(TeamMember, User).join(User).where(
            and_(
                TeamMember.team_id == team_id,
                TeamMember.user_id == user_id,
            )
        )
    )
    target = target_member_result.first()
    if not target:
        raise HTTPException(status_code=404, detail="Team member not found")

    member, user = target

    # Calculate date range
    end_dt = datetime.fromisoformat(end_date) if end_date else datetime.now()
    if start_date:
        start_dt = datetime.fromisoformat(start_date)
    else:
        if period == ReportPeriod.DAILY:
            start_dt = end_dt.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == ReportPeriod.WEEKLY:
            start_dt = end_dt - timedelta(days=7)
        else:
            start_dt = end_dt - timedelta(days=30)

    # Get member's report data
    aggregator = ReportDataAggregator(db)
    data = await aggregator.get_report_data(
        user_id=user.id,
        period=period,
        start_date=start_dt,
        end_date=end_dt,
    )

    return {
        "team_id": team_id,
        "team_name": team.name,
        "user_id": user.id,
        "name": user.name or user.email,
        "role": member.role.value,
        "period": period.value,
        "start_date": start_dt.isoformat(),
        "end_date": end_dt.isoformat(),
        "metrics": {
            "deep_work_score": data.deep_work_score,
            "productive_hours": round(data.productive_hours, 2),
            "meeting_hours": round(data.meeting_hours, 2),
            "total_hours": round(data.total_tracked_hours, 2),
            "productivity_percentage": round(data.productivity_percentage, 1),
        },
        "daily_stats": data.daily_stats,
        "category_breakdown": data.category_breakdown,
        "top_apps": data.top_apps[:10],
        "insights": data.insights,
        "recommendations": data.recommendations,
    }
