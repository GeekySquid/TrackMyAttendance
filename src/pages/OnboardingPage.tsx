import React, { useState, useRef, useEffect } from 'react';
  import { Camera, Plus, CheckCircle, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getMentors } from '../services/dbService';
import toast from 'react-hot-toast';

export default function OnboardingPage({ user, onComplete }: { user: any, onComplete: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    course: user?.course || '',
    rollNo: user?.rollNo || '',
    phone: '',
    gender: '',
    bloodGroup: '',
    mentorId: '',
    photoURL: user?.photoURL || ''
  });
  const [mentors, setMentors] = useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

      const { error: uploadError, data } = await supabase.storage
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

  useEffect(() => {
    const fetchMentors = async () => {
      const data = await getMentors();
      setMentors(data || []);
    };
    fetchMentors();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[OnboardingPage] Form submitted:', formData);
    setIsSubmitting(true);
    try {
      await onComplete(formData);
      console.log('[OnboardingPage] onComplete finished');
    } catch (error) {
      console.error('[OnboardingPage] Submission error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8 flex justify-center items-center">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-blue-600 p-6 sm:p-8 text-white text-center">
          <h2 className="text-2xl font-bold mb-2">Complete Your Profile</h2>
          <p className="text-blue-100 text-sm">Help us set up your student account</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-6">
          {/* Profile Image Upload */}
          <div className="flex flex-col items-center justify-center mb-8">
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handlePhotoUpload}
            />
            <div 
              className="w-24 h-24 bg-gray-100 rounded-full border-4 border-white shadow-lg flex items-center justify-center relative cursor-pointer hover:bg-gray-200 transition-colors group"
              onClick={() => !isUploading && fileInputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
              ) : (
                <>
                  <img src={formData.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name || 'User'}`} alt="Profile" className="w-full h-full rounded-full object-cover" />
                  <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white" />
                  </div>
                  <div className="absolute bottom-0 right-0 bg-blue-600 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
                    <Plus className="w-4 h-4 text-white" />
                  </div>
                </>
              )}
            </div>
            <p className="text-xs font-bold text-gray-500 mt-3">Upload Photo</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
              <input 
                type="text" 
                required 
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="e.g. Alex Johnson" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Course</label>
              <select 
                required 
                value={formData.course}
                onChange={(e) => setFormData({...formData, course: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Course</option>
                <option value="MCA">MCA</option>
                <option value="B.Tech CS">B.Tech CS</option>
                <option value="B.Tech">B.Tech</option>
                <option value="BCA">BCA</option>
                <option value="M.Tech">M.Tech</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Registration / Roll No.</label>
              <input 
                type="text" 
                required 
                value={formData.rollNo}
                onChange={(e) => setFormData({...formData, rollNo: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="e.g. 2023MCA001" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
              <input 
                type="tel" 
                required 
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" 
                placeholder="+1 (555) 000-0000" 
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Gender</label>
              <select 
                required 
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Gender</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">Blood Group</label>
              <select 
                required 
                value={formData.bloodGroup}
                onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
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
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-1">Assigned Mentor</label>
              <select 
                required 
                value={formData.mentorId}
                onChange={(e) => setFormData({...formData, mentorId: e.target.value})}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select Mentor</option>
                {mentors.map(m => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100">
            <button 
              type="submit" 
              disabled={isSubmitting}
              className={`w-full text-white py-3 rounded-lg font-bold shadow-lg transition-all flex items-center justify-center gap-2 ${
                isSubmitting ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 shadow-blue-200 hover:bg-blue-700'
              }`}
            >
              {isSubmitting ? (
                <>Saving Profile...</>
              ) : (
                <>Complete Setup <CheckCircle className="w-5 h-5" /></>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
