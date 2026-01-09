import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Grid,
  List,
  Trash2,
  Download,
  Eye,
  Clock,
  ChevronLeft,
  ChevronRight,
  X,
  HardDrive,
  Image,
  AlertCircle,
  RefreshCw,
  Settings,
  Loader2,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { Link } from 'react-router-dom';
import { GlassCard, SearchInput, ProductivityBadge } from '@/components/common';
import {
  useScreenshots,
  useCaptureScreenshot,
  useDeleteScreenshot,
  useScreenshotStats,
} from '@/hooks/useScreenshots';
import { getScreenshotImageUrl, Screenshot } from '@/lib/api/screenshots';

// Helpers
const formatTime = (dateStr: string): string => {
  try {
    return format(parseISO(dateStr), 'h:mm a');
  } catch {
    return dateStr;
  }
};

const formatDate = (dateStr: string): string => {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
};

const getProductivityType = (type: string): 'productive' | 'neutral' | 'distracting' => {
  if (type === 'productive') return 'productive';
  if (type === 'distracting') return 'distracting';
  return 'neutral';
};

// Screenshot Modal Component
function ScreenshotModal({
  screenshot,
  screenshots,
  currentIndex,
  onClose,
  onNavigate,
  onDelete,
}: {
  screenshot: Screenshot;
  screenshots: Screenshot[];
  currentIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  onDelete: (id: string) => void;
}) {
  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && currentIndex > 0) onNavigate('prev');
      if (e.key === 'ArrowRight' && currentIndex < screenshots.length - 1) onNavigate('next');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentIndex, screenshots.length, onClose, onNavigate]);

  const handleDownload = async () => {
    const url = getScreenshotImageUrl(screenshot.id, false);
    const link = document.createElement('a');
    link.href = url;
    link.download = `screenshot-${screenshot.id}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors z-10"
      >
        <X className="w-6 h-6 text-white" />
      </button>

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate('prev');
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <ChevronLeft className="w-8 h-8 text-white" />
        </button>
      )}

      {currentIndex < screenshots.length - 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onNavigate('next');
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-white/10 hover:bg-white/20 transition-colors z-10"
        >
          <ChevronRight className="w-8 h-8 text-white" />
        </button>
      )}

      {/* Main content */}
      <div
        className="flex flex-col lg:flex-row max-w-6xl w-full mx-4 max-h-[90vh] gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Image */}
        <motion.div
          key={screenshot.id}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex-1 flex items-center justify-center bg-black/50 rounded-xl overflow-hidden"
        >
          <img
            src={getScreenshotImageUrl(screenshot.id, false)}
            alt={`Screenshot from ${screenshot.app_name}`}
            className="max-w-full max-h-[70vh] object-contain"
            onError={(e) => {
              // Fallback to placeholder
              (e.target as HTMLImageElement).src = '';
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
        </motion.div>

        {/* Metadata panel */}
        <div className="lg:w-80 glass-card p-6 space-y-4 overflow-y-auto">
          <div>
            <h3 className="text-lg font-bold text-white">{screenshot.app_name || 'Unknown App'}</h3>
            <p className="text-white/50 text-sm truncate">{screenshot.window_title || 'No title'}</p>
          </div>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-white/50 text-sm">Time</span>
              <span className="text-white text-sm">{formatTime(screenshot.timestamp)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50 text-sm">Date</span>
              <span className="text-white text-sm">{formatDate(screenshot.timestamp)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/50 text-sm">Category</span>
              <span className="text-white text-sm capitalize">{screenshot.category}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-white/50 text-sm">Type</span>
              <ProductivityBadge type={getProductivityType(screenshot.productivity_type)} size="sm" />
            </div>
            {screenshot.url && (
              <div className="pt-2 border-t border-white/10">
                <span className="text-white/50 text-xs">URL</span>
                <p className="text-primary text-sm truncate mt-1">{screenshot.url}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-4 border-t border-white/10">
            <motion.button
              onClick={handleDownload}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white text-sm transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Download className="w-4 h-4" />
              Download
            </motion.button>
            <motion.button
              onClick={() => onDelete(screenshot.id)}
              className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm transition-colors"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </motion.button>
          </div>

          {/* Navigation indicator */}
          <div className="text-center text-white/40 text-xs pt-2">
            {currentIndex + 1} of {screenshots.length}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Screenshot Grid Item
function ScreenshotCard({
  screenshot,
  onClick,
  onDelete,
}: {
  screenshot: Screenshot;
  onClick: () => void;
  onDelete: (id: string) => void;
}) {
  const [imageError, setImageError] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2 }}
    >
      <GlassCard className="overflow-hidden" hoverable>
        {/* Thumbnail */}
        <div
          className="aspect-video bg-gradient-to-br from-gray-800 to-gray-900 relative group cursor-pointer"
          onClick={onClick}
        >
          {!imageError ? (
            <img
              src={getScreenshotImageUrl(screenshot.id, true)}
              alt={`Screenshot from ${screenshot.app_name}`}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Camera className="w-12 h-12 text-white/20" />
            </div>
          )}

          {/* Overlay with actions */}
          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
            <motion.button
              className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onClick();
              }}
            >
              <Eye className="w-5 h-5 text-white" />
            </motion.button>
            <motion.button
              className="p-2 rounded-lg bg-red-500/30 hover:bg-red-500/50 transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={(e) => {
                e.stopPropagation();
                onDelete(screenshot.id);
              }}
            >
              <Trash2 className="w-5 h-5 text-red-400" />
            </motion.button>
          </div>

          {/* App name overlay */}
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
            <span className="text-white text-xs font-medium">{screenshot.app_name || 'Unknown'}</span>
          </div>
        </div>

        {/* Info */}
        <div className="p-3">
          <div className="flex items-center justify-between mb-1">
            <span className="text-white/70 text-xs truncate flex-1">{screenshot.window_title || 'No title'}</span>
            <ProductivityBadge type={getProductivityType(screenshot.productivity_type)} size="xs" />
          </div>
          <div className="flex items-center gap-1 text-white/40">
            <Clock className="w-3 h-3" />
            <span className="text-xs">{formatTime(screenshot.timestamp)}</span>
          </div>
        </div>
      </GlassCard>
    </motion.div>
  );
}

// Loading Skeleton
function ScreenshotSkeleton() {
  return (
    <div className="glass-card overflow-hidden animate-pulse">
      <div className="aspect-video bg-white/5" />
      <div className="p-3 space-y-2">
        <div className="h-4 bg-white/10 rounded w-3/4" />
        <div className="h-3 bg-white/10 rounded w-1/2" />
      </div>
    </div>
  );
}

// Main Component
export default function Screenshots() {
  const [viewMode, setViewMode] = useState<'grid' | 'timeline'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [selectedScreenshot, setSelectedScreenshot] = useState<Screenshot | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Fetch screenshots
  const {
    data: screenshots,
    isLoading,
    error,
    refetch,
  } = useScreenshots({
    date: selectedDate || undefined,
    limit: 50,
  });

  // Fetch stats
  const { data: stats } = useScreenshotStats(7);

  // Capture mutation
  const captureMutation = useCaptureScreenshot();

  // Delete mutation
  const deleteMutation = useDeleteScreenshot();

  // Filter screenshots by search
  const filteredScreenshots = screenshots?.filter(
    (s) =>
      !searchQuery ||
      s.app_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.window_title?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  // Handle capture
  const handleCapture = async () => {
    try {
      await captureMutation.mutateAsync();
    } catch (err) {
      console.error('Failed to capture screenshot:', err);
    }
  };

  // Handle delete
  const handleDelete = async (id: string) => {
    try {
      await deleteMutation.mutateAsync({ id, permanent: false });
      if (selectedScreenshot?.id === id) {
        setSelectedScreenshot(null);
      }
    } catch (err) {
      console.error('Failed to delete screenshot:', err);
    }
  };

  // Handle modal navigation
  const handleNavigate = useCallback(
    (direction: 'prev' | 'next') => {
      const newIndex = direction === 'prev' ? selectedIndex - 1 : selectedIndex + 1;
      if (newIndex >= 0 && newIndex < filteredScreenshots.length) {
        setSelectedIndex(newIndex);
        setSelectedScreenshot(filteredScreenshots[newIndex]);
      }
    },
    [selectedIndex, filteredScreenshots]
  );

  // Open modal
  const openModal = (screenshot: Screenshot, index: number) => {
    setSelectedScreenshot(screenshot);
    setSelectedIndex(index);
  };

  // Date options
  const today = format(new Date(), 'yyyy-MM-dd');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-white">Screenshots</h1>
          <p className="text-sm text-white/50">Captured moments from your work sessions</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={handleCapture}
            disabled={captureMutation.isPending}
            className="glass-button-primary flex items-center gap-2 disabled:opacity-50"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {captureMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Camera className="w-4 h-4" />
            )}
            Capture Now
          </motion.button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4">
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
              <Image className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-white/50 text-xs">Total</p>
              <p className="text-xl font-bold text-white">{stats?.total_count ?? 0}</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-productive/20 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-productive" />
            </div>
            <div>
              <p className="text-white/50 text-xs">Storage</p>
              <p className="text-xl font-bold text-white">{stats?.storage_mb?.toFixed(1) ?? 0} MB</p>
            </div>
          </div>
        </GlassCard>
        <GlassCard>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-neutral/20 flex items-center justify-center">
              <Clock className="w-5 h-5 text-neutral" />
            </div>
            <div>
              <p className="text-white/50 text-xs">Daily Avg</p>
              <p className="text-xl font-bold text-white">{stats?.daily_average?.toFixed(0) ?? 0}</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <SearchInput
            placeholder="Search screenshots..."
            value={searchQuery}
            onChange={setSearchQuery}
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="glass-input py-2 px-3 w-32"
          >
            <option value="">All Time</option>
            <option value={today}>Today</option>
            <option value={format(new Date(Date.now() - 86400000), 'yyyy-MM-dd')}>Yesterday</option>
          </select>
          <div className="flex bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'grid' ? 'bg-primary text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('timeline')}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === 'timeline' ? 'bg-primary text-white' : 'text-white/60 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      {error ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
          <h3 className="text-white font-medium mb-2">Failed to load screenshots</h3>
          <p className="text-white/50 text-sm mb-4">Check if the backend is running</p>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg text-primary transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Retry
          </button>
        </div>
      ) : isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <ScreenshotSkeleton key={i} />
          ))}
        </div>
      ) : filteredScreenshots.length === 0 ? (
        <GlassCard className="py-12">
          <div className="flex flex-col items-center justify-center text-center">
            <Camera className="w-16 h-16 text-white/20 mb-4" />
            <h3 className="text-white text-lg font-medium mb-2">No screenshots yet</h3>
            <p className="text-white/50 text-sm max-w-md mb-4">
              Screenshots are captured automatically at random intervals to help you review your work sessions.
            </p>
            <div className="flex gap-3">
              <motion.button
                onClick={handleCapture}
                disabled={captureMutation.isPending}
                className="flex items-center gap-2 px-4 py-2 bg-primary/20 hover:bg-primary/30 rounded-lg text-primary transition-colors"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Camera className="w-4 h-4" />
                Capture Now
              </motion.button>
              <Link
                to="/settings"
                className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 transition-colors"
              >
                <Settings className="w-4 h-4" />
                Configure
              </Link>
            </div>
          </div>
        </GlassCard>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredScreenshots.map((screenshot, index) => (
            <ScreenshotCard
              key={screenshot.id}
              screenshot={screenshot}
              onClick={() => openModal(screenshot, index)}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <GlassCard>
          <div className="divide-y divide-white/5">
            {filteredScreenshots.map((screenshot, index) => (
              <motion.div
                key={screenshot.id}
                className="flex items-center gap-4 p-4 hover:bg-white/5 transition-colors cursor-pointer"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                onClick={() => openModal(screenshot, index)}
              >
                <div className="w-20 h-12 rounded-lg bg-gradient-to-br from-gray-800 to-gray-900 overflow-hidden flex-shrink-0">
                  <img
                    src={getScreenshotImageUrl(screenshot.id, true)}
                    alt=""
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium text-sm">{screenshot.app_name || 'Unknown'}</p>
                  <p className="text-white/50 text-xs truncate">{screenshot.window_title || 'No title'}</p>
                </div>
                <ProductivityBadge type={getProductivityType(screenshot.productivity_type)} size="sm" />
                <span className="text-white/40 text-sm">{formatTime(screenshot.timestamp)}</span>
                <div className="flex items-center gap-2">
                  <button
                    className="p-1.5 rounded-lg hover:bg-white/10 text-white/50 hover:text-white transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      openModal(screenshot, index);
                    }}
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/50 hover:text-red-400 transition-colors"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDelete(screenshot.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </GlassCard>
      )}

      {/* Screenshot Modal */}
      <AnimatePresence>
        {selectedScreenshot && (
          <ScreenshotModal
            screenshot={selectedScreenshot}
            screenshots={filteredScreenshots}
            currentIndex={selectedIndex}
            onClose={() => setSelectedScreenshot(null)}
            onNavigate={handleNavigate}
            onDelete={handleDelete}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
