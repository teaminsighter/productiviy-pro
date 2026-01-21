'use client';

import { useState, useEffect } from 'react';
import { DollarSign, TrendingUp, CreditCard, Users, ArrowUpRight, Calendar } from 'lucide-react';

interface RevenueStats {
  mrr: number;
  arr: number;
  totalRevenue: number;
  activeSubscriptions: number;
  averageRevenue: number;
  revenueGrowth: number;
}

interface Transaction {
  id: string;
  user: string;
  email: string;
  amount: number;
  plan: string;
  status: string;
  date: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://productifypro.insighter.digital';

export default function RevenuePage() {
  const [stats, setStats] = useState<RevenueStats>({
    mrr: 0,
    arr: 0,
    totalRevenue: 0,
    activeSubscriptions: 0,
    averageRevenue: 0,
    revenueGrowth: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [period, setPeriod] = useState('month');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRevenue = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/admin/dashboard/revenue?period=${period}`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        });
        if (response.ok) {
          const data = await response.json();
          setStats(data.stats);
          setTransactions(data.transactions);
        }
      } catch (error) {
        // Mock data
        setStats({
          mrr: 12450,
          arr: 149400,
          totalRevenue: 87650,
          activeSubscriptions: 342,
          averageRevenue: 36.40,
          revenueGrowth: 18.5,
        });
        setTransactions([
          { id: '1', user: 'John Doe', email: 'john@example.com', amount: 29, plan: 'Pro Monthly', status: 'succeeded', date: 'Jan 20, 2024' },
          { id: '2', user: 'Alice Corp', email: 'billing@alice.com', amount: 99, plan: 'Team Monthly', status: 'succeeded', date: 'Jan 20, 2024' },
          { id: '3', user: 'Bob Wilson', email: 'bob@example.com', amount: 290, plan: 'Pro Yearly', status: 'succeeded', date: 'Jan 19, 2024' },
          { id: '4', user: 'Jane Smith', email: 'jane@example.com', amount: 29, plan: 'Pro Monthly', status: 'refunded', date: 'Jan 18, 2024' },
          { id: '5', user: 'Tech Inc', email: 'pay@tech.com', amount: 990, plan: 'Team Yearly', status: 'succeeded', date: 'Jan 17, 2024' },
        ]);
      }
      setIsLoading(false);
    };
    fetchRevenue();
  }, [period]);

  const statCards = [
    { label: 'Monthly Revenue (MRR)', value: `$${stats.mrr.toLocaleString()}`, icon: DollarSign, color: 'green' },
    { label: 'Annual Revenue (ARR)', value: `$${stats.arr.toLocaleString()}`, icon: TrendingUp, color: 'indigo' },
    { label: 'Active Subscriptions', value: stats.activeSubscriptions.toLocaleString(), icon: Users, color: 'blue' },
    { label: 'Avg Revenue/User', value: `$${stats.averageRevenue.toFixed(2)}`, icon: CreditCard, color: 'purple' },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Revenue</h1>
          <p className="text-gray-400 mt-1">Track your subscription revenue and payments</p>
        </div>
        <div className="flex gap-2">
          {['week', 'month', 'year'].map((p) => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={`px-4 py-2 rounded-xl capitalize transition-colors ${
                period === p ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, index) => (
          <div key={index} className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl bg-${stat.color}-500/20`}>
                <stat.icon className={`w-6 h-6 text-${stat.color}-400`} />
              </div>
              <span className="flex items-center text-sm text-green-400">
                <ArrowUpRight className="w-4 h-4" />
                +{stats.revenueGrowth}%
              </span>
            </div>
            <h3 className="text-gray-400 text-sm">{stat.label}</h3>
            <p className="text-2xl font-bold text-white mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Transactions */}
      <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-800">
          <h2 className="text-xl font-semibold text-white">Recent Transactions</h2>
        </div>
        <table className="w-full">
          <thead className="bg-gray-800/50">
            <tr>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Customer</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Plan</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Amount</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Status</th>
              <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-800">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-800/50 transition-colors">
                <td className="px-6 py-4">
                  <div>
                    <p className="text-white font-medium">{tx.user}</p>
                    <p className="text-gray-400 text-sm">{tx.email}</p>
                  </div>
                </td>
                <td className="px-6 py-4 text-gray-300">{tx.plan}</td>
                <td className="px-6 py-4 text-white font-medium">${tx.amount}</td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                    tx.status === 'succeeded' ? 'bg-green-500/20 text-green-400' :
                    tx.status === 'refunded' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {tx.status}
                  </span>
                </td>
                <td className="px-6 py-4 text-gray-400">{tx.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
