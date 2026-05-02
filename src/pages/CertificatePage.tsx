import React from 'react';
import { Award, Download, Share2, Star, Trophy, Sparkles, Calendar, UserCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export default function CertificatePage({ user }: { user: any }) {
  const handleDownload = () => {
    // In a real app, this would generate a PDF or trigger a download
    window.print();
  };

  const today = new Date();
  const monthName = today.toLocaleString('default', { month: 'long' });
  const year = today.getFullYear();

  return (
    <div className="flex-1 overflow-y-auto mobile-container-padding bg-[#fdfdfd]">
      <div className="max-w-5xl mx-auto w-full py-8 sm:py-12">
        
        {/* Header Section */}
        <div className="mb-12 text-center sm:text-left flex flex-col sm:flex-row sm:items-end justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-[10px] font-black mb-4 border border-orange-200">
              <Trophy className="w-3.5 h-3.5" /> RECOGNITION OF EXCELLENCE
            </div>
            <h1 className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight leading-none">
              Academic <span className="text-orange-600 underline decoration-orange-200 underline-offset-8">Achievements</span>
            </h1>
            <p className="text-sm font-bold text-slate-400 mt-6 max-w-xl leading-relaxed">
              Congratulations, {user?.name}! Your dedication and consistent attendance have earned you the prestigious title of Student of the Month.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button 
              onClick={handleDownload}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-2xl text-xs font-black hover:bg-slate-800 transition-all shadow-xl shadow-slate-200 group"
            >
              <Download className="w-4 h-4 group-hover:-translate-y-1 transition-transform" />
              DOWNLOAD PDF
            </button>
            <button className="p-3 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all shadow-sm">
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Display Area */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative group"
        >
          {/* Certificate Background Glow */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-orange-500/10 via-amber-500/5 to-transparent rounded-[3rem] blur-3xl opacity-50 group-hover:opacity-100 transition-opacity" />
          
          {/* Actual Certificate Container */}
          <div className="relative bg-white border-[16px] border-slate-900 rounded-[2rem] shadow-2xl overflow-hidden aspect-[1.414/1] w-full max-w-4xl mx-auto p-8 sm:p-16 flex flex-col items-center justify-between text-center">
            
            {/* Corner Decorative Elements */}
            <div className="absolute top-0 left-0 w-32 h-32 border-l-4 border-t-4 border-orange-500 m-8 opacity-20" />
            <div className="absolute top-0 right-0 w-32 h-32 border-r-4 border-t-4 border-orange-500 m-8 opacity-20" />
            <div className="absolute bottom-0 left-0 w-32 h-32 border-l-4 border-b-4 border-orange-500 m-8 opacity-20" />
            <div className="absolute bottom-0 right-0 w-32 h-32 border-r-4 border-b-4 border-orange-500 m-8 opacity-20" />

            {/* Content */}
            <div className="w-full flex flex-col items-center">
              <div className="mb-8">
                <div className="w-20 h-20 bg-orange-500 rounded-full flex items-center justify-center text-white mb-4 mx-auto shadow-lg shadow-orange-200">
                  <Award className="w-10 h-10" />
                </div>
                <h2 className="text-xl font-black text-slate-900 uppercase tracking-[0.3em]">Certificate of Excellence</h2>
              </div>

              <div className="space-y-4 w-full">
                <p className="text-sm italic text-slate-500 font-medium">This is to certify that</p>
                <div className="relative inline-block px-12">
                  <h3 className="text-4xl sm:text-6xl font-serif italic text-slate-900 leading-tight">
                    {user?.name || 'Academic Scholar'}
                  </h3>
                  <div className="absolute -bottom-2 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-orange-400 to-transparent opacity-50" />
                </div>
                <p className="text-sm text-slate-600 font-bold max-w-lg mx-auto leading-loose">
                  has been awarded the prestigious title of <span className="text-orange-600 font-black">Student of the Month</span> for their exceptional commitment, 
                  outstanding attendance of <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-md">{user?.attendance || '95%'}</span>, 
                  and significant academic contribution during
                </p>
                <h4 className="text-xl font-black text-slate-800 uppercase tracking-widest">{monthName} {year}</h4>
              </div>
            </div>

            {/* Footer with Signatures/Logos */}
            <div className="w-full flex flex-col sm:flex-row justify-between items-end gap-8 pt-12 border-t border-slate-100">
              <div className="text-left">
                <div className="w-32 h-1 bg-slate-200 mb-2" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Date of Issue</p>
                <p className="text-xs font-bold text-slate-800">{new Date().toLocaleDateString()}</p>
              </div>

              <div className="flex flex-col items-center">
                <div className="w-24 h-24 relative mb-4">
                  <div className="absolute inset-0 bg-orange-500/10 rounded-full animate-spin-slow" />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-16 h-16 bg-white rounded-full border-4 border-orange-500 flex items-center justify-center shadow-lg">
                      <Sparkles className="w-8 h-8 text-orange-500" />
                    </div>
                  </div>
                </div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Official Seal</p>
              </div>

              <div className="text-right">
                <div className="w-32 h-1 bg-slate-200 mb-2 ml-auto" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Institution Head</p>
                <p className="text-xs font-serif italic font-bold text-slate-800">TrackMYAttendance Academy</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Perks Section */}
        <div className="mt-16 grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl shrink-0">
              <Star className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">Elite Status</h5>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">Special badge displayed on your public profile and leaderboard rankings.</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-2xl shrink-0">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">Bonus Quota</h5>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">Earn an extra 2 days of casual leave balance for your exceptional performance.</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-start gap-4">
            <div className="p-3 bg-purple-50 text-purple-600 rounded-2xl shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h5 className="text-sm font-black text-slate-900 uppercase tracking-tight">Priority Access</h5>
              <p className="text-xs text-slate-500 mt-1 font-medium leading-relaxed">Early bird access to new workshops and premium educational materials.</p>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spin-slow 8s linear infinite;
        }
        @media print {
          .mobile-container-padding { padding: 0 !important; }
          button, .mb-12, .mt-16 { display: none !important; }
          .max-w-5xl { max-width: 100% !important; margin: 0 !important; }
          .border-[16px] { border-width: 8px !important; }
        }
      `}</style>
    </div>
  );
}
