import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { listenToCollection } from '../services/dbService';
import CustomDropdown from './CustomDropdown';

interface AnalyticsChartProps {
  // Admin mode: can switch between students
  selectedStudent?: string;
  onStudentSelect?: (studentName: string) => void;
  // Student mode: locked to this user's data
  userId?: string;
}

function AnalyticsChart({
  selectedStudent = 'All Students',
  onStudentSelect,
  userId,
}: AnalyticsChartProps) {

  const isStudentMode = !!userId;
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [localSelectedStudent, setLocalSelectedStudent] = useState(selectedStudent);
  const [timeRange, setTimeRange] = useState<'Weekly' | 'Monthly'>('Weekly');

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

    let rawData = [];

    if (timeRange === 'Weekly') {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      rawData = Array(7).fill(0).map((_, i) => {
        const d = new Date(today);
        d.setDate(d.getDate() - d.getDay() + i);
        const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];

        let dayRecords = attendanceData.filter((r: any) => r.date === dateStr);
        if (!isStudentMode && localSelectedStudent !== 'All Students') {
          dayRecords = dayRecords.filter((r: any) => r.userName === localSelectedStudent);
        }

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
      rawData = Array(4).fill(0).map((_, weekIdx) => {
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - (3 - weekIdx) * 7 - today.getDay());
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekStart.getDate() + 6);

        const weekDates: string[] = [];
        let validOperationDays = 0;

        for (let d = new Date(weekStart); d <= weekEnd; d.setDate(d.getDate() + 1)) {
          const dStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
          weekDates.push(dStr);
          if (d.getDay() !== 0 && d.getDay() !== 6 && dStr <= todayLocalStr) {
            validOperationDays++;
          }
        }

        let weekRecords = attendanceData.filter((r: any) => weekDates.includes(r.date));
        if (!isStudentMode && localSelectedStudent !== 'All Students') {
          weekRecords = weekRecords.filter((r: any) => r.userName === localSelectedStudent);
        }

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

    // Calculate period average for more "Informative Info"
    const validPoints = rawData.filter(d => d.attendance !== null);
    const avg = validPoints.length > 0 
      ? Math.round(validPoints.reduce((acc, curr) => acc + curr.attendance, 0) / validPoints.length) 
      : 0;

    return rawData.map(d => ({ ...d, average: avg }));
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
      if (students.length === 0) return { type: 'spotlight', name: '—', score: '—', photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=none' };

      const studentsWithStats = students.map(s => {
        const studentRecords = attendanceData.filter(r => r.userId === (s.uid || s.id) && new Date(r.date) >= monthStart);
        const uniqueDays = new Set(studentRecords.filter(r => r.status === 'Present' || r.status === 'Late').map(r => r.date)).size;
        const rate = weekdaysSoFar > 0 ? Math.round((uniqueDays / weekdaysSoFar) * 100) : 0;
        return { ...s, monthlyRate: rate, presentDays: uniqueDays };
      });

      const best = studentsWithStats.sort((a, b) => b.monthlyRate - a.monthlyRate)[0];
      return {
        type: 'spotlight',
        name: best?.name || '—',
        email: best?.email || '—',
        id: best?.roll_no || best?.uid || best?.id || '—',
        department: (best as any)?.department || 'Student',
        score: `${best?.monthlyRate || 0}%`,
        presentDays: best?.presentDays || 0,
        photoURL: best?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${best?.name || 'best'}`,
        label: 'Best of Month'
      };
    } else {
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
        email: (targetUser as any)?.email || '—',
        id: (targetUser as any)?.roll_no || (targetUser as any)?.uid || (targetUser as any)?.id || '—',
        department: (targetUser as any)?.department || 'Student',
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
        <div className="bg-gray-100 p-1 rounded-lg flex w-full sm:w-auto flex-wrap sm:flex-nowrap gap-2">
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

      <div className="grid grid-cols-1 gap-6">
        {/* Analysis Overview Header */}
        {analysis && (
          <div className="flex flex-wrap items-center gap-3 sm:gap-6 pb-6 border-b border-gray-50">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className={`absolute inset-0 blur-lg opacity-20 rounded-full ${analysis.type === 'spotlight' ? 'bg-blue-400' : 'bg-indigo-400'}`} />
                <img alt={analysis.name} className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover border-2 border-white shadow-sm relative z-10" src={analysis.photoURL} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest leading-none mb-1">{analysis.label}</p>
                <h4 className="text-sm font-black text-gray-900 leading-tight">{analysis.name}</h4>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                  <p className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    ID: {analysis.id}
                  </p>
                  <p className="text-[9px] font-bold text-gray-400 flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-gray-300" />
                    {analysis.email}
                  </p>
                  <p className="text-[9px] font-black text-indigo-500/80 uppercase tracking-tighter">
                    {analysis.department}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-4 ml-auto">
              {analysis.type === 'analysis' ? (
                <>
                  <div className="bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100/50">
                    <p className="text-[9px] font-black text-blue-400 uppercase tracking-tight">Attendance</p>
                    <p className="text-xs font-black text-blue-700">{analysis.rate}</p>
                  </div>
                  <div className="bg-emerald-50/50 px-3 py-1.5 rounded-xl border border-emerald-100/50">
                    <p className="text-[9px] font-black text-emerald-400 uppercase tracking-tight">Punctuality</p>
                    <p className="text-xs font-black text-emerald-700">{analysis.punctuality}</p>
                  </div>
                  <div className="flex gap-1">
                    <div className="bg-green-100/30 px-2 py-1 rounded-lg text-[10px] font-black text-green-700">{analysis.present}P</div>
                    <div className="bg-orange-100/30 px-2 py-1 rounded-lg text-[10px] font-black text-orange-700">{analysis.late}L</div>
                    <div className="bg-red-100/30 px-2 py-1 rounded-lg text-[10px] font-black text-red-700">{analysis.missed}M</div>
                  </div>
                </>
              ) : (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-700 px-5 py-3 rounded-2xl shadow-lg shadow-blue-100 border border-white/10">
                   <p className="text-[9px] font-black text-blue-100 uppercase tracking-widest opacity-80 mb-1">Monthly Score</p>
                   <div className="flex items-end gap-2">
                     <p className="text-2xl font-black text-white leading-none">{analysis.score}</p>
                     <div className="flex flex-col">
                        <p className="text-[10px] font-black text-blue-100/90 leading-tight">
                          {analysis.presentDays} Days Present
                        </p>
                        {parseInt(analysis.score) >= 90 && (
                          <p className="text-[8px] font-black text-emerald-300 uppercase tracking-tighter mt-0.5">
                            Perfect Record
                          </p>
                        )}
                     </div>
                   </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Chart Section - Now Full Width */}
        <div className="w-full h-[300px] sm:h-[350px] relative mt-2">
          <ResponsiveContainer width="100%" height="100%" className="outline-none">
            <AreaChart 
              data={chartData} 
              margin={{ top: 20, right: 80, left: -20, bottom: 0 }}
              style={{ outline: 'none' }}
            >
              <defs>
                <linearGradient id="colorAttendance" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0} />
                </linearGradient>
                <filter id="shadow" height="200%">
                  <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#2563EB" floodOpacity="0.2"/>
                </filter>
              </defs>
              <CartesianGrid strokeDasharray="6 6" vertical={false} stroke="#f1f5f9" />
              <XAxis 
                dataKey="name" 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 800 }} 
                dy={15} 
              />
              <YAxis 
                axisLine={false} 
                tickLine={false} 
                tick={{ fontSize: 10, fill: '#64748b', fontWeight: 800 }} 
                domain={[0, 100]} 
                ticks={[0, 25, 50, 75, 100]} 
                tickFormatter={(v) => `${v}%`} 
              />
              <Tooltip 
                cursor={{ stroke: '#e2e8f0', strokeWidth: 2, strokeDasharray: '4 4' }}
                offset={20}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const value = payload[0].value as number;
                    const status = value >= 75 ? 'Optimal' : value >= 50 ? 'Warning' : 'Critical';
                    const color = value >= 75 ? '#059669' : value >= 50 ? '#d97706' : '#dc2626';
                    return (
                      <div className="bg-white/95 backdrop-blur-md border border-gray-100 rounded-2xl shadow-2xl p-4 min-w-[160px] z-50">
                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{label}</p>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-black text-gray-800">Attendance</span>
                          <span className="text-sm font-black text-blue-600">{value}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mb-3">
                          <div className="h-full transition-all duration-500" style={{ width: `${value}%`, backgroundColor: color }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-gray-400 uppercase">Status</span>
                          <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md" style={{ backgroundColor: `${color}10`, color }}>{status}</span>
                        </div>
                        {payload[1] && (
                          <div className="mt-3 pt-3 border-t border-gray-50 flex items-center justify-between">
                            <span className="text-[9px] font-black text-gray-400 uppercase">Period Avg</span>
                            <span className="text-[10px] font-black text-gray-600">{payload[1].value}%</span>
                          </div>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              
              {/* Reference Line for Minimum Requirement (75%) */}
              <ReferenceLine 
                y={75} 
                stroke="#F87171" 
                strokeDasharray="4 4" 
                label={{ 
                  value: 'Target (75%)', 
                  position: 'insideRight', 
                  fill: '#F87171', 
                  fontSize: 9, 
                  fontWeight: 900,
                  offset: 10
                }} 
              />

              {/* Period Average Line */}
              <Area
                type="monotone"
                dataKey="average"
                stroke="#94a3b8"
                strokeWidth={1}
                strokeDasharray="5 5"
                fill="transparent"
                animationDuration={2000}
              />

              <Area 
                type="monotone" 
                dataKey="attendance" 
                stroke="#2563EB" 
                strokeWidth={4} 
                fillOpacity={1} 
                fill="url(#colorAttendance)" 
                filter="url(#shadow)"
                connectNulls={false} 
                dot={{ r: 4, fill: '#2563EB', stroke: '#fff', strokeWidth: 2 }}
                activeDot={{ r: 7, stroke: '#fff', strokeWidth: 3, shadow: '0 0 10px rgba(37,99,235,0.5)' }}
                animationDuration={2000}
                animationEasing="ease-in-out"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

export default React.memo(AnalyticsChart);
