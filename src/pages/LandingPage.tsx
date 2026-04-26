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
  Play
} from 'lucide-react';
import { useAuth } from '@clerk/clerk-react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

interface LandingPageProps {
  onGetStarted?: () => void;
}

const LandingPage: React.FC<LandingPageProps> = ({ onGetStarted }) => {
  const { isSignedIn } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleGetStarted = () => {
    if (isSignedIn) {
      navigate('/');
    } else if (onGetStarted) {
      onGetStarted();
    } else {
      window.location.reload(); 
    }
  };

  const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.6, ease: "easeOut" }
  };

  const staggerContainer = {
    animate: {
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-blue-500/30 selection:text-white overflow-x-hidden">
      {/* Background Mesh Gradients */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-600/10 rounded-full blur-[120px]" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-[100] border-b border-white/5 bg-[#020617]/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <img src="/logo.png" alt="Logo" className="w-7 h-7 object-contain brightness-0 invert" />
            </div>
            <span className="text-xl font-black tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">TrackMyAttendance</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Features</a>
            <a href="#benefits" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">Benefits</a>
            <div className="h-6 w-px bg-white/10 mx-2" />
            <button 
              onClick={handleGetStarted}
              className="text-sm font-bold text-slate-300 hover:text-white transition-colors"
            >
              Login
            </button>
            <button 
              onClick={handleGetStarted}
              className="px-5 py-2 bg-blue-600/10 border border-blue-500/20 text-blue-400 text-xs font-black uppercase tracking-widest rounded-full hover:bg-blue-500/20 transition-all active:scale-95"
            >
              Try Demo
            </button>
            <button 
              onClick={handleGetStarted}
              className="px-7 py-2.5 bg-white text-slate-900 text-sm font-black rounded-full hover:shadow-[0_0_30px_rgba(255,255,255,0.3)] transition-all active:scale-95"
            >
              Launch App
            </button>
          </div>

          {/* Mobile Toggle */}
          <button 
            className="md:hidden p-2 text-slate-400"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-[#020617] border-b border-white/5 overflow-hidden"
            >
              <div className="px-6 py-8 flex flex-col gap-6">
                <a href="#features" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-slate-300">Features</a>
                <a href="#benefits" onClick={() => setMobileMenuOpen(false)} className="text-lg font-bold text-slate-300">Benefits</a>
                <button 
                  onClick={handleGetStarted}
                  className="w-full py-4 text-slate-300 font-bold border border-white/10 rounded-2xl"
                >
                  Login
                </button>
                <button 
                  onClick={handleGetStarted}
                  className="w-full py-4 bg-blue-600/20 text-blue-400 font-black rounded-2xl border border-blue-500/30"
                >
                  Try Demo
                </button>
                <button 
                  onClick={handleGetStarted}
                  className="w-full py-4 bg-white text-slate-900 font-black rounded-2xl shadow-xl"
                >
                  Get Started
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-40 pb-24 md:pt-56 md:pb-40 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
            {/* Left Content */}
            <motion.div 
              className="lg:col-span-7 text-left"
              initial="initial"
              animate="animate"
              variants={staggerContainer}
            >
              <motion.div 
                variants={fadeInUp}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-full text-xs font-black uppercase tracking-widest mb-8"
              >
                <Zap className="w-3.5 h-3.5 fill-blue-400" />
                V2.0 is now live
              </motion.div>
              
              <motion.h1 
                variants={fadeInUp}
                className="text-5xl md:text-8xl font-black tracking-tighter text-white mb-8 leading-[0.95]"
              >
                Automated <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400">Geofencing.</span>
              </motion.h1>

              <motion.p 
                variants={fadeInUp}
                className="text-lg md:text-2xl text-slate-400 max-w-xl mb-12 font-medium leading-relaxed"
              >
                The award-winning attendance platform for modern institutions. 
                Seamless verification, real-time analytics, and zero administrative friction.
              </motion.p>

              <motion.div 
                variants={fadeInUp}
                className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4"
              >
                <button 
                  onClick={handleGetStarted}
                  className="px-10 py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white text-lg font-black rounded-[2rem] hover:shadow-[0_0_40px_rgba(37,99,235,0.4)] transition-all flex items-center justify-center gap-3 group active:scale-95"
                >
                  Start Tracking
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
                <button 
                  onClick={handleGetStarted}
                  className="px-10 py-5 bg-white/5 hover:bg-white/10 text-white text-lg font-black rounded-[2rem] transition-all flex items-center justify-center gap-3 backdrop-blur-sm border border-white/10 active:scale-95"
                >
                  <Play className="w-5 h-5 fill-white" />
                  Try Demo
                </button>
              </motion.div>

              <motion.div 
                variants={fadeInUp}
                className="mt-16 flex items-center gap-6"
              >
                <div className="flex -space-x-3">
                  {[1,2,3].map(i => (
                    <div key={i} className="w-12 h-12 rounded-full border-4 border-[#020617] bg-slate-800 overflow-hidden ring-1 ring-white/10">
                      <img src={`https://i.pravatar.cc/150?u=${i+10}`} alt="User" />
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-sm font-black text-white">4.9/5 Rating</p>
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Trusted by 12,000+ Students</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Right Mockup */}
            <motion.div 
              className="lg:col-span-5 relative"
              initial={{ opacity: 0, scale: 0.8, rotateY: 20 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              transition={{ duration: 1.2, ease: "easeOut", delay: 0.2 }}
            >
              <div className="relative z-10">
                <img 
                  src="/hero-mockup.png" 
                  alt="TrackMyAttendance App Mockup" 
                  className="w-full drop-shadow-[0_0_80px_rgba(37,99,235,0.3)] rounded-[3rem]"
                />
              </div>
              
              {/* Decorative Fluid Element */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[140%] h-[140%] bg-blue-500/20 rounded-full blur-[100px] -z-10 animate-pulse" />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-end mb-20 gap-8">
            <div className="max-w-2xl">
              <p className="text-blue-400 font-black uppercase tracking-[0.3em] text-xs mb-4">Core Engine</p>
              <h2 className="text-4xl md:text-6xl font-black tracking-tight text-white leading-tight">
                Everything you need <br /> for total control.
              </h2>
            </div>
            <p className="text-slate-400 font-medium max-w-sm mb-2 leading-relaxed">
              We've redesigned attendance management from the ground up to be mobile-first and bulletproof.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: MapPin,
                title: "Smart Geofencing",
                desc: "High-precision GPS boundaries ensure students are physically present before they can check in.",
                gradient: "from-blue-500/20 to-transparent"
              },
              {
                icon: Shield,
                title: "Proof of Presence",
                desc: "Multiple validation layers including biometric and photo evidence for absolute data integrity.",
                gradient: "from-indigo-500/20 to-transparent"
              },
              {
                icon: BarChart3,
                title: "Deep Analytics",
                desc: "Powerful visualized reports for admins to track trends, streaks, and engagement metrics.",
                gradient: "from-purple-500/20 to-transparent"
              }
            ].map((f, i) => (
              <motion.div 
                key={i}
                whileHover={{ y: -10 }}
                className={`p-10 rounded-[3rem] border border-white/5 bg-gradient-to-b ${f.gradient} backdrop-blur-sm relative overflow-hidden group transition-all`}
              >
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:border-blue-500/50 transition-colors">
                  <f.icon className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-black mb-4 text-white">{f.title}</h3>
                <p className="text-slate-400 font-medium leading-relaxed">{f.desc}</p>
                <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
                  <Zap className="w-20 h-20 text-white" />
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Mid-Page CTA */}
      <section className="py-12 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600/10 to-indigo-600/10 border border-white/5 rounded-[3rem] p-12 flex flex-col md:flex-row items-center justify-between gap-8 backdrop-blur-sm relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="text-3xl md:text-4xl font-black text-white mb-2 tracking-tight">No hardware required.</h3>
              <p className="text-slate-400 font-medium text-lg">Start tracking with just your student's smartphones today.</p>
            </div>
            <button 
              onClick={handleGetStarted}
              className="relative z-10 px-10 py-5 bg-white text-slate-900 font-black rounded-2xl hover:scale-105 transition-all shadow-xl active:scale-95 whitespace-nowrap"
            >
              Get Started Now
            </button>
            <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -mr-20 -mt-20" />
          </div>
        </div>
      </section>

      {/* Benefits / High Performance */}
      <section id="benefits" className="py-32 px-6 bg-white/5 backdrop-blur-md relative overflow-hidden">
        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-center">
            <div className="order-2 lg:order-1">
              <div className="grid grid-cols-2 gap-6">
                {[
                  { label: "Check-in Speed", val: "0.8s" },
                  { label: "Data Integrity", val: "100%" },
                  { label: "Admin Workload", val: "-85%" },
                  { label: "Student Score", val: "4.9" }
                ].map((s, i) => (
                  <div key={i} className="p-8 bg-[#020617] rounded-[2.5rem] border border-white/10 shadow-2xl">
                    <p className="text-4xl md:text-5xl font-black mb-3 text-white">{s.val}</p>
                    <p className="text-xs font-black text-slate-500 uppercase tracking-widest">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="text-4xl md:text-6xl font-black tracking-tight mb-8 leading-[1.1]">
                Scale without the <br />
                <span className="text-blue-500">paperwork headache.</span>
              </h2>
              <div className="space-y-8">
                {[
                  "Real-time geofence activations",
                  "Automated late marking & grace periods",
                  "Digital leave request workflows",
                  "Export-ready compliance reports"
                ].map((item, i) => (
                  <div key={i} className="flex items-center gap-5">
                    <div className="w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                    <p className="text-lg font-bold text-slate-200">{item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Abstract Fluid Shapes */}
        <div className="absolute top-1/2 right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px]" />
      </section>

      {/* CTA Section */}
      <section className="py-32 px-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          className="max-w-5xl mx-auto bg-gradient-to-br from-blue-600 to-indigo-700 rounded-[4rem] p-12 md:p-24 text-center relative overflow-hidden shadow-2xl shadow-blue-500/20"
        >
          <div className="relative z-10">
            <Smartphone className="w-16 h-16 text-white/50 mx-auto mb-10" />
            <h2 className="text-4xl md:text-7xl font-black text-white mb-8 tracking-tighter">
              Ready to automate <br /> your campus?
            </h2>
            <p className="text-blue-100 text-lg md:text-xl font-medium mb-12 max-w-2xl mx-auto opacity-80 leading-relaxed">
              Join leading institutions using TrackMyAttendance to save thousands of hours 
              and build a more efficient campus environment.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
              <button 
                onClick={handleGetStarted}
                className="w-full sm:w-auto px-12 py-6 bg-white text-blue-600 text-xl font-black rounded-full hover:scale-105 transition-all shadow-xl active:scale-95"
              >
                Launch Platform
              </button>
              <button 
                onClick={handleGetStarted}
                className="w-full sm:w-auto px-12 py-6 bg-white/10 border border-white/20 text-white text-xl font-black rounded-full hover:bg-white/20 transition-all backdrop-blur-md active:scale-95"
              >
                Try the Demo
              </button>
            </div>
          </div>

          {/* Fluid CTAs background shapes */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl -mr-32 -mt-32" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-indigo-400/20 rounded-full blur-3xl -ml-32 -mb-32" />
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="py-20 px-6 border-t border-white/5 relative z-10">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-20">
            <div className="md:col-span-1">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center">
                  <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain brightness-0 invert" />
                </div>
                <span className="text-xl font-black tracking-tight text-white">TrackMyAttendance</span>
              </div>
              <p className="text-slate-500 text-sm font-medium leading-relaxed">
                Reimagining campus administration through intelligent automation and geofencing technology.
              </p>
            </div>
            <div>
              <h4 className="text-white font-black mb-6 uppercase tracking-widest text-xs">Product</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-slate-500 hover:text-white transition-colors font-bold text-sm">Features</a></li>
                <li><button onClick={handleGetStarted} className="text-slate-500 hover:text-white transition-colors font-bold text-sm">Login</button></li>
                <li><button onClick={handleGetStarted} className="text-slate-500 hover:text-white transition-colors font-bold text-sm">Try Demo</button></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-black mb-6 uppercase tracking-widest text-xs">Company</h4>
              <ul className="space-y-4">
                <li><a href="#" className="text-slate-500 hover:text-white transition-colors font-bold text-sm">About Us</a></li>
                <li><a href="#" className="text-slate-500 hover:text-white transition-colors font-bold text-sm">Careers</a></li>
                <li><a href="#" className="text-slate-500 hover:text-white transition-colors font-bold text-sm">Legal</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-black mb-6 uppercase tracking-widest text-xs">Stay Updated</h4>
              <div className="flex gap-2 p-1 bg-white/5 border border-white/10 rounded-2xl">
                <input type="email" placeholder="Email address" className="bg-transparent border-none outline-none px-4 py-2 text-sm w-full text-white" />
                <button className="p-2 bg-blue-600 rounded-xl hover:bg-blue-700 transition-all">
                  <ArrowRight className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-center justify-between pt-10 border-t border-white/5 gap-6">
            <p className="text-slate-600 text-xs font-bold">© 2024 TrackMyAttendance AI. Powered by Antigravity Design System.</p>
            <div className="flex items-center gap-8">
              <Globe className="w-5 h-5 text-slate-700" />
              <div className="flex gap-6">
                <a href="#" className="text-slate-600 hover:text-white transition-colors text-xs font-black">Twitter</a>
                <a href="#" className="text-slate-600 hover:text-white transition-colors text-xs font-black">LinkedIn</a>
                <a href="#" className="text-slate-600 hover:text-white transition-colors text-xs font-black">GitHub</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
