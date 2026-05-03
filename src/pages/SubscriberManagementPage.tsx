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
  RotateCcw,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Zap,
  Calendar,
  Layers,
  Copy,
  Download,
  ChevronDown,
  Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { listenToCollection, updateSubscriberStatus, markSubscriberMailed } from '../services/dbService';
import toast from 'react-hot-toast';
import CustomDropdown from '../components/CustomDropdown';

const SubscriberManagementPage: React.FC = () => {
  const [subscribers, setSubscribers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);

  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeTo, setComposeTo] = useState<string[]>([]);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLoading(true);
    const unsubscribe = listenToCollection('subscribers', (data) => {
      setSubscribers(data || []);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'unsubscribed' : 'active';
    
    // Optimistic update
    setSubscribers(prev => prev.map(s => s.id === id ? { ...s, status: newStatus } : s));
    
    const success = await updateSubscriberStatus(id, newStatus);
    if (success) {
      toast.success(`Subscriber ${newStatus === 'active' ? 'activated' : 'deactivated'}`);
    } else {
      toast.error('Failed to update status');
      // Realtime will restore
    }
  };

  const handlePushMail = async () => {
    if (composeTo.length === 0) return;
    
    const loadingToast = toast.loading(`Broadcasting to ${composeTo.length} nodes...`);
    
    try {
      // Simulate API call for mail sending
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Open mailto as a fallback/real action for the user
      const bcc = composeTo.join(',');
      const mailtoLink = `mailto:${composeTo[0]}?bcc=${bcc}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
      window.location.href = mailtoLink;

      // Update database status for each recipient
      await Promise.all(subscribers.filter(s => composeTo.includes(s.email)).map(s => markSubscriberMailed(s.id)));
      
      toast.success('Broadcast transmitted successfully!', { id: loadingToast });
      setIsComposeOpen(false);
      setSubject('');
      setMessage('');
      setSelectedUsers([]);
    } catch (err) {
      toast.error('Transmission failed.', { id: loadingToast });
    }
  };

  const openSingleCompose = (email: string) => {
    setComposeTo([email]);
    setIsComposeOpen(true);
  };

  const openBatchCompose = () => {
    const emails = subscribers.filter(s => selectedUsers.includes(s.id)).map(s => s.email);
    setComposeTo(emails);
    setIsComposeOpen(true);
  };

  const copyAllEmails = () => {
    const emails = filteredSubscribers.map(s => s.email).join(', ');
    navigator.clipboard.writeText(emails);
    toast.success('All filtered emails copied to clipboard');
  };

  const toggleSelect = (id: string) => {
    setSelectedUsers(prev => 
      prev.includes(id) ? prev.filter(uid => uid !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    if (selectedUsers.length === filteredSubscribers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredSubscribers.map(s => s.id));
    }
  };

  const filteredSubscribers = subscribers.filter(s => {
    const matchesSearch = (s.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filter === 'all' || s.status === filter;
    return matchesSearch && matchesFilter;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <div className="flex-1 overflow-y-auto mobile-container-padding bg-[#f8fafc] relative min-h-screen">
      {/* Background Mesh Gradient */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-200/40 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-200/30 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto w-full space-y-4 lg:space-y-5 relative z-10 lg:pt-2">
        {/* Compact Page Header */}
        <div className="bg-white/80 backdrop-blur-xl rounded-[1.5rem] lg:rounded-[2rem] p-4 lg:p-6 border border-white/50 shadow-xl shadow-blue-500/5 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-50 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/3 opacity-40" />

          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center relative z-10 gap-4 lg:gap-8">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-lg bg-blue-500/10 text-blue-700 text-[9px] font-black mb-2 border border-blue-200/50 uppercase tracking-widest">
                <Sparkles className="w-3 h-3" /> GROWTH PROTOCOL
              </div>
              <h2 className="text-xl lg:text-3xl font-black text-gray-900 tracking-tight flex items-center gap-2 lg:gap-3 uppercase leading-none">
                Waitlist Stream
                <Zap className="w-5 h-5 lg:w-7 lg:h-7 text-blue-500" />
              </h2>
              <p className="text-[11px] lg:text-xs text-gray-400 mt-1.5 max-w-md font-bold leading-tight">
                Real-time monitor for global waitlist nodes. Manage identities and push protocol updates.
              </p>
            </div>

            <div className="bg-gray-900 rounded-xl lg:rounded-2xl p-3 lg:p-4 shadow-2xl shadow-gray-400/20 border border-gray-700/50 w-full lg:w-auto text-white flex gap-4 lg:gap-6 items-center group transition-transform hover:scale-105 duration-500">
              <div className="relative shrink-0">
                <p className="text-[8px] lg:text-[9px] text-gray-400 font-black uppercase tracking-widest mb-1">Population</p>
                <div className="flex items-end gap-2 lg:gap-3">
                  <span className="text-2xl lg:text-3xl font-black tabular-nums leading-none">
                    {subscribers.length}
                  </span>
                  <div className="flex items-center gap-1 bg-blue-500/20 text-blue-400 px-1.5 py-0.5 rounded-md text-[8px] lg:text-[9px] font-black border border-blue-500/10 mb-0.5">
                    LIVE
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Compact High-Fidelity Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 lg:gap-4">
          {[
            { label: "Active Nodes", val: subscribers.filter(s => s.status === 'active').length, icon: ShieldCheck, color: "text-emerald-600", bg: "bg-emerald-50", span: "col-span-1" },
            { label: "Dormant Nodes", val: subscribers.filter(s => s.status === 'unsubscribed').length, icon: Ban, color: "text-rose-600", bg: "bg-rose-50", span: "col-span-1" },
            { label: "Updates Pushed", val: subscribers.filter(s => s.last_mailed_at).length, icon: Send, color: "text-blue-600", bg: "bg-blue-50", span: "col-span-2 sm:col-span-1" },
          ].map((stat, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className={`bg-white rounded-xl lg:rounded-[1.5rem] p-3 lg:p-5 border border-gray-100 shadow-xl shadow-blue-500/5 flex items-center justify-between group hover:border-blue-200 transition-all duration-300 ${stat.span}`}
            >
              <div>
                <p className="text-[8px] lg:text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-xl lg:text-2xl font-black text-gray-900 tabular-nums">{stat.val}</p>
              </div>
              <div className={`w-8 h-8 lg:w-12 lg:h-12 ${stat.bg} ${stat.color} rounded-lg lg:rounded-xl flex items-center justify-center border border-white group-hover:scale-110 transition-transform duration-500`}>
                <stat.icon className="w-4 h-4 lg:w-6 lg:h-6" />
              </div>
            </motion.div>
          ))}
        </div>

        {/* Compact Content Section */}
        <div className="bg-white/80 backdrop-blur-md rounded-[1.8rem] lg:rounded-[2.5rem] border border-white/80 shadow-2xl shadow-blue-500/5 overflow-hidden relative group p-4 lg:p-6">
          {/* Compact Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-center gap-3 mb-6">
            <div className="relative flex-1 w-full group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
              <input 
                type="text" 
                placeholder="Search nodes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-50 border border-gray-100 rounded-xl lg:rounded-2xl pl-11 pr-5 py-2.5 lg:py-3.5 text-[13px] font-bold text-gray-700 focus:bg-white focus:border-blue-500 outline-none transition-all"
              />
            </div>
            
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <CustomDropdown 
                options={[
                  { value: 'all', label: 'ALL NODES', icon: Users },
                  { value: 'active', label: 'ACTIVE', icon: ShieldCheck },
                  { value: 'unsubscribed', label: 'IDLE', icon: Ban }
                ]}
                value={filter}
                onChange={setFilter}
                className="flex-1 sm:flex-none min-w-[150px]"
                icon={Filter}
              />
              <button 
                onClick={copyAllEmails}
                className="p-3 lg:p-3.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl lg:rounded-2xl hover:bg-blue-100 transition-all active:scale-95 shadow-sm flex items-center justify-center shrink-0"
                title="Copy all filtered emails"
              >
                <Copy className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
              <button className="p-3 lg:p-3.5 bg-blue-600 text-white rounded-xl lg:rounded-2xl hover:bg-blue-700 transition-all active:scale-95 shadow-lg shadow-blue-200/50 flex items-center justify-center shrink-0">
                <Download className="w-4 h-4 lg:w-5 lg:h-5" />
              </button>
            </div>
          </div>

          {/* Compact Table Header - Desktop */}
          <div className="hidden lg:grid grid-cols-[60px_1fr_160px_160px_130px] gap-4 px-6 py-2 text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">
            <div className="text-center">Select</div>
            <div>Node Identity</div>
            <div>Status</div>
            <div>Registered</div>
            <div className="text-right">Manage</div>
          </div>

          <div className="space-y-2 lg:space-y-2.5">
            {loading ? (
              <div className="py-20 flex flex-col items-center">
                <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
                <p className="mt-3 text-[9px] font-black text-gray-400 uppercase tracking-widest animate-pulse">Syncing Stream...</p>
              </div>
            ) : filteredSubscribers.length === 0 ? (
              <div className="py-20 text-center">
                <Mail className="w-12 h-12 text-gray-100 mx-auto mb-4" />
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Empty Stream</h3>
                <p className="text-[10px] text-gray-400 font-bold mt-1">No nodes matching current filter.</p>
              </div>
            ) : (
              <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-2">
                {filteredSubscribers.map((entry) => {
                  const isSelected = selectedUsers.includes(entry.id);
                  return (
                    <motion.div
                      key={entry.id}
                      variants={itemVariants}
                      className={`group/row relative bg-white rounded-xl lg:rounded-2xl p-2.5 lg:p-3.5 border transition-all duration-300 hover:scale-[1.005] hover:shadow-lg hover:shadow-blue-500/5 ${
                        isSelected ? 'border-blue-500 bg-blue-50/20 z-10 ring-2 ring-blue-500/5' : 'border-gray-100 hover:border-blue-200'
                      }`}
                    >
                      <div className="flex flex-col lg:grid lg:grid-cols-[60px_1fr_160px_160px_130px] lg:items-center gap-2.5 lg:gap-4">
                        {/* Select */}
                        <div className="hidden lg:flex items-center justify-center">
                          <button 
                            onClick={() => toggleSelect(entry.id)}
                            className={`w-5 h-5 rounded-md border-2 transition-all flex items-center justify-center ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white border-gray-200 opacity-0 group-hover/row:opacity-100'}`}
                          >
                            {isSelected && <CheckCircle2 className="w-3 text-white" />}
                          </button>
                        </div>

                        {/* Node Identity */}
                        <div className="flex items-center gap-3 lg:gap-3.5">
                          <div className="w-9 h-9 lg:w-10 lg:h-10 bg-gray-900 text-white flex items-center justify-center font-black text-base rounded-xl shadow-md group-hover/row:scale-105 transition-transform duration-500 shrink-0">
                            {entry.email.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h4 className={`font-black text-[13px] lg:text-sm tracking-tight truncate ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                              {entry.email.split('@')[0]}
                            </h4>
                            <p className="text-[9px] lg:text-[10px] font-bold text-gray-400 uppercase tracking-widest truncate">{entry.email}</p>
                          </div>
                        </div>

                        {/* Status */}
                        <div className="flex items-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-[9px] font-black tracking-widest border transition-all ${
                            entry.status === 'active' 
                              ? 'bg-emerald-50 text-emerald-600 border-emerald-100' 
                              : 'bg-rose-50 text-rose-600 border-rose-100'
                          }`}>
                            <div className={`w-1 h-1 rounded-full ${entry.status === 'active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                            {entry.status === 'active' ? 'ACTIVE' : 'IDLE'}
                          </span>
                        </div>

                        {/* Registered */}
                        <div className="flex flex-col">
                          <span className={`font-black text-xs lg:text-[13px] tabular-nums tracking-tighter ${isSelected ? 'text-blue-700' : 'text-gray-900'}`}>
                            {new Date(entry.created_at).toLocaleDateString('en-US', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </span>
                          <span className="text-[8px] lg:text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">Joined Node</span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center lg:justify-end gap-1.5 lg:gap-2">
                          <button 
                            onClick={() => openSingleCompose(entry.email)}
                            className="p-2 lg:p-2.5 bg-gray-50 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg lg:rounded-xl transition-all border border-gray-100"
                            title="Compose Message"
                          >
                            <Mail className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleToggleStatus(entry.id, entry.status)}
                            className={`p-2 lg:p-2.5 bg-gray-50 rounded-lg lg:rounded-xl transition-all border border-gray-100 ${
                              entry.status === 'active' ? 'text-gray-400 hover:text-rose-500 hover:bg-rose-50' : 'text-gray-400 hover:text-emerald-500 hover:bg-emerald-50'
                            }`}
                            title={entry.status === 'active' ? 'Revoke Access' : 'Restore Access'}
                          >
                            {entry.status === 'active' ? <Ban className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Batch Actions Overlay */}
      <AnimatePresence>
        {selectedUsers.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-6 lg:bottom-8 left-1/2 -translate-x-1/2 z-[100] w-[92%] max-w-lg"
          >
            <div className="bg-gray-900 text-white rounded-2xl lg:rounded-[2rem] p-3 lg:p-4 shadow-2xl flex items-center justify-between gap-4 lg:gap-6 ring-4 ring-white/10 border border-gray-700/50 backdrop-blur-xl">
              <div className="flex items-center gap-3 lg:gap-4 pl-3">
                <div className="w-9 h-9 lg:w-11 lg:h-11 bg-blue-600 rounded-xl flex items-center justify-center font-black text-base lg:text-lg shadow-lg shadow-blue-500/40">
                  {selectedUsers.length}
                </div>
                <div>
                  <p className="font-black text-[11px] lg:text-xs uppercase tracking-widest">Nodes Selected</p>
                  <p className="text-[8px] lg:text-[9px] text-gray-400 font-bold uppercase tracking-widest">Global Batch Actions</p>
                </div>
              </div>
              <div className="flex items-center gap-2 pr-1">
                <button 
                  onClick={() => setSelectedUsers([])}
                  className="px-4 py-3 text-[10px] lg:text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={openBatchCompose}
                  className="bg-blue-600 px-5 lg:px-6 py-3 rounded-xl lg:rounded-2xl font-black text-[10px] lg:text-[11px] uppercase tracking-widest hover:bg-blue-500 transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <Send className="w-3.5 h-3.5" />
                  Broadcast
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Compose Message Modal */}
      <AnimatePresence>
        {isComposeOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsComposeOpen(false)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl border border-white overflow-hidden"
            >
              <div className="p-6 lg:p-8">
                <div className="flex items-center justify-between mb-8">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 tracking-tight uppercase">Compose Update</h3>
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mt-1">Transmission Protocol</p>
                  </div>
                  <button 
                    onClick={() => setIsComposeOpen(false)}
                    className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center hover:bg-gray-100 transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-400" />
                  </button>
                </div>

                <div className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Recipients</label>
                    <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 max-h-[100px] overflow-y-auto flex flex-wrap gap-2">
                      {composeTo.map(email => (
                        <span key={email} className="px-3 py-1 bg-white border border-gray-200 rounded-lg text-[10px] font-bold text-gray-600 shadow-sm">
                          {email}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Subject</label>
                    <input 
                      type="text" 
                      value={subject}
                      onChange={(e) => setSubject(e.target.value)}
                      placeholder="Protocol Update: Action Required"
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-sm font-bold text-gray-700 focus:bg-white focus:border-blue-500 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Message Content</label>
                    <textarea 
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      rows={6}
                      placeholder="Identify deployment status or welcome the new node to the stream..."
                      className="w-full bg-gray-50 border border-gray-100 rounded-xl px-5 py-4 text-sm font-bold text-gray-700 focus:bg-white focus:border-blue-500 outline-none transition-all resize-none"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 mt-10">
                  <button 
                    onClick={() => setIsComposeOpen(false)}
                    className="px-6 py-4 text-[11px] font-black uppercase tracking-widest text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    Discard
                  </button>
                  <button 
                    onClick={handlePushMail}
                    className="bg-gray-900 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-black transition-all shadow-xl shadow-gray-200 flex items-center gap-2 group"
                  >
                    <Send className="w-4 h-4 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    Transmit Signal
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SubscriberManagementPage;
