import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe, Link, Folder, Plus, Trash2, Check, X,
  Clock, AlertCircle, CheckCircle, MinusCircle,
  Calendar, Pencil, RefreshCw, Sparkles
} from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { Button } from '@/components/common/Button';
import { apiClient } from '@/lib/api/client';

type TabType = 'platforms' | 'urls' | 'categories' | 'settings';
type ProductivityType = 'productive' | 'neutral' | 'distracting';

interface TrackedPlatform {
  domain: string;
  productivity: ProductivityType;
  category: string | null;
  is_custom: boolean;
  total_time: number;
  today_time: number;
  is_new: boolean;
  last_seen: string | null;
}

interface TrackedURL {
  url_pattern: string;
  productivity: ProductivityType;
  category: string | null;
  override_platform: boolean;
  total_time: number;
  today_time: number;
  is_new: boolean;
  is_custom: boolean;
}

interface Category {
  name: string;
  color: string;
  icon?: string;
  default?: boolean;
}

interface WorkSchedule {
  work_days: string[];
  start_time: string;
  end_time: string;
  day_start_hour: number;
}

const DAYS = [
  { id: 'mon', label: 'Mon' },
  { id: 'tue', label: 'Tue' },
  { id: 'wed', label: 'Wed' },
  { id: 'thu', label: 'Thu' },
  { id: 'fri', label: 'Fri' },
  { id: 'sat', label: 'Sat' },
  { id: 'sun', label: 'Sun' },
];

export default function Rules() {
  const [activeTab, setActiveTab] = useState<TabType>('platforms');
  const [trackedPlatforms, setTrackedPlatforms] = useState<TrackedPlatform[]>([]);
  const [trackedURLs, setTrackedURLs] = useState<TrackedURL[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [workSchedule, setWorkSchedule] = useState<WorkSchedule>({
    work_days: ['mon', 'tue', 'wed', 'thu', 'fri'],
    start_time: '09:00',
    end_time: '17:00',
    day_start_hour: 0
  });
  const [isLoading, setIsLoading] = useState(true);

  // Edit states
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [editingURL, setEditingURL] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState({ name: '', color: '#6366F1' });
  const [showAddCategory, setShowAddCategory] = useState(false);

  // Add new platform/URL form
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [showAddURL, setShowAddURL] = useState(false);
  const [newPlatform, setNewPlatform] = useState({ domain: '', productivity: 'neutral' as ProductivityType, category: '' });
  const [newURL, setNewURL] = useState({ url_pattern: '', productivity: 'neutral' as ProductivityType, category: '' });

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [platformsRes, urlsRes, categoriesRes, scheduleRes] = await Promise.all([
        apiClient.get('/api/rules/platforms/tracked'),
        apiClient.get('/api/rules/urls/tracked'),
        apiClient.get('/api/rules/categories'),
        apiClient.get('/api/rules/settings/schedule')
      ]);

      setTrackedPlatforms(platformsRes.data.platforms || []);
      setTrackedURLs(urlsRes.data.urls || []);
      setCategories(categoriesRes.data.categories || []);
      setWorkSchedule(scheduleRes.data);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Format time in human readable format
  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Save platform rule
  const savePlatformRule = async (domain: string, productivity: ProductivityType, category: string | null) => {
    try {
      await apiClient.post('/api/rules/platforms', { domain, productivity, category });
      await fetchData();
      setEditingPlatform(null);
      setShowAddPlatform(false);
      setNewPlatform({ domain: '', productivity: 'neutral', category: '' });
    } catch (error) {
      console.error('Failed to save platform rule:', error);
    }
  };

  // Delete platform rule
  const deletePlatformRule = async (domain: string) => {
    try {
      await apiClient.delete(`/api/rules/platforms/${encodeURIComponent(domain)}`);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete platform rule:', error);
    }
  };

  // Save URL rule
  const saveURLRule = async (url_pattern: string, productivity: ProductivityType, category: string | null) => {
    try {
      await apiClient.post('/api/rules/urls', { url_pattern, productivity, category, override_platform: true });
      await fetchData();
      setEditingURL(null);
      setShowAddURL(false);
      setNewURL({ url_pattern: '', productivity: 'neutral', category: '' });
    } catch (error) {
      console.error('Failed to save URL rule:', error);
    }
  };

  // Delete URL rule
  const deleteURLRule = async (pattern: string) => {
    try {
      await apiClient.delete(`/api/rules/urls/${encodeURIComponent(pattern)}`);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete URL rule:', error);
    }
  };

  // Save category
  const saveCategory = async () => {
    try {
      await apiClient.post('/api/rules/categories', newCategory);
      await fetchData();
      setShowAddCategory(false);
      setNewCategory({ name: '', color: '#6366F1' });
    } catch (error) {
      console.error('Failed to save category:', error);
    }
  };

  // Delete category
  const deleteCategory = async (name: string) => {
    try {
      await apiClient.delete(`/api/rules/categories/${encodeURIComponent(name)}`);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  // Save work schedule
  const saveWorkSchedule = async (updates: Partial<WorkSchedule>) => {
    try {
      const newSchedule = { ...workSchedule, ...updates };
      await apiClient.post('/api/rules/settings/schedule', newSchedule);
      setWorkSchedule(newSchedule);
    } catch (error) {
      console.error('Failed to save work schedule:', error);
    }
  };

  const getProductivityIcon = (productivity: string) => {
    switch (productivity) {
      case 'productive': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'distracting': return <AlertCircle className="w-4 h-4 text-red-400" />;
      default: return <MinusCircle className="w-4 h-4 text-white/40" />;
    }
  };

  const getProductivityColor = (productivity: string) => {
    switch (productivity) {
      case 'productive': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'distracting': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-white/10 text-white/50 border-white/20';
    }
  };

  // Inline edit component for platforms
  const PlatformEditRow = ({ platform }: { platform: TrackedPlatform }) => {
    const [localProductivity, setLocalProductivity] = useState(platform.productivity);
    const [localCategory, setLocalCategory] = useState(platform.category || '');

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="p-4 bg-primary/10 border-y border-primary/20"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <p className="font-medium text-white mb-1">{platform.domain}</p>
            <p className="text-xs text-white/40">Editing rule</p>
          </div>
          <div className="w-36">
            <label className="block text-xs text-white/50 mb-1">Status</label>
            <select
              value={localProductivity}
              onChange={(e) => setLocalProductivity(e.target.value as ProductivityType)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
            >
              <option value="productive">Productive</option>
              <option value="neutral">Neutral</option>
              <option value="distracting">Distracting</option>
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs text-white/50 mb-1">Category</label>
            <select
              value={localCategory}
              onChange={(e) => setLocalCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
            >
              <option value="">None</option>
              {categories.map(cat => (
                <option key={cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => savePlatformRule(platform.domain, localProductivity, localCategory || null)}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingPlatform(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  // Inline edit component for URLs
  const URLEditRow = ({ url }: { url: TrackedURL }) => {
    const [localProductivity, setLocalProductivity] = useState(url.productivity);
    const [localCategory, setLocalCategory] = useState(url.category || '');

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="p-4 bg-primary/10 border-y border-primary/20"
      >
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[150px]">
            <p className="font-medium text-white font-mono text-sm mb-1">{url.url_pattern}</p>
            <p className="text-xs text-white/40">Editing rule</p>
          </div>
          <div className="w-36">
            <label className="block text-xs text-white/50 mb-1">Status</label>
            <select
              value={localProductivity}
              onChange={(e) => setLocalProductivity(e.target.value as ProductivityType)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
            >
              <option value="productive">Productive</option>
              <option value="neutral">Neutral</option>
              <option value="distracting">Distracting</option>
            </select>
          </div>
          <div className="w-36">
            <label className="block text-xs text-white/50 mb-1">Category</label>
            <select
              value={localCategory}
              onChange={(e) => setLocalCategory(e.target.value)}
              className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm"
            >
              <option value="">None</option>
              {categories.map(cat => (
                <option key={cat.name} value={cat.name}>{cat.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={() => saveURLRule(url.url_pattern, localProductivity, localCategory || null)}
            >
              <Check className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setEditingURL(null)}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Custom Rules</h2>
          <p className="text-white/50">Configure productivity rules for platforms and URLs</p>
        </div>
        <Button variant="ghost" onClick={fetchData} disabled={isLoading}>
          <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/5 rounded-xl p-1 w-fit">
        {[
          { id: 'platforms', label: 'Platforms', icon: Globe, count: trackedPlatforms.length },
          { id: 'urls', label: 'URL Rules', icon: Link, count: trackedURLs.length },
          { id: 'categories', label: 'Categories', icon: Folder, count: categories.length },
          { id: 'settings', label: 'Settings', icon: Clock },
        ].map(({ id, label, icon: Icon, count }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as TabType)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === id
                ? 'bg-primary text-white'
                : 'text-white/50 hover:text-white'
            }`}
          >
            <Icon className="w-4 h-4" />
            {label}
            {count !== undefined && (
              <span className="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-white/10">
                {count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Platform Rules Tab */}
      {activeTab === 'platforms' && (
        <GlassCard>
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">All Tracked Platforms</h3>
              <p className="text-sm text-white/40">
                {trackedPlatforms.filter(p => p.is_new).length} new today · Sorted by usage
              </p>
            </div>
            <Button size="sm" onClick={() => setShowAddPlatform(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Rule
            </Button>
          </div>

          {/* Add New Platform Form */}
          <AnimatePresence>
            {showAddPlatform && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-white/5 border-b border-white/10"
              >
                <div className="flex gap-4 items-end flex-wrap">
                  <div className="flex-1 min-w-[200px]">
                    <label className="block text-sm text-white/50 mb-1">Domain</label>
                    <input
                      type="text"
                      value={newPlatform.domain}
                      onChange={(e) => setNewPlatform({ ...newPlatform, domain: e.target.value })}
                      placeholder="example.com"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30"
                    />
                  </div>
                  <div className="w-36">
                    <label className="block text-sm text-white/50 mb-1">Status</label>
                    <select
                      value={newPlatform.productivity}
                      onChange={(e) => setNewPlatform({ ...newPlatform, productivity: e.target.value as ProductivityType })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    >
                      <option value="productive">Productive</option>
                      <option value="neutral">Neutral</option>
                      <option value="distracting">Distracting</option>
                    </select>
                  </div>
                  <div className="w-36">
                    <label className="block text-sm text-white/50 mb-1">Category</label>
                    <select
                      value={newPlatform.category}
                      onChange={(e) => setNewPlatform({ ...newPlatform, category: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    >
                      <option value="">Select...</option>
                      {categories.map(cat => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={() => savePlatformRule(newPlatform.domain, newPlatform.productivity, newPlatform.category || null)}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => setShowAddPlatform(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
            {trackedPlatforms.length === 0 ? (
              <div className="p-8 text-center text-white/40">
                <Globe className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No platforms tracked yet</p>
                <p className="text-sm text-white/30">Start browsing to see platforms here</p>
              </div>
            ) : (
              trackedPlatforms.map((platform) => (
                <div key={platform.domain}>
                  <AnimatePresence>
                    {editingPlatform === platform.domain ? (
                      <PlatformEditRow platform={platform} />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                            <Globe className="w-5 h-5 text-white/50" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-white truncate">{platform.domain}</p>
                              {platform.is_new && (
                                <span className="px-1.5 py-0.5 text-xs rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  NEW
                                </span>
                              )}
                              {platform.is_custom && (
                                <span className="px-1.5 py-0.5 text-xs rounded bg-white/10 text-white/40">
                                  Custom
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-white/40">
                              <span>{platform.category || 'Uncategorized'}</span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(platform.total_time)} total
                              </span>
                              {platform.today_time > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="text-primary">{formatTime(platform.today_time)} today</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs border capitalize flex items-center gap-1 ${getProductivityColor(platform.productivity)}`}>
                            {getProductivityIcon(platform.productivity)}
                            <span>{platform.productivity}</span>
                          </span>
                          <button
                            onClick={() => setEditingPlatform(platform.domain)}
                            className="p-2 text-white/30 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit rule"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          {platform.is_custom && (
                            <button
                              onClick={() => deletePlatformRule(platform.domain)}
                              className="p-2 text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                              title="Remove custom rule"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
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

      {/* URL Rules Tab */}
      {activeTab === 'urls' && (
        <GlassCard>
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">URL-Specific Rules</h3>
              <p className="text-sm text-white/40">
                Override platform rules for specific URL patterns
              </p>
            </div>
            <Button size="sm" onClick={() => setShowAddURL(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Rule
            </Button>
          </div>

          {/* Add New URL Form */}
          <AnimatePresence>
            {showAddURL && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-white/5 border-b border-white/10"
              >
                <div className="flex gap-4 items-end flex-wrap">
                  <div className="flex-1 min-w-[300px]">
                    <label className="block text-sm text-white/50 mb-1">URL Pattern</label>
                    <input
                      type="text"
                      value={newURL.url_pattern}
                      onChange={(e) => setNewURL({ ...newURL, url_pattern: e.target.value })}
                      placeholder="youtube.com/playlist* or reddit.com/r/programming"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30"
                    />
                  </div>
                  <div className="w-36">
                    <label className="block text-sm text-white/50 mb-1">Status</label>
                    <select
                      value={newURL.productivity}
                      onChange={(e) => setNewURL({ ...newURL, productivity: e.target.value as ProductivityType })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    >
                      <option value="productive">Productive</option>
                      <option value="neutral">Neutral</option>
                      <option value="distracting">Distracting</option>
                    </select>
                  </div>
                  <div className="w-36">
                    <label className="block text-sm text-white/50 mb-1">Category</label>
                    <select
                      value={newURL.category}
                      onChange={(e) => setNewURL({ ...newURL, category: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                    >
                      <option value="">Select...</option>
                      {categories.map(cat => (
                        <option key={cat.name} value={cat.name}>{cat.name}</option>
                      ))}
                    </select>
                  </div>
                  <Button onClick={() => saveURLRule(newURL.url_pattern, newURL.productivity, newURL.category || null)}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => setShowAddURL(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-white/30 mt-2">
                  Use * as wildcard. Example: youtube.com/playlist* matches all playlist URLs
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="divide-y divide-white/5 max-h-[600px] overflow-y-auto">
            {trackedURLs.length === 0 ? (
              <div className="p-8 text-center text-white/40">
                <Link className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No URL patterns tracked yet</p>
                <p className="text-sm text-white/30">Add rules to override platform settings for specific URLs</p>
              </div>
            ) : (
              trackedURLs.map((url) => (
                <div key={url.url_pattern}>
                  <AnimatePresence>
                    {editingURL === url.url_pattern ? (
                      <URLEditRow url={url} />
                    ) : (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors group"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                            <Link className="w-5 h-5 text-white/50" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium font-mono text-sm text-white truncate">{url.url_pattern}</p>
                              {url.is_new && (
                                <span className="px-1.5 py-0.5 text-xs rounded bg-primary/20 text-primary border border-primary/30 flex items-center gap-1">
                                  <Sparkles className="w-3 h-3" />
                                  NEW
                                </span>
                              )}
                              {url.is_custom && (
                                <span className="px-1.5 py-0.5 text-xs rounded bg-white/10 text-white/40">
                                  Custom
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 text-sm text-white/40">
                              <span>{url.category || 'Uncategorized'}</span>
                              <span>·</span>
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {formatTime(url.total_time)} total
                              </span>
                              {url.today_time > 0 && (
                                <>
                                  <span>·</span>
                                  <span className="text-primary">{formatTime(url.today_time)} today</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-xs border capitalize flex items-center gap-1 ${getProductivityColor(url.productivity)}`}>
                            {getProductivityIcon(url.productivity)}
                            <span>{url.productivity}</span>
                          </span>
                          <button
                            onClick={() => setEditingURL(url.url_pattern)}
                            className="p-2 text-white/30 hover:text-primary transition-colors opacity-0 group-hover:opacity-100"
                            title="Edit rule"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteURLRule(url.url_pattern)}
                            className="p-2 text-white/30 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                            title="Delete rule"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
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

      {/* Categories Tab */}
      {activeTab === 'categories' && (
        <GlassCard>
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-semibold text-white">Categories</h3>
            <Button size="sm" onClick={() => setShowAddCategory(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Category
            </Button>
          </div>

          {/* Add New Category Form */}
          <AnimatePresence>
            {showAddCategory && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-4 bg-white/5 border-b border-white/10"
              >
                <div className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm text-white/50 mb-1">Name</label>
                    <input
                      type="text"
                      value={newCategory.name}
                      onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                      placeholder="Category name"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30"
                    />
                  </div>
                  <div className="w-32">
                    <label className="block text-sm text-white/50 mb-1">Color</label>
                    <input
                      type="color"
                      value={newCategory.color}
                      onChange={(e) => setNewCategory({ ...newCategory, color: e.target.value })}
                      className="w-full h-10 bg-white/5 border border-white/10 rounded-lg cursor-pointer"
                    />
                  </div>
                  <Button onClick={saveCategory}>
                    <Check className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" onClick={() => setShowAddCategory(false)}>
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4">
            {categories.map((cat) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: cat.color }}
                  />
                  <span className="font-medium text-white">{cat.name}</span>
                  {cat.default && (
                    <span className="text-xs text-white/30">(default)</span>
                  )}
                </div>
                {!cat.default && (
                  <button
                    onClick={() => deleteCategory(cat.name)}
                    className="p-1 text-white/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Settings Tab - Now includes Work Schedule */}
      {activeTab === 'settings' && (
        <div className="space-y-6">
          {/* Work Schedule */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Calendar className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-white">Work Schedule</h3>
            </div>

            <div className="space-y-6">
              {/* Work Days */}
              <div>
                <label className="block font-medium text-white mb-3">Work Days</label>
                <div className="flex gap-2 flex-wrap">
                  {DAYS.map((day) => (
                    <button
                      key={day.id}
                      onClick={() => {
                        const newDays = workSchedule.work_days.includes(day.id)
                          ? workSchedule.work_days.filter(d => d !== day.id)
                          : [...workSchedule.work_days, day.id];
                        saveWorkSchedule({ work_days: newDays });
                      }}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                        workSchedule.work_days.includes(day.id)
                          ? 'bg-primary text-white'
                          : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {day.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Work Hours */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-medium text-white mb-2">Start Time</label>
                  <input
                    type="time"
                    value={workSchedule.start_time}
                    onChange={(e) => saveWorkSchedule({ start_time: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
                <div>
                  <label className="block font-medium text-white mb-2">End Time</label>
                  <input
                    type="time"
                    value={workSchedule.end_time}
                    onChange={(e) => saveWorkSchedule({ end_time: e.target.value })}
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  />
                </div>
              </div>

              {/* Info box */}
              <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
                <p className="text-sm text-primary">
                  Work schedule is used to calculate productivity during work hours vs personal time.
                </p>
              </div>
            </div>
          </GlassCard>

          {/* Day Start Time */}
          <GlassCard className="p-6">
            <div className="flex items-center gap-3 mb-6">
              <Clock className="w-5 h-5 text-primary" />
              <h3 className="font-semibold text-white">Day Start Time</h3>
            </div>

            <div className="space-y-4">
              <p className="text-sm text-white/40">
                When should a new "day" begin for tracking? (Default: midnight)
              </p>
              <div className="flex items-center gap-4">
                <select
                  value={workSchedule.day_start_hour}
                  onChange={(e) => saveWorkSchedule({ day_start_hour: parseInt(e.target.value) })}
                  className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                >
                  {Array.from({ length: 24 }, (_, i) => (
                    <option key={i} value={i}>
                      {i === 0 ? '12:00 AM (Midnight)' :
                       i < 12 ? `${i}:00 AM` :
                       i === 12 ? '12:00 PM (Noon)' :
                       `${i - 12}:00 PM`}
                    </option>
                  ))}
                </select>
                <span className="text-white/50">
                  Your day starts at {workSchedule.day_start_hour === 0 ? 'midnight' :
                    `${workSchedule.day_start_hour > 12 ? workSchedule.day_start_hour - 12 : workSchedule.day_start_hour}:00 ${workSchedule.day_start_hour >= 12 ? 'PM' : 'AM'}`}
                </span>
              </div>

              {/* Example */}
              <div className="p-4 bg-white/5 border border-white/10 rounded-lg">
                <p className="text-sm text-white/50">
                  <strong className="text-white">Example:</strong> If you set day start to 6:00 AM,
                  activity from 2:00 AM tonight will count towards "today" until 6:00 AM tomorrow.
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}
