import React, { useState, useEffect, useRef } from 'react';
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
  Loader2,
  ChevronRight,
  Target,
  Cpu,
  Activity,
  ShieldCheck,
  Search,
  Database,
  Layers,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence, useScroll, useTransform, useSpring, useInView } from 'framer-motion';
import { subscribeEmail } from '../services/dbService';
import toast from 'react-hot-toast';

interface LandingPageProps {
  onGetStarted?: () => void;
}

const FloatingParticle = ({ delay = 0, size = 2, color = 'blue' }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0 }}
    animate={{ 
      opacity: [0, 0.5, 0], 
      scale: [0, 1, 0],
      y: [-20, -120],
      x: [0, Math.random() * 40 - 20]
    }}
    transition={{ 
      duration: 4 + Math.random() * 4, 
      repeat: Infinity, 
      delay,
      ease: "easeOut" 
    }}
    className={`absolute w-${size} h-${size} rounded-full bg-${color}-500/30 blur-[2px] pointer-events-none`}
  />
);

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);

  const { scrollYProgress } = useScroll();
  const springScroll = useSpring(scrollYProgress, { stiffness: 100, damping: 30 });
  const opacity = useTransform(springScroll, [0, 0.1], [1, 0]);
  const heroScale = useTransform(springScroll, [0, 0.2], [1, 0.9]);
  const heroY = useTransform(springScroll, [0, 0.2], [0, -40]);

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
    try {
      const result = await subscribeEmail(email);
      if (result.success) {
        toast.success(result.message);
        setIsSubscribed(true);
        setTimeout(() => {
          setIsSubscribed(false);
          setEmail('');
        }, 3000);
      } else {
        toast.error(result.message);
      }
    } finally {
      setIsSubscribing(false);
    }
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, margin: "-50px" },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  };

  return (
    <div className="min-h-screen bg-[#020205] text-slate-100 font-sans selection:bg-blue-600/40 selection:text-white overflow-x-hidden">
      {/* Premium Cinematic Background Layer */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-blue-600/5 rounded-full blur-[180px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-indigo-600/5 rounded-full blur-[180px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Fine Grain / Noise */}
        <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay" style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} />
        
        {/* Static Grid */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '64px 64px' }} />
      </div>

      {/* Modern Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] transition-all duration-500 border-b border-white/5 bg-black/40 backdrop-blur-2xl">
        <div className="max-w-7xl mx-auto px-5 lg:px-8 h-20 lg:h-24 flex items-center justify-between">
          <motion.div 
            initial={{ opacity: 0, x: -15 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 cursor-pointer group"
            onClick={() => navigate('/')}
          >
            <div className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-xl flex items-center justify-center shadow-2xl transition-transform group-hover:scale-105">
              <img src="/logo.png" alt="Logo" className="w-7 h-7 lg:w-8 lg:h-8 object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-lg lg:text-xl font-[1000] tracking-tight text-white leading-none">Track<span className="text-blue-500">MY</span>Attendance</span>
              <span className="text-[8px] font-black uppercase tracking-[0.3em] text-blue-500/60 mt-1">Presence Protocol</span>
            </div>
          </motion.div>

          <div className="hidden lg:flex items-center gap-10">
            {['Architecture', 'Ecosystem', 'Security'].map((item) => (
              <a key={item} href="#" className="text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-[0.2em] relative group">
                {item}
                <span className="absolute -bottom-1 left-0 w-0 h-px bg-blue-600 transition-all group-hover:w-full" />
              </a>
            ))}
            <motion.button 
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleGetStarted}
              className="px-8 py-3.5 bg-white text-black text-[10px] font-black uppercase tracking-[0.3em] rounded-full hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] transition-all"
            >
              Access
            </motion.button>
          </div>

          <button 
            className="lg:hidden w-10 h-10 flex items-center justify-center bg-white/5 rounded-xl text-slate-400 border border-white/10 active:scale-95"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile Nav Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="lg:hidden absolute top-20 left-0 right-0 bg-black/95 backdrop-blur-3xl border-b border-white/5 px-8 py-12 flex flex-col gap-8 shadow-2xl"
            >
              {['Features', 'Governance', 'Security', 'Waitlist'].map(item => (
                <a key={item} href="#" className="text-2xl font-[1000] text-white uppercase tracking-tighter" onClick={() => setMobileMenuOpen(false)}>
                  {item}
                </a>
              ))}
              <div className="h-px bg-white/5 w-full my-2" />
              <button 
                onClick={handleGetStarted}
                className="w-full py-6 bg-blue-600 text-white font-black uppercase tracking-[0.3em] rounded-2xl shadow-xl shadow-blue-900/20"
              >
                Launch Application
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section - Optimized for all screens */}
      <section className="relative pt-40 pb-24 lg:pt-64 lg:pb-72 px-6">
        <motion.div 
          style={{ opacity, scale: heroScale, y: heroY }}
          className="max-w-7xl mx-auto text-center relative z-10"
        >
          {/* Animated Ambient Light */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-lg h-64 pointer-events-none -z-10">
            <FloatingParticle delay={0} size={2} color="blue" />
            <FloatingParticle delay={1.5} size={1} color="indigo" />
            <FloatingParticle delay={3} size={2} color="blue" />
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.9, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="inline-flex items-center gap-3 px-5 py-2.5 bg-white/[0.03] border border-white/10 text-white rounded-full text-[9px] lg:text-[10px] font-black uppercase tracking-[0.3em] mb-10 backdrop-blur-xl shadow-2xl"
          >
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            Global Presence Protocol 2.0
          </motion.div>
          
          <motion.h1 
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
            className="text-[12vw] lg:text-[10rem] font-[1000] tracking-[-0.05em] text-white mb-10 leading-[0.85] uppercase"
          >
            PRESENCE <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-white/10">UNMATCHED.</span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.3 }}
            className="text-base lg:text-xl text-slate-500 max-w-3xl mx-auto mb-16 font-bold leading-relaxed px-4"
          >
            Leveraging zero-knowledge proofing and hyper-precision geofencing to 
            establish the world's most secure institutional attendance fabric.
          </motion.p>

          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 lg:gap-6 px-4"
          >
            <motion.button 
              whileHover={{ scale: 1.02, y: -4 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGetStarted}
              className="group w-full sm:w-auto px-12 lg:px-16 py-6 lg:py-7 bg-blue-600 text-white text-base lg:text-lg font-black rounded-[2rem] flex items-center justify-center gap-3 shadow-2xl shadow-blue-900/40 relative overflow-hidden"
            >
              Get Started
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1.5 transition-transform" />
            </motion.button>
            <motion.button 
              whileHover={{ scale: 1.02, y: -4, backgroundColor: "rgba(255,255,255,0.08)" }}
              whileTap={{ scale: 0.98 }}
              onClick={handleGetStarted}
              className="w-full sm:w-auto px-12 lg:px-16 py-6 lg:py-7 bg-white/[0.05] border border-white/10 text-white text-base lg:text-lg font-black rounded-[2rem] backdrop-blur-2xl transition-all"
            >
              System Docs
            </motion.button>
          </motion.div>
        </motion.div>

        {/* Dashboard Preview Overlay */}
        <motion.div 
          initial={{ opacity: 0, y: 100, rotateX: 15 }}
          whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
          className="mt-32 lg:mt-48 max-w-6xl mx-auto px-4 relative"
          style={{ perspective: "1500px" }}
        >
          <div className="absolute inset-0 bg-blue-600/10 rounded-[3rem] blur-[80px] -z-10 animate-pulse" />
          <div className="bg-slate-900/80 backdrop-blur-3xl rounded-[3rem] border border-white/10 p-2 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500 to-transparent opacity-40 z-20" />
            <img 
              src="/hero-mockup.png" 
              alt="System Interface" 
              className="w-full rounded-[2.6rem] object-cover opacity-80 group-hover:opacity-100 transition-all duration-700"
            />
            {/* Holographic scanning effect */}
            <div className="absolute inset-0 bg-gradient-to-t from-[#020205] via-transparent to-transparent opacity-80 z-10" />
          </div>
          
          {/* Diagnostic floating UI element */}
          <motion.div 
            animate={{ y: [0, -15, 0] }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-12 -right-4 lg:-right-12 p-8 bg-black/60 backdrop-blur-3xl border border-white/10 rounded-[2.5rem] shadow-2xl hidden md:block z-30"
          >
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-2xl flex items-center justify-center border border-blue-500/30">
                <ShieldCheck className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <p className="text-[8px] font-black text-blue-500 uppercase tracking-widest mb-0.5">Core Health</p>
                <p className="text-xl font-black text-white tracking-tight uppercase">Optimal</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[8px] font-black text-slate-500 uppercase tracking-[0.3em]">
              <span>Latency: 12ms</span>
              <span className="flex items-center gap-1.5 ml-8">
                <div className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                Live Feed
              </span>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Trust & Metrics Section */}
      <section className="py-32 lg:py-48 px-6 bg-[#010103] relative overflow-hidden">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div variants={fadeInUp} initial="initial" whileInView="whileInView">
              <div className="inline-flex items-center gap-2 px-4 py-1 bg-white/[0.03] border border-white/10 rounded-full text-[9px] font-black text-blue-500 uppercase tracking-widest mb-8">
                Performance Metrics
              </div>
              <h2 className="text-5xl lg:text-8xl font-[1000] text-white tracking-tighter mb-8 leading-[0.9] uppercase">
                SCALED <br /> BEYOND.
              </h2>
              <p className="text-lg lg:text-xl text-slate-500 font-bold leading-relaxed mb-12 max-w-md">
                Infrastructure engineered to handle high-density institutional traffic with 
                mathematical precision and zero fraud tolerance.
              </p>
              <div className="flex flex-wrap gap-4">
                {['Zero-Proxy', 'Instant-Sync', 'Immutable'].map(tag => (
                  <span key={tag} className="px-5 py-2 bg-white/5 border border-white/5 rounded-xl text-[9px] font-black text-slate-400 tracking-widest uppercase">{tag}</span>
                ))}
              </div>
            </motion.div>

            <div className="grid grid-cols-2 gap-4 lg:gap-6">
              {[
                { label: "Check-in time", val: "0.4s" },
                { label: "Fraud protection", val: "100%" },
                { label: "Active Nodes", val: "15k+" },
                { label: "Uptime SLA", val: "99.9%" }
              ].map((stat, i) => (
                <motion.div 
                  key={i}
                  whileHover={{ y: -5, backgroundColor: "rgba(255,255,255,0.03)" }}
                  className="p-8 lg:p-12 bg-white/[0.015] border border-white/5 rounded-[2.5rem] text-center lg:text-left"
                >
                  <p className="text-4xl lg:text-6xl font-[1000] text-white mb-2 tracking-tighter">{stat.val}</p>
                  <p className="text-[8px] lg:text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">{stat.label}</p>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Grid of Capabilities */}
      <section className="py-40 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-5xl lg:text-9xl font-[1000] tracking-[-0.04em] text-white mb-8 uppercase leading-none">Modules.</h2>
            <p className="text-lg lg:text-xl text-slate-500 font-bold max-w-2xl mx-auto">
              A comprehensive suite of autonomous systems designed to optimize institutional governance.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {[
              { title: "Geofence X", icon: MapPin, desc: "Precision spatial validation using hybrid triangulation." },
              { title: "Bio-Identity", icon: Fingerprint, icon2: Shield, desc: "Multi-layered biometric verification for high-security nodes." },
              { title: "Auto-Govern", icon: Cpu, desc: "Autonomous session lifecycle and automated reporting engine." },
              { title: "Neural Sync", icon: Zap, desc: "Intelligent data queuing with background resync technology." },
              { title: "Vault Ledger", icon: Database, desc: "Cryptographically signed attendance records stored securely." },
              { title: "Predict AI", icon: Activity, desc: "Behavioral analysis and early-warning dropout protection." }
            ].map((feature, i) => (
              <motion.div 
                key={i}
                variants={fadeInUp}
                initial="initial"
                whileInView="whileInView"
                className="group p-10 lg:p-12 bg-white/[0.01] border border-white/5 rounded-[3rem] hover:bg-white/[0.04] hover:border-blue-500/20 transition-all duration-500"
              >
                <div className="w-16 h-16 lg:w-20 lg:h-20 bg-blue-600/10 border border-blue-500/20 rounded-3xl flex items-center justify-center mb-8 group-hover:scale-110 transition-transform">
                  <feature.icon className="w-8 h-8 lg:w-10 lg:h-10 text-blue-500" />
                </div>
                <h3 className="text-2xl lg:text-3xl font-[1000] text-white mb-4 uppercase tracking-tight">{feature.title}</h3>
                <p className="text-slate-500 font-bold leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ultra Footer */}
      <footer className="py-32 lg:py-48 px-6 border-t border-white/5 bg-[#010103] relative z-10 overflow-hidden">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[120%] h-[400px] bg-blue-600/5 rounded-full blur-[150px] -z-10" />
        
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-20 mb-32">
            <div className="lg:col-span-6">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-blue-500/10">
                  <img src="/logo.png" alt="Logo" className="w-8 h-8 object-contain" />
                </div>
                <span className="text-2xl font-[1000] tracking-tight text-white uppercase">Track<span className="text-blue-500">MY</span>Attendance</span>
              </div>
              <p className="text-xl text-slate-500 font-bold leading-relaxed mb-12 max-w-md">
                Redefining presence management through cryptographic innovation and spatial precision.
              </p>
              
              <div className="space-y-6">
                <p className="text-[9px] font-black text-blue-500 uppercase tracking-[0.4em]">Waitlist Registration</p>
                <form onSubmit={handleSubscribe} className="relative max-w-sm group">
                  <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl blur opacity-0 group-focus-within:opacity-20 transition duration-1000 group-focus-within:duration-200" />
                  <div className="relative">
                    <input 
                      type="email" 
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Email" 
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl px-5 lg:px-6 py-4 lg:py-5 text-sm lg:text-base text-white font-bold outline-none focus:border-blue-500/50 focus:bg-white/[0.05] transition-all placeholder:text-slate-600"
                    />
                    <button 
                      type="submit"
                      disabled={isSubscribing || isSubscribed}
                      className="absolute right-1.5 top-1.5 bottom-1.5 px-5 lg:px-7 bg-blue-600 text-white rounded-xl hover:bg-blue-500 active:scale-95 transition-all flex items-center justify-center disabled:opacity-50 shadow-xl shadow-blue-900/20"
                    >
                      {isSubscribing ? (
                        <Loader2 className="w-4 h-4 lg:w-5 lg:h-5 animate-spin" />
                      ) : isSubscribed ? (
                        <CheckCircle2 className="w-4 h-4 lg:w-5 lg:h-5" />
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">Join</span>
                          <ArrowRight className="w-4 h-4" />
                        </div>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>

            <div className="lg:col-span-6 grid grid-cols-2 lg:grid-cols-3 gap-12">
              <div className="space-y-8">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Protocol</h4>
                <ul className="space-y-5">
                  {['Capabilities', 'Security', 'Scale', 'Docs'].map(item => (
                    <li key={item}><a href="#" className="text-[10px] font-black text-slate-600 hover:text-white transition-all uppercase tracking-widest">{item}</a></li>
                  ))}
                </ul>
              </div>
              <div className="space-y-8">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Ecosystem</h4>
                <ul className="space-y-5">
                  {['Enterprise', 'Hardware', 'Mobile', 'Privacy'].map(item => (
                    <li key={item}><a href="#" className="text-[10px] font-black text-slate-600 hover:text-white transition-all uppercase tracking-widest">{item}</a></li>
                  ))}
                </ul>
              </div>
              <div className="space-y-8 col-span-2 lg:col-span-1">
                <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Global</h4>
                <div className="flex gap-4">
                  {[Globe, Smartphone, Layers].map((Icon, i) => (
                    <div key={i} className="w-12 h-12 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center hover:bg-blue-600 hover:border-blue-600 transition-all cursor-pointer group">
                      <Icon className="w-5 h-5 text-slate-600 group-hover:text-white" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col lg:flex-row items-center justify-between pt-16 border-t border-white/5 gap-10">
            <p className="text-slate-700 text-[9px] font-black uppercase tracking-[0.3em]">© 2026 TMA PROTOCOL. ARCHITECTED BY RAMA KRISHNA.</p>
            <div className="flex gap-8">
              {['Terms', 'Privacy', 'Compliance'].map(item => (
                <a key={item} href="#" className="text-[9px] font-black text-slate-700 hover:text-white transition-colors uppercase tracking-[0.3em]">{item}</a>
              ))}
            </div>
          </div>
        </div>
      </footer>
      
      <style>{`
        html { scroll-behavior: smooth; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: #020205; }
        ::-webkit-scrollbar-thumb { background: #1e1e2e; border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: #313244; }
      `}</style>
    </div>
  );
};

export default LandingPage;
