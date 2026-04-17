import React, { useState, useEffect } from 'react';
import { Users, Clock, XCircle, UserCheck, Zap, Loader2, CheckCircle2 } from 'lucide-react';
import StatCard from './StatCard';
import AttendanceTable from './AttendanceTable';
import LeaveReports from './LeaveReports';
import AnalyticsChart from './AnalyticsChart';
import { listenToCollection } from '../services/dbService';

export default function Dashboard() {
  const [selectedStudentName, setSelectedStudentName] = useState('All Students');
  const [students, setStudents] = useState<any[]>([]);
  const [attendance, setAttendance] = useState<any[]>([]);
  const [leaveRequests, setLeaveRequests] = useState<any[]>([]);
  const [isActivating, setIsActivating] = useState(false);
  const [isActivated, setIsActivated] = useState(false);

  useEffect(() => {
    const unsubUsers = listenToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student'));
    });
    const unsubAtt = listenToCollection('attendance', setAttendance);
    const unsubLeave = listenToCollection('leaveRequests', setLeaveRequests);
    return () => {
      unsubUsers();
      unsubAtt();
      unsubLeave();
    };
  }, []);

  const handleActivate = () => {
    if (isActivating) return;
    if (isActivated) {
      setIsActivated(false);
      return;
    }
    setIsActivating(true);
    setTimeout(() => {
      setIsActivating(false);
      setIsActivated(true);
    }, 2000);
  };

  const totalStudents = students.length;
  const today = new Date().toISOString().split('T')[0];
  const todayAttendance = attendance.filter(a => a.date === today);
  
  const presentCount = todayAttendance.filter(a => a.status === 'Present').length;
  const lateCount = todayAttendance.filter(a => a.status === 'Late').length;
  const absentCount = todayAttendance.filter(a => a.status === 'Absent').length;
  
  const onLeaveCount = leaveRequests.filter(lr => {
    return lr.status === 'Approved' && lr.fromDate <= today && lr.toDate >= today;
  }).length;

  const presentPercentage = totalStudents > 0 ? Math.round((presentCount / totalStudents) * 100) : 0;
  const latePercentage = totalStudents > 0 ? Math.round((lateCount / totalStudents) * 100) : 0;
  const absentPercentage = totalStudents > 0 ? Math.round((absentCount / totalStudents) * 100) : 0;
  const leavePercentage = totalStudents > 0 ? Math.round((onLeaveCount / totalStudents) * 100) : 0;

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      {/* Dashboard Intro */}
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Good Morning, Rama Krishna</h2>
            <p className="text-sm text-gray-500">Monitor student attendance in real-time</p>
          </div>
          <button 
            onClick={handleActivate}
            disabled={isActivating}
            className={`w-full sm:w-auto text-white text-xs py-2.5 px-6 rounded-lg font-bold shadow-lg transition-all duration-300 flex items-center justify-center ${
              isActivated 
                ? 'bg-green-500 shadow-green-200 hover:bg-green-600' 
                : 'bg-blue-600 shadow-blue-200 hover:bg-blue-700'
            }`}
          >
            {isActivating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Activating...
              </>
            ) : isActivated ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2 animate-bounce" />
                Windows Activated
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" />
                Activate Windows
              </>
            )}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-8">
        <StatCard 
          title="Present Today"
          value={presentCount.toString()}
          total={totalStudents.toString()}
          percentage={`${presentPercentage}%`}
          trend="Today"
          trendUp={true}
          icon={<Users className="h-6 w-6 text-blue-600" />}
          colorClass="text-blue-600"
          bgClass="bg-blue-50"
          progressColorClass="bg-blue-500"
        />
        <StatCard 
          title="Late Arrivals"
          value={lateCount.toString()}
          total={totalStudents.toString()}
          percentage={`${latePercentage}%`}
          trend="Needs Attention"
          trendUp={false}
          icon={<Clock className="h-6 w-6 text-orange-400" />}
          colorClass="text-orange-400"
          bgClass="bg-orange-50"
          progressColorClass="bg-orange-400"
        />
        <StatCard 
          title="Absent"
          value={absentCount.toString()}
          total={totalStudents.toString()}
          percentage={`${absentPercentage}%`}
          trend="Action Required"
          trendUp={false}
          icon={<XCircle className="h-6 w-6 text-red-500" />}
          colorClass="text-red-500"
          bgClass="bg-red-50"
          progressColorClass="bg-red-400"
        />
        <StatCard 
          title="On Leave"
          value={onLeaveCount.toString()}
          total={totalStudents.toString()}
          percentage={`${leavePercentage}%`}
          trend="Approved"
          trendUp={true}
          icon={<UserCheck className="h-6 w-6 text-green-500" />}
          colorClass="text-green-500"
          bgClass="bg-green-50"
          progressColorClass="bg-green-500"
        />
      </div>

      {/* Layout Grid (Attendance & Leave Reports) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 mb-8">
        <AttendanceTable />
        <LeaveReports />
      </div>

      {/* Bottom Section (Analytics) */}
      <div className="grid grid-cols-1 gap-4 sm:gap-8">
        <AnalyticsChart 
          selectedStudent={selectedStudentName} 
          onStudentSelect={setSelectedStudentName} 
        />
      </div>
    </div>
  );
}
