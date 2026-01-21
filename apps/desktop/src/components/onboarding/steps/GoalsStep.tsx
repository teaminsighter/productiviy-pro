/**
 * Goals Step - Set daily productivity goals
 */
import { motion } from 'framer-motion';
import { Target, Clock, AlertTriangle } from 'lucide-react';

interface GoalsStepProps {
  productiveHours: number;
  distractionHours: number;
  onChangeProductive: (hours: number) => void;
  onChangeDistraction: (hours: number) => void;
  onNext: () => void;
}

export function GoalsStep({
  productiveHours,
  distractionHours,
  onChangeProductive,
  onChangeDistraction,
  onNext,
}: GoalsStepProps) {
  // Visual progress bars for preview
  const productivePercent = (productiveHours / 12) * 100;
  const distractionPercent = (distractionHours / 4) * 100;

  return (
    <div className="text-center">
      {/* Title */}
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-3xl font-bold text-white mb-3"
      >
        Set your daily goals
      </motion.h2>

      {/* Description */}
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="text-white/60 mb-10 max-w-md mx-auto"
      >
        Define your targets for productive work and limits for distractions.
      </motion.p>

      {/* Goals Container */}
      <div className="space-y-8 max-w-lg mx-auto mb-10">
        {/* Productive Hours */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 rounded-2xl bg-white/5 border border-white/10 text-left"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-xl bg-productive/20">
              <Target className="text-productive" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium mb-1">Daily Productive Hours</h3>
              <p className="text-white/50 text-sm">
                Target hours of focused, productive work
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-productive">{productiveHours}</p>
              <p className="text-white/40 text-xs">hours</p>
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min={2}
              max={12}
              step={0.5}
              value={productiveHours}
              onChange={(e) => onChangeProductive(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:bg-productive
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:shadow-productive/30"
            />
            <div className="flex justify-between text-white/40 text-xs">
              <span>2h</span>
              <span>6h (recommended)</span>
              <span>12h</span>
            </div>
          </div>

          {/* Preview Bar */}
          <div className="mt-4">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-productive"
                initial={{ width: 0 }}
                animate={{ width: `${productivePercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Distraction Limit */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 rounded-2xl bg-white/5 border border-white/10 text-left"
        >
          <div className="flex items-start gap-4 mb-6">
            <div className="p-3 rounded-xl bg-distracting/20">
              <AlertTriangle className="text-distracting" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-white font-medium mb-1">Max Distraction Time</h3>
              <p className="text-white/50 text-sm">
                Limit for time on distracting apps/sites
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold text-distracting">{distractionHours}</p>
              <p className="text-white/40 text-xs">hours</p>
            </div>
          </div>

          {/* Slider */}
          <div className="space-y-2">
            <input
              type="range"
              min={0}
              max={4}
              step={0.5}
              value={distractionHours}
              onChange={(e) => onChangeDistraction(parseFloat(e.target.value))}
              className="w-full h-2 bg-white/10 rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                [&::-webkit-slider-thumb]:bg-distracting
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-lg
                [&::-webkit-slider-thumb]:shadow-distracting/30"
            />
            <div className="flex justify-between text-white/40 text-xs">
              <span>0h (strict)</span>
              <span>1h (balanced)</span>
              <span>4h</span>
            </div>
          </div>

          {/* Preview Bar */}
          <div className="mt-4">
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-distracting"
                initial={{ width: 0 }}
                animate={{ width: `${distractionPercent}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Visual Preview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="flex items-center justify-center gap-4 mb-8"
      >
        <div className="flex items-center gap-2">
          <Clock className="text-white/40" size={18} />
          <span className="text-white/40 text-sm">Daily target:</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-productive" />
          <span className="text-white text-sm">{productiveHours}h productive</span>
        </div>
        <span className="text-white/30">|</span>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-distracting" />
          <span className="text-white text-sm">{distractionHours}h max distraction</span>
        </div>
      </motion.div>

      {/* Continue Button - Glass green 3D button */}
      <motion.button
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
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
        Continue
      </motion.button>
    </div>
  );
}

export default GoalsStep;
