'use client';

import { useState, useEffect } from 'react';
import { MessageSquare, Mail, Clock, CheckCircle, AlertCircle, XCircle, Send } from 'lucide-react';

interface Ticket {
  id: string;
  user: string;
  email: string;
  subject: string;
  message: string;
  status: 'open' | 'pending' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
  updatedAt: string;
}

interface Feedback {
  id: string;
  user: string;
  type: 'bug' | 'feature' | 'feedback';
  message: string;
  rating: number;
  createdAt: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://productifypro.insighter.digital';

export default function SupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [activeTab, setActiveTab] = useState('tickets');
  const [selectedTicket, setSelectedTicket] = useState<Ticket | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchSupport = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`${API_URL}/api/admin/dashboard/support`, {
          headers: { 'Authorization': `Bearer ${localStorage.getItem('admin_token')}` },
        });
        if (response.ok) {
          const data = await response.json();
          setTickets(data.tickets);
          setFeedback(data.feedback);
        }
      } catch (error) {
        // Mock data
        setTickets([
          { id: '1', user: 'John Doe', email: 'john@example.com', subject: 'App crashes on startup', message: 'The app crashes whenever I try to open it on my Mac M1.', status: 'open', priority: 'high', createdAt: '2 hours ago', updatedAt: '2 hours ago' },
          { id: '2', user: 'Jane Smith', email: 'jane@example.com', subject: 'Cannot sync data', message: 'My activity data is not syncing properly between devices.', status: 'pending', priority: 'medium', createdAt: '1 day ago', updatedAt: '5 hours ago' },
          { id: '3', user: 'Bob Wilson', email: 'bob@example.com', subject: 'Billing question', message: 'I was charged twice this month. Please help.', status: 'resolved', priority: 'high', createdAt: '3 days ago', updatedAt: '1 day ago' },
        ]);
        setFeedback([
          { id: '1', user: 'Alice', type: 'feature', message: 'Would love to see Pomodoro timer integration!', rating: 5, createdAt: '1 day ago' },
          { id: '2', user: 'Charlie', type: 'bug', message: 'Screenshots are sometimes blurry', rating: 3, createdAt: '2 days ago' },
          { id: '3', user: 'Diana', type: 'feedback', message: 'Great app! Helped me improve my productivity a lot.', rating: 5, createdAt: '3 days ago' },
        ]);
      }
      setIsLoading(false);
    };
    fetchSupport();
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'pending': return <Clock className="w-4 h-4 text-blue-400" />;
      case 'resolved': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'closed': return <XCircle className="w-4 h-4 text-gray-400" />;
      default: return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-yellow-500/20 text-yellow-400';
      case 'pending': return 'bg-blue-500/20 text-blue-400';
      case 'resolved': return 'bg-green-500/20 text-green-400';
      case 'closed': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-500/20 text-red-400';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400';
      case 'low': return 'bg-gray-500/20 text-gray-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const openTickets = tickets.filter(t => t.status === 'open' || t.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white">Support</h1>
        <p className="text-gray-400 mt-1">Manage support tickets and user feedback</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-gray-400 text-sm">Open Tickets</p>
          <p className="text-2xl font-bold text-white">{openTickets}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-gray-400 text-sm">Total Tickets</p>
          <p className="text-2xl font-bold text-white">{tickets.length}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-gray-400 text-sm">Feedback Items</p>
          <p className="text-2xl font-bold text-white">{feedback.length}</p>
        </div>
        <div className="bg-gray-900 rounded-xl border border-gray-800 p-4">
          <p className="text-gray-400 text-sm">Avg Rating</p>
          <p className="text-2xl font-bold text-white">{(feedback.reduce((a, b) => a + b.rating, 0) / feedback.length || 0).toFixed(1)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('tickets')}
          className={`px-4 py-2 rounded-xl transition-colors ${activeTab === 'tickets' ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
        >
          Support Tickets
        </button>
        <button
          onClick={() => setActiveTab('feedback')}
          className={`px-4 py-2 rounded-xl transition-colors ${activeTab === 'feedback' ? 'bg-indigo-500 text-white' : 'bg-gray-900 text-gray-400 hover:bg-gray-800'}`}
        >
          User Feedback
        </button>
      </div>

      {/* Content */}
      {activeTab === 'tickets' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-800">
              <h2 className="text-lg font-semibold text-white">Tickets</h2>
            </div>
            <div className="divide-y divide-gray-800">
              {tickets.map((ticket) => (
                <div
                  key={ticket.id}
                  onClick={() => setSelectedTicket(ticket)}
                  className={`p-4 cursor-pointer transition-colors ${selectedTicket?.id === ticket.id ? 'bg-gray-800' : 'hover:bg-gray-800/50'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-white font-medium">{ticket.subject}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs ${getPriorityColor(ticket.priority)}`}>
                      {ticket.priority}
                    </span>
                  </div>
                  <p className="text-gray-400 text-sm mb-2">{ticket.user} - {ticket.email}</p>
                  <div className="flex items-center gap-3">
                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs ${getStatusColor(ticket.status)}`}>
                      {getStatusIcon(ticket.status)}
                      {ticket.status}
                    </span>
                    <span className="text-gray-500 text-xs">{ticket.createdAt}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-gray-900 rounded-2xl border border-gray-800 p-6">
            {selectedTicket ? (
              <div className="space-y-4">
                <div>
                  <h2 className="text-xl font-semibold text-white">{selectedTicket.subject}</h2>
                  <p className="text-gray-400 text-sm mt-1">From: {selectedTicket.user} ({selectedTicket.email})</p>
                </div>
                <div className="p-4 bg-gray-800/50 rounded-xl">
                  <p className="text-gray-300">{selectedTicket.message}</p>
                </div>
                <div className="pt-4 border-t border-gray-800">
                  <label className="block text-sm font-medium text-gray-300 mb-2">Reply</label>
                  <textarea
                    value={replyMessage}
                    onChange={(e) => setReplyMessage(e.target.value)}
                    rows={4}
                    className="w-full p-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Type your response..."
                  />
                  <div className="flex gap-2 mt-3">
                    <button className="flex items-center gap-2 px-4 py-2 bg-indigo-500 text-white rounded-xl hover:bg-indigo-600">
                      <Send size={16} />
                      Send Reply
                    </button>
                    <button className="px-4 py-2 bg-green-500/20 text-green-400 rounded-xl hover:bg-green-500/30">
                      Mark Resolved
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 text-gray-500">
                Select a ticket to view details
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-2xl border border-gray-800 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-800/50">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">User</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Type</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Message</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Rating</th>
                <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {feedback.map((item) => (
                <tr key={item.id} className="hover:bg-gray-800/50">
                  <td className="px-6 py-4 text-white">{item.user}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs ${
                      item.type === 'bug' ? 'bg-red-500/20 text-red-400' :
                      item.type === 'feature' ? 'bg-blue-500/20 text-blue-400' :
                      'bg-green-500/20 text-green-400'
                    }`}>
                      {item.type}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-300 max-w-md truncate">{item.message}</td>
                  <td className="px-6 py-4">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= item.rating ? 'text-yellow-400' : 'text-gray-600'}>★</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{item.createdAt}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
