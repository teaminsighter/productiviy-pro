'use client';

import { useState, useEffect } from 'react';
import { 
  Users, 
  Download, 
  DollarSign, 
  TrendingUp, 
  UserPlus, 
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw
} from 'lucide-react';

interface Stats {
  totalUsers: number;
  activeUsers: number;
  totalDownloads: number;
  monthlyRevenue: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  conversionRate: number;
  churnRate: number;
}

interface RecentUser {
  id: string;
  email: string;
  name: string;
  plan: string;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://productifypro.insighter.digital';

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats>({
    totalUsers: 0,
    activeUsers: 0,
    totalDownloads: 0,
    monthlyRevenue: 0,
    newUsersToday: 0,
    newUsersThisWeek: 0,
    conversionRate: 0,
    churnRate: 0,
  });
  const [recentUsers, setRecentUsers] = useState<RecentUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/dashboard/stats`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('admin_token')}`,
        },
      });
      if (response.ok) {
        const data = await response.json();
        setStats(data.stats || stats);
        setRecentUsers(data.recentUsers || []);
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error);
      // Use mock data for demo
      setStats({
        totalUsers: 1247,
        activeUsers: 892,
        totalDownloads: 3421,
        monthlyRevenue: 12450,
        newUsersToday: 23,
        newUsersThisWeek: 156,
        conversionRate: 12.5,
        churnRate: 2.3,
      });
      setRecentUsers([
        { id: '1', email: 'john@example.com', name: 'John Doe', plan: 'Pro', createdAt: '2024-01-20' },
        { id: '2', email: 'jane@example.com', name: 'Jane Smith', plan: 'Free', createdAt: '2024-01-20' },
        { id: '3', email: 'bob@example.com', name: 'Bob Wilson', plan: 'Team', createdAt: '2024-01-19' },
      ]);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, color: 'indigo', change: '+12%' },
    { label: 'Active Users', value: stats.activeUsers.toLocaleString(), icon: Activity, color: 'green', change: '+8%' },
    { label: 'Downloads', value: stats.totalDownloads.toLocaleString(), icon: Download, color: 'blue', change: '+24%' },
    { label: 'Monthly Revenue', value: `$${stats.monthlyRevenue.toLocaleString()}`, icon: DollarSign, color: 'purple', change: '+18%' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-gray-400 mt-1">Welcome back! Here is your business overview.</p>
        </div>
        <button
          onClick={fetchStats}
          disabled={isLoading}
          className="flex items-center gap-2 px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-xl text-gray-300 transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-${stat.color}-500/20`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
              </div>
              <span className="flex items-center text-sm text-green-400">
                <ArrowUpRight className="w-4 h-4" />
                {stat.change}
              </span>
            </div>
            <h3 className="text-gray-400 text-sm">{stat.label}</h3>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Growth Metrics</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <UserPlus className="w-5 h-5 text-indigo-400" />
                <span className="text-gray-300">New Users Today</span>
              </div>
              <span className="text-xl font-semibold text-white">{stats.newUsersToday}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-green-400" />
                <span className="text-gray-300">New Users This Week</span>
              </div>
              <span className="text-xl font-semibold text-white">{stats.newUsersThisWeek}</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-blue-400" />
                <span className="text-gray-300">Conversion Rate</span>
              </div>
              <span className="text-xl font-semibold text-white">{stats.conversionRate}%</span>
            </div>
            <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
              <div className="flex items-center gap-3">
                <ArrowDownRight className="w-5 h-5 text-red-400" />
                <span className="text-gray-300">Churn Rate</span>
              </div>
              <span className="text-xl font-semibold text-white">{stats.churnRate}%</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-white mb-4">Recent Signups</h2>
          <div className="space-y-3">
            {recentUsers.map((user) => (
              <div key={user.id} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                    {user.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-white font-medium">{user.name}</p>
                    <p className="text-gray-400 text-sm">{user.email}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 rounded-lg text-xs font-medium ${
                    user.plan === 'Pro' ? 'bg-indigo-500/20 text-indigo-400' :
                    user.plan === 'Team' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {user.plan}
                  </span>
                  <p className="text-gray-500 text-xs mt-1">{user.createdAt}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
