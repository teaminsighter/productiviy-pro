"""
System Metrics Service
Provides CPU, memory, disk, and battery information using psutil.
"""

import psutil
from typing import Dict, Any, Optional, List
from datetime import datetime


def get_cpu_metrics() -> Dict[str, Any]:
    """Get CPU usage metrics"""
    cpu_percent = psutil.cpu_percent(interval=0.1)
    cpu_count = psutil.cpu_count()
    cpu_count_logical = psutil.cpu_count(logical=True)

    # Get per-core usage
    per_cpu = psutil.cpu_percent(interval=0.1, percpu=True)

    return {
        "percent": cpu_percent,
        "cores_physical": cpu_count,
        "cores_logical": cpu_count_logical,
        "per_core": per_cpu,
    }


def get_memory_metrics() -> Dict[str, Any]:
    """Get memory usage metrics"""
    memory = psutil.virtual_memory()
    swap = psutil.swap_memory()

    return {
        "total_gb": round(memory.total / (1024**3), 2),
        "available_gb": round(memory.available / (1024**3), 2),
        "used_gb": round(memory.used / (1024**3), 2),
        "percent": memory.percent,
        "swap_total_gb": round(swap.total / (1024**3), 2),
        "swap_used_gb": round(swap.used / (1024**3), 2),
        "swap_percent": swap.percent,
    }


def get_disk_metrics() -> Dict[str, Any]:
    """Get disk usage metrics for the main disk"""
    try:
        disk = psutil.disk_usage('/')

        return {
            "total_gb": round(disk.total / (1024**3), 2),
            "used_gb": round(disk.used / (1024**3), 2),
            "free_gb": round(disk.free / (1024**3), 2),
            "percent": disk.percent,
        }
    except Exception:
        return {
            "total_gb": 0,
            "used_gb": 0,
            "free_gb": 0,
            "percent": 0,
        }


def get_battery_metrics() -> Optional[Dict[str, Any]]:
    """Get battery metrics (if available)"""
    try:
        battery = psutil.sensors_battery()
        if battery:
            # Calculate time left in readable format
            time_left = None
            if battery.secsleft > 0:
                hours = battery.secsleft // 3600
                minutes = (battery.secsleft % 3600) // 60
                time_left = f"{hours}h {minutes}m" if hours > 0 else f"{minutes}m"

            return {
                "percent": battery.percent,
                "plugged": battery.power_plugged,
                "seconds_left": battery.secsleft if battery.secsleft > 0 else None,
                "time_left": time_left,
                "status": "charging" if battery.power_plugged else "discharging",
            }
    except Exception:
        pass
    return None


def get_network_metrics() -> Dict[str, Any]:
    """Get network I/O metrics"""
    try:
        net_io = psutil.net_io_counters()

        return {
            "bytes_sent": net_io.bytes_sent,
            "bytes_recv": net_io.bytes_recv,
            "bytes_sent_mb": round(net_io.bytes_sent / (1024**2), 2),
            "bytes_recv_mb": round(net_io.bytes_recv / (1024**2), 2),
            "packets_sent": net_io.packets_sent,
            "packets_recv": net_io.packets_recv,
        }
    except Exception:
        return {
            "bytes_sent": 0,
            "bytes_recv": 0,
            "bytes_sent_mb": 0,
            "bytes_recv_mb": 0,
            "packets_sent": 0,
            "packets_recv": 0,
        }


def get_system_metrics() -> Dict[str, Any]:
    """Get all system metrics"""
    return {
        "cpu": get_cpu_metrics(),
        "memory": get_memory_metrics(),
        "disk": get_disk_metrics(),
        "battery": get_battery_metrics(),
        "network": get_network_metrics(),
        "timestamp": datetime.now().isoformat(),
    }


def get_running_processes(limit: int = 10, sort_by: str = "cpu") -> List[Dict[str, Any]]:
    """
    Get top running processes.

    Args:
        limit: Maximum number of processes to return
        sort_by: Sort by 'cpu' or 'memory'

    Returns:
        List of process information dictionaries
    """
    processes = []

    for proc in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'status']):
        try:
            pinfo = proc.info
            if pinfo['cpu_percent'] is not None and pinfo['memory_percent'] is not None:
                processes.append({
                    "pid": pinfo['pid'],
                    "name": pinfo['name'],
                    "cpu_percent": round(pinfo['cpu_percent'], 1),
                    "memory_percent": round(pinfo['memory_percent'], 1),
                    "status": pinfo['status'],
                })
        except (psutil.NoSuchProcess, psutil.AccessDenied, psutil.ZombieProcess):
            pass

    # Sort by specified field
    sort_key = 'cpu_percent' if sort_by == 'cpu' else 'memory_percent'
    processes.sort(key=lambda x: x.get(sort_key, 0), reverse=True)

    return processes[:limit]


def get_uptime() -> Dict[str, Any]:
    """Get system uptime information"""
    try:
        boot_time = psutil.boot_time()
        boot_datetime = datetime.fromtimestamp(boot_time)
        uptime_seconds = (datetime.now() - boot_datetime).total_seconds()

        # Format uptime
        days = int(uptime_seconds // 86400)
        hours = int((uptime_seconds % 86400) // 3600)
        minutes = int((uptime_seconds % 3600) // 60)

        if days > 0:
            uptime_str = f"{days}d {hours}h {minutes}m"
        elif hours > 0:
            uptime_str = f"{hours}h {minutes}m"
        else:
            uptime_str = f"{minutes}m"

        return {
            "boot_time": boot_datetime.isoformat(),
            "uptime_seconds": int(uptime_seconds),
            "uptime_formatted": uptime_str,
        }
    except Exception:
        return {
            "boot_time": None,
            "uptime_seconds": 0,
            "uptime_formatted": "Unknown",
        }
