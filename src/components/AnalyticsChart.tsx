import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { listenToCollection } from '../services/dbService';

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

  const handleStudentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
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

  // ── Chart data computation ──────────────────────────────────────────
  const processChartData = () => {
    const today = new Date();

    if (timeRange === 'Weekly') {
      // Show Sun–Sat of the current week
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      return Array(7).fill(0).map((_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - d.getDay() + i);
        const dateStr = d.toISOString().split('T')[0];

        let dayRecords = attendanceData.filter((r: any) => r.date === dateStr);

        // In admin mode, filter by selected student if any
        if (!isStudentMode && localSelectedStudent !== 'All Students') {
          dayRecords = dayRecords.filter((r: any) => r.userName === localSelectedStudent);
        }

        let attendanceRate = 0;
        if (dayRecords.length > 0) {
          const presentCount = dayRecords.filter(
            (r: any) => r.status === 'Present' || r.status === 'Late'
          ).length;
          // In student mode: 100% or 0% per day (either they checked in or not)
          attendanceRate = isStudentMode
            ? presentCount > 0 ? 100 : 0
            : Math.round((presentCount / dayRecords.length) * 100);
        }
        // Don't show future days
        const isFuture = d > today;

        return {
          name: days[i],
          attendance: isFuture ? null : attendanceRate,
        };
      });
    } else {
      // Monthly: last 4 weeks
      return Array(4).fill(0).map((_, weekIdx) => {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (3 - weekIdx) * 7 - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const weekDates: string[] = [];
        for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
          weekDates.push(d.toISOString().split('T')[0]);
        }

        let weekRecords = attendanceData.filter((r: any) => weekDates.includes(r.date));
        if (!isStudentMode && localSelectedStudent !== 'All Students') {
          weekRecords = weekRecords.filter((r: any) => r.userName === localSelectedStudent);
        }

        let rate = 0;
        if (weekRecords.length > 0) {
          const presentCount = weekRecords.filter(
            (r: any) => r.status === 'Present' || r.status === 'Late'
          ).length;
          rate = isStudentMode
            ? Math.round((presentCount / Math.min(weekDates.length, 5)) * 100) // out of weekdays
            : Math.round((presentCount / weekRecords.length) * 100);
        }

        return {
          name: `Week ${weekIdx + 1}`,
          attendance: rate,
        };
      });
    }
  };

  const chartData = processChartData();

  // ── Best student (admin mode only) ──────────────────────────────────
  const getBestStudent = () => {
    if (isStudentMode) return null;
    if (students.length === 0) return { name: '—', score: '—', photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=unknown` };
    const best = [...students].sort((a, b) => {
      const pa = parseFloat(a.attendance) || 0;
      const pb = parseFloat(b.attendance) || 0;
      return pb - pa;
    })[0];
    return {
      name: best?.name || '—',
      score: best?.attendance || '—',
      photoURL: best?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${best?.name || 'best'}`,
    };
  };

  const bestStudent = getBestStudent();

  return (
    <div className={`${isStudentMode ? '' : 'col-span-1 lg:col-span-2'} bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6`}>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-800">Attendance Analytics</h3>
          <p className="text-xs text-gray-500">
            {isStudentMode ? 'Your personal attendance trend' : 'Track attendance trends over time'}
          </p>
        </div>
        <div className="bg-gray-100 p-1 rounded-lg flex w-full sm:w-auto overflow-x-auto gap-2">
          {/* Student dropdown — admin mode only */}
          {!isStudentMode && (
            <div className="relative flex-1 sm:flex-none">
              <select
                value={localSelectedStudent}
                onChange={handleStudentChange}
                className="w-full appearance-none bg-gray-50 border border-gray-200 text-[10px] font-bold text-gray-600 py-1 pl-3 pr-8 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="All Students">All Students</option>
                {students.map((s) => (
                  <option key={s.uid || s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <ChevronDown className="h-3 w-3" />
              </div>
            </div>
          )}
          <div className="bg-gray-100 p-1 rounded-lg flex shrink-0">
            <button
              onClick={() => setTimeRange('Weekly')}
              className={`px-4 py-1 text-[10px] font-bold rounded shadow-sm ${timeRange === 'Weekly' ? 'bg-white text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}
            >
              Weekly
            </button>
            <button
              onClick={() => setTimeRange('Monthly')}
              className={`px-4 py-1 text-[10px] font-bold rounded shadow-sm ${timeRange === 'Monthly' ? 'bg-white text-gray-800' : 'text-gray-500 hover:bg-gray-200'}`}
            >
              Monthly
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 mb-8">
        <div className={`flex flex-col ${!isStudentMode ? 'lg:flex-row' : ''} gap-8 lg:h-64`}>
          {/* Chart */}
          <div className="flex-1 relative flex flex-col min-h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 12, fill: '#9ca3af' }}
                  domain={[0, 100]}
                  ticks={[0, 25, 50, 75, 100]}
                  tickFormatter={(v) => `${v}%`}
                />
                <Tooltip
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`${value}%`, 'Attendance']}
                />
                <Area
                  type="monotone"
                  dataKey="attendance"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  fillOpacity={1}
                  fill="url(#colorAttendance)"
                  connectNulls={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Best Student Spotlight (admin only) */}
          {!isStudentMode && bestStudent && (
            <div className="w-full lg:w-56 bg-blue-50/50 rounded-2xl p-6 border border-blue-100 flex flex-col items-center justify-center text-center">
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-4">Best of Month</p>
              <div className="relative mb-3">
                <div className="absolute inset-0 bg-blue-200 blur-lg opacity-20 rounded-full" />
                <img
                  alt="Best Student"
                  className="w-20 h-20 rounded-full border-4 border-white shadow-sm relative z-10 object-cover"
                  src={bestStudent.photoURL}
                />
                <div className="absolute -bottom-1 -right-1 bg-yellow-400 rounded-full p-1.5 shadow-sm z-20">
                  <svg className="h-4 w-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                </div>
              </div>
              <h4 className="text-sm font-bold text-gray-800">{bestStudent.name}</h4>
              <div className="mt-3">
                <p className="text-[10px] text-gray-500 font-medium">Attendance Score</p>
                <p className="text-lg font-bold text-blue-600">{bestStudent.score}</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
