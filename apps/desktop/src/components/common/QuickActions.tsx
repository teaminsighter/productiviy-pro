/**
 * Quick Actions - Floating action button with expandable menu
 */
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, X, Camera, Target, FileText, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import apiClient from '@/lib/api/client';

interface QuickAction {
  icon: React.ElementType;
  label: string;
  color: string;
  onClick: () => void;
}

export function QuickActions() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();

  // Screenshot capture mutation
  const captureMutation = useMutation({
    mutationFn: async () => {
      const response = await apiClient.post('/api/screenshots/capture');
      return response.data;
    },
    onSuccess: () => {
      setIsOpen(false);
    },
  });

  // Download report mutation
  const downloadReportMutation = useMutation({
    mutationFn: async () => {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000';
      const response = await fetch(`${apiUrl}/api/reports/daily`);
      if (!response.ok) throw new Error('Failed to download report');
      const blob = await response.blob();
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `productivity-report-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      setIsOpen(false);
    },
  });

  const actions: QuickAction[] = [
    {
      icon: Camera,
      label: 'Screenshot',
      color: 'from-blue-500 to-cyan-500',
      onClick: () => captureMutation.mutate(),
    },
    {
      icon: Target,
      label: 'Start Focus',
      color: 'from-green-500 to-emerald-500',
      onClick: () => {
        navigate('/goals');
        setIsOpen(false);
      },
    },
    {
      icon: FileText,
      label: 'Export Report',
      color: 'from-purple-500 to-pink-500',
      onClick: () => downloadReportMutation.mutate(),
    },
    {
      icon: Settings,
      label: 'Settings',
      color: 'from-orange-500 to-amber-500',
      onClick: () => {
        navigate('/settings');
        setIsOpen(false);
      },
    },
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Action Items */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.2 }}
            className="absolute bottom-16 right-0 flex flex-col gap-3 items-end"
          >
            {actions.map((action, index) => (
              <motion.button
                key={action.label}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: index * 0.05 }}
                onClick={action.onClick}
                className="flex items-center gap-3 group"
                disabled={captureMutation.isPending || downloadReportMutation.isPending}
              >
                {/* Label */}
                <span className="px-3 py-1.5 bg-black/80 backdrop-blur-sm rounded-lg text-sm text-white font-medium opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                  {action.label}
                </span>

                {/* Icon Button */}
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  className={`w-12 h-12 rounded-full bg-gradient-to-br ${action.color} flex items-center justify-center shadow-lg hover:shadow-xl transition-shadow`}
                >
                  <action.icon className="w-5 h-5 text-white" />
                </motion.div>
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all duration-300 ${
          isOpen
            ? 'bg-red-500 hover:bg-red-600'
            : 'bg-gradient-to-br from-primary to-secondary hover:shadow-primary/30'
        }`}
      >
        <motion.div
          animate={{ rotate: isOpen ? 45 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {isOpen ? (
            <X className="w-6 h-6 text-white" />
          ) : (
            <Plus className="w-6 h-6 text-white" />
          )}
        </motion.div>
      </motion.button>
    </div>
  );
}

export default QuickActions;
