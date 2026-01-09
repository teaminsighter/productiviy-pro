import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Globe, List, Layers, Search,
  ChevronRight, ExternalLink,
  Calendar, RefreshCw, ChevronDown,
  Play, Youtube, Tv, BookOpen,
  ChevronLeft, Sparkles
} from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { Button } from '@/components/common/Button';
import { apiClient } from '@/lib/api/client';
import { useRealTimeActivity } from '@/hooks/useRealTimeActivity';

type TabType = 'history' | 'platforms' | 'websites' | 'detail' | 'websiteDetail';

interface ActivityItem {
  id: number;
  url: string;
  title: string;
  domain: string;
  app: string;
  duration: number;
  timestamp: string;
  category: string;
  is_productive: boolean;
  productivity_type: string;
}

interface Platform {
  domain: string;
  total_time: number;
  visit_count: number;
  unique_urls: number;
  productivity: string;
  category: string;
  last_visited: string;
  is_productive: boolean;
}

interface PlatformDetail {
  domain: string;
  total_time: number;
  unique_urls: number;
  productivity: string;
  category: string;
  urls: Array<{
    url: string;
    url_hash: string;
    title: string;
    total_time: number;
    visit_count: number;
    visits: Array<{ timestamp: string; duration: number; title: string }>;
  }>;
}

interface Website {
  site: string;
  total_time: number;
  visit_count: number;
  pages: number;
  productivity: string;
  category: string;
  last_visited: string;
}

interface WebsiteDetail {
  site: string;
  total_time: number;
  visit_count: number;
  productivity: string;
  category: string;
  pages: Array<{
    title: string;
    total_time: number;
    visit_count: number;
    visits: Array<{ timestamp: string; duration: number }>;
  }>;
}

export default function Activity() {
  const [activeTab, setActiveTab] = useState<TabType>('platforms');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Real-time activity from hook
  const { currentActivity } = useRealTimeActivity();

  // Data
  const [history, setHistory] = useState<ActivityItem[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [websites, setWebsites] = useState<Website[]>([]);
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null);
  const [selectedSite, setSelectedSite] = useState<string | null>(null);
  const [platformDetail, setPlatformDetail] = useState<PlatformDetail | null>(null);
  const [selectedWebsite, setSelectedWebsite] = useState<string | null>(null);
  const [websiteDetail, setWebsiteDetail] = useState<WebsiteDetail | null>(null);

  // Auto-refresh
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [secondsAgo, setSecondsAgo] = useState(0);
  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const AUTO_REFRESH_INTERVAL = 10000; // 10 seconds for faster updates

  // Update "seconds ago" counter
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsAgo(Math.floor((Date.now() - lastUpdated.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [lastUpdated]);

  // Auto-refresh data
  useEffect(() => {
    const refreshData = () => {
      if (activeTab === 'history') {
        fetchHistory(false);
      } else if (activeTab === 'platforms') {
        fetchPlatforms(false);
      } else if (activeTab === 'websites') {
        fetchWebsites(false);
      } else if (activeTab === 'detail' && platformDetail) {
        fetchPlatformDetail(platformDetail.domain, false);
      } else if (activeTab === 'websiteDetail' && websiteDetail) {
        fetchWebsiteDetail(websiteDetail.site, false);
      }
    };

    // Initial fetch
    refreshData();

    // Set up auto-refresh
    refreshIntervalRef.current = setInterval(refreshData, AUTO_REFRESH_INTERVAL);

    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, [activeTab, selectedDate]);

  useEffect(() => {
    if (selectedPlatform) {
      fetchPlatformDetail(selectedPlatform);
      setActiveTab('detail');
      setSelectedSite(null);
    }
  }, [selectedPlatform]);

  useEffect(() => {
    if (selectedWebsite) {
      fetchWebsiteDetail(selectedWebsite);
      setActiveTab('websiteDetail');
    }
  }, [selectedWebsite]);

  const fetchHistory = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const isToday = selectedDate === new Date().toISOString().split('T')[0];
      const params: Record<string, string | number> = {
        limit: 100,
        period: isToday ? 'today' : 'custom',
        ...(isToday ? {} : { date: selectedDate })
      };
      const response = await apiClient.get('/api/activities/history', { params });
      setHistory(response.data.activities || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch history:', error);
      setHistory([]);
    }
    if (showLoading) setIsLoading(false);
  };

  const fetchPlatforms = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const isToday = selectedDate === new Date().toISOString().split('T')[0];
      const params: Record<string, string> = {
        period: isToday ? 'today' : 'custom',
        ...(isToday ? {} : { date: selectedDate })
      };
      const response = await apiClient.get('/api/activities/platforms', { params });
      setPlatforms(response.data.platforms || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch platforms:', error);
      setPlatforms([]);
    }
    if (showLoading) setIsLoading(false);
  };

  const fetchPlatformDetail = async (domain: string, showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const isToday = selectedDate === new Date().toISOString().split('T')[0];
      const params: Record<string, string> = {
        period: isToday ? 'today' : 'custom',
        ...(isToday ? {} : { date: selectedDate })
      };
      const response = await apiClient.get(`/api/activities/platforms/${encodeURIComponent(domain)}`, { params });
      setPlatformDetail(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch platform detail:', error);
      setPlatformDetail(null);
    }
    if (showLoading) setIsLoading(false);
  };

  const fetchWebsites = async (showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const isToday = selectedDate === new Date().toISOString().split('T')[0];
      const params: Record<string, string> = {
        period: isToday ? 'today' : 'custom',
        ...(isToday ? {} : { date: selectedDate })
      };
      const response = await apiClient.get('/api/activities/websites', { params });
      setWebsites(response.data.websites || []);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch websites:', error);
      setWebsites([]);
    }
    if (showLoading) setIsLoading(false);
  };

  const fetchWebsiteDetail = async (site: string, showLoading = true) => {
    if (showLoading) setIsLoading(true);
    try {
      const isToday = selectedDate === new Date().toISOString().split('T')[0];
      const params: Record<string, string> = {
        period: isToday ? 'today' : 'custom',
        ...(isToday ? {} : { date: selectedDate })
      };
      const response = await apiClient.get(`/api/activities/websites/${encodeURIComponent(site)}`, { params });
      setWebsiteDetail(response.data);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch website detail:', error);
      setWebsiteDetail(null);
    }
    if (showLoading) setIsLoading(false);
  };

  const handleRefresh = useCallback(() => {
    if (activeTab === 'history') fetchHistory();
    else if (activeTab === 'platforms') fetchPlatforms();
    else if (activeTab === 'websites') fetchWebsites();
    else if (activeTab === 'detail' && platformDetail) fetchPlatformDetail(platformDetail.domain);
    else if (activeTab === 'websiteDetail' && websiteDetail) fetchWebsiteDetail(websiteDetail.site);
  }, [activeTab, platformDetail, websiteDetail]);

  // Date navigation
  const navigateDate = (direction: 'prev' | 'next') => {
    const current = new Date(selectedDate);
    current.setDate(current.getDate() + (direction === 'next' ? 1 : -1));
    const today = new Date();
    if (current <= today) {
      setSelectedDate(current.toISOString().split('T')[0]);
    }
  };

  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const formatDuration = (seconds: number): string => {
    if (!seconds || isNaN(seconds)) return '0s';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    if (minutes > 0) return `${minutes}m ${secs}s`;
    return `${secs}s`;
  };

  const formatTime = (timestamp: string): string => {
    try {
      return new Date(timestamp).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '--:--';
    }
  };

  const getProductivityColor = (productivity: string): string => {
    switch (productivity) {
      case 'productive': return 'text-green-400 bg-green-500/20';
      case 'distracting': return 'text-red-400 bg-red-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const filteredHistory = history.filter(item =>
    (item.title?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
    (item.domain?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  const filteredPlatforms = platforms.filter(platform =>
    (platform.domain?.toLowerCase() || '').includes(searchQuery.toLowerCase())
  );

  // Check if item is new (added in last 5 minutes)
  const isNewItem = (timestamp: string): boolean => {
    const itemTime = new Date(timestamp).getTime();
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    return itemTime > fiveMinutesAgo;
  };

  // Format date for display
  const formatDateDisplay = (dateStr: string): string => {
    const date = new Date(dateStr);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (dateStr === today.toISOString().split('T')[0]) return 'Today';
    if (dateStr === yesterday.toISOString().split('T')[0]) return 'Yesterday';
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  // Build breadcrumb path
  const getBreadcrumbs = () => {
    const crumbs: Array<{ label: string; onClick: () => void }> = [];

    crumbs.push({
      label: 'Platforms',
      onClick: () => {
        setActiveTab('platforms');
        setSelectedPlatform(null);
        setSelectedSite(null);
        setPlatformDetail(null);
      }
    });

    if (platformDetail) {
      crumbs.push({
        label: platformDetail.domain,
        onClick: () => {
          setSelectedSite(null);
        }
      });
    }

    if (selectedSite) {
      crumbs.push({
        label: selectedSite,
        onClick: () => {}
      });
    }

    return crumbs;
  };

  return (
    <div className="space-y-6">
      {/* Header with Live Status */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Activity</h1>
          <p className="text-white/50">Track your browsing and app usage</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Live Status Indicator */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            <span className="text-sm text-green-400">
              Live • {secondsAgo}s ago
            </span>
          </div>
          <Button variant="outline" onClick={handleRefresh}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Tabs and Date Controls */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Main Tabs */}
          <div className="flex bg-white/5 rounded-xl p-1">
            <TabButton
              active={activeTab === 'history'}
              onClick={() => { setActiveTab('history'); setSelectedPlatform(null); setSelectedSite(null); }}
              icon={<List className="w-4 h-4" />}
              label="All History"
            />
            <TabButton
              active={activeTab === 'platforms' || activeTab === 'detail'}
              onClick={() => { setActiveTab('platforms'); setSelectedPlatform(null); setSelectedSite(null); setPlatformDetail(null); }}
              icon={<Layers className="w-4 h-4" />}
              label="Platforms"
            />
            <TabButton
              active={activeTab === 'websites' || activeTab === 'websiteDetail'}
              onClick={() => { setActiveTab('websites'); setSelectedPlatform(null); setSelectedSite(null); setSelectedWebsite(null); setWebsiteDetail(null); }}
              icon={<Globe className="w-4 h-4" />}
              label="Websites"
            />
          </div>

        </div>

        {/* Date Picker */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigateDate('prev')}
            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-white/50 hover:text-white" />
          </button>

          <div className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg border border-white/10">
            <Calendar className="w-4 h-4 text-white/50" />
            <input
              type="date"
              value={selectedDate}
              max={new Date().toISOString().split('T')[0]}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-transparent text-white text-sm outline-none cursor-pointer"
            />
          </div>

          <button
            onClick={() => navigateDate('next')}
            disabled={isToday}
            className={`p-2 rounded-lg transition-colors ${
              isToday ? 'opacity-30 cursor-not-allowed' : 'hover:bg-white/10'
            }`}
          >
            <ChevronRight className="w-5 h-5 text-white/50 hover:text-white" />
          </button>

          <span className="text-sm text-white/50 ml-2">
            {formatDateDisplay(selectedDate)}
          </span>
        </div>
      </div>

      {/* Breadcrumb Navigation (when in detail view) */}
      {activeTab === 'detail' && platformDetail && (
        <div className="flex items-center gap-2 text-sm">
          {getBreadcrumbs().map((crumb, index) => (
            <div key={index} className="flex items-center gap-2">
              {index > 0 && <ChevronRight className="w-4 h-4 text-white/30" />}
              <button
                onClick={crumb.onClick}
                className={`hover:text-primary transition-colors ${
                  index === getBreadcrumbs().length - 1
                    ? 'text-white font-medium'
                    : 'text-white/50'
                }`}
              >
                {crumb.label}
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search activities..."
          className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl
            text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {activeTab === 'history' && (
          <HistoryTab
            items={filteredHistory}
            isLoading={isLoading}
            formatDuration={formatDuration}
            formatTime={formatTime}
            getProductivityColor={getProductivityColor}
            isNewItem={isNewItem}
          />
        )}

        {activeTab === 'platforms' && (
          <PlatformsTab
            platforms={filteredPlatforms}
            isLoading={isLoading}
            formatDuration={formatDuration}
            getProductivityColor={getProductivityColor}
            onSelectPlatform={setSelectedPlatform}
            currentActivity={currentActivity}
            isToday={isToday}
          />
        )}

        {activeTab === 'websites' && (
          <WebsitesTab
            websites={websites}
            isLoading={isLoading}
            formatDuration={formatDuration}
            searchQuery={searchQuery}
            onSelectWebsite={setSelectedWebsite}
          />
        )}

        {activeTab === 'websiteDetail' && websiteDetail && (
          <WebsiteDetailTab
            detail={websiteDetail}
            isLoading={isLoading}
            formatDuration={formatDuration}
            formatTime={formatTime}
            onBack={() => { setActiveTab('websites'); setSelectedWebsite(null); setWebsiteDetail(null); }}
          />
        )}

        {activeTab === 'detail' && platformDetail && (
          <PlatformDetailTab
            detail={platformDetail}
            isLoading={isLoading}
            formatDuration={formatDuration}
            formatTime={formatTime}
            selectedSite={selectedSite}
            onSelectSite={setSelectedSite}
            onBack={() => { setActiveTab('platforms'); setSelectedPlatform(null); setSelectedSite(null); setPlatformDetail(null); }}
            isNewItem={isNewItem}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Tab Button Component
function TabButton({
  active,
  onClick,
  icon,
  label
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
        active
          ? 'bg-primary text-white'
          : 'text-white/50 hover:text-white hover:bg-white/5'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// History Tab - All activities with duplicates
function HistoryTab({
  items,
  isLoading,
  formatDuration,
  formatTime,
  getProductivityColor,
  isNewItem
}: {
  items: ActivityItem[];
  isLoading: boolean;
  formatDuration: (s: number) => string;
  formatTime: (t: string) => string;
  getProductivityColor: (p: string) => string;
  isNewItem: (timestamp: string) => boolean;
}) {
  if (isLoading) {
    return <LoadingState />;
  }

  if (items.length === 0) {
    return <EmptyState message="No activity recorded yet" />;
  }

  // Group by date
  const groupedByDate: Record<string, ActivityItem[]> = {};
  items.forEach((item) => {
    const date = new Date(item.timestamp).toLocaleDateString();
    if (!groupedByDate[date]) groupedByDate[date] = [];
    groupedByDate[date].push(item);
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {Object.entries(groupedByDate).map(([date, dateItems]) => (
        <GlassCard key={date}>
          <div className="p-3 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-white/50" />
              <span className="font-medium text-white">{date}</span>
            </div>
            <span className="text-sm text-white/40">
              {dateItems.length} activities
            </span>
          </div>
          <div className="divide-y divide-white/5">
            {dateItems.map((item, index) => (
              <motion.div
                key={`${item.id}-${index}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.02 }}
                className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
              >
                <div className="text-sm text-white/40 w-16">
                  {formatTime(item.timestamp)}
                </div>

                <div className={`w-2 h-2 rounded-full ${
                  item.is_productive ? 'bg-green-400' : item.productivity_type === 'distracting' ? 'bg-red-400' : 'bg-white/30'
                }`} />

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-white truncate">{item.title || item.app || 'Untitled'}</p>
                  <p className="text-sm text-white/40 truncate">
                    {item.domain || item.app}
                    {item.url && item.url !== item.domain && (
                      <span className="ml-2 text-white/30">
                        {item.url.substring(0, 50)}...
                      </span>
                    )}
                  </p>
                </div>

                <span className={`px-2 py-1 rounded-full text-xs ${getProductivityColor(
                  item.productivity_type || (item.is_productive ? 'productive' : 'neutral')
                )}`}>
                  {item.category || 'Other'}
                </span>

                {isNewItem(item.timestamp) && (
                  <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    NEW
                  </span>
                )}

                <div className="flex items-center gap-1 text-sm text-white/50 w-20 justify-end">
                  <Clock className="w-4 h-4" />
                  {formatDuration(item.duration)}
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      ))}
    </motion.div>
  );
}

// Platforms Tab - Unique domains aggregated
function PlatformsTab({
  platforms,
  isLoading,
  formatDuration,
  getProductivityColor,
  onSelectPlatform,
  currentActivity,
  isToday
}: {
  platforms: Platform[];
  isLoading: boolean;
  formatDuration: (s: number) => string;
  getProductivityColor: (p: string) => string;
  onSelectPlatform: (domain: string) => void;
  currentActivity: { app_name: string; title: string; duration: number } | null;
  isToday: boolean;
}) {
  // Check if platform is currently active
  const isPlatformActive = (domain: string): boolean => {
    if (!currentActivity || !isToday) return false;
    const appName = currentActivity.app_name.toLowerCase();
    const domainLower = domain.toLowerCase();
    return appName.includes(domainLower) || domainLower.includes(appName.split(' ')[0]);
  };

  // Get meaningful count label based on platform type
  const getItemCountLabel = (platform: Platform): string => {
    const domain = platform.domain.toLowerCase();
    const count = platform.unique_urls || platform.visit_count || 0;

    // Browser apps
    if (domain.includes('chrome') || domain.includes('safari') || domain.includes('firefox') || domain.includes('edge') || domain.includes('brave') || domain.includes('arc')) {
      return `${count} ${count === 1 ? 'site' : 'sites'}`;
    }
    // Code editors
    if (domain.includes('code') || domain.includes('visual studio') || domain.includes('vs code') || domain.includes('cursor') || domain.includes('sublime') || domain.includes('atom') || domain.includes('webstorm') || domain.includes('intellij') || domain.includes('xcode')) {
      return `${count} ${count === 1 ? 'project' : 'projects'}`;
    }
    // Communication apps
    if (domain.includes('slack') || domain.includes('discord') || domain.includes('teams') || domain.includes('zoom')) {
      return `${count} ${count === 1 ? 'channel' : 'channels'}`;
    }
    // Document apps
    if (domain.includes('notion') || domain.includes('obsidian') || domain.includes('word') || domain.includes('pages')) {
      return `${count} ${count === 1 ? 'document' : 'documents'}`;
    }
    // Default
    return `${count} ${count === 1 ? 'item' : 'items'}`;
  };

  // Get current activity text for platform
  const getActivityText = (platform: Platform): { prefix: string; title: string } | null => {
    const isActive = isPlatformActive(platform.domain);

    if (isActive && currentActivity) {
      return { prefix: 'Currently:', title: currentActivity.title };
    }

    // For inactive platforms, we'd need last activity data which isn't in the Platform type
    // For now, return null for inactive and we'll just show the item count
    return null;
  };

  if (isLoading) {
    return <LoadingState />;
  }

  if (platforms.length === 0) {
    return <EmptyState message="No platforms tracked yet" />;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <GlassCard>
        <div className="p-4 border-b border-white/10">
          <div className="grid grid-cols-12 text-sm text-white/40 font-medium">
            <div className="col-span-5">Platform</div>
            <div className="col-span-2 text-center">Time</div>
            <div className="col-span-2 text-center">Activity</div>
            <div className="col-span-2 text-center">Status</div>
            <div className="col-span-1"></div>
          </div>
        </div>
        <div className="divide-y divide-white/5">
          {platforms.map((platform, index) => {
            const isActive = isPlatformActive(platform.domain);
            const activityText = getActivityText(platform);

            return (
              <motion.div
                key={platform.domain}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => onSelectPlatform(platform.domain)}
                className={`p-4 grid grid-cols-12 items-center hover:bg-white/5 transition-colors cursor-pointer ${
                  isActive ? 'bg-green-500/5 border-l-2 border-green-500' : ''
                }`}
              >
                <div className="col-span-5 flex items-center gap-3">
                  <div className="relative">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      isActive ? 'bg-green-500/20' : 'bg-white/10'
                    }`}>
                      <Globe className={`w-5 h-5 ${isActive ? 'text-green-400' : 'text-white/50'}`} />
                    </div>
                    {/* Active indicator dot */}
                    <div className={`absolute -top-1 -right-1 w-3 h-3 rounded-full border-2 border-[#0a0a0f] ${
                      isActive ? 'bg-green-400 animate-pulse' : 'bg-gray-500'
                    }`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-white truncate">{platform.domain}</p>
                      {isActive && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/20 text-green-400 uppercase tracking-wide">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-white/40 truncate">
                      {activityText ? (
                        <span>
                          <span className={isActive ? 'text-green-400' : 'text-white/50'}>
                            {activityText.prefix}
                          </span>{' '}
                          <span className="text-white/60">{activityText.title.substring(0, 40)}{activityText.title.length > 40 ? '...' : ''}</span>
                        </span>
                      ) : (
                        getItemCountLabel(platform)
                      )}
                    </p>
                  </div>
                </div>

                <div className="col-span-2 text-center font-medium text-white">
                  {formatDuration(platform.total_time)}
                </div>

                <div className="col-span-2 text-center text-white/50">
                  {getItemCountLabel(platform)}
                </div>

                <div className="col-span-2 text-center">
                  <span className={`px-2 py-1 rounded-full text-xs capitalize ${getProductivityColor(platform.productivity)}`}>
                    {platform.productivity}
                  </span>
                </div>

                <div className="col-span-1 text-right">
                  <ChevronRight className="w-5 h-5 text-white/30 inline" />
                </div>
              </motion.div>
            );
          })}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Websites Tab - All websites/URLs visited
function WebsitesTab({
  websites,
  isLoading,
  formatDuration,
  searchQuery,
  onSelectWebsite
}: {
  websites: Website[];
  isLoading: boolean;
  formatDuration: (s: number) => string;
  searchQuery: string;
  onSelectWebsite: (site: string) => void;
}) {
  if (isLoading) {
    return <LoadingState />;
  }

  // Filter websites by search
  const filteredWebsites = websites.filter(site =>
    site.site.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (filteredWebsites.length === 0) {
    return <EmptyState message="No websites tracked yet" />;
  }

  // Get icon for website
  const getWebsiteIcon = (site: string) => {
    const lower = site.toLowerCase();
    if (lower.includes('youtube')) return <Youtube className="w-5 h-5 text-red-500" />;
    if (lower.includes('netflix') || lower.includes('twitch')) return <Tv className="w-5 h-5 text-red-600" />;
    if (lower.includes('udemy') || lower.includes('coursera')) return <BookOpen className="w-5 h-5 text-purple-500" />;
    return <Globe className="w-5 h-5 text-white/50" />;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
    >
      <GlassCard>
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-primary" />
              Websites Visited
            </h3>
            <span className="text-sm text-white/40">{filteredWebsites.length} sites</span>
          </div>
        </div>
        <div className="p-4 border-b border-white/10">
          <div className="grid grid-cols-12 text-sm text-white/40 font-medium">
            <div className="col-span-5">Website</div>
            <div className="col-span-2 text-center">Time</div>
            <div className="col-span-2 text-center">Pages</div>
            <div className="col-span-2 text-center">Visits</div>
            <div className="col-span-1 text-center">Status</div>
          </div>
        </div>
        <div className="divide-y divide-white/5">
          {filteredWebsites.map((site, index) => (
            <motion.div
              key={site.site}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.02 }}
              onClick={() => onSelectWebsite(site.site)}
              className="p-4 grid grid-cols-12 items-center hover:bg-white/5 transition-colors cursor-pointer"
            >
              <div className="col-span-5 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                  {getWebsiteIcon(site.site)}
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-white truncate">{site.site}</p>
                  <p className="text-xs text-white/40">{site.category}</p>
                </div>
              </div>

              <div className="col-span-2 text-center font-medium text-white">
                {formatDuration(site.total_time)}
              </div>

              <div className="col-span-2 text-center text-white/50">
                {site.pages}
              </div>

              <div className="col-span-2 text-center text-white/50">
                {site.visit_count}
              </div>

              <div className="col-span-1 flex items-center justify-center gap-2">
                <span className={`w-2 h-2 rounded-full inline-block ${
                  site.productivity === 'productive' ? 'bg-green-400' :
                  site.productivity === 'distracting' ? 'bg-red-400' : 'bg-gray-400'
                }`} />
                <ChevronRight className="w-4 h-4 text-white/30" />
              </div>
            </motion.div>
          ))}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Website Detail Tab - Detailed view for selected website
function WebsiteDetailTab({
  detail,
  isLoading,
  formatDuration,
  formatTime,
  onBack
}: {
  detail: WebsiteDetail;
  isLoading: boolean;
  formatDuration: (s: number) => string;
  formatTime: (t: string) => string;
  onBack: () => void;
}) {
  const [expandedPage, setExpandedPage] = useState<string | null>(null);

  if (isLoading) {
    return <LoadingState />;
  }

  if (!detail) {
    return <EmptyState message="Website not found" />;
  }

  // Get icon for website
  const getWebsiteIcon = (site: string) => {
    const lower = site.toLowerCase();
    if (lower.includes('youtube')) return <Youtube className="w-8 h-8 text-red-500" />;
    if (lower.includes('netflix') || lower.includes('twitch')) return <Tv className="w-8 h-8 text-red-600" />;
    if (lower.includes('udemy') || lower.includes('coursera')) return <BookOpen className="w-8 h-8 text-purple-500" />;
    if (lower.includes('github')) return <Globe className="w-8 h-8 text-white" />;
    if (lower.includes('firebase')) return <Globe className="w-8 h-8 text-yellow-500" />;
    return <Globe className="w-8 h-8 text-white/50" />;
  };

  // Check if this is a video platform
  const isVideoPlatform = ['youtube', 'netflix', 'udemy', 'coursera', 'twitch', 'vimeo'].some(
    v => detail.site.toLowerCase().includes(v)
  );

  // Extract clean title for display
  const extractCleanTitle = (title: string): string => {
    let cleaned = title;
    // Remove site name suffix
    const siteLower = detail.site.toLowerCase();
    if (siteLower.includes('youtube')) {
      cleaned = cleaned.replace(/ - YouTube$/, '').trim();
    } else if (siteLower.includes('netflix')) {
      cleaned = cleaned.replace(/^Watch\s+/, '').replace(/\s*\|\s*Netflix$/, '').trim();
    } else if (siteLower.includes('udemy')) {
      cleaned = cleaned.replace(/\s*\|\s*Udemy$/, '').trim();
    }
    // Remove browser suffix
    cleaned = cleaned.replace(/ - (Google Chrome|Safari|Firefox|Microsoft Edge|Brave|Arc|Opera).*$/i, '').trim();
    return cleaned || 'Untitled';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header Card */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={onBack}
            className="text-white/50 hover:text-white transition-colors flex items-center gap-2"
          >
            ← Back to Websites
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary to-accent flex items-center justify-center">
            {getWebsiteIcon(detail.site)}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">{detail.site}</h2>
            <p className="text-white/50">{detail.category}</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <p className="text-2xl font-bold text-white">
              {formatDuration(detail.total_time)}
            </p>
            <p className="text-sm text-white/50">Total Time</p>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <p className="text-2xl font-bold text-white">
              {detail.pages?.length || 0}
            </p>
            <p className="text-sm text-white/50">
              {isVideoPlatform ? 'Videos' : 'Pages'}
            </p>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <p className={`text-2xl font-bold capitalize ${
              detail.productivity === 'productive' ? 'text-green-400' :
              detail.productivity === 'distracting' ? 'text-red-400' : 'text-white/50'
            }`}>
              {detail.productivity}
            </p>
            <p className="text-sm text-white/50">Status</p>
          </div>
        </div>
      </GlassCard>

      {/* Pages/Videos List */}
      <GlassCard>
        <div className="p-4 border-b border-white/10">
          <h3 className="font-semibold text-white flex items-center gap-2">
            {isVideoPlatform ? (
              <>
                <Play className="w-4 h-4 text-red-400" />
                Videos Watched
              </>
            ) : (
              <>
                <List className="w-4 h-4 text-primary" />
                Pages Visited
              </>
            )}
          </h3>
        </div>
        <div className="divide-y divide-white/5">
          {!detail.pages || detail.pages.length === 0 ? (
            <div className="p-8 text-center text-white/40">
              No pages recorded
            </div>
          ) : (
            detail.pages.map((page, index) => (
              <div key={`${page.title}-${index}`}>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setExpandedPage(expandedPage === page.title ? null : page.title)}
                  className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {isVideoPlatform && (
                      <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                        <Play className="w-5 h-5 text-red-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-white truncate">
                        {extractCleanTitle(page.title)}
                      </p>
                      {!isVideoPlatform && (
                        <p className="text-sm text-white/40 truncate">{page.title}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-white">{formatDuration(page.total_time)}</p>
                      <p className="text-xs text-white/40">{page.visit_count} visits</p>
                    </div>
                    <ChevronDown className={`w-5 h-5 text-white/30 transition-transform ${
                      expandedPage === page.title ? 'rotate-180' : ''
                    }`} />
                  </div>
                </motion.div>

                {/* Expanded Visit History */}
                <AnimatePresence>
                  {expandedPage === page.title && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-white/5"
                    >
                      <div className="p-4 space-y-2">
                        <p className="text-sm text-white/40 mb-3">Visit History:</p>
                        {page.visits?.slice(0, 20).map((visit, vIndex) => (
                          <div
                            key={vIndex}
                            className="flex items-center justify-between text-sm py-2 px-3 bg-white/5 rounded-lg"
                          >
                            <span className="text-white/50">
                              {new Date(visit.timestamp).toLocaleDateString()} at {formatTime(visit.timestamp)}
                            </span>
                            <span className="font-medium text-white">{formatDuration(visit.duration)}</span>
                          </div>
                        ))}
                        {page.visits && page.visits.length > 20 && (
                          <p className="text-xs text-white/30 text-center pt-2">
                            + {page.visits.length - 20} more visits
                          </p>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))
          )}
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Platform Detail Tab - Hierarchical drill-down for selected platform
function PlatformDetailTab({
  detail,
  isLoading,
  formatDuration,
  formatTime,
  selectedSite,
  onSelectSite,
  onBack,
  isNewItem
}: {
  detail: PlatformDetail;
  isLoading: boolean;
  formatDuration: (s: number) => string;
  formatTime: (t: string) => string;
  selectedSite: string | null;
  onSelectSite: (site: string | null) => void;
  onBack: () => void;
  isNewItem: (timestamp: string) => boolean;
}) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  // Use selectedSite from props instead of local state
  const selectedSubItem = selectedSite;
  const setSelectedSubItem = onSelectSite;

  if (isLoading) {
    return <LoadingState />;
  }

  if (!detail) {
    return <EmptyState message="Platform not found" />;
  }

  // Check if this is a browser
  const isBrowser = ['Google Chrome', 'Chrome', 'Safari', 'Firefox', 'Microsoft Edge', 'Edge', 'Brave', 'Arc', 'Opera'].some(
    browser => detail.domain.toLowerCase().includes(browser.toLowerCase())
  );

  // Flatten all visits from all URLs into a single array
  const allVisits: Array<{ timestamp: string; duration: number; title: string }> = [];
  detail.urls.forEach(urlItem => {
    if (urlItem.visits) {
      allVisits.push(...urlItem.visits);
    }
  });

  // Group visits by extracted key (domain for browsers, project name for apps)
  interface GroupedItem {
    name: string;
    total_time: number;
    visit_count: number;
    visits: Array<{ timestamp: string; duration: number; title: string }>;
    isVideoPlatform?: boolean;
  }

  const groupedItems: Record<string, GroupedItem> = {};

  // Helper to extract site/domain from browser window title
  const extractSiteFromTitle = (title: string): string => {
    // Common patterns: "Page Title - Site Name - Google Chrome - Insighter"
    // Or: "Page Title - Google Chrome - Insighter"
    const cleanTitle = title.replace(/ - (Google Chrome|Safari|Firefox|Microsoft Edge|Brave|Arc|Opera).*$/i, '');

    // Check for known sites in the title
    const knownSites: Record<string, string> = {
      'youtube': 'YouTube',
      'netflix': 'Netflix',
      'udemy': 'Udemy',
      'coursera': 'Coursera',
      'github': 'GitHub',
      'firebase': 'Firebase',
      'claude': 'Claude',
      'chatgpt': 'ChatGPT',
      'openai': 'OpenAI',
      'stackoverflow': 'Stack Overflow',
      'localhost': 'Localhost',
      'productify': 'Productify Pro',
      'twitter': 'Twitter',
      'reddit': 'Reddit',
      'linkedin': 'LinkedIn',
      'figma': 'Figma',
      'notion': 'Notion',
      'slack': 'Slack',
      'discord': 'Discord',
      'twitch': 'Twitch',
      'amazon': 'Amazon',
      'google': 'Google',
    };

    const lowerTitle = cleanTitle.toLowerCase();
    for (const [key, siteName] of Object.entries(knownSites)) {
      if (lowerTitle.includes(key)) {
        return siteName;
      }
    }

    // Try to extract site name from title format "Page - Site"
    const parts = cleanTitle.split(' - ');
    if (parts.length >= 2) {
      return parts[parts.length - 1].trim() || 'Other';
    }

    return cleanTitle || 'Other';
  };

  // Helper to extract project name from VS Code title
  const extractProjectFromTitle = (title: string): string => {
    // VS Code format: "filename.ext — project-name" or "filename.ext - project-name"
    if (title.includes(' — ')) {
      return title.split(' — ').pop()?.trim() || 'Unknown';
    }
    if (title.includes(' - ') && !title.toLowerCase().includes('chrome') && !title.toLowerCase().includes('safari')) {
      const parts = title.split(' - ');
      return parts[parts.length - 1].trim() || 'Unknown';
    }
    return title || 'Unknown';
  };

  // Group visits
  allVisits.forEach(visit => {
    if (!visit.title) return;

    let groupKey: string;
    let isVideoPlatform = false;

    if (isBrowser) {
      groupKey = extractSiteFromTitle(visit.title);
      const videoPlatforms = ['YouTube', 'Netflix', 'Udemy', 'Coursera', 'Twitch', 'Prime Video', 'Disney+', 'Hulu', 'Vimeo'];
      isVideoPlatform = videoPlatforms.includes(groupKey);
    } else {
      groupKey = extractProjectFromTitle(visit.title);
    }

    if (!groupedItems[groupKey]) {
      groupedItems[groupKey] = {
        name: groupKey,
        total_time: 0,
        visit_count: 0,
        visits: [],
        isVideoPlatform
      };
    }

    groupedItems[groupKey].total_time += visit.duration;
    groupedItems[groupKey].visit_count += 1;
    groupedItems[groupKey].visits.push(visit);
  });

  // Sort by total time
  const sortedGroups = Object.entries(groupedItems).sort((a, b) => b[1].total_time - a[1].total_time);

  // Get the selected group
  const selectedGroup = selectedSubItem ? groupedItems[selectedSubItem] : null;

  // Group visits within selected group by unique title (for pages/files)
  interface SubItem {
    title: string;
    total_time: number;
    visit_count: number;
    visits: Array<{ timestamp: string; duration: number; title: string }>;
  }

  const subItems: SubItem[] = [];
  if (selectedGroup) {
    const subGrouped: Record<string, SubItem> = {};
    selectedGroup.visits.forEach(visit => {
      // Extract page/file name
      let itemKey = visit.title;
      if (isBrowser) {
        // Remove browser suffix: "Page - Site - Google Chrome" -> "Page - Site"
        itemKey = visit.title.replace(/ - (Google Chrome|Safari|Firefox|Microsoft Edge|Brave|Arc|Opera).*$/i, '').trim();
      }

      if (!subGrouped[itemKey]) {
        subGrouped[itemKey] = {
          title: itemKey,
          total_time: 0,
          visit_count: 0,
          visits: []
        };
      }
      subGrouped[itemKey].total_time += visit.duration;
      subGrouped[itemKey].visit_count += 1;
      subGrouped[itemKey].visits.push(visit);
    });

    subItems.push(...Object.values(subGrouped).sort((a, b) => b.total_time - a.total_time));
  }

  // Get appropriate icon for domain/site
  const getDomainIcon = (name: string) => {
    const lower = name.toLowerCase();
    if (lower.includes('youtube')) return <Youtube className="w-5 h-5 text-red-500" />;
    if (lower.includes('netflix')) return <Tv className="w-5 h-5 text-red-600" />;
    if (lower.includes('udemy') || lower.includes('coursera')) return <BookOpen className="w-5 h-5 text-purple-500" />;
    if (lower.includes('github')) return <Globe className="w-5 h-5 text-white" />;
    if (lower.includes('firebase')) return <Globe className="w-5 h-5 text-yellow-500" />;
    if (lower.includes('claude') || lower.includes('openai') || lower.includes('chatgpt')) return <Globe className="w-5 h-5 text-orange-400" />;
    if (lower.includes('localhost') || lower.includes('productify')) return <Globe className="w-5 h-5 text-primary" />;
    if (lower.includes('twitch')) return <Tv className="w-5 h-5 text-purple-500" />;
    return <Globe className="w-5 h-5 text-white/50" />;
  };

  // Extract video/page title for display
  const extractDisplayTitle = (title: string, groupName: string): string => {
    // Remove site name and browser from title
    let cleaned = title.replace(/ - (Google Chrome|Safari|Firefox|Microsoft Edge|Brave|Arc|Opera).*$/i, '');

    // For video platforms, clean up further
    if (groupName === 'YouTube') {
      cleaned = cleaned.replace(/ - YouTube$/, '').trim();
    } else if (groupName === 'Netflix') {
      cleaned = cleaned.replace(/^Watch\s+/, '').replace(/\s*\|\s*Netflix$/, '').trim();
    } else if (groupName === 'Udemy') {
      cleaned = cleaned.replace(/\s*\|\s*Udemy$/, '').trim();
    }

    // For VS Code, extract just the filename
    if (!isBrowser && cleaned.includes(' — ')) {
      cleaned = cleaned.split(' — ')[0].trim();
    }

    return cleaned || 'Untitled';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-6"
    >
      {/* Header Card */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => {
              if (selectedSubItem) {
                setSelectedSubItem(null);
                setExpandedItem(null);
              } else {
                onBack();
              }
            }}
            className="text-white/50 hover:text-white transition-colors flex items-center gap-2"
          >
            ← {selectedSubItem ? `Back to ${detail.domain}` : 'Back to Platforms'}
          </button>

          {!selectedSubItem && (
            <a
              href={`https://${detail.domain}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:text-primary/80 flex items-center gap-1"
            >
              Visit site <ExternalLink className="w-4 h-4" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-r from-primary to-accent flex items-center justify-center">
            {selectedSubItem ? getDomainIcon(selectedSubItem) : <Globe className="w-8 h-8 text-white" />}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-white">
              {selectedSubItem || detail.domain}
            </h2>
            <p className="text-white/50">
              {selectedSubItem ? detail.domain : detail.category}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <p className="text-2xl font-bold text-white">
              {formatDuration(selectedGroup?.total_time || detail.total_time)}
            </p>
            <p className="text-sm text-white/50">Total Time</p>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <p className="text-2xl font-bold text-white">
              {selectedGroup ? subItems.length : sortedGroups.length}
            </p>
            <p className="text-sm text-white/50">
              {isBrowser
                ? (selectedSubItem ? (selectedGroup?.isVideoPlatform ? 'Videos' : 'Pages') : 'Sites')
                : (selectedSubItem ? 'Files' : 'Projects')
              }
            </p>
          </div>
          <div className="text-center p-4 bg-white/5 rounded-xl">
            <p className={`text-2xl font-bold capitalize ${
              detail.productivity === 'productive' ? 'text-green-400' :
              detail.productivity === 'distracting' ? 'text-red-400' : 'text-white/50'
            }`}>
              {detail.productivity}
            </p>
            <p className="text-sm text-white/50">Status</p>
          </div>
        </div>
      </GlassCard>

      {/* Level 2: Sub-items (Sites for browsers, Projects for apps) */}
      {!selectedSubItem && (
        <GlassCard>
          <div className="p-4 border-b border-white/10">
            <h3 className="font-semibold text-white">
              {isBrowser ? 'Sites Visited' : 'Projects / Windows'}
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            {sortedGroups.length === 0 ? (
              <div className="p-8 text-center text-white/40">
                No data available
              </div>
            ) : (
              sortedGroups.map(([key, group], index) => (
                <motion.div
                  key={key}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => setSelectedSubItem(key)}
                  className="p-4 flex items-center gap-4 hover:bg-white/5 transition-colors cursor-pointer"
                >
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    {isBrowser ? getDomainIcon(key) : <Layers className="w-5 h-5 text-primary" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-white truncate">{group.name}</p>
                    <p className="text-xs text-white/40">
                      {group.visit_count} {isBrowser ? (group.isVideoPlatform ? 'video sessions' : 'page views') : 'file switches'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-white">{formatDuration(group.total_time)}</p>
                    <p className="text-xs text-white/40">{group.visit_count} visits</p>
                  </div>
                  <ChevronRight className="w-5 h-5 text-white/30" />
                </motion.div>
              ))
            )}
          </div>
        </GlassCard>
      )}

      {/* Level 3: Detail items (Pages/Videos for selected site, or files for selected project) */}
      {selectedSubItem && selectedGroup && (
        <GlassCard>
          <div className="p-4 border-b border-white/10">
            <h3 className="font-semibold text-white flex items-center gap-2">
              {selectedGroup.isVideoPlatform ? (
                <>
                  <Play className="w-4 h-4 text-red-400" />
                  Videos Watched
                </>
              ) : (
                <>
                  <List className="w-4 h-4 text-primary" />
                  {isBrowser ? 'Pages Visited' : 'Files Opened'}
                </>
              )}
            </h3>
          </div>
          <div className="divide-y divide-white/5">
            {subItems.length === 0 ? (
              <div className="p-8 text-center text-white/40">
                No items found
              </div>
            ) : (
              subItems.map((item, index) => (
                <div key={`${item.title}-${index}`}>
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.03 }}
                    onClick={() => setExpandedItem(expandedItem === item.title ? null : item.title)}
                    className="p-4 hover:bg-white/5 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      {selectedGroup.isVideoPlatform && (
                        <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                          <Play className="w-5 h-5 text-red-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-white truncate">
                          {extractDisplayTitle(item.title, selectedSubItem)}
                        </p>
                        {!selectedGroup.isVideoPlatform && isBrowser && (
                          <p className="text-sm text-white/40 truncate">{item.title}</p>
                        )}
                      </div>
                      {/* NEW badge for items with recent activity */}
                      {item.visits.length > 0 && isNewItem(item.visits[0].timestamp) && (
                        <span className="px-2 py-0.5 rounded-full text-xs bg-green-500/20 text-green-400 border border-green-500/30 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          NEW
                        </span>
                      )}
                      <div className="text-right">
                        <p className="font-medium text-white">{formatDuration(item.total_time)}</p>
                        <p className="text-xs text-white/40">{item.visit_count} visits</p>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-white/30 transition-transform ${
                        expandedItem === item.title ? 'rotate-180' : ''
                      }`} />
                    </div>
                  </motion.div>

                  {/* Expanded Visit History */}
                  <AnimatePresence>
                    {expandedItem === item.title && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden bg-white/5"
                      >
                        <div className="p-4 space-y-2">
                          <p className="text-sm text-white/40 mb-3">Visit History:</p>
                          {item.visits.slice(0, 20).map((visit, vIndex) => (
                            <div
                              key={vIndex}
                              className="flex items-center justify-between text-sm py-2 px-3 bg-white/5 rounded-lg"
                            >
                              <span className="text-white/50">
                                {new Date(visit.timestamp).toLocaleDateString()} at {formatTime(visit.timestamp)}
                              </span>
                              <span className="font-medium text-white">{formatDuration(visit.duration)}</span>
                            </div>
                          ))}
                          {item.visits.length > 20 && (
                            <p className="text-xs text-white/30 text-center pt-2">
                              + {item.visits.length - 20} more visits
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ))
            )}
          </div>
        </GlassCard>
      )}
    </motion.div>
  );
}

// Loading State
function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-white/50">Loading activities...</p>
      </div>
    </div>
  );
}

// Empty State
function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <Globe className="w-16 h-16 text-white/20 mx-auto mb-4" />
        <p className="text-white/50">{message}</p>
        <p className="text-sm text-white/30 mt-2">
          Start browsing and your activity will appear here
        </p>
      </div>
    </div>
  );
}

