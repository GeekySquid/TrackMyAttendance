import React, { useEffect, useState } from 'react';
import { 
  Users, 
  Mail, 
  Trash2, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  Search,
  Filter,
  ArrowUpDown,
  MoreVertical,
  ExternalLink,
  Ban,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { getSubscribers, updateSubscriberStatus, markSubscriberMailed } from '../services/dbService';
import toast from 'react-hot-toast';

const SubscriberManagementPage: React.FC = () => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    loadSubscribers();
  }, []);

  const loadSubscribers = async () => {
    setLoading(true);
    const data = await getSubscribers();
    setSubscribers(data);
    setLoading(false);
  };

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'unsubscribed' : 'active';
    const success = await updateSubscriberStatus(id, newStatus);
    if (success) {
      toast.success(`Subscriber ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
      loadSubscribers();
    } else {
      toast.error('Failed to update status');
    }
  };

  const handlePushMail = async (id: string, email: string) => {
    // In a real app, this would trigger an Edge Function or SendGrid
    toast.promise(
      new Promise((resolve) => setTimeout(resolve, 1500)),
      {
        loading: `Sending update to ${email}...`,
        success: 'Update pushed successfully!',
        error: 'Failed to send mail.',
      }
    );
    await markSubscriberMailed(id);
    loadSubscribers();
  };

  const filteredSubscribers = subscribers.filter(s => {
    const matchesSearch = s.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || s.status === filter;
    return matchesSearch && matchesFilter;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0 }
  };

  return (
    <div className="mobile-container-padding max-w-7xl mx-auto min-h-screen">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight mb-2">Subscriber Management</h1>
          <p className="text-slate-500 font-medium">Monitor and manage users waiting for application updates.</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-blue-50 border border-blue-100 rounded-2xl flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-sm font-black text-blue-700">{subscribers.length} Total Users</span>
          </div>
          <button 
            onClick={loadSubscribers}
            className="p-3 bg-white border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all text-slate-600 active:scale-95"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
        {[
          { label: "Active", val: subscribers.filter(s => s.status === 'active').length, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Unsubscribed", val: subscribers.filter(s => s.status === 'unsubscribed').length, icon: Ban, color: "text-rose-600", bg: "bg-rose-50" },
          { label: "Updates Pushed", val: subscribers.filter(s => s.last_mailed_at).length, icon: Send, color: "text-blue-600", bg: "bg-blue-50" },
        ].map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-8 bg-white border border-slate-200 rounded-[2.5rem] shadow-sm flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
              <p className="text-4xl font-black text-slate-900">{stat.val}</p>
            </div>
            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
              <stat.icon className="w-7 h-7" />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Controls */}
      <div className="bg-white border border-slate-200 rounded-[2.5rem] p-4 mb-8 flex flex-col md:flex-row gap-4 items-center shadow-sm">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-50 border-none rounded-2xl pl-14 pr-6 py-4 font-bold text-slate-700 focus:ring-2 focus:ring-blue-500/20 transition-all"
          />
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <select 
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 md:w-48 bg-slate-50 border-none rounded-2xl px-6 py-4 font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="unsubscribed">Unsubscribed</option>
          </select>
          <button className="p-4 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all active:scale-95">
            <Mail className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-[3rem] overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left table-responsive">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Subscriber</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Joined</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Last Mailed</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">Actions</th>
              </tr>
            </thead>
            <motion.tbody 
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                      <p className="text-slate-400 font-bold">Synchronizing subscriber data...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSubscribers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center opacity-30">
                      <Mail className="w-16 h-16 mb-4 text-slate-400" />
                      <p className="text-xl font-black text-slate-400">No subscribers found</p>
                    </div>
                  </td>
                </tr>
              ) : filteredSubscribers.map((subscriber) => (
                <motion.tr 
                  key={subscriber.id}
                  variants={itemVariants}
                  className="group hover:bg-slate-50/50 transition-colors border-b border-slate-50 last:border-none"
                >
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
                        {subscriber.email.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{subscriber.email}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase">Premium Waitlist</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                      subscriber.status === 'active' 
                        ? 'bg-emerald-100 text-emerald-700' 
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {subscriber.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-500">
                    {new Date(subscriber.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-8 py-6 text-sm font-bold text-slate-500">
                    {subscriber.last_mailed_at 
                      ? new Date(subscriber.last_mailed_at).toLocaleDateString()
                      : <span className="opacity-30">Never</span>
                    }
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all">
                      <button 
                        onClick={() => handlePushMail(subscriber.id, subscriber.email)}
                        className="p-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                        title="Push Update Mail"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleToggleStatus(subscriber.id, subscriber.status)}
                        className={`p-3 rounded-xl transition-all shadow-sm ${
                          subscriber.status === 'active' 
                            ? 'bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white' 
                            : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-600 hover:text-white'
                        }`}
                        title={subscriber.status === 'active' ? 'Disable' : 'Enable'}
                      >
                        {subscriber.status === 'active' ? <Ban className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </motion.tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default SubscriberManagementPage;
