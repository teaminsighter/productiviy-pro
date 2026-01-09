import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const steps = [
  {
    title: 'Welcome to Productify Pro',
    description: "Let's set up your productivity tracking in just a few steps.",
    icon: '👋',
  },
  {
    title: 'What do you do?',
    description: 'This helps us categorize your apps intelligently.',
    icon: '💼',
    options: ['Developer', 'Designer', 'Writer', 'Manager', 'Student', 'Freelancer', 'Other'],
  },
  {
    title: 'Set your daily goals',
    description: 'How many productive hours do you want to achieve?',
    icon: '🎯',
  },
  {
    title: 'Enable AI Insights',
    description: 'Get personalized productivity recommendations powered by AI.',
    icon: '🤖',
  },
  {
    title: "You're all set!",
    description: 'Productify is now tracking your productivity.',
    icon: '🎉',
  },
];

export default function Onboarding() {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedRole, setSelectedRole] = useState('');
  const [apiKey, setApiKey] = useState('');
  const navigate = useNavigate();

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      navigate('/');
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-dark flex items-center justify-center p-6">
      <motion.div
        className="glass-card p-8 w-full max-w-lg"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        {/* Progress */}
        <div className="flex gap-2 mb-8">
          {steps.map((_, index) => (
            <div
              key={index}
              className={`h-1 flex-1 rounded-full transition-colors ${
                index <= currentStep ? 'bg-primary' : 'bg-white/20'
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="text-center"
          >
            <span className="text-5xl mb-4 block">{steps[currentStep].icon}</span>
            <h2 className="text-2xl font-bold text-white mb-2">
              {steps[currentStep].title}
            </h2>
            <p className="text-white/60 mb-8">{steps[currentStep].description}</p>

            {/* Step-specific content */}
            {currentStep === 1 && (
              <div className="grid grid-cols-2 gap-3 mb-8">
                {steps[1].options?.map((option) => (
                  <button
                    key={option}
                    onClick={() => setSelectedRole(option)}
                    className={`p-3 rounded-xl border transition-all ${
                      selectedRole === option
                        ? 'border-primary bg-primary/20 text-white'
                        : 'border-white/20 text-white/60 hover:border-white/40'
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {currentStep === 2 && (
              <div className="mb-8">
                <label className="block text-white/70 text-sm mb-2">
                  Daily productive hours goal
                </label>
                <input
                  type="range"
                  min="4"
                  max="12"
                  defaultValue="6"
                  className="w-full"
                />
                <div className="flex justify-between text-white/50 text-sm mt-2">
                  <span>4 hours</span>
                  <span>12 hours</span>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="mb-8">
                <label className="block text-white/70 text-sm mb-2 text-left">
                  OpenAI API Key (Optional)
                </label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="glass-input mb-2"
                />
                <p className="text-white/40 text-xs text-left">
                  You can add this later in Settings. Get your key from{' '}
                  <a
                    href="https://platform.openai.com/api-keys"
                    className="text-primary hover:underline"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    platform.openai.com
                  </a>
                </p>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={prevStep}
            disabled={currentStep === 0}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all ${
              currentStep === 0
                ? 'text-white/30 cursor-not-allowed'
                : 'text-white/70 hover:text-white hover:bg-white/10'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <button
            onClick={nextStep}
            className="flex items-center gap-2 px-6 py-2 rounded-xl bg-primary text-white hover:bg-primary/80 transition-all"
          >
            {currentStep === steps.length - 1 ? 'Get Started' : 'Continue'}
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </div>
  );
}
