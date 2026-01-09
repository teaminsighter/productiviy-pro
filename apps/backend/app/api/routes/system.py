"""
System Metrics API Routes
Provides endpoints for CPU, memory, disk, and process information.
"""

from fastapi import APIRouter, Query
from typing import Optional

from app.services.system_metrics import (
    get_system_metrics,
    get_cpu_metrics,
    get_memory_metrics,
    get_disk_metrics,
    get_battery_metrics,
    get_network_metrics,
    get_running_processes,
    get_uptime,
)

router = APIRouter()


@router.get("/metrics")
async def get_all_metrics():
    """Get all system metrics (CPU, memory, disk, battery, network)"""
    return get_system_metrics()


@router.get("/cpu")
async def get_cpu():
    """Get CPU usage metrics"""
    return get_cpu_metrics()


@router.get("/memory")
async def get_memory():
    """Get memory usage metrics"""
    return get_memory_metrics()


@router.get("/disk")
async def get_disk():
    """Get disk usage metrics"""
    return get_disk_metrics()


@router.get("/battery")
async def get_battery():
    """Get battery metrics (if available)"""
    battery = get_battery_metrics()
    if battery:
        return battery
    return {"available": False, "message": "No battery detected"}


@router.get("/network")
async def get_network():
    """Get network I/O metrics"""
    return get_network_metrics()


@router.get("/processes")
async def get_processes(
    limit: int = Query(10, ge=1, le=50, description="Maximum number of processes"),
    sort_by: str = Query("cpu", regex="^(cpu|memory)$", description="Sort by cpu or memory"),
):
    """Get top running processes"""
    return {
        "processes": get_running_processes(limit=limit, sort_by=sort_by),
        "count": limit,
        "sort_by": sort_by,
    }


@router.get("/uptime")
async def get_system_uptime():
    """Get system uptime information"""
    return get_uptime()


@router.get("/health")
async def health_check():
    """Quick health check with basic metrics"""
    cpu = get_cpu_metrics()
    memory = get_memory_metrics()
    disk = get_disk_metrics()

    # Determine health status
    status = "healthy"
    warnings = []

    if cpu["percent"] > 90:
        warnings.append("High CPU usage")
        status = "warning"
    if memory["percent"] > 90:
        warnings.append("High memory usage")
        status = "warning"
    if disk["percent"] > 90:
        warnings.append("Low disk space")
        status = "warning"

    return {
        "status": status,
        "warnings": warnings,
        "cpu_percent": cpu["percent"],
        "memory_percent": memory["percent"],
        "disk_percent": disk["percent"],
    }
