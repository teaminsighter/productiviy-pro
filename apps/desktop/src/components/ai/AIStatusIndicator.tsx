import { motion } from 'framer-motion';
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  WifiOff,
  Key,
  Loader2,
  Settings,
} from 'lucide-react';
import { useAIStatus } from '@/hooks/useAI';
import { Link } from 'react-router-dom';

interface AIStatusIndicatorProps {
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function AIStatusIndicator({ showLabel = true, size = 'md' }: AIStatusIndicatorProps) {
  const { data: status, isLoading } = useAIStatus();

  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-2',
    lg: 'text-base gap-2',
  };

  const iconSizes = {
    sm: 12,
    md: 16,
    lg: 20,
  };

  if (isLoading) {
    return (
      <div className={`flex items-center ${sizeClasses[size]} text-white/50`}>
        <Loader2 size={iconSizes[size]} className="animate-spin" />
        {showLabel && <span>Checking AI...</span>}
      </div>
    );
  }

  // Not configured
  if (!status?.configured) {
    return (
      <Link to="/settings" className="block">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className={`flex items-center ${sizeClasses[size]} px-3 py-1.5 rounded-full bg-yellow-500/10 text-yellow-400 cursor-pointer hover:bg-yellow-500/20 transition-colors`}
        >
          <Key size={iconSizes[size]} />
          {showLabel && <span>Setup AI</span>}
        </motion.div>
      </Link>
    );
  }

  // Rate limited
  if (status?.rate_limited) {
    return (
      <div
        className={`flex items-center ${sizeClasses[size]} px-3 py-1.5 rounded-full bg-orange-500/10 text-orange-400`}
      >
        <AlertCircle size={iconSizes[size]} />
        {showLabel && <span>Rate Limited</span>}
      </div>
    );
  }

  // Offline
  if (!status?.online) {
    return (
      <div
        className={`flex items-center ${sizeClasses[size]} px-3 py-1.5 rounded-full bg-red-500/10 text-red-400`}
      >
        <WifiOff size={iconSizes[size]} />
        {showLabel && <span>AI Offline</span>}
      </div>
    );
  }

  // Available and ready
  if (status?.available) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center ${sizeClasses[size]} px-3 py-1.5 rounded-full bg-accent/10 text-accent`}
      >
        <Brain size={iconSizes[size]} />
        {showLabel && <span>AI Ready</span>}
        <CheckCircle2 size={iconSizes[size] - 2} className="text-productive" />
      </motion.div>
    );
  }

  // Unknown state
  return (
    <Link to="/settings" className="block">
      <div
        className={`flex items-center ${sizeClasses[size]} px-3 py-1.5 rounded-full bg-white/10 text-white/50 cursor-pointer hover:bg-white/20 transition-colors`}
      >
        <Settings size={iconSizes[size]} />
        {showLabel && <span>Configure AI</span>}
      </div>
    </Link>
  );
}

export default AIStatusIndicator;
