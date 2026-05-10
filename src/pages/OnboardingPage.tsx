import React, { useState, useRef, useEffect } from 'react';
import { Camera, Plus, CheckCircle, Loader2, GraduationCap, Briefcase, ChevronRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getMentors } from '../services/dbService';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

type OnboardingStep = 'role-selection' | 'form';
type UserRole = 'student' | 'faculty';

export default function OnboardingPage({ user, onComplete }: { user: any, onComplete: (data: any) => void }) {
  const [step, setStep] = useState<OnboardingStep>('role-selection');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    // Common fields
    phone: '',
    photoURL: user?.photoURL || '',
    // Student specific
    course: '',
    rollNo: '',
    gender: '',
    bloodGroup: '',
    mentorId: '',
    // Faculty specific
    department: '',
    employeeId: '',
    designation: '',
    specialization: '',
    experience: ''
  });

  const [mentors, setMentors] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const fetchMentors = async () => {
      const data = await getMentors();
      setMentors(data || []);
    };
    fetchMentors();
  }, []);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size should be less than 5MB');
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading('Uploading photo...');

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id || 'new'}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('student-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('student-photos')
        .getPublicUrl(filePath);

      setFormData(prev => ({ ...prev, photoURL: publicUrl }));
      toast.success('Photo uploaded successfully', { id: toastId });
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      toast.error(error.message || 'Failed to upload photo', { id: toastId });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      // Clean up data based on role before sending
      const submissionData = {
        ...formData,
        role: selectedRole,
        onboarded: true,
        onboardedAt: new Date().toISOString()
      };

      // Remove irrelevant fields
      if (selectedRole === 'faculty') {
        delete (submissionData as any).rollNo;
        delete (submissionData as any).course;
        delete (submissionData as any).mentorId;
      } else {
        delete (submissionData as any).department;
        delete (submissionData as any).employeeId;
        delete (submissionData as any).designation;
      }

      await onComplete(submissionData);
    } catch (error) {
      console.error('[OnboardingPage] Submission error:', error);
      toast.error('Failed to complete onboarding');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectRole = (role: UserRole) => {
    setSelectedRole(role);
    setStep('form');
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-center font-sans">
      <div className="max-w-2xl w-full">
        <AnimatePresence mode="wait">
          {step === 'role-selection' ? (
            <motion.div
              key="role-selection"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden p-8 text-center"
            >
              <div className="mb-10">
                <h2 className="text-3xl font-black text-gray-900 tracking-tight uppercase">Welcome to the Protocol</h2>
                <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-2">Identify your role to proceed</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-10">
                <button
                  onClick={() => selectRole('student')}
                  className="group relative bg-white border-2 border-gray-100 rounded-3xl p-8 transition-all hover:border-blue-600 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col items-center gap-6"
                >
                  <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 transition-transform">
                    <GraduationCap className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Student</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Access courses & tracking</p>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5 text-blue-600" />
                  </div>
                </button>

                <button
                  onClick={() => selectRole('faculty')}
                  className="group relative bg-white border-2 border-gray-100 rounded-3xl p-8 transition-all hover:border-blue-600 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col items-center gap-6"
                >
                  <div className="w-20 h-20 bg-gray-50 rounded-2xl flex items-center justify-center text-gray-600 group-hover:scale-110 transition-transform">
                    <Briefcase className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-800 uppercase tracking-tight">Faculty</h3>
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">Manage nodes & governance</p>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5 text-blue-600" />
                  </div>
                </button>
              </div>

              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">Institutional Access Engine v2.0</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
            >
              <div className="bg-gray-900 p-8 text-white flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black tracking-tight uppercase">
                    {selectedRole === 'faculty' ? 'Faculty Onboarding' : 'Student Onboarding'}
                  </h2>
                  <p className="text-gray-400 text-[10px] font-black uppercase tracking-widest mt-1">Complete your secure profile</p>
                </div>
                <button 
                  onClick={() => setStep('role-selection')}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                {/* Profile Image Upload */}
                <div className="flex flex-col items-center justify-center">
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    ref={fileInputRef} 
                    onChange={handlePhotoUpload}
                  />
                  <div 
                    className="w-24 h-24 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 flex items-center justify-center relative cursor-pointer hover:border-blue-500 hover:bg-blue-50/30 transition-all group overflow-hidden"
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
                    ) : (
                      <>
                        <img 
                          src={formData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name || 'User'}`} 
                          alt="Profile" 
                          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        />
                        <div className="absolute inset-0 bg-blue-600/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Camera className="w-8 h-8 text-white" />
                        </div>
                      </>
                    )}
                  </div>
                  <p className="text-[9px] font-black text-gray-400 mt-3 uppercase tracking-widest">Identify Photo</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Identity Name</label>
                    <input 
                      type="text" 
                      required 
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-500 outline-none transition-all" 
                      placeholder="e.g. Dr. Sarah Connor" 
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Contact Protocol (Phone)</label>
                    <input 
                      type="tel" 
                      required 
                      value={formData.phone}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-500 outline-none transition-all" 
                      placeholder="+1 (555) 000-0000" 
                    />
                  </div>

                  {selectedRole === 'student' ? (
                    <>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Enrollment (Roll No)</label>
                        <input 
                          type="text" 
                          required 
                          value={formData.rollNo}
                          onChange={(e) => setFormData({...formData, rollNo: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-500 outline-none transition-all" 
                          placeholder="e.g. 2023MCA001" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Academic Stream (Course)</label>
                        <select 
                          required 
                          value={formData.course}
                          onChange={(e) => setFormData({...formData, course: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
                        >
                          <option value="">Select Stream</option>
                          <option value="MCA">MCA</option>
                          <option value="B.Tech CS">B.Tech CS</option>
                          <option value="B.Tech">B.Tech</option>
                          <option value="BCA">BCA</option>
                          <option value="M.Tech">M.Tech</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Biometric Class (Gender)</label>
                        <select 
                          required 
                          value={formData.gender}
                          onChange={(e) => setFormData({...formData, gender: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
                        >
                          <option value="">Select Class</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="sm:col-span-2">
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Assigned Mentor</label>
                        <select 
                          required 
                          value={formData.mentorId}
                          onChange={(e) => setFormData({...formData, mentorId: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
                        >
                          <option value="">Identify Mentor</option>
                          {mentors.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Employee ID</label>
                        <input 
                          type="text" 
                          required 
                          value={formData.employeeId}
                          onChange={(e) => setFormData({...formData, employeeId: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-500 outline-none transition-all" 
                          placeholder="e.g. FAC-001" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Department</label>
                        <select 
                          required 
                          value={formData.department}
                          onChange={(e) => setFormData({...formData, department: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-500 outline-none transition-all"
                        >
                          <option value="">Select Dept</option>
                          <option value="Computer Science">Computer Science</option>
                          <option value="Information Technology">Information Technology</option>
                          <option value="Mathematics">Mathematics</option>
                          <option value="Management">Management</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Designation</label>
                        <input 
                          type="text" 
                          required 
                          value={formData.designation}
                          onChange={(e) => setFormData({...formData, designation: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-500 outline-none transition-all" 
                          placeholder="e.g. Senior Professor" 
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Experience (Years)</label>
                        <input 
                          type="number" 
                          required 
                          value={formData.experience}
                          onChange={(e) => setFormData({...formData, experience: e.target.value})}
                          className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-4 text-sm font-bold text-gray-800 focus:bg-white focus:border-blue-500 outline-none transition-all" 
                          placeholder="e.g. 10" 
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-8 border-t border-gray-100">
                  <button 
                    type="submit" 
                    disabled={isSubmitting}
                    className={`w-full text-white py-5 rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-3 ${
                      isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 shadow-blue-500/20 hover:bg-blue-700 hover:-translate-y-1'
                    }`}
                  >
                    {isSubmitting ? (
                      <>Syncing Identity...</>
                    ) : (
                      <>Commit Registration <CheckCircle className="w-5 h-5" /></>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
  );
}
