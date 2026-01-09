import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Globe, Link, Folder, Plus, Trash2, Check, X,
  Clock, AlertCircle, CheckCircle, MinusCircle
} from 'lucide-react';
import { GlassCard } from '@/components/common/GlassCard';
import { Button } from '@/components/common/Button';
import { apiClient } from '@/lib/api/client';

type TabType = 'platforms' | 'urls' | 'categories' | 'settings';

interface PlatformRule {
  domain: string;
  productivity: 'productive' | 'neutral' | 'distracting';
  category?: string;
}

interface URLRule {
  url_pattern: string;
  productivity: 'productive' | 'neutral' | 'distracting';
  category?: string;
  override_platform: boolean;
}

interface Category {
  name: string;
  color: string;
  icon?: string;
  default?: boolean;
}

export default function Rules() {
  const [activeTab, setActiveTab] = useState<TabType>('platforms');
  const [platformRules, setPlatformRules] = useState<PlatformRule[]>([]);
  const [urlRules, setURLRules] = useState<URLRule[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [dayStartHour, setDayStartHour] = useState(0);

  // Edit states
  const [newPlatform, setNewPlatform] = useState({ domain: '', productivity: 'neutral' as const, category: '' });
  const [newURL, setNewURL] = useState({ url_pattern: '', productivity: 'neutral' as const, category: '' });
  const [newCategory, setNewCategory] = useState({ name: '', color: '#6366F1' });
  const [showAddPlatform, setShowAddPlatform] = useState(false);
  const [showAddURL, setShowAddURL] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [platformsRes, urlsRes, categoriesRes, dayStartRes] = await Promise.all([
        apiClient.get('/api/rules/platforms'),
        apiClient.get('/api/rules/urls'),
        apiClient.get('/api/rules/categories'),
        apiClient.get('/api/rules/settings/day-start')
      ]);

      setPlatformRules(platformsRes.data.rules || []);
      setURLRules(urlsRes.data.rules || []);
      setCategories(categoriesRes.data.categories || []);
      setDayStartHour(dayStartRes.data.hour || 0);
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    }
  };

  const savePlatformRule = async (rule: PlatformRule) => {
    try {
      await apiClient.post('/api/rules/platforms', rule);
      await fetchData();
      setShowAddPlatform(false);
      setNewPlatform({ domain: '', productivity: 'neutral', category: '' });
    } catch (error) {
      console.error('Failed to save platform rule:', error);
    }
  };

  const deletePlatformRule = async (domain: string) => {
    try {
      await apiClient.delete(`/api/rules/platforms/${encodeURIComponent(domain)}`);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete platform rule:', error);
    }
  };

  const saveURLRule = async (rule: URLRule) => {
    try {
      await apiClient.post('/api/rules/urls', { ...rule, override_platform: true });
      await fetchData();
      setShowAddURL(false);
      setNewURL({ url_pattern: '', productivity: 'neutral', category: '' });
    } catch (error) {
      console.error('Failed to save URL rule:', error);
    }
  };

  const deleteURLRule = async (pattern: string) => {
    try {
      await apiClient.delete(`/api/rules/urls/${encodeURIComponent(pattern)}`);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete URL rule:', error);
    }
  };

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

  const deleteCategory = async (name: string) => {
    try {
      await apiClient.delete(`/api/rules/categories/${encodeURIComponent(name)}`);
      await fetchData();
    } catch (error) {
      console.error('Failed to delete category:', error);
    }
  };

  const saveDayStart = async (hour: number) => {
    try {
      await apiClient.post('/api/rules/settings/day-start', { hour });
      setDayStartHour(hour);
    } catch (error) {
      console.error('Failed to save day start:', error);
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white">Custom Rules</h2>
        <p className="text-white/50">Configure productivity rules for platforms and URLs</p>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/5 rounded-xl p-1 w-fit">
        {[
          { id: 'platforms', label: 'Platforms', icon: Globe },
          { id: 'urls', label: 'URL Rules', icon: Link },
          { id: 'categories', label: 'Categories', icon: Folder },
          { id: 'settings', label: 'Settings', icon: Clock },
        ].map(({ id, label, icon: Icon }) => (
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
          </button>
        ))}
      </div>

      {/* Platform Rules Tab */}
      {activeTab === 'platforms' && (
        <GlassCard>
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h3 className="font-semibold text-white">Platform Rules</h3>
            <Button size="sm" onClick={() => setShowAddPlatform(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Rule
            </Button>
          </div>

          {/* Add New Platform Form */}
          {showAddPlatform && (
            <div className="p-4 bg-white/5 border-b border-white/10">
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
                <div className="w-40">
                  <label className="block text-sm text-white/50 mb-1">Status</label>
                  <select
                    value={newPlatform.productivity}
                    onChange={(e) => setNewPlatform({ ...newPlatform, productivity: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  >
                    <option value="productive">Productive</option>
                    <option value="neutral">Neutral</option>
                    <option value="distracting">Distracting</option>
                  </select>
                </div>
                <div className="w-40">
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
                <Button onClick={() => savePlatformRule(newPlatform as PlatformRule)}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button variant="ghost" onClick={() => setShowAddPlatform(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}

          <div className="divide-y divide-white/5">
            {platformRules.map((rule) => (
              <motion.div
                key={rule.domain}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                    <Globe className="w-5 h-5 text-white/50" />
                  </div>
                  <div>
                    <p className="font-medium text-white">{rule.domain}</p>
                    <p className="text-sm text-white/40">{rule.category || 'Uncategorized'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-xs border capitalize flex items-center gap-1 ${getProductivityColor(rule.productivity)}`}>
                    {getProductivityIcon(rule.productivity)}
                    <span>{rule.productivity}</span>
                  </span>
                  <button
                    onClick={() => deletePlatformRule(rule.domain)}
                    className="p-2 text-white/30 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* URL Rules Tab */}
      {activeTab === 'urls' && (
        <GlassCard>
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-white">URL-Specific Rules</h3>
              <p className="text-sm text-white/40">Override platform rules for specific URLs</p>
            </div>
            <Button size="sm" onClick={() => setShowAddURL(true)}>
              <Plus className="w-4 h-4 mr-1" /> Add Rule
            </Button>
          </div>

          {/* Add New URL Form */}
          {showAddURL && (
            <div className="p-4 bg-white/5 border-b border-white/10">
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
                <div className="w-40">
                  <label className="block text-sm text-white/50 mb-1">Status</label>
                  <select
                    value={newURL.productivity}
                    onChange={(e) => setNewURL({ ...newURL, productivity: e.target.value as any })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white"
                  >
                    <option value="productive">Productive</option>
                    <option value="neutral">Neutral</option>
                    <option value="distracting">Distracting</option>
                  </select>
                </div>
                <Button onClick={() => saveURLRule(newURL as URLRule)}>
                  <Check className="w-4 h-4" />
                </Button>
                <Button variant="ghost" onClick={() => setShowAddURL(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-white/30 mt-2">
                Use * as wildcard. Example: youtube.com/playlist* matches all playlist URLs
              </p>
            </div>
          )}

          <div className="divide-y divide-white/5">
            {urlRules.length === 0 ? (
              <div className="p-8 text-center text-white/40">
                <Link className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No URL rules yet</p>
                <p className="text-sm text-white/30">Add rules to override platform settings for specific URLs</p>
              </div>
            ) : (
              urlRules.map((rule) => (
                <motion.div
                  key={rule.url_pattern}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
                      <Link className="w-5 h-5 text-white/50" />
                    </div>
                    <div>
                      <p className="font-medium font-mono text-sm text-white">{rule.url_pattern}</p>
                      <p className="text-xs text-white/40">Overrides platform rule</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-xs border capitalize ${getProductivityColor(rule.productivity)}`}>
                      {rule.productivity}
                    </span>
                    <button
                      onClick={() => deleteURLRule(rule.url_pattern)}
                      className="p-2 text-white/30 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
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
          {showAddCategory && (
            <div className="p-4 bg-white/5 border-b border-white/10">
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
            </div>
          )}

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

      {/* Settings Tab */}
      {activeTab === 'settings' && (
        <GlassCard className="p-6">
          <h3 className="font-semibold text-white mb-6">Time Settings</h3>

          <div className="space-y-6">
            {/* Day Start Hour */}
            <div>
              <label className="block font-medium text-white mb-2">Day Start Time</label>
              <p className="text-sm text-white/40 mb-3">
                When should a new "day" begin for tracking? (Default: midnight)
              </p>
              <div className="flex items-center gap-4">
                <select
                  value={dayStartHour}
                  onChange={(e) => saveDayStart(parseInt(e.target.value))}
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
                  Your day starts at {dayStartHour === 0 ? 'midnight' :
                    `${dayStartHour > 12 ? dayStartHour - 12 : dayStartHour}:00 ${dayStartHour >= 12 ? 'PM' : 'AM'}`}
                </span>
              </div>
            </div>

            {/* Example */}
            <div className="p-4 bg-primary/10 border border-primary/20 rounded-lg">
              <p className="text-sm text-primary">
                <strong>Example:</strong> If you set day start to 6:00 AM,
                activity from 2:00 AM tonight will count towards "today" until 6:00 AM tomorrow.
              </p>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
