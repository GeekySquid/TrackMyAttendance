import React, { useState } from 'react';
import { Camera, Plus, CheckCircle } from 'lucide-react';

export default function OnboardingPage({ user, onComplete }: { user: any, onComplete: (data: any) => void }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    course: user?.course || '',
    rollNo: user?.rollNo || '',
    phone: '',
    gender: '',
    bloodGroup: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

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
            <div className="w-24 h-24 bg-gray-100 rounded-full border-4 border-white shadow-lg flex items-center justify-center relative cursor-pointer hover:bg-gray-200 transition-colors group">
              <img src={user?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.name || 'User'}`} alt="Profile" className="w-full h-full rounded-full object-cover" />
              <div className="absolute inset-0 bg-black/20 rounded-full opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <Camera className="w-8 h-8 text-white" />
              </div>
              <div className="absolute bottom-0 right-0 bg-blue-600 w-8 h-8 rounded-full border-2 border-white flex items-center justify-center">
                <Plus className="w-4 h-4 text-white" />
              </div>
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
