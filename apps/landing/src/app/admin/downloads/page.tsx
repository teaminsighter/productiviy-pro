'use client';

import { useState, useEffect } from 'react';
import { Download, Monitor, Apple, Laptop, TrendingUp, Calendar, Globe } from 'lucide-react';

interface DownloadStats {
  total: number;
  today: number;
  thisWeek: number;
  thisMonth: number;
  byPlatform: {
    macos: number;
    windows: number;
    linux: number;
  };
  byVersion: {
    version: string;
    downloads: number;
  }[];
}

interface DownloadRecord {
  id: string;
  platform: string;
  version: string;
  country: string;
  date: string;
  ip: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://productifypro.insighter.digital';

export default function DownloadsPage() {
  const [stats, setStats] = useState<DownloadStats>({
    total: 0,
    today: 0,
    thisWeek: 0,
    thisMonth: 0,
    byPlatform: { macos: 0, windows: 0, linux: 0 },
    byVersion: [],
  });
  const [downloads, setDownloads] = useState<DownloadRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDownloads = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/admin/dashboard/downloads`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
          setDownloads(data.downloads);
        }
      } catch (error) {
        // Mock data
        setStats({
          total: 3421,
          today: 47,
          thisWeek: 312,
          thisMonth: 1245,
          byPlatform: { macos: 1856, windows: 1234, linux: 331 },
          byVersion: [
            { version: '1.0.0', downloads: 3421 },
            { version: '0.9.5', downloads: 2156 },
            { version: '0.9.0', downloads: 1432 },
          ],
        });
        setDownloads([
          { id: '1', platform: 'macOS', version: '1.0.0', country: 'United States', date: '2 mins ago', ip: '192.168.x.x' },
          { id: '2', platform: 'Windows', version: '1.0.0', country: 'Germany', date: '15 mins ago', ip: '10.0.x.x' },
          { id: '3', platform: 'macOS', version: '1.0.0', country: 'United Kingdom', date: '1 hour ago', ip: '172.16.x.x' },
          { id: '4', platform: 'Linux', version: '1.0.0', country: 'Canada', date: '2 hours ago', ip: '192.168.x.x' },
          { id: '5', platform: 'Windows', version: '1.0.0', country: 'France', date: '3 hours ago', ip: '10.0.x.x' },
        ]);
      }
      setIsLoading(false);
    };
    fetchDownloads();
  }, []);

  const getPlatformIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'macos': return Apple;
      case 'windows': return Monitor;
      case 'linux': return Laptop;
      default: return Download;
    }
  };

  const totalPlatform = stats.byPlatform.macos + stats.byPlatform.windows + stats.byPlatform.linux;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Downloads</h1>
        <p className="text-gray-400 mt-1">Track app downloads across all platforms</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-indigo-500/20">
              <Download className="w-6 h-6 text-indigo-400" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm">Total Downloads</h3>
          <p className="text-2xl font-bold text-white mt-1">{stats.total.toLocaleString()}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-green-500/20">
              <TrendingUp className="w-6 h-6 text-green-400" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm">Today</h3>
          <p className="text-2xl font-bold text-white mt-1">{stats.today}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-blue-500/20">
              <Calendar className="w-6 h-6 text-blue-400" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm">This Week</h3>
          <p className="text-2xl font-bold text-white mt-1">{stats.thisWeek}</p>
        </div>
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-purple-500/20">
              <Globe className="w-6 h-6 text-purple-400" />
            </div>
          </div>
          <h3 className="text-gray-400 text-sm">This Month</h3>
          <p className="text-2xl font-bold text-white mt-1">{stats.thisMonth}</p>
        </div>
      </div>

      {/* Platform Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Downloads by Platform</h2>
          <div className="space-y-4">
            {[
              { name: 'macOS', count: stats.byPlatform.macos, icon: Apple, color: 'gray' },
              { name: 'Windows', count: stats.byPlatform.windows, icon: Monitor, color: 'blue' },
              { name: 'Linux', count: stats.byPlatform.linux, icon: Laptop, color: 'orange' },
            ].map((platform) => (
              <div key={platform.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <platform.icon className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-300">{platform.name}</span>
                  </div>
                  <span className="text-white font-medium">{platform.count.toLocaleString()}</span>
                </div>
                <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full bg-${platform.color}-500 rounded-full`}
                    style={{ width: `${(platform.count / totalPlatform) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
          <h2 className="text-xl font-semibold text-white mb-6">Downloads by Version</h2>
          <div className="space-y-4">
            {stats.byVersion.map((ver) => (
              <div key={ver.version} className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
                <span className="text-gray-300">v{ver.version}</span>
                <span className="text-white font-medium">{ver.downloads.toLocaleString()} downloads</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Downloads */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Recent Downloads</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Platform</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Version</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Country</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {downloads.map((dl) => {
              const PlatformIcon = getPlatformIcon(dl.platform);
              return (
                <tr key={dl.id} className="hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <PlatformIcon className="w-5 h-5 text-gray-400" />
                      <span className="text-white">{dl.platform}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-300">v{dl.version}</td>
                  <td className="px-6 py-4 text-gray-300">{dl.country}</td>
                  <td className="px-6 py-4 text-gray-400">{dl.date}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
