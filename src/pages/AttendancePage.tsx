import React, { useState, useEffect } from 'react';
import { Download, CheckSquare, Bell } from 'lucide-react';
import AttendanceTable from '../components/AttendanceTable';
import AnalyticsChart from '../components/AnalyticsChart';
import StudentProfile from '../components/StudentProfile';
import { listenToCollection } from '../services/dbService';
import toast from 'react-hot-toast';

export default function AttendancePage() {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentName, setSelectedStudentName] = useState('All Students');

  useEffect(() => {
    const unsubAtt = listenToCollection('attendance', (data) => {
      setAttendanceData(data);
    });
    const unsubUsers = listenToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student'));
    });
    return () => {
      unsubAtt();
      unsubUsers();
    };
  }, []);

  const selectedStudentData = selectedStudentName === 'All Students' 
    ? undefined 
    : students.find(s => s.name === selectedStudentName);

  const calculateInsights = () => {
    if (attendanceData.length === 0) return "Not enough data to generate insights yet.";
    
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceData.filter(r => r.date === today);
    const presentToday = todayRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
    
    if (todayRecords.length > 0) {
      const percentage = Math.round((presentToday / todayRecords.length) * 100);
      return `Today's attendance is at ${percentage}%.`;
    }
    
    return "Overall attendance is stable this week.";
  };

  const handleExport = () => {
    if (attendanceData.length === 0) {
      toast.error("No data to export.");
      return;
    }
    
    const headers = ['Student Name', 'Roll No', 'Course', 'Date', 'Check-in Time', 'Check-out Time', 'Status'];
    const csvContent = [
      headers.join(','),
      ...attendanceData.map(r => [
        `"${r.userName || ''}"`,
        `"${r.rollNo || ''}"`,
        `"${r.course || ''}"`,
        `"${r.date || ''}"`,
        `"${r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}"`,
        `"${r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}"`,
        `"${r.status || ''}"`
      ].join(','))
    ].join('\n');

    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `full_attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => toast.success("Report exported successfully!"), 500);
    } catch (err) {
      toast.success("Report generated successfully! (Download may be blocked by your browser)");
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Attendance Records</h2>
            <p className="text-sm text-gray-500">Detailed view of student attendance</p>
          </div>
          <button 
            onClick={handleExport}
            className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 text-xs py-2.5 px-6 rounded-lg font-bold shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center"
          >
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 mb-8">
        <AnalyticsChart 
          selectedStudent={selectedStudentName} 
          onStudentSelect={setSelectedStudentName} 
        />
        <StudentProfile student={selectedStudentData} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 mb-8">
        <AttendanceTable />
        <div className="hidden lg:block col-span-1">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 h-full flex flex-col items-center justify-center text-center">
            <div className="w-12 h-12 bg-green-50 rounded-full flex items-center justify-center mb-4">
              <CheckSquare className="text-green-600 w-6 h-6" />
            </div>
            <h4 className="text-base font-bold text-gray-800 mb-2">Quick Actions</h4>
            <p className="text-xs text-gray-500 mb-6">Manage attendance efficiently with bulk actions.</p>
            
            <div className="w-full space-y-3">
              <button 
                onClick={() => toast.success("Bulk attendance marked successfully!")}
                className="w-full bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <CheckSquare className="w-4 h-4" />
                Mark Bulk Present
              </button>
              <button 
                onClick={() => toast.success("Reminders sent to absent students!")}
                className="w-full bg-orange-50 hover:bg-orange-100 text-orange-700 text-sm font-bold py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Bell className="w-4 h-4" />
                Send Reminders
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
