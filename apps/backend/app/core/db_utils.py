"""
Database Utilities and Query Optimization Helpers
"""
from datetime import datetime, timedelta
from typing import TypeVar, Generic, Optional, List, Any
from sqlalchemy import select, func, and_, or_, desc
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload, joinedload

from app.core.logging import get_logger

logger = get_logger(__name__)

T = TypeVar('T')


class PaginatedResult(Generic[T]):
    """Paginated query result container"""

    def __init__(
        self,
        items: List[T],
        total: int,
        page: int,
        page_size: int
    ):
        self.items = items
        self.total = total
        self.page = page
        self.page_size = page_size
        self.pages = (total + page_size - 1) // page_size if page_size > 0 else 0
        self.has_next = page < self.pages
        self.has_prev = page > 1

    def to_dict(self) -> dict:
        return {
            "items": self.items,
            "total": self.total,
            "page": self.page,
            "page_size": self.page_size,
            "pages": self.pages,
            "has_next": self.has_next,
            "has_prev": self.has_prev,
        }


async def paginate(
    session: AsyncSession,
    query,
    page: int = 1,
    page_size: int = 50,
    max_page_size: int = 100
) -> PaginatedResult:
    """
    Paginate a SQLAlchemy query efficiently.

    Args:
        session: Database session
        query: SQLAlchemy select query
        page: Page number (1-indexed)
        page_size: Items per page
        max_page_size: Maximum allowed page size

    Returns:
        PaginatedResult with items and metadata
    """
    # Enforce limits
    page = max(1, page)
    page_size = min(max(1, page_size), max_page_size)

    # Get total count (use subquery for efficiency)
    count_query = select(func.count()).select_from(query.subquery())
    total_result = await session.execute(count_query)
    total = total_result.scalar() or 0

    # Apply pagination
    offset = (page - 1) * page_size
    paginated_query = query.offset(offset).limit(page_size)

    # Execute query
    result = await session.execute(paginated_query)
    items = result.scalars().all()

    return PaginatedResult(
        items=list(items),
        total=total,
        page=page,
        page_size=page_size
    )


def date_range_filter(
    column,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    period: str = "today"
):
    """
    Create a date range filter for a column.

    Args:
        column: SQLAlchemy column to filter
        start_date: Optional start date override
        end_date: Optional end date override
        period: Period shortcut ("today", "yesterday", "week", "month", "year")

    Returns:
        SQLAlchemy filter expression
    """
    now = datetime.utcnow()

    if start_date is None or end_date is None:
        if period == "today":
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now
        elif period == "yesterday":
            start_date = (now - timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == "week":
            start_date = (now - timedelta(days=7)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now
        elif period == "month":
            start_date = (now - timedelta(days=30)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now
        elif period == "year":
            start_date = (now - timedelta(days=365)).replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now
        else:
            # Default to today
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
            end_date = now

    return and_(column >= start_date, column <= end_date)


async def batch_insert(
    session: AsyncSession,
    model_class,
    items: List[dict],
    batch_size: int = 1000
) -> int:
    """
    Insert items in batches for better performance.

    Args:
        session: Database session
        model_class: SQLAlchemy model class
        items: List of dictionaries to insert
        batch_size: Number of items per batch

    Returns:
        Number of items inserted
    """
    total_inserted = 0

    for i in range(0, len(items), batch_size):
        batch = items[i:i + batch_size]
        objects = [model_class(**item) for item in batch]
        session.add_all(objects)
        await session.flush()
        total_inserted += len(batch)

        logger.debug(f"Inserted batch {i // batch_size + 1} ({len(batch)} items)")

    await session.commit()
    logger.info(f"Batch insert complete: {total_inserted} items")

    return total_inserted


async def bulk_update(
    session: AsyncSession,
    model_class,
    updates: List[dict],
    id_field: str = "id"
) -> int:
    """
    Update multiple rows efficiently.

    Args:
        session: Database session
        model_class: SQLAlchemy model class
        updates: List of dicts with id and fields to update
        id_field: Name of the ID field

    Returns:
        Number of rows updated
    """
    if not updates:
        return 0

    updated = 0
    for update_data in updates:
        item_id = update_data.pop(id_field, None)
        if item_id is None:
            continue

        result = await session.execute(
            select(model_class).where(getattr(model_class, id_field) == item_id)
        )
        item = result.scalar_one_or_none()

        if item:
            for key, value in update_data.items():
                if hasattr(item, key):
                    setattr(item, key, value)
            updated += 1

    await session.commit()
    return updated


def optimize_query_for_listing(
    query,
    order_column=None,
    order_desc: bool = True,
    eager_load: List[str] = None
):
    """
    Apply common optimizations for listing queries.

    Args:
        query: Base SQLAlchemy query
        order_column: Column to order by
        order_desc: Whether to order descending
        eager_load: List of relationship names to eager load

    Returns:
        Optimized query
    """
    # Apply ordering
    if order_column is not None:
        if order_desc:
            query = query.order_by(desc(order_column))
        else:
            query = query.order_by(order_column)

    # Apply eager loading
    if eager_load:
        for relationship_name in eager_load:
            query = query.options(selectinload(relationship_name))

    return query


class QueryProfiler:
    """Simple query profiler for development debugging"""

    def __init__(self):
        self.queries = []

    def start(self, query_name: str):
        self.queries.append({
            "name": query_name,
            "start_time": datetime.utcnow(),
            "end_time": None,
            "duration_ms": None
        })

    def end(self):
        if self.queries and self.queries[-1]["end_time"] is None:
            self.queries[-1]["end_time"] = datetime.utcnow()
            duration = (self.queries[-1]["end_time"] - self.queries[-1]["start_time"])
            self.queries[-1]["duration_ms"] = duration.total_seconds() * 1000

    def get_slow_queries(self, threshold_ms: float = 100) -> List[dict]:
        return [q for q in self.queries if q["duration_ms"] and q["duration_ms"] > threshold_ms]

    def get_summary(self) -> dict:
        completed = [q for q in self.queries if q["duration_ms"] is not None]
        if not completed:
            return {"total_queries": 0, "avg_ms": 0, "max_ms": 0, "slow_queries": 0}

        durations = [q["duration_ms"] for q in completed]
        return {
            "total_queries": len(completed),
            "avg_ms": sum(durations) / len(durations),
            "max_ms": max(durations),
            "slow_queries": len(self.get_slow_queries())
        }

    def reset(self):
        self.queries = []
