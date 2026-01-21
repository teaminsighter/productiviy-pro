/**
 * AI Setup Step - Configure AI-powered insights
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Brain,
  Sparkles,
  Lightbulb,
  TrendingUp,
  Key,
  Check,
  X,
  ExternalLink,
  Loader2,
} from 'lucide-react';

interface AISetupStepProps {
  enabled: boolean;
  apiKey: string;
  onChangeEnabled: (enabled: boolean) => void;
  onChangeApiKey: (key: string) => void;
  onNext: () => void;
}

const aiFeatures = [
  {
    icon: Sparkles,
    title: 'Personalized Insights',
    description: 'AI analyzes your patterns to give tailored advice',
  },
  {
    icon: Lightbulb,
    title: 'Smart Suggestions',
    description: 'Get tips to improve focus and productivity',
  },
  {
    icon: TrendingUp,
    title: 'Weekly Reports',
    description: 'Comprehensive AI-generated productivity reports',
  },
];

export function AISetupStep({
  enabled,
  apiKey,
  onChangeEnabled,
  onChangeApiKey,
  onNext,
}: AISetupStepProps) {
  const [showApiInput, setShowApiInput] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleTestConnection = async () => {
    if (!apiKey) return;

    setIsTesting(true);
    setTestResult(null);

    try {
      // Simple test - just validate the key format
      // Real validation would call the OpenAI API
      const response = await fetch('https://api.openai.com/v1/models', {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        setTestResult('success');
        onChangeEnabled(true);
      } else {
        setTestResult('error');
      }
    } catch {
      setTestResult('error');
    }

    setIsTesting(false);
  };

  return (
    <div className="text-center">
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-white mb-3"
      >
        Enable AI-Powered Insights
      </motion.h2>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-white/60 mb-8 max-w-md mx-auto"
      >
        Unlock intelligent productivity insights powered by OpenAI. Your data
        stays private.
      </motion.p>

      {/* AI Features */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="grid grid-cols-3 gap-4 mb-8"
      >
        {aiFeatures.map((feature, index) => (
          <motion.div
            key={feature.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + index * 0.1 }}
            className="p-4 rounded-xl bg-white/5 border border-white/10"
          >
            <feature.icon className="text-accent mx-auto mb-2" size={24} />
            <p className="text-white text-sm font-medium">{feature.title}</p>
            <p className="text-white/50 text-xs mt-1">{feature.description}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Enable Toggle */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="max-w-md mx-auto mb-6"
      >
        <div
          onClick={() => {
            if (!enabled) {
              setShowApiInput(true);
            } else {
              onChangeEnabled(false);
              setShowApiInput(false);
            }
          }}
          className={`p-4 rounded-xl border cursor-pointer transition-all ${
            enabled
              ? 'border-accent bg-accent/20'
              : 'border-white/10 bg-white/5 hover:border-white/20'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-lg ${
                  enabled ? 'bg-accent' : 'bg-white/10'
                }`}
              >
                <Brain className={enabled ? 'text-white' : 'text-white/50'} size={20} />
              </div>
              <div className="text-left">
                <p className="text-white font-medium">AI Insights</p>
                <p className="text-white/50 text-xs">
                  {enabled ? 'Enabled' : 'Click to enable'}
                </p>
              </div>
            </div>
            <div
              className={`w-11 h-6 rounded-full p-1 transition-colors ${
                enabled ? 'bg-accent' : 'bg-white/20'
              }`}
            >
              <motion.div
                className="w-4 h-4 rounded-full bg-white"
                animate={{ x: enabled ? 20 : 0 }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            </div>
          </div>
        </div>
      </motion.div>

      {/* API Key Input */}
      <AnimatePresence>
        {showApiInput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-md mx-auto mb-6"
          >
            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-4">
              <div className="flex items-center gap-2 text-white/50 text-sm">
                <Key size={16} />
                <span>OpenAI API Key</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => {
                    onChangeApiKey(e.target.value);
                    setTestResult(null);
                  }}
                  placeholder="sk-..."
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-white placeholder-white/30 focus:border-accent/50 focus:outline-none font-mono text-sm"
                />
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleTestConnection}
                  disabled={!apiKey || isTesting}
                  className="px-4 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isTesting ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    'Test'
                  )}
                </motion.button>
              </div>

              {/* Test Result */}
              <AnimatePresence>
                {testResult && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className={`flex items-center gap-2 text-sm ${
                      testResult === 'success' ? 'text-productive' : 'text-distracting'
                    }`}
                  >
                    {testResult === 'success' ? (
                      <>
                        <Check size={16} />
                        <span>Connection successful!</span>
                      </>
                    ) : (
                      <>
                        <X size={16} />
                        <span>Invalid API key. Please check and try again.</span>
                      </>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Get API Key Link */}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 text-accent hover:text-accent/80 text-sm"
              >
                <ExternalLink size={14} />
                Get your API key from OpenAI
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex flex-col items-center gap-3"
      >
        <motion.button
          whileHover={{ scale: 1.02, y: -3 }}
          whileTap={{ scale: 0.98, y: 0 }}
          onClick={onNext}
          className="px-10 py-4 rounded-2xl text-white font-semibold transition-all"
          style={{
            background: 'rgba(16, 185, 129, 0.85)',
            backdropFilter: 'blur(12px)',
            boxShadow: '0 8px 32px rgba(16, 185, 129, 0.35), 0 4px 12px rgba(0, 0, 0, 0.3), inset 0 1px 1px rgba(255, 255, 255, 0.2), inset 0 -2px 4px rgba(0, 0, 0, 0.15)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
          }}
        >
          {enabled ? 'Continue' : 'Skip for now'}
        </motion.button>

        {!showApiInput && !enabled && (
          <button
            onClick={() => {
              setShowApiInput(true);
            }}
            className="text-accent text-sm hover:underline"
          >
            I have an API key
          </button>
        )}
      </motion.div>
    </div>
  );
}

export default AISetupStep;
