/**
 * Onboarding Flow Component
 *
 * Multi-step wizard for new user setup
 */
import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check } from 'lucide-react';

// Import steps
import { WelcomeStep } from './steps/WelcomeStep';
import { ProfileStep } from './steps/ProfileStep';
import { WorkAppsStep } from './steps/WorkAppsStep';
import { GoalsStep } from './steps/GoalsStep';
import { AISetupStep } from './steps/AISetupStep';
import { PermissionsStep } from './steps/PermissionsStep';
import { CompleteStep } from './steps/CompleteStep';

// Hooks
import {
  useSaveOnboardingStep,
  useCompleteOnboarding,
} from '@/hooks/useOnboarding';
import type { UserProfileType } from '@/lib/api/notifications';

// Total number of steps
const TOTAL_STEPS = 7;

// Step titles for progress indicator
const STEP_TITLES = [
  'Welcome',
  'Profile',
  'Work Apps',
  'Goals',
  'AI Setup',
  'Permissions',
  'Complete',
];

export interface OnboardingData {
  profileType: UserProfileType;
  workApps: string[];
  dailyProductiveHours: number;
  maxDistractionHours: number;
  aiEnabled: boolean;
  openaiApiKey: string;
  accessibilityGranted: boolean;
  screenRecordingGranted: boolean;
  launchOnStartup: boolean;
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    profileType: 'other',
    workApps: [],
    dailyProductiveHours: 6,
    maxDistractionHours: 1,
    aiEnabled: false,
    openaiApiKey: '',
    accessibilityGranted: false,
    screenRecordingGranted: false,
    launchOnStartup: true,
  });

  const saveStep = useSaveOnboardingStep();
  const completeOnboarding = useCompleteOnboarding();

  // Update data and save to backend
  const updateData = useCallback(
    async (updates: Partial<OnboardingData>, step: number) => {
      const newData = { ...data, ...updates };
      setData(newData);

      // Convert to backend format
      const stepData: Record<string, unknown> = {};

      switch (step) {
        case 2:
          stepData.profile_type = newData.profileType;
          break;
        case 3:
          stepData.work_apps = newData.workApps;
          break;
        case 4:
          stepData.daily_productive_hours = newData.dailyProductiveHours;
          stepData.max_distraction_hours = newData.maxDistractionHours;
          break;
        case 5:
          stepData.ai_enabled = newData.aiEnabled;
          if (newData.openaiApiKey) {
            stepData.openai_api_key = newData.openaiApiKey;
          }
          break;
        case 6:
          stepData.accessibility_granted = newData.accessibilityGranted;
          stepData.screen_recording_granted = newData.screenRecordingGranted;
          stepData.launch_on_startup = newData.launchOnStartup;
          break;
      }

      if (Object.keys(stepData).length > 0) {
        try {
          await saveStep.mutateAsync({ step, data: stepData });
        } catch (error) {
          console.error('Failed to save step:', error);
        }
      }
    },
    [data, saveStep]
  );

  // Navigation
  const goNext = useCallback(() => {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep]);

  const goBack = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  // Complete onboarding
  const handleComplete = useCallback(async () => {
    try {
      await completeOnboarding.mutateAsync();
      onComplete();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    }
  }, [completeOnboarding, onComplete]);

  // Progress percentage
  const progress = ((currentStep - 1) / (TOTAL_STEPS - 1)) * 100;

  // Animation variants
  const slideVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 100 : -100,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 100 : -100,
      opacity: 0,
    }),
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-950 to-black flex flex-col">
      {/* Progress Bar */}
      <div className="fixed top-0 left-0 right-0 z-50">
        <div className="h-1 bg-white/10">
          <motion.div
            className="h-full bg-gradient-to-r from-accent to-purple-500"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* Step Indicators */}
      <div className="flex justify-center gap-2 pt-8 pb-4">
        {STEP_TITLES.map((title, index) => {
          const stepNum = index + 1;
          const isComplete = currentStep > stepNum;
          const isCurrent = currentStep === stepNum;

          return (
            <div key={title} className="flex items-center">
              <motion.div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  isComplete
                    ? 'bg-productive text-white'
                    : isCurrent
                    ? 'bg-accent text-white'
                    : 'bg-white/10 text-white/50'
                }`}
                initial={false}
                animate={{
                  scale: isCurrent ? 1.1 : 1,
                }}
              >
                {isComplete ? <Check size={16} /> : stepNum}
              </motion.div>
              {index < STEP_TITLES.length - 1 && (
                <div
                  className={`w-8 h-0.5 mx-1 ${
                    isComplete ? 'bg-productive' : 'bg-white/10'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Title */}
      <div className="text-center mb-4">
        <motion.p
          key={currentStep}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-white/50 text-sm"
        >
          Step {currentStep} of {TOTAL_STEPS}: {STEP_TITLES[currentStep - 1]}
        </motion.p>
      </div>

      {/* Step Content */}
      <div className="flex-1 flex items-center justify-center px-4 overflow-hidden">
        <AnimatePresence mode="wait" custom={1}>
          <motion.div
            key={currentStep}
            custom={1}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="w-full max-w-2xl"
          >
            {currentStep === 1 && <WelcomeStep onNext={goNext} />}
            {currentStep === 2 && (
              <ProfileStep
                value={data.profileType}
                onChange={(type) => updateData({ profileType: type }, 2)}
                onNext={goNext}
              />
            )}
            {currentStep === 3 && (
              <WorkAppsStep
                selected={data.workApps}
                onChange={(apps) => updateData({ workApps: apps }, 3)}
                onNext={goNext}
              />
            )}
            {currentStep === 4 && (
              <GoalsStep
                productiveHours={data.dailyProductiveHours}
                distractionHours={data.maxDistractionHours}
                onChangeProductive={(hours) =>
                  updateData({ dailyProductiveHours: hours }, 4)
                }
                onChangeDistraction={(hours) =>
                  updateData({ maxDistractionHours: hours }, 4)
                }
                onNext={goNext}
              />
            )}
            {currentStep === 5 && (
              <AISetupStep
                enabled={data.aiEnabled}
                apiKey={data.openaiApiKey}
                onChangeEnabled={(enabled) =>
                  updateData({ aiEnabled: enabled }, 5)
                }
                onChangeApiKey={(key) => updateData({ openaiApiKey: key }, 5)}
                onNext={goNext}
              />
            )}
            {currentStep === 6 && (
              <PermissionsStep
                accessibility={data.accessibilityGranted}
                screenRecording={data.screenRecordingGranted}
                launchOnStartup={data.launchOnStartup}
                onChangeAccessibility={(granted) =>
                  updateData({ accessibilityGranted: granted }, 6)
                }
                onChangeScreenRecording={(granted) =>
                  updateData({ screenRecordingGranted: granted }, 6)
                }
                onChangeLaunchOnStartup={(enabled) =>
                  updateData({ launchOnStartup: enabled }, 6)
                }
                onNext={goNext}
              />
            )}
            {currentStep === 7 && (
              <CompleteStep
                data={data}
                onComplete={handleComplete}
                isLoading={completeOnboarding.isPending}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation Buttons */}
      <div className="flex justify-between items-center p-6 max-w-2xl mx-auto w-full">
        {currentStep > 1 && currentStep < 7 ? (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={goBack}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          >
            <ChevronLeft size={18} />
            Back
          </motion.button>
        ) : (
          <div />
        )}

        {currentStep > 1 && currentStep < 6 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={goNext}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-white/50 hover:text-white transition-colors"
          >
            Skip
            <ChevronRight size={18} />
          </motion.button>
        )}
      </div>
    </div>
  );
}

export default OnboardingFlow;
