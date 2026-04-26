import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { listenToCollection } from '../services/dbService';
import CustomDropdown from './CustomDropdown';

interface AnalyticsChartProps {
  // Admin mode: can switch between students
  selectedStudent?: string;
  onStudentSelect?: (studentName: string) => void;
  // Student mode: locked to this user's data
  userId?: string;
}

export default function AnalyticsChart({
  selectedStudent = 'All Students',
  onStudentSelect,
  userId,
}: AnalyticsChartProps) {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [localSelectedStudent, setLocalSelectedStudent] = useState(selectedStudent);
  const [timeRange, setTimeRange] = useState('Weekly');

  const isStudentMode = !!userId;

  useEffect(() => {
    setLocalSelectedStudent(selectedStudent);
  }, [selectedStudent]);

  const handleStudentChange = (val: string) => {
    setLocalSelectedStudent(val);
    if (onStudentSelect) onStudentSelect(val);
  };

  useEffect(() => {
    // In student mode: subscribe only to this user's attendance
    const unsubAttendance = listenToCollection(
      'attendance',
      (data) => setAttendanceData(data),
      isStudentMode ? userId : undefined
    );

    let unsubUsers: (() => void) | undefined;
    if (!isStudentMode) {
      unsubUsers = listenToCollection('users', (data) => {
        setStudents(data.filter((u: any) => u.role === 'student'));
      });
    }

    return () => {
      unsubAttendance();
      if (unsubUsers) unsubUsers();
    };
  }, [userId, isStudentMode]);

  // ── Analytics Algorithm (Inspired by Python Data Science patterns) ────────
  const processChartData = () => {
    const today = new Date();
    const todayLocalStr = new Date(today.getTime() - (today.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
    const populationCount = isStudentMode ? 1 : (students.length > 0 ? students.length : 1);

    if (timeRange === 'Weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      // We look at the current week (Sun to Sat)
      return Array(7).fill(0).map((_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - d.getDay() + i);
        const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        let dayRecords = attendanceData.filter((r: any) => r.date === dateStr);
        if (!isStudentMode && localSelectedStudent !== 'All Students') {
          dayRecords = dayRecords.filter((r: any) => r.userName === localSelectedStudent);
        }

        // Deduplicate: Count unique userIds per day to ensure accuracy (no 400% logic)
        const uniquePresent = new Set(
          dayRecords
            .filter((r: any) => r.status === 'Present' || r.status === 'Late')
            .map((r: any) => r.userId)
        ).size;

        let attendanceRate = 0;
        if (isStudentMode || localSelectedStudent !== 'All Students') {
          attendanceRate = uniquePresent > 0 ? 100 : 0;
        } else {
          attendanceRate = Math.round((uniquePresent / populationCount) * 100);
        }

        const isFuture = dateStr > todayLocalStr;
        return {
          name: days[i],
          attendance: isFuture ? null : attendanceRate,
        };
      });
    } else {
      // Monthly: Show 4 weeks leading up to today
      return Array(4).fill(0).map((_, weekIdx) => {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (3 - weekIdx) * 7 - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const weekDates: string[] = [];
        let validOperationDays = 0;

        for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
          const dStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
          weekDates.push(dStr);
          // Only count weekdays that have already passed or are today
          if (d.getDay() !== 0 && d.getDay() !== 6 && dStr <= todayLocalStr) {
            validOperationDays++;
          }
        }

        let weekRecords = attendanceData.filter((r: any) => weekDates.includes(r.date));
        if (!isStudentMode && localSelectedStudent !== 'All Students') {
          weekRecords = weekRecords.filter((r: any) => r.userName === localSelectedStudent);
        }

        // Total unique check-ins in this week
        // Note: For a week-wide "Rate", we need to sum the unique check-ins per day
        let totalDailyUniques = 0;
        weekDates.forEach(ds => {
          if (ds > todayLocalStr) return;
          const dayUniques = new Set(
            weekRecords
              .filter((r: any) => r.date === ds && (r.status === 'Present' || r.status === 'Late'))
              .map((r: any) => r.userId)
          ).size;
          totalDailyUniques += dayUniques;
        });

        let rate = 0;
        if (validOperationDays > 0) {
          if (isStudentMode || localSelectedStudent !== 'All Students') {
            rate = Math.round((totalDailyUniques / validOperationDays) * 100);
          } else {
            rate = Math.round((totalDailyUniques / (populationCount * validOperationDays)) * 100);
          }
        }

        return {
          name: `Week ${weekIdx + 1}`,
          attendance: rate,
        };
      });
    }
  };

  const chartData = React.useMemo(() => processChartData(), [attendanceData, students, localSelectedStudent, timeRange, isStudentMode]);

  // ── Monthly Deep Analysis (Data Science Insights) ──────────────────
  const getMonthlyAnalysis = () => {
    const today = new Date();
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysElapsed = today.getDate();
    
    // Count weekdays in month so far
    let weekdaysSoFar = 0;
    for (let i = 1; i <= daysElapsed; i++) {
      const d = new Date(today.getFullYear(), today.getMonth(), i);
      if (d.getDay() !== 0 && d.getDay() !== 6) weekdaysSoFar++;
    }

    if (localSelectedStudent === 'All Students' && !isStudentMode) {
      // Return Best Student of Month logic
      if (students.length === 0) return { type: 'spotlight', name: '—', score: '—', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=none' };
      
      const studentsWithStats = students.map(s => {
        const studentRecords = attendanceData.filter(r => r.userId === (s.uid || s.id) && new Date(r.date) >= monthStart);
        const uniqueDays = new Set(studentRecords.filter(r => r.status === 'Present' || r.status === 'Late').map(r => r.date)).size;
        const rate = weekdaysSoFar > 0 ? Math.round((uniqueDays / weekdaysSoFar) * 100) : 0;
        return { ...s, monthlyRate: rate };
      });

      const best = studentsWithStats.sort((a, b) => b.monthlyRate - a.monthlyRate)[0];
      return {
        type: 'spotlight',
        name: best?.name || '—',
        score: `${best?.monthlyRate || 0}%`,
        photoURL: best?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${best?.name || 'best'}`,
        label: 'Best of Month'
      };
    } else {
      // Individual User Analysis (Ongoing Data)
      const targetName = isStudentMode ? students.find(s => (s.uid || s.id) === userId)?.name : localSelectedStudent;
      const targetUser = students.find(s => s.name === targetName) || (isStudentMode ? { id: userId, name: 'You' } : null);
      
      if (!targetUser) return null;

      const userRecords = attendanceData.filter(r => 
        (r.userName === targetName || r.userId === (targetUser.uid || targetUser.id)) && 
        new Date(r.date) >= monthStart
      );

      const presentDays = new Set(userRecords.filter(r => r.status === 'Present').map(r => r.date)).size;
      const lateDays = new Set(userRecords.filter(r => r.status === 'Late').map(r => r.date)).size;
      const totalPresent = presentDays + lateDays;
      
      const attendanceRate = weekdaysSoFar > 0 ? Math.round((totalPresent / weekdaysSoFar) * 100) : 0;
      const punctualityRate = totalPresent > 0 ? Math.round((presentDays / totalPresent) * 100) : 100;

      return {
        type: 'analysis',
        name: targetUser.name,
        photoURL: targetUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${targetUser.name}`,
        rate: `${attendanceRate}%`,
        punctuality: `${punctualityRate}%`,
        present: totalPresent,
        late: lateDays,
        missed: Math.max(0, weekdaysSoFar - totalPresent),
        label: 'Monthly Analysis'
      };
    }
  };

  const analysis = React.useMemo(() => getMonthlyAnalysis(), [attendanceData, students, localSelectedStudent, isStudentMode]);

  return (
    <div className={`${isStudentMode ? '' : 'col-span-1 lg:col-span-2'} bg-white rounded-3xl border border-gray-100/80 shadow-sm p-3 sm:p-6`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 gap-3 sm:gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-800">Attendance Analytics</h3>
          <p className="text-xs text-gray-500">
            {isStudentMode ? 'Your personal attendance trend' : 'Track attendance trends over time'}
          </p>
        </div>
        <div className="bg-gray-100 p-1 rounded-lg flex w-full sm:w-auto overflow-x-auto gap-2">
          {!isStudentMode && (
            <CustomDropdown
              options={[
                { value: "All Students", label: "All Students" },
                ...students.map((s) => ({ value: s.name, label: s.name }))
              ]}
              value={localSelectedStudent}
              onChange={handleStudentChange}
              className="w-full sm:w-48"
            />
          )}
          <div className="bg-gray-100 p-1 rounded-lg flex shrink-0">
            <button
              onClick={() => setTimeRange('Weekly')}
              className={`px-4 py-1.5 text-[10px] font-bold rounded shadow-sm transition-all ${timeRange === 'Weekly' ? 'bg-white text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeRange('Monthly')}
              className={`px-4 py-1.5 text-[10px] font-bold rounded shadow-sm transition-all ${timeRange === 'Monthly' ? 'bg-white text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-4">
        <div className={`flex flex-col ${!isStudentMode ? 'lg:flex-row' : ''} gap-8 h-[400px] sm:h-[450px] lg:h-72`}>
          {/* Chart Section */}
          <div className="flex-1 relative flex flex-col min-h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#9ca3af', fontWeight: 600 }} domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={(v) => `${v}%`} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', padding: '12px' }} formatter={(value: number) => [`${value}%`, 'Rate']} />
                <Area type="monotone" dataKey="attendance" stroke="#3B82F6" strokeWidth={4} fillOpacity={1} fill="url(#colorAttendance)" connectNulls={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Dynamic Spotlight / Analysis Card */}
          {analysis && (
            <div className={`w-full lg:w-64 bg-gradient-to-br ${analysis.type === 'spotlight' ? 'from-blue-50 to-indigo-50 border-blue-100' : 'from-gray-50 to-white border-gray-100'} rounded-2xl p-6 border flex flex-col items-center text-center shadow-sm relative overflow-hidden group`}>
              {analysis.type === 'spotlight' && <div className="absolute -top-10 -right-10 w-24 h-24 bg-yellow-400/10 rounded-full blur-2xl group-hover:bg-yellow-400/20 transition-all duration-700" />}
              
              <p className={`text-[10px] font-black uppercase tracking-widest mb-4 ${analysis.type === 'spotlight' ? 'text-blue-600' : 'text-gray-400'}`}>
                {analysis.label}
              </p>

              <div className="relative mb-4">
                <div className={`absolute inset-0 blur-xl opacity-20 rounded-full ${analysis.type === 'spotlight' ? 'bg-blue-400' : 'bg-gray-400'}`} />
                <img alt={analysis.name} className={`w-20 h-20 rounded-full border-4 border-white shadow-md relative z-10 object-cover transition-transform group-hover:scale-110 duration-500`} src={analysis.photoURL} />
                {analysis.type === 'spotlight' && (
                  <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1.5 shadow-lg z-20 border-2 border-white">
                    <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
                  </div>
                )}
              </div>

              <h4 className="text-sm font-black text-gray-800 mb-4 truncate w-full">{analysis.name}</h4>

              {analysis.type === 'spotlight' ? (
                <div className="w-full pt-4 border-t border-blue-100/50">
                  <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tight mb-1">Monthly Score</p>
                  <p className="text-3xl font-black text-blue-600 tracking-tighter">{analysis.score}</p>
                </div>
              ) : (
                <div className="w-full grid grid-cols-2 gap-y-4 pt-4 border-t border-gray-100">
                  <div className="text-left">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Attendance</p>
                    <p className="text-sm font-black text-indigo-600">{analysis.rate}</p>
                  </div>
                  <div className="text-left">
                    <p className="text-[9px] text-gray-400 font-bold uppercase">Punctuality</p>
                    <p className="text-sm font-black text-emerald-500">{analysis.punctuality}</p>
                  </div>
                  <div className="text-left col-span-2 grid grid-cols-3 gap-2">
                    <div className="bg-green-50 rounded-lg p-1.5">
                      <p className="text-[8px] text-green-600 font-bold uppercase">Pres</p>
                      <p className="text-xs font-black text-green-700">{analysis.present}</p>
                    </div>
                    <div className="bg-orange-50 rounded-lg p-1.5">
                      <p className="text-[8px] text-orange-600 font-bold uppercase">Late</p>
                      <p className="text-xs font-black text-orange-700">{analysis.late}</p>
                    </div>
                    <div className="bg-red-50 rounded-lg p-1.5">
                      <p className="text-[8px] text-red-600 font-bold uppercase">Miss</p>
                      <p className="text-xs font-black text-red-700">{analysis.missed}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
