/**
 * Work Apps Step - Select productive apps
 */
import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Plus, X, Search } from 'lucide-react';
import { useCommonApps } from '@/hooks/useOnboarding';

interface WorkAppsStepProps {
  selected: string[];
  onChange: (apps: string[]) => void;
  onNext: () => void;
}

// App icons mapping
const appIcons: Record<string, string> = {
  'VS Code': '💻',
  Cursor: '⌨️',
  WebStorm: '🌐',
  PyCharm: '🐍',
  Xcode: '🍎',
  Terminal: '⬛',
  iTerm: '⬛',
  Figma: '🎨',
  Sketch: '✏️',
  'Adobe Photoshop': '🖼️',
  'Adobe Illustrator': '🎭',
  Slack: '💬',
  Discord: '🎮',
  'Microsoft Teams': '👥',
  Zoom: '📹',
  'Google Chrome': '🌐',
  Firefox: '🦊',
  Safari: '🧭',
  Arc: '🌈',
  Notion: '📝',
  Obsidian: '💎',
  'Microsoft Word': '📄',
  'Google Docs': '📄',
  'Microsoft Excel': '📊',
  'Google Sheets': '📊',
  Linear: '📋',
  Jira: '🔷',
  Asana: '✅',
  Trello: '📌',
};

export function WorkAppsStep({ selected, onChange, onNext }: WorkAppsStepProps) {
  const { data: commonApps, isLoading } = useCommonApps();
  const [searchQuery, setSearchQuery] = useState('');
  const [customApp, setCustomApp] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);

  const toggleApp = (appName: string) => {
    if (selected.includes(appName)) {
      onChange(selected.filter((a) => a !== appName));
    } else {
      onChange([...selected, appName]);
    }
  };

  const addCustomApp = () => {
    if (customApp.trim() && !selected.includes(customApp.trim())) {
      onChange([...selected, customApp.trim()]);
      setCustomApp('');
      setShowCustomInput(false);
    }
  };

  // Filter apps based on search
  const filteredApps = (commonApps || []).filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group apps by category
  const groupedApps = filteredApps.reduce((acc, app) => {
    const category = app.category || 'other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(app);
    return acc;
  }, {} as Record<string, typeof filteredApps>);

  const categoryLabels: Record<string, string> = {
    development: 'Development',
    design: 'Design',
    communication: 'Communication',
    browser: 'Browsers',
    productivity: 'Productivity',
    other: 'Other',
  };

  return (
    <div className="text-center">
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-white mb-3"
      >
        Select your work apps
      </motion.h2>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-white/60 mb-6 max-w-md mx-auto"
      >
        These apps will be marked as productive. You can always change this
        later.
      </motion.p>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="relative max-w-md mx-auto mb-6"
      >
        <Search
          className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40"
          size={18}
        />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search apps..."
          className="w-full pl-10 pr-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-accent/50 focus:outline-none"
        />
      </motion.div>

      {/* Selected Count */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="mb-4"
      >
        <span className="text-accent font-medium">{selected.length}</span>
        <span className="text-white/50"> apps selected</span>
      </motion.div>

      {/* Apps Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="max-h-[40vh] overflow-y-auto pr-2 mb-6 text-left space-y-4"
      >
        {isLoading ? (
          <div className="text-white/50 text-center py-8">Loading apps...</div>
        ) : (
          Object.entries(groupedApps).map(([category, apps]) => (
            <div key={category}>
              <p className="text-white/50 text-xs uppercase tracking-wide mb-2 px-1">
                {categoryLabels[category] || category}
              </p>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                {apps.map((app) => {
                  const isSelected = selected.includes(app.name);
                  return (
                    <motion.button
                      key={app.name}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => toggleApp(app.name)}
                      className={`relative p-3 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'border-accent bg-accent/20'
                          : 'border-white/10 bg-white/5 hover:border-white/20'
                      }`}
                    >
                      {isSelected && (
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          className="absolute top-1 right-1 w-5 h-5 rounded-full bg-accent flex items-center justify-center"
                        >
                          <Check size={12} className="text-white" />
                        </motion.div>
                      )}
                      <span className="text-xl block mb-1">
                        {appIcons[app.name] || '📱'}
                      </span>
                      <p className="text-white text-xs truncate">{app.name}</p>
                    </motion.button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </motion.div>

      {/* Add Custom App */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="mb-6"
      >
        {showCustomInput ? (
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <input
              type="text"
              value={customApp}
              onChange={(e) => setCustomApp(e.target.value)}
              placeholder="Enter app name..."
              className="flex-1 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white placeholder-white/40 focus:border-accent/50 focus:outline-none"
              onKeyDown={(e) => e.key === 'Enter' && addCustomApp()}
              autoFocus
            />
            <button
              onClick={addCustomApp}
              className="p-2 rounded-xl bg-accent text-white hover:bg-accent/80"
            >
              <Plus size={20} />
            </button>
            <button
              onClick={() => {
                setShowCustomInput(false);
                setCustomApp('');
              }}
              className="p-2 rounded-xl bg-white/10 text-white/70 hover:bg-white/20"
            >
              <X size={20} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowCustomInput(true)}
            className="flex items-center gap-2 mx-auto px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <Plus size={18} />
            Add custom app
          </button>
        )}
      </motion.div>

      {/* Continue Button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={onNext}
        className="px-8 py-3 rounded-xl bg-gradient-to-r from-accent to-purple-500 text-white font-medium hover:opacity-90 transition-opacity"
      >
        Continue
      </motion.button>
    </div>
  );
}

export default WorkAppsStep;
