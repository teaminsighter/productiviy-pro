"""
Goal Sync Service
Automatically synchronizes goal progress from activity data.
Runs as a background task, updating goals, streaks, and achievements.
"""

import asyncio
from datetime import datetime, date, timedelta
from typing import Optional, List, Dict, Any
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import async_session
from app.models.goals import Goal, Streak, Achievement, FocusSession, DailyGoalProgress, ACHIEVEMENT_DEFINITIONS
from app.services.activity_tracker import activity_watch_client
from app.services.classification import classify_activity


class GoalSyncService:
    """Background service to sync goal progress from activity data"""

    def __init__(self):
        self.sync_interval = 60  # seconds
        self.running = False
        self._last_sync: Optional[datetime] = None

    async def start(self):
        """Start the background sync loop"""
        self.running = True
        print("🎯 Goal sync service started")

        while self.running:
            try:
                await self.sync_all_goals()
                self._last_sync = datetime.now()
            except Exception as e:
                print(f"Error in goal sync: {e}")

            await asyncio.sleep(self.sync_interval)

    def stop(self):
        """Stop the sync service"""
        self.running = False
        print("🎯 Goal sync service stopped")

    async def sync_all_goals(self):
        """Main sync logic - update all goals, streaks, and achievements"""
        async with async_session() as db:
            try:
                # 1. Get today's activity summary
                summary = await self._get_today_summary()

                # 2. Get all active goals
                result = await db.execute(
                    select(Goal).where(Goal.is_active == True)
                )
                goals = result.scalars().all()

                if not goals:
                    return

                # 3. Update each goal
                for goal in goals:
                    await self._sync_goal(goal, summary, db)

                # 4. Update streaks based on goal completion
                await self._update_streaks(goals, summary, db)

                # 5. Check and unlock achievements
                await self._check_achievements(goals, summary, db)

                await db.commit()

            except Exception as e:
                print(f"Error syncing goals: {e}")
                await db.rollback()

    async def _get_today_summary(self) -> Dict[str, Any]:
        """Fetch today's activity summary from ActivityWatch"""
        today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
        today_end = today_start + timedelta(days=1)

        activities = await activity_watch_client.get_activities(today_start, today_end)

        productive_time = 0
        distracting_time = 0
        neutral_time = 0
        categories: Dict[str, int] = {}
        apps: Dict[str, int] = {}
        early_productive = False  # Before 9am
        late_productive = False   # After 9pm

        for activity in activities:
            duration = activity.get("duration", 0)
            app_name = activity.get("app_name", "")
            window_title = activity.get("window_title", "")
            url = activity.get("url")
            start_time_str = activity.get("start_time", "")

            # Classify the activity
            classification = classify_activity(app_name, window_title, url)

            # Track time by productivity type
            if classification.productivity_type == "productive":
                productive_time += duration

                # Check for early/late productivity
                try:
                    if start_time_str:
                        start_time = datetime.fromisoformat(start_time_str.replace("Z", "+00:00"))
                        if start_time.hour < 9:
                            early_productive = True
                        if start_time.hour >= 21:
                            late_productive = True
                except:
                    pass

            elif classification.productivity_type == "distracting":
                distracting_time += duration
            else:
                neutral_time += duration

            # Track by category
            category = classification.category
            categories[category] = categories.get(category, 0) + duration

            # Track by app
            apps[app_name] = apps.get(app_name, 0) + duration

        return {
            "productive_time": productive_time,
            "distracting_time": distracting_time,
            "neutral_time": neutral_time,
            "total_time": productive_time + distracting_time + neutral_time,
            "categories": [
                {"category": cat, "duration": dur}
                for cat, dur in categories.items()
            ],
            "apps": [
                {"app_name": app, "duration": dur}
                for app, dur in apps.items()
            ],
            "early_productive": early_productive,
            "late_productive": late_productive,
        }

    async def _sync_goal(self, goal: Goal, summary: Dict[str, Any], db: AsyncSession):
        """Sync a single goal's progress"""
        today = date.today()

        # Check for daily reset
        if goal.frequency == "daily" and goal.last_reset:
            last_reset_date = goal.last_reset.date() if isinstance(goal.last_reset, datetime) else goal.last_reset
            if last_reset_date < today:
                # Record yesterday's progress before resetting
                await self._record_daily_progress(goal, last_reset_date, db)

                # Reset for new day
                goal.current_value = 0.0
                goal.status = "on_track"
                goal.last_reset = datetime.now()

        # Calculate current progress based on goal type
        new_value = await self._calculate_goal_progress(goal, summary, db)
        goal.current_value = new_value

        # Update status
        goal.status = self._calculate_status(goal)

    async def _calculate_goal_progress(self, goal: Goal, summary: Dict[str, Any], db: AsyncSession) -> float:
        """Calculate current goal progress based on goal type"""

        if goal.goal_type == "productive_hours":
            # Convert seconds to hours
            return summary["productive_time"] / 3600

        elif goal.goal_type == "distraction_limit":
            # For limits, track how much has been used
            return summary["distracting_time"] / 3600

        elif goal.goal_type == "category_limit":
            # Find the target category's time
            for cat in summary["categories"]:
                if cat["category"] == goal.target_category:
                    return cat["duration"] / 3600
            return 0.0

        elif goal.goal_type == "app_specific":
            # Find the target app's time
            for app in summary["apps"]:
                if goal.target_app and goal.target_app.lower() in app["app_name"].lower():
                    return app["duration"] / 3600
            return 0.0

        elif goal.goal_type == "focus_sessions":
            # Count today's completed focus sessions
            today_start = datetime.now().replace(hour=0, minute=0, second=0, microsecond=0)
            result = await db.execute(
                select(func.count(FocusSession.id)).where(
                    and_(
                        FocusSession.started_at >= today_start,
                        FocusSession.was_completed == True
                    )
                )
            )
            count = result.scalar() or 0
            return float(count)

        return 0.0

    def _calculate_status(self, goal: Goal) -> str:
        """Calculate goal status based on progress and time of day"""
        if goal.target_value <= 0:
            return "on_track"

        # For limit goals (distraction_limit, category_limit), logic is inverted
        if goal.goal_type in ["distraction_limit", "category_limit"]:
            # Goal is "completed" (success) if under the limit
            if goal.current_value <= goal.target_value:
                return "completed"
            else:
                return "failed"

        # For positive goals (productive_hours, focus_sessions, app_specific)
        progress_pct = (goal.current_value / goal.target_value) * 100

        if progress_pct >= 100:
            return "completed"

        # Check if on track based on time of day
        now = datetime.now()
        if goal.frequency == "daily":
            hours_elapsed = now.hour + (now.minute / 60)
            expected_progress = (hours_elapsed / 24) * 100

            if progress_pct >= expected_progress * 0.7:
                return "on_track"
            elif progress_pct >= expected_progress * 0.4:
                return "at_risk"
            else:
                return "at_risk"

        return "on_track"

    async def _record_daily_progress(self, goal: Goal, record_date: date, db: AsyncSession):
        """Record daily goal progress to history table"""
        # Check if already recorded
        result = await db.execute(
            select(DailyGoalProgress).where(
                and_(
                    DailyGoalProgress.goal_id == goal.id,
                    func.date(DailyGoalProgress.date) == record_date
                )
            )
        )
        existing = result.scalar_one_or_none()

        if existing:
            # Update existing record
            existing.value = goal.current_value
            existing.was_achieved = goal.status == "completed"
        else:
            # Create new record
            progress = DailyGoalProgress(
                goal_id=goal.id,
                date=datetime.combine(record_date, datetime.min.time()),
                value=goal.current_value,
                target=goal.target_value,
                was_achieved=goal.status == "completed"
            )
            db.add(progress)

    async def _update_streaks(self, goals: List[Goal], summary: Dict[str, Any], db: AsyncSession):
        """Update streaks based on goal completion"""
        today = date.today()

        # Get or create streaks
        result = await db.execute(select(Streak))
        streaks = {s.streak_type: s for s in result.scalars().all()}

        # Initialize missing streaks
        for streak_type in ["productivity_goal", "distraction_limit", "focus_sessions", "consistency"]:
            if streak_type not in streaks:
                streak = Streak(streak_type=streak_type)
                db.add(streak)
                streaks[streak_type] = streak

        # Check conditions for each streak type
        productivity_goal_met = any(
            g.goal_type == "productive_hours" and g.status == "completed"
            for g in goals
        )

        distraction_limit_met = all(
            g.current_value <= g.target_value
            for g in goals if g.goal_type == "distraction_limit"
        ) if any(g.goal_type == "distraction_limit" for g in goals) else False

        focus_sessions_met = any(
            g.goal_type == "focus_sessions" and g.current_value >= 1
            for g in goals
        )

        all_goals_completed = all(g.status == "completed" for g in goals) if goals else False

        # Update productivity_goal streak
        await self._update_single_streak(
            streaks["productivity_goal"],
            productivity_goal_met,
            today,
            db
        )

        # Update distraction_limit streak
        await self._update_single_streak(
            streaks["distraction_limit"],
            distraction_limit_met,
            today,
            db
        )

        # Update focus_sessions streak
        await self._update_single_streak(
            streaks["focus_sessions"],
            focus_sessions_met,
            today,
            db
        )

        # Update consistency streak (all goals met)
        await self._update_single_streak(
            streaks["consistency"],
            all_goals_completed,
            today,
            db
        )

    async def _update_single_streak(self, streak: Streak, condition_met: bool, today: date, db: AsyncSession):
        """Update a single streak"""
        last_achieved = streak.last_achieved_date.date() if streak.last_achieved_date else None

        if condition_met:
            if last_achieved == today:
                # Already recorded today
                pass
            elif last_achieved == today - timedelta(days=1):
                # Consecutive day - increment
                streak.increment()
            elif last_achieved is None or last_achieved < today - timedelta(days=1):
                # Gap in streak - reset and start new
                streak.current_count = 1
                streak.last_achieved_date = datetime.now()
                streak.last_updated = datetime.now()
                if streak.current_count > streak.best_count:
                    streak.best_count = streak.current_count

    async def _check_achievements(self, goals: List[Goal], summary: Dict[str, Any], db: AsyncSession):
        """Check and unlock achievements based on activity and goals"""

        # Get all achievements
        result = await db.execute(select(Achievement))
        achievements = {a.achievement_type: a for a in result.scalars().all()}

        # Initialize missing achievements
        for defn in ACHIEVEMENT_DEFINITIONS:
            if defn["achievement_type"] not in achievements:
                achievement = Achievement(
                    achievement_type=defn["achievement_type"],
                    name=defn["name"],
                    description=defn["description"],
                    icon=defn["icon"],
                    target=defn["target"],
                    progress=0,
                    is_unlocked=False,
                )
                db.add(achievement)
                achievements[defn["achievement_type"]] = achievement

        # Get streaks for streak-based achievements
        result = await db.execute(select(Streak))
        streaks = {s.streak_type: s for s in result.scalars().all()}

        # Check streak achievements
        max_streak = max((s.current_count for s in streaks.values()), default=0)

        if max_streak >= 7:
            await self._unlock_achievement(achievements.get("streak_7_days"), db)
        if max_streak >= 30:
            await self._unlock_achievement(achievements.get("streak_30_days"), db)
        if max_streak >= 100:
            await self._unlock_achievement(achievements.get("streak_100_days"), db)

        # Check hours achievements (cumulative)
        total_productive_hours = await self._get_total_productive_hours(db)

        if total_productive_hours >= 100:
            await self._update_achievement_progress(achievements.get("hours_100"), 100, db)
        if total_productive_hours >= 500:
            await self._update_achievement_progress(achievements.get("hours_500"), 500, db)
        if total_productive_hours >= 1000:
            await self._update_achievement_progress(achievements.get("hours_1000"), 1000, db)

        # Check early bird / night owl
        if summary.get("early_productive"):
            await self._increment_achievement(achievements.get("early_bird"), db)
        if summary.get("late_productive"):
            await self._increment_achievement(achievements.get("night_owl"), db)

        # Check zero distraction day
        if summary["distracting_time"] == 0 and summary["total_time"] > 3600:  # At least 1 hour tracked
            await self._unlock_achievement(achievements.get("zero_distraction_day"), db)

        # Check distraction fighter (7 day streak of staying under limit)
        distraction_streak = streaks.get("distraction_limit")
        if distraction_streak and distraction_streak.current_count >= 7:
            await self._unlock_achievement(achievements.get("distraction_fighter"), db)

        # Check goal crusher (50 goals completed)
        completed_count = await self._get_total_completed_goals(db)
        if completed_count >= 50:
            await self._update_achievement_progress(achievements.get("goal_crusher"), 50, db)

        # Check perfect week (all goals met for 7 days)
        consistency_streak = streaks.get("consistency")
        if consistency_streak and consistency_streak.current_count >= 7:
            await self._unlock_achievement(achievements.get("perfect_week"), db)

    async def _unlock_achievement(self, achievement: Optional[Achievement], db: AsyncSession):
        """Unlock an achievement if not already unlocked"""
        if achievement and not achievement.is_unlocked:
            achievement.unlock()
            print(f"🏆 Achievement unlocked: {achievement.name}")

    async def _update_achievement_progress(self, achievement: Optional[Achievement], value: float, db: AsyncSession):
        """Update achievement progress and unlock if target reached"""
        if achievement:
            achievement.progress = value
            if achievement.target and value >= achievement.target and not achievement.is_unlocked:
                achievement.unlock()
                print(f"🏆 Achievement unlocked: {achievement.name}")

    async def _increment_achievement(self, achievement: Optional[Achievement], db: AsyncSession):
        """Increment achievement progress by 1"""
        if achievement and not achievement.is_unlocked:
            achievement.progress += 1
            if achievement.target and achievement.progress >= achievement.target:
                achievement.unlock()
                print(f"🏆 Achievement unlocked: {achievement.name}")

    async def _get_total_productive_hours(self, db: AsyncSession) -> float:
        """Get total cumulative productive hours from daily progress"""
        result = await db.execute(
            select(func.sum(DailyGoalProgress.value)).where(
                DailyGoalProgress.was_achieved == True
            )
        )
        total = result.scalar() or 0
        return float(total)

    async def _get_total_completed_goals(self, db: AsyncSession) -> int:
        """Get total count of completed goal instances"""
        result = await db.execute(
            select(func.count(DailyGoalProgress.id)).where(
                DailyGoalProgress.was_achieved == True
            )
        )
        return result.scalar() or 0


# Singleton instance
goal_sync_service = GoalSyncService()
