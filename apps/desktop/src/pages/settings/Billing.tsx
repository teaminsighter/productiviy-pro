import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Crown, CreditCard, Check, Loader2, AlertCircle, RefreshCw
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { apiClient } from '@/lib/api/client';

const plans = [
  {
    id: 'personal',
    name: 'Personal',
    price: 6,
    yearly: 60,
    features: ['Unlimited history', 'AI insights', 'Screenshots', 'PDF reports'],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 9,
    yearly: 84,
    popular: true,
    features: ['Everything in Personal', 'Advanced analytics', 'Goal tracking', 'Website blocking', 'Priority support'],
  },
  {
    id: 'team',
    name: 'Team',
    price: 7,
    yearly: 70,
    perUser: true,
    features: ['Everything in Pro', 'Team dashboard', 'Admin controls', 'Privacy settings'],
  },
];

interface SubscriptionStatus {
  has_subscription: boolean;
  plan: string;
  is_trial?: boolean;
  trial_ends_at?: string;
  days_left?: number;
  status?: string;
  current_period_end?: string;
  cancel_at_period_end?: boolean;
}

export default function Billing() {
  useAuthStore();
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
  const [loadingSubscription, setLoadingSubscription] = useState(true);

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const response = await apiClient.get('/api/billing/subscription');
      setSubscription(response.data);
    } catch (err) {
      console.error('Failed to fetch subscription:', err);
    } finally {
      setLoadingSubscription(false);
    }
  };

  const handleSubscribe = async (planId: string) => {
    setIsLoading(planId);
    setError('');

    try {
      const response = await apiClient.post('/api/billing/create-checkout-session', {
        plan: planId,
        billing_cycle: billingCycle,
      });

      // Open Stripe Checkout in external browser
      if (response.data.url) {
        window.open(response.data.url, '_blank');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to start checkout');
    } finally {
      setIsLoading(null);
    }
  };

  const handleManageSubscription = async () => {
    setIsLoading('manage');
    try {
      const response = await apiClient.post('/api/billing/create-portal-session');
      if (response.data.url) {
        window.open(response.data.url, '_blank');
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to open billing portal');
    } finally {
      setIsLoading(null);
    }
  };

  const handleCancelSubscription = async () => {
    if (!confirm('Are you sure you want to cancel your subscription? You will retain access until the end of your billing period.')) {
      return;
    }

    setIsLoading('cancel');
    try {
      await apiClient.post('/api/billing/cancel');
      await fetchSubscription();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to cancel subscription');
    } finally {
      setIsLoading(null);
    }
  };

  const handleReactivate = async () => {
    setIsLoading('reactivate');
    try {
      await apiClient.post('/api/billing/reactivate');
      await fetchSubscription();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to reactivate subscription');
    } finally {
      setIsLoading(null);
    }
  };

  const hasActiveSubscription = subscription?.has_subscription && subscription?.status === 'active';
  const isCanceling = subscription?.cancel_at_period_end;

  if (loadingSubscription) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-5xl mx-auto p-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Billing & Subscription</h2>
        <p className="text-gray-400">Manage your subscription and billing details</p>
      </div>

      {/* Current Plan Status */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 rounded-2xl bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/20"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Crown className="w-5 h-5 text-indigo-400" />
              <span className="font-medium">Current Plan</span>
            </div>
            <h3 className="text-2xl font-bold capitalize">{subscription?.plan || 'Free'}</h3>
            {subscription?.is_trial && subscription.days_left !== undefined && (
              <p className="text-sm text-yellow-400 mt-1">
                Trial ends in {subscription.days_left} days
              </p>
            )}
            {isCanceling && (
              <p className="text-sm text-red-400 mt-1">
                Cancels at end of billing period
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {hasActiveSubscription && (
              <>
                <button
                  onClick={handleManageSubscription}
                  disabled={isLoading === 'manage'}
                  className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                >
                  {isLoading === 'manage' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <CreditCard className="w-4 h-4" />
                      Manage Billing
                    </>
                  )}
                </button>
                {isCanceling ? (
                  <button
                    onClick={handleReactivate}
                    disabled={isLoading === 'reactivate'}
                    className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {isLoading === 'reactivate' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <RefreshCw className="w-4 h-4" />
                        Reactivate
                      </>
                    )}
                  </button>
                ) : (
                  <button
                    onClick={handleCancelSubscription}
                    disabled={isLoading === 'cancel'}
                    className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
                  >
                    {isLoading === 'cancel' ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      'Cancel'
                    )}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </motion.div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-center gap-2 text-red-400">
          <AlertCircle className="w-5 h-5" />
          {error}
        </div>
      )}

      {/* Billing Cycle Toggle */}
      <div className="flex justify-center">
        <div className="inline-flex items-center p-1 bg-gray-800 rounded-lg">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              billingCycle === 'monthly'
                ? 'bg-indigo-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              billingCycle === 'yearly'
                ? 'bg-indigo-500 text-white'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Yearly
            <span className="ml-1 text-xs text-green-400">Save 20%</span>
          </button>
        </div>
      </div>

      {/* Plans */}
      <div className="grid md:grid-cols-3 gap-6">
        {plans.map((plan, index) => {
          const isCurrentPlan = subscription?.plan === plan.id;
          const price = billingCycle === 'yearly'
            ? Math.round(plan.yearly / 12)
            : plan.price;

          return (
            <motion.div
              key={plan.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={`relative p-6 rounded-2xl bg-gray-800/50 border ${
                plan.popular
                  ? 'border-indigo-500 ring-1 ring-indigo-500'
                  : 'border-gray-700'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="px-3 py-1 bg-indigo-500 rounded-full text-xs font-medium">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className="text-lg font-semibold">{plan.name}</h3>
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-3xl font-bold">${price}</span>
                  <span className="text-gray-500">
                    /{plan.perUser ? 'user/' : ''}mo
                  </span>
                </div>
                {billingCycle === 'yearly' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Billed ${plan.yearly}/year
                  </p>
                )}
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="w-4 h-4 text-green-400" />
                    <span className="text-gray-300">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => !isCurrentPlan && handleSubscribe(plan.id)}
                disabled={isCurrentPlan || isLoading === plan.id}
                className={`w-full py-3 rounded-xl font-medium transition-all ${
                  isCurrentPlan
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : plan.popular
                    ? 'bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600'
                    : 'bg-gray-700 hover:bg-gray-600'
                } disabled:opacity-50`}
              >
                {isLoading === plan.id ? (
                  <Loader2 className="w-4 h-4 animate-spin mx-auto" />
                ) : isCurrentPlan ? (
                  'Current Plan'
                ) : (
                  'Upgrade'
                )}
              </button>
            </motion.div>
          );
        })}
      </div>

      {/* FAQ */}
      <div className="mt-12 text-center text-sm text-gray-500">
        <p>All plans include a 7-day free trial. Cancel anytime.</p>
        <p className="mt-1">
          Questions?{' '}
          <a
            href="mailto:support@productifypro.com"
            className="text-indigo-400 hover:text-indigo-300"
          >
            Contact support
          </a>
        </p>
      </div>
    </div>
  );
}
