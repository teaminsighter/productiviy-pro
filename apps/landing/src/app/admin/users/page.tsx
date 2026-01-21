'use client';

import { useState, useEffect } from 'react';
import { Search, Filter, MoreVertical, Mail, Calendar, Activity, ChevronLeft, ChevronRight } from 'lucide-react';

interface User {
  id: string;
  email: string;
  name: string;
  plan: string;
  status: string;
  lastActive: string;
  createdAt: string;
  totalTime: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://productifypro.insighter.digital';

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/admin/dashboard/users?page=${page}&search=${search}&filter=${filter}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setTotalPages(data.totalPages || 1);
      }
    } catch (error) {
      // Mock data for demo
      setUsers([
        { id: '1', email: 'john@example.com', name: 'John Doe', plan: 'Pro', status: 'active', lastActive: '2 hours ago', createdAt: 'Jan 15, 2024', totalTime: 12450 },
        { id: '2', email: 'jane@example.com', name: 'Jane Smith', plan: 'Free', status: 'active', lastActive: '5 mins ago', createdAt: 'Jan 18, 2024', totalTime: 8230 },
        { id: '3', email: 'bob@example.com', name: 'Bob Wilson', plan: 'Team', status: 'active', lastActive: '1 day ago', createdAt: 'Jan 10, 2024', totalTime: 24560 },
        { id: '4', email: 'alice@example.com', name: 'Alice Brown', plan: 'Pro', status: 'inactive', lastActive: '1 week ago', createdAt: 'Dec 20, 2023', totalTime: 45230 },
        { id: '5', email: 'charlie@example.com', name: 'Charlie Davis', plan: 'Free', status: 'active', lastActive: 'Just now', createdAt: 'Jan 19, 2024', totalTime: 1230 },
      ]);
      setTotalPages(5);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchUsers();
  }, [page, search, filter]);

  const formatTime = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Users</h1>
        <p className="text-gray-400 mt-1">Manage and view all registered users</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-900 border border-gray-800 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'inactive', 'pro', 'free'].map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2.5 rounded-xl capitalize transition-colors ${
                filter === f ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">User</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Plan</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Total Time</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Last Active</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Joined</th>
              <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-semibold">
                      {user.name.charAt(0)}
                    </div>
                    <div>
                      <p className="text-white font-medium">{user.name}</p>
                      <p className="text-gray-400 text-sm">{user.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    user.plan === 'Pro' ? 'bg-indigo-500/20 text-indigo-400' :
                    user.plan === 'Team' ? 'bg-purple-500/20 text-purple-400' :
                    'bg-gray-700 text-gray-400'
                  }`}>
                    {user.plan}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className={`flex items-center gap-2 text-sm ${
                    user.status === 'active' ? 'text-green-400' : 'text-gray-500'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      user.status === 'active' ? 'bg-green-400' : 'bg-gray-500'
                    }`}></span>
                    {user.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-300">{formatTime(user.totalTime)}</td>
                <td className="px-6 py-4 text-gray-400">{user.lastActive}</td>
                <td className="px-6 py-4 text-gray-400">{user.createdAt}</td>
                <td className="px-6 py-4 text-right">
                  <button className="p-2 hover:bg-gray-800 rounded-lg text-gray-400">
                    <MoreVertical size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Pagination */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-800">
          <p className="text-sm text-gray-400">Showing page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="p-2 rounded-lg bg-gray-800 text-gray-400 hover:bg-gray-700 disabled:opacity-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
