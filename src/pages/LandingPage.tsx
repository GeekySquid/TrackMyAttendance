import React, { useState } from 'react';
import { 
  ArrowRight, 
  Shield, 
  MapPin, 
  BarChart3, 
  Zap, 
  CheckCircle2, 
  Smartphone,
  Globe,
  Menu,
  X,
  Play,
  Award,
  Sparkles,
  Command,
  Lock,
  MousePointer2,
  Bell,
  Fingerprint,
  Loader2
} from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { subscribeEmail } from '../services/dbService';
import toast from 'react-hot-toast';

interface LandingPageProps {
  onGetStarted?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);

  const { scrollYProgress } = useScroll();
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);

  const handleGetStarted = () => {
    if (isSignedIn) {
      navigate('/');
    } else if (onGetStarted) {
      onGetStarted();
    } else {
      navigate('/login');
    }
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setIsSubscribing(true);
    const result = await subscribeEmail(email);
    if (result.success) {
      toast.success(result.message);
      setEmail('');
    } else {
      toast.error(result.message);
    }
    setIsSubscribing(false);
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  };

  const staggerContainer = {
    initial: {},
    whileInView: {
      transition: {
        staggerChildren: 0.1
      }
    },
    viewport: { once: true }
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 font-sans selection:bg-blue-500/30 selection:text-white overflow-x-hidden">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[70%] h-[70%] bg-blue-600/5 rounded-full blur-[150px] animate-pulse" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[70%] h-[70%] bg-indigo-600/5 rounded-full blur-[150px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full opacity-[0.03] mix-blend-overlay pointer-events-none" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-6 h-24 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-4 group"
          >
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/20 group-hover:scale-110 transition-transform duration-500">
              <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-xl font-black tracking-tight text-white leading-none">Track<span className="text-blue-500">MY</span>Attendance</span>
              <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500 mt-1">Next-Gen Verification</span>
            </div>
          </motion.div>

          {/* Desktop Nav */}
          <div className="hidden lg:flex items-center gap-10">
            <a href="#features" className="text-sm font-black text-slate-400 hover:text-white transition-colors uppercase tracking-widest">Features</a>
            <a href="#benefits" className="text-sm font-black text-slate-400 hover:text-white transition-colors uppercase tracking-widest">Tech Stack</a>
            <div className="h-8 w-px bg-white/10 mx-2" />
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGetStarted}
              className="text-sm font-black text-slate-300 hover:text-white transition-colors uppercase tracking-widest"
            >
              Sign In
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGetStarted}
              className="px-8 py-4 bg-white text-black text-xs font-black uppercase tracking-[0.2em] rounded-full hover:shadow-[0_0_40px_rgba(255,255,255,0.3)] transition-all"
            >
              Get Started
            </motion.button>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="lg:hidden w-12 h-12 flex items-center justify-center bg-white/5 rounded-2xl text-slate-400"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="lg:hidden absolute top-full left-0 right-0 bg-black/95 backdrop-blur-3xl border-b border-white/5 overflow-hidden shadow-2xl"
            >
              <div className="px-8 py-12 flex flex-col gap-8">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-black text-white uppercase tracking-tighter">Features</a>
                <a href="#benefits" onClick={() => setMobileMenuOpen(false)} className="text-2xl font-black text-white uppercase tracking-tighter">Tech Stack</a>
                <div className="h-px bg-white/5 w-full" />
                <button onClick={handleGetStarted} className="text-left text-xl font-black text-slate-400 uppercase tracking-widest">Login</button>
                <button 
                  onClick={handleGetStarted}
                  className="w-full py-6 bg-white text-black font-black uppercase tracking-[0.3em] rounded-3xl"
                >
                  Launch App
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 lg:pt-64 lg:pb-56 px-6">
        <motion.div 
          style={{ opacity, scale }}
          className="max-w-7xl mx-auto text-center"
        >
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-3 px-6 py-2.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-[10px] font-black uppercase tracking-[0.4em] mb-12"
          >
            <Sparkles className="w-4 h-4 fill-blue-400" />
            Empowering Modern Institutions
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-6xl md:text-[10rem] font-black tracking-[-0.05em] text-white mb-12 leading-[0.85]"
          >
            VERIFY <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-blue-500 to-indigo-600">PRESENCE.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.2 }}
            className="text-lg md:text-2xl text-slate-500 max-w-3xl mx-auto mb-16 font-medium leading-relaxed"
          >
            TrackMyAttendance combines high-precision geofencing with biometric 
            validation to create the world's most reliable attendance ecosystem.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-6"
          >
            <motion.button 
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGetStarted}
              className="group px-12 py-7 bg-blue-600 text-white text-lg font-black rounded-[2.5rem] shadow-[0_20px_50px_rgba(37,99,235,0.3)] flex items-center gap-4"
            >
              Start Implementation
              <ArrowRight className="w-6 h-6 group-hover:translate-x-2 transition-transform duration-500" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGetStarted}
              className="px-12 py-7 bg-white/5 border border-white/10 text-white text-lg font-black rounded-[2.5rem] backdrop-blur-xl hover:bg-white/10 transition-all flex items-center gap-4"
            >
              <Play className="w-5 h-5 fill-white" />
              Watch Demo
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Abstract Hero Image Placeholder/Graphic */}
        <motion.div 
          initial={{ opacity: 0, y: 100 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
          className="mt-32 max-w-6xl mx-auto relative group"
        >
          <div className="absolute inset-0 bg-blue-600/20 rounded-[4rem] blur-[80px] group-hover:bg-blue-600/30 transition-all duration-1000 -z-10" />
          <div className="bg-gradient-to-br from-slate-900 to-black rounded-[3.5rem] border border-white/10 p-4 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-50" />
            <img 
              src="/hero-mockup.png" 
              alt="Dashboard Preview" 
              className="w-full rounded-[2.5rem] object-cover grayscale-[0.2] group-hover:grayscale-0 transition-all duration-1000"
            />
          </div>
          
          {/* Floating Stats Card */}
          <motion.div 
            animate={{ y: [0, -20, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-12 -right-6 md:-right-12 p-8 bg-black/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl hidden md:block"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-emerald-500/20 rounded-2xl flex items-center justify-center">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Global Integrity</p>
                <p className="text-xl font-black text-white tracking-tight">100% Reliable</p>
              </div>
            </div>
            <div className="flex -space-x-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-slate-800 ring-1 ring-white/10 overflow-hidden">
                  <img src={`https://i.pravatar.cc/100?u=${i+20}`} alt="User" />
                </div>
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-black bg-blue-600 flex items-center justify-center text-[10px] font-black text-white ring-1 ring-white/10">
                +12k
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Marquee / Social Proof */}
      <div className="py-20 border-y border-white/5 overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee">
          {[1,2,3,4,5,6,7,8].map(i => (
            <div key={i} className="flex items-center gap-12 mx-12">
              <span className="text-4xl font-black text-slate-800 tracking-tighter opacity-50">STREAK TRACKING</span>
              <div className="w-3 h-3 bg-blue-600 rounded-full" />
              <span className="text-4xl font-black text-slate-800 tracking-tighter opacity-50">GEOFENCE AUTH</span>
              <div className="w-3 h-3 bg-indigo-600 rounded-full" />
              <span className="text-4xl font-black text-slate-800 tracking-tighter opacity-50">ZERO FRAUD</span>
              <div className="w-3 h-3 bg-slate-800 rounded-full" />
            </div>
          ))}
        </div>
      </div>

      {/* Features Grid */}
      <section id="features" className="py-48 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-32"
          >
            <h2 className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-10">THE CORE ENGINE.</h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto font-medium">Built with cutting-edge technology to handle the demands of massive-scale education systems.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: MapPin,
                title: "Precision Geofencing",
                desc: "Sub-meter accuracy for campus boundaries. Check-ins are only enabled when inside the designated safety zone.",
                color: "blue"
              },
              {
                icon: Fingerprint,
                title: "Identity Verification",
                desc: "Integrated biometric and multi-factor validation prevents attendance fraud and proxy check-ins.",
                color: "indigo"
              },
              {
                icon: BarChart3,
                title: "Real-time Insight",
                desc: "Live analytics dashboards for faculty to monitor engagement and identify at-risk students instantly.",
                color: "purple"
              },
              {
                icon: Smartphone,
                title: "Progressive PWA",
                desc: "Zero-install application that works flawlessly even with poor connectivity, syncing data when online.",
                color: "emerald"
              },
              {
                icon: Lock,
                title: "Encrypted Data",
                desc: "All attendance records are timestamped and cryptographically secured for permanent compliance.",
                color: "rose"
              },
              {
                icon: Bell,
                title: "Smart Triggers",
                desc: "Automated notifications for upcoming sessions, late arrivals, and streak achievements.",
                color: "amber"
              }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                variants={fadeInUp}
                whileHover={{ y: -10 }}
                className="group p-10 rounded-[3rem] bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 p-10 opacity-[0.03] group-hover:opacity-[0.1] group-hover:scale-125 transition-all duration-700">
                  <feature.icon className="w-32 h-32 text-white" />
                </div>
                <div className={`w-16 h-16 rounded-2xl bg-${feature.color}-500/20 flex items-center justify-center mb-8 border border-${feature.color}-500/30`}>
                  <feature.icon className={`w-8 h-8 text-${feature.color}-400`} />
                </div>
                <h3 className="text-2xl font-black mb-4 text-white tracking-tight">{feature.title}</h3>
                <p className="text-slate-500 font-bold leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Awards Section - Like Top Websites */}
      <section className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-center gap-16 p-16 md:p-24 bg-gradient-to-br from-blue-900/20 to-indigo-900/20 border border-white/5 rounded-[4rem] relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(circle_at_50%_0%,rgba(37,99,235,0.1),transparent)]" />
            
            <div className="lg:w-1/2 relative z-10">
              <Award className="w-16 h-16 text-blue-500 mb-8" />
              <h2 className="text-4xl md:text-6xl font-black text-white tracking-tighter mb-8 leading-none">VOTED #1 <br /> FOR EDTECH INNOVATION.</h2>
              <p className="text-xl text-slate-400 font-bold leading-relaxed">
                Recognized for excellence in design, security, and administrative utility. 
                Our platform is used by 50+ tier-1 institutions to revolutionize attendance management.
              </p>
            </div>

            <div className="lg:w-1/2 grid grid-cols-2 gap-8 relative z-10">
              {[
                { label: "Check-in Speed", val: "0.8s" },
                { label: "Data Uptime", val: "99.9%" },
                { label: "Fraud Prevented", val: "100k+" },
                { label: "User Love", val: "4.9/5" }
              ].map((stat, i) => (
                <div key={i} className="text-center p-8 bg-black/40 rounded-[2.5rem] border border-white/5">
                  <p className="text-4xl font-black text-white mb-2">{stat.val}</p>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-32 px-8 border-t border-white/5 bg-[#030303] relative z-10 overflow-hidden">
        {/* Subtle radial glow */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[80%] h-64 bg-blue-600/5 rounded-full blur-[120px] -z-10" />

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 mb-32">
            <div className="lg:col-span-5">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center">
                  <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                </div>
                <span className="text-2xl font-black tracking-tight text-white">Track<span className="text-blue-500">MY</span>Attendance</span>
              </div>
              <p className="text-xl text-slate-500 font-bold leading-relaxed max-w-sm mb-12">
                Providing modern institutions with bulletproof attendance verification since 2024.
              </p>
              
              <div className="space-y-6">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em]">Stay Updated</p>
                <form onSubmit={handleSubscribe} className="relative max-w-md group">
                  <input 
                    type="email" 
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email for updates" 
                    className="w-full bg-white/[0.03] border-2 border-white/10 rounded-[2rem] px-8 py-6 text-white font-bold outline-none focus:border-blue-600 focus:bg-white/5 transition-all placeholder:text-slate-600"
                  />
                  <button 
                    type="submit"
                    disabled={isSubscribing}
                    className="absolute right-3 top-3 bottom-3 px-6 bg-blue-600 text-white rounded-[1.5rem] hover:bg-blue-700 transition-all flex items-center justify-center disabled:opacity-50"
                  >
                    {isSubscribing ? <Loader2 className="w-5 h-5 animate-spin" /> : <ArrowRight className="w-6 h-6" />}
                  </button>
                </form>
              </div>
            </div>

            <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-3 gap-12 lg:gap-24">
              <div className="space-y-8">
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Product</h4>
                <ul className="space-y-4">
                  <li><a href="#features" className="text-slate-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-xs">Features</a></li>
                  <li><button onClick={handleGetStarted} className="text-slate-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-xs">Login</button></li>
                  <li><button onClick={handleGetStarted} className="text-slate-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-xs">Try Demo</button></li>
                </ul>
              </div>
              <div className="space-y-8">
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Company</h4>
                <ul className="space-y-4">
                  <li><a href="#" className="text-slate-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-xs">About Us</a></li>
                  <li><a href="#" className="text-slate-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-xs">Infrastructure</a></li>
                  <li><a href="#" className="text-slate-500 hover:text-white transition-colors font-bold uppercase tracking-widest text-xs">Security</a></li>
                </ul>
              </div>
              <div className="space-y-8 col-span-2 sm:col-span-1">
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.4em]">Connect</h4>
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-blue-600 transition-all cursor-pointer group">
                    <Globe className="w-5 h-5 text-slate-400 group-hover:text-white" />
                  </div>
                  <div className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-blue-600 transition-all cursor-pointer group">
                    <Smartphone className="w-5 h-5 text-slate-400 group-hover:text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between pt-16 border-t border-white/5 gap-8">
            <div className="flex flex-col items-center md:items-start gap-2">
              <p className="text-slate-600 text-[10px] font-black uppercase tracking-[0.2em]">© 2026 TrackMyAttendance Ecosystem. All Rights Reserved.</p>
              <p className="text-slate-400 text-sm font-black">Powered by <span className="text-white">Rama Krishna</span></p>
            </div>
            
            <div className="flex items-center gap-12">
              <div className="flex gap-8">
                <a href="#" className="text-slate-600 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">Privacy Policy</a>
                <a href="#" className="text-slate-600 hover:text-white transition-colors text-[10px] font-black uppercase tracking-widest">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      <style>{`
        @keyframes marquee {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-marquee {
          animation: marquee 30s linear infinite;
        }
        .selection\\:bg-blue-500\\/30 ::selection {
          background-color: rgba(59, 130, 246, 0.3);
          color: white;
        }
      `}</style>
    </div>
  );
};

export default LandingPage;
