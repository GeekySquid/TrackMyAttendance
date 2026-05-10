import React, { useState, useRef, useEffect } from 'react';
import { Camera, CheckCircle, Loader2, GraduationCap, Briefcase, ChevronRight, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getMentors } from '../services/dbService';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

type OnboardingStep = 'role-selection' | 'form';
type UserRole = 'student' | 'faculty';

export default function OnboardingPage({ user, onComplete }: { user: any, onComplete: (data: any) => void }) {
  const [step, setStep] = useState<OnboardingStep>('role-selection');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  // Pre-fill name from the profile which is built from Clerk's user data in App.tsx
  const [formData, setFormData] = useState({
    name: user?.name || '',
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

  // Update name if user prop changes (e.g., after profile loads from DB)
  useEffect(() => {
    if (user?.name && !formData.name) {
      setFormData(prev => ({ ...prev, name: user.name }));
    }
    if (user?.photoURL && !formData.photoURL) {
      setFormData(prev => ({ ...prev, photoURL: user.photoURL }));
    }
  }, [user?.name, user?.photoURL]);

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
      const fileName = `${user?.id || 'new'}-${Math.random().toString(36).substring(2)}.${fileExt}`;
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

    if (!formData.name.trim()) {
      toast.error('Please enter your full name');
      return;
    }
    if (!formData.phone.trim()) {
      toast.error('Please enter your phone number');
      return;
    }

    setIsSubmitting(true);
    try {
      const submissionData: any = {
        ...formData,
        role: selectedRole,
        onboarded: true,
        onboardedAt: new Date().toISOString()
      };

      // Remove irrelevant fields based on role
      if (selectedRole === 'faculty') {
        delete submissionData.rollNo;
        delete submissionData.course;
        delete submissionData.mentorId;
        delete submissionData.gender;
        delete submissionData.bloodGroup;
      } else {
        delete submissionData.department;
        delete submissionData.employeeId;
        delete submissionData.designation;
        delete submissionData.specialization;
        delete submissionData.experience;
      }

      await onComplete(submissionData);
    } catch (error) {
      console.error('[OnboardingPage] Submission error:', error);
      toast.error('Failed to complete onboarding. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectRole = (role: UserRole) => {
    setSelectedRole(role);
    setStep('form');
  };

  const inputClass = "w-full bg-white border border-gray-200 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-700 placeholder:text-gray-300 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/5 outline-none transition-all hover:border-gray-300 cursor-pointer appearance-none";
  const labelClass = "block text-[11px] font-black text-gray-500 uppercase tracking-widest ml-1 mb-2 flex items-center gap-1.5";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-center font-sans">
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
              {/* Header */}
              <div className="mb-4">
                <div className="w-16 h-16 bg-white border border-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-blue-900/5">
                  <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
                </div>
                <h2 className="text-3xl font-black text-gray-900 tracking-tight">Welcome{user?.name ? `, ${user.name.split(' ')[0]}` : ''}!</h2>
                <p className="text-sm font-medium text-gray-500 mt-2">Select your role to set up your profile</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 my-8">
                {/* Student Card */}
                <button
                  onClick={() => selectRole('student')}
                  className="group relative bg-white border-2 border-gray-100 rounded-3xl p-8 transition-all hover:border-blue-500 hover:shadow-2xl hover:shadow-blue-500/10 flex flex-col items-center gap-5 cursor-pointer"
                >
                  <div className="w-20 h-20 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:scale-110 group-hover:bg-blue-100 transition-all">
                    <GraduationCap className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-800">Student</h3>
                    <p className="text-xs font-medium text-gray-400 mt-1">Track attendance & apply for leaves</p>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5 text-blue-600" />
                  </div>
                </button>

                {/* Faculty Card */}
                <button
                  onClick={() => selectRole('faculty')}
                  className="group relative bg-white border-2 border-gray-100 rounded-3xl p-8 transition-all hover:border-indigo-500 hover:shadow-2xl hover:shadow-indigo-500/10 flex flex-col items-center gap-5 cursor-pointer"
                >
                  <div className="w-20 h-20 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:scale-110 group-hover:bg-indigo-100 transition-all">
                    <Briefcase className="w-10 h-10" />
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-gray-800">Faculty</h3>
                    <p className="text-xs font-medium text-gray-400 mt-1">Manage students & attendance records</p>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="w-5 h-5 text-indigo-600" />
                  </div>
                </button>
              </div>

              <p className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">TrackMyAttendance · Secure Access</p>
            </motion.div>
          ) : (
            <motion.div
              key="form"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden"
            >
              {/* Header */}
              <div className={`p-8 text-white flex justify-between items-center ${selectedRole === 'faculty' ? 'bg-indigo-700' : 'bg-blue-600'}`}>
                <div>
                  <h2 className="text-2xl font-black tracking-tight">
                    {selectedRole === 'faculty' ? 'Faculty Profile Setup' : 'Student Profile Setup'}
                  </h2>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest mt-1">
                    Complete your profile to continue
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setStep('role-selection')}
                  className="p-2 hover:bg-white/10 rounded-xl transition-colors"
                  title="Go back to role selection"
                >
                  <ArrowLeft className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
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
                  <p className="text-[9px] font-black text-gray-400 mt-3 uppercase tracking-widest">Click to upload photo (optional)</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  {/* Full Name — pre-filled from Clerk registration */}
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={inputClass}
                      placeholder="e.g. Rahul Sharma"
                    />
                  </div>

                  {/* Phone */}
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className={inputClass}
                      placeholder="+91 9876543210"
                    />
                  </div>

                  {/* ─── Student-specific fields ─────────────────────────── */}
                  {selectedRole === 'student' && (
                    <>
                      <div>
                        <label className={labelClass}>Roll Number *</label>
                        <input
                          type="text"
                          required
                          value={formData.rollNo}
                          onChange={(e) => setFormData({ ...formData, rollNo: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. 2023MCA001"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Course / Stream *</label>
                        <div className="relative">
                          <select
                            required
                            value={formData.course}
                            onChange={(e) => setFormData({ ...formData, course: e.target.value })}
                            className={inputClass}
                          >
                          <option value="">Select Course</option>
                          <option value="MCA">MCA</option>
                          <option value="B.Tech CS">B.Tech CS</option>
                          <option value="B.Tech">B.Tech</option>
                          <option value="BCA">BCA</option>
                          <option value="M.Tech">M.Tech</option>
                          <option value="MBA">MBA</option>
                          <option value="BSc">BSc</option>
                          </select>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronRight className="w-4 h-4 rotate-90" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Gender *</label>
                        <div className="relative">
                          <select
                            required
                            value={formData.gender}
                            onChange={(e) => setFormData({ ...formData, gender: e.target.value })}
                            className={inputClass}
                          >
                          <option value="">Select Gender</option>
                          <option value="Male">Male</option>
                          <option value="Female">Female</option>
                          <option value="Other">Other</option>
                          </select>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronRight className="w-4 h-4 rotate-90" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Blood Group</label>
                        <div className="relative">
                          <select
                            value={formData.bloodGroup}
                            onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                            className={inputClass}
                          >
                          <option value="">Select Blood Group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          </select>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronRight className="w-4 h-4 rotate-90" />
                          </div>
                        </div>
                      </div>

                      <div className="sm:col-span-2">
                        <label className={labelClass}>Assigned Mentor {mentors.length === 0 ? '(None available yet)' : '*'}</label>
                        <div className="relative">
                          <select
                            required={mentors.length > 0}
                            value={formData.mentorId}
                            onChange={(e) => setFormData({ ...formData, mentorId: e.target.value })}
                            className={inputClass}
                          >
                          <option value="">
                            {mentors.length === 0 ? 'No mentors available — will be assigned later' : 'Select your mentor'}
                          </option>
                          {mentors.map(m => (
                            <option key={m.id} value={m.id}>{m.name}</option>
                          ))}
                          </select>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronRight className="w-4 h-4 rotate-90" />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* ─── Faculty-specific fields ─────────────────────────── */}
                  {selectedRole === 'faculty' && (
                    <>
                      <div>
                        <label className={labelClass}>Employee ID *</label>
                        <input
                          type="text"
                          required
                          value={formData.employeeId}
                          onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. FAC-2024-001"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Department *</label>
                        <div className="relative">
                          <select
                            required
                            value={formData.department}
                            onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                            className={inputClass}
                          >
                          <option value="">Select Department</option>
                          <option value="Computer Science">Computer Science</option>
                          <option value="Information Technology">Information Technology</option>
                          <option value="Mathematics">Mathematics</option>
                          <option value="Management">Management</option>
                          <option value="Electronics">Electronics</option>
                          <option value="Physics">Physics</option>
                          </select>
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                            <ChevronRight className="w-4 h-4 rotate-90" />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className={labelClass}>Designation *</label>
                        <input
                          type="text"
                          required
                          value={formData.designation}
                          onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. Senior Professor"
                        />
                      </div>

                      <div>
                        <label className={labelClass}>Experience (Years) *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          max="50"
                          value={formData.experience}
                          onChange={(e) => setFormData({ ...formData, experience: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. 10"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className={labelClass}>Specialization</label>
                        <input
                          type="text"
                          value={formData.specialization}
                          onChange={(e) => setFormData({ ...formData, specialization: e.target.value })}
                          className={inputClass}
                          placeholder="e.g. Machine Learning, Data Structures"
                        />
                      </div>
                    </>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={`w-full text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 ${
                      isSubmitting
                        ? 'bg-gray-400 cursor-not-allowed'
                        : selectedRole === 'faculty'
                          ? 'bg-indigo-600 shadow-indigo-200 hover:bg-indigo-700 hover:-translate-y-0.5'
                          : 'bg-blue-600 shadow-blue-200 hover:bg-blue-700 hover:-translate-y-0.5'
                    }`}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 animate-spin" />
                        Saving Profile...
                      </>
                    ) : (
                      <>
                        Complete Setup
                        <CheckCircle className="w-5 h-5" />
                      </>
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
