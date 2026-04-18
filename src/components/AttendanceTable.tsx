import React, { useState, useEffect } from 'react';
import { Filter, Download, Search, Info, CalendarDays, History } from 'lucide-react';
import { listenToCollection } from '../services/dbService';
import toast from 'react-hot-toast';

const TODAY = new Date().toISOString().split('T')[0];

export default function AttendanceTable() {
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilter, setShowFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'today' | 'all'>('today');

  useEffect(() => {
    const unsubscribe = listenToCollection('attendance', (data) => {
      const parseDateTime = (dateStr: string, timeStr: string | null) => {
        if (!timeStr) return new Date(dateStr).getTime();
        if (timeStr.includes('T') || timeStr.includes('-')) return new Date(timeStr).getTime();
        return new Date(`${dateStr}T${timeStr}`).getTime();
      };

      const sorted = [...data].sort((a, b) => {
        const timeA = parseDateTime(a.date, a.checkInTime);
        const timeB = parseDateTime(b.date, b.checkInTime);
        return timeB - timeA;
      });
      setAttendanceRecords(sorted);
    });

    return () => unsubscribe();
  }, []);

  // Apply today filter + search + status filter
  const filteredRecords = attendanceRecords.filter(record => {
    const matchesToday = viewMode === 'all' || record.date === TODAY;
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      (record.userName || '').toLowerCase().includes(searchLower) ||
      (record.rollNo || '').toLowerCase().includes(searchLower) ||
      (record.course || '').toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
    return matchesToday && matchesSearch && matchesStatus;
  });

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    const date =
      timeStr.includes('T') || timeStr.includes('-')
        ? new Date(timeStr)
        : new Date(`2000-01-01T${timeStr}`);
    if (isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleExport = () => {
    if (filteredRecords.length === 0) {
      toast.error('No data to export.');
      return;
    }

    const headers = ['Student Name', 'Roll No', 'Course', 'Date', 'Check-in Time', 'Check-out Time', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(r =>
        [
          `"${r.userName || ''}"`,
          `"${r.rollNo || ''}"`,
          `"${r.course || ''}"`,
          `"${r.date || ''}"`,
          `"${formatTime(r.checkInTime)}"`,
          `"${formatTime(r.checkOutTime)}"`,
          `"${r.status || ''}"`,
        ].join(',')
      ),
    ].join('\n');

    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute(
        'download',
        `attendance_report_${new Date().toISOString().split('T')[0]}.csv`
      );
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => toast.success('Report exported successfully!'), 500);
    } catch {
      toast.success('Report generated! (Download may be blocked by your browser)');
    }
  };

  return (
    <div className="col-span-1 lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
        <div>
          <h3 className="text-base font-bold text-gray-800">
            {viewMode === 'today' ? "Today's Attendance" : 'All Attendance Records'}
          </h3>
          <p className="text-xs text-gray-500">
            {viewMode === 'today'
              ? `${filteredRecords.length} check-in${filteredRecords.length !== 1 ? 's' : ''} recorded today`
              : 'Full attendance history'}
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {/* Today / All toggle */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 shrink-0">
            <button
              onClick={() => setViewMode('today')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'today'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <CalendarDays className="h-3 w-3" />
              Today
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${
                viewMode === 'all'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <History className="h-3 w-3" />
              All Time
            </button>
          </div>

          {/* Filter */}
          <div className="relative">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${
                statusFilter !== 'All'
                  ? 'bg-blue-50 border-blue-200 text-blue-700'
                  : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Filter className="h-3 w-3 mr-1.5" />
              {statusFilter === 'All' ? 'Filter' : statusFilter}
            </button>
            {showFilter && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowFilter(false)} />
                <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-20 py-1">
                  {['All', 'Present', 'Late', 'Absent'].map(status => (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status); setShowFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 ${
                        statusFilter === status ? 'font-bold text-blue-600' : 'text-gray-700'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Export */}
          <button
            onClick={handleExport}
            className="flex items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Download className="h-3 w-3 mr-1.5" />
            Export
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-4">
        <input
          className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Search by name, roll no, or course"
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto max-h-[300px]">
        <table className="w-full min-w-[600px] relative">
          <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_#f9fafb]">
            <tr className="text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider border-b border-gray-50">
              <th className="pb-3 px-2">Student</th>
              <th className="pb-3 px-2">Course</th>
              <th className="pb-3 px-2">Date</th>
              <th className="pb-3 px-2">Check-in</th>
              <th className="pb-3 px-2">Check-out</th>
              <th className="pb-3 px-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {filteredRecords.length === 0 && (
              <tr>
                <td colSpan={6} className="py-12 text-center text-gray-500 text-sm">
                  <div className="flex flex-col items-center gap-2">
                    <CalendarDays className="w-8 h-8 text-gray-200" />
                    <span>
                      {viewMode === 'today'
                        ? 'No check-ins recorded yet today.'
                        : 'No attendance records found.'}
                    </span>
                  </div>
                </td>
              </tr>
            )}
            {filteredRecords.map((record, idx) => {
              const checkInTimestamp = record.checkInTime
                ? record.checkInTime.includes('T') || record.checkInTime.includes('-')
                  ? new Date(record.checkInTime).getTime()
                  : new Date(`${record.date}T${record.checkInTime}`).getTime()
                : 0;
              const isNew = checkInTimestamp > 0 && Date.now() - checkInTimestamp < 30000;

              return (
                <tr
                  key={record.id || idx}
                  className={`text-xs transition-all duration-500 ${
                    isNew
                      ? 'bg-blue-50/80 animate-in fade-in slide-in-from-left-2'
                      : 'hover:bg-gray-50/50'
                  }`}
                >
                  <td className="py-4 px-2">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs transition-colors shadow-sm ${
                            isNew ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-600'
                          }`}
                        >
                          {record.userName?.charAt(0) || 'U'}
                        </div>
                        {isNew && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 border-2 border-white rounded-full animate-ping" />
                        )}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-semibold text-gray-800">{record.userName}</p>
                          {isNew && (
                            <span className="bg-blue-600 text-white text-[7px] font-black uppercase px-1.5 py-0.5 rounded-full tracking-tighter">
                              Just Now
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400">{record.rollNo}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-2 text-gray-600">{record.course}</td>
                  <td className="py-4 px-2 text-gray-600">{record.date}</td>
                  <td className="py-4 px-2 text-gray-600 font-medium">{formatTime(record.checkInTime)}</td>
                  <td className="py-4 px-2 text-gray-600 font-medium">{formatTime(record.checkOutTime)}</td>
                  <td className="py-4 px-2">
                    {record.status === 'Late' ? (
                      <div className="group relative w-fit">
                        <span className="bg-orange-50 text-orange-600 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center w-fit cursor-help shadow-sm border border-orange-100 ring-2 ring-transparent group-hover:ring-orange-200 transition-all">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mr-2 animate-pulse" />
                          Late
                        </span>
                        {record.lateReason && (
                          <div className="absolute bottom-full left-0 mb-3 w-64 p-4 bg-white border border-gray-100 rounded-2xl shadow-2xl z-50 opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-500 transform translate-y-2 group-hover:translate-y-0 backdrop-blur-sm">
                            <div className="flex items-center gap-2 mb-2 border-b border-gray-50 pb-2">
                              <Info className="w-3.5 h-3.5 text-orange-500" />
                              <span className="text-[9px] font-black uppercase tracking-widest text-gray-400">
                                Late Reason
                              </span>
                            </div>
                            <p className="text-[11px] leading-relaxed italic text-gray-700 font-medium">
                              "{record.lateReason}"
                            </p>
                            {record.lateReasonImage && (
                              <img
                                src={record.lateReasonImage}
                                alt="Proof"
                                className="mt-3 rounded-xl w-full h-24 object-cover border border-gray-100 shadow-inner"
                              />
                            )}
                            <div className="mt-3 pt-2 border-t border-gray-50 flex justify-between items-center">
                              <span className="text-[8px] font-bold text-gray-400 uppercase">Status</span>
                              <span
                                className={`text-[8px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${
                                  record.lateReasonStatus === 'Approved'
                                    ? 'bg-green-100 text-green-700'
                                    : record.lateReasonStatus === 'Rejected'
                                    ? 'bg-red-100 text-red-700'
                                    : 'bg-orange-100 text-orange-700 animate-pulse'
                                }`}
                              >
                                {record.lateReasonStatus || 'Pending Review'}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : record.status === 'Present' ? (
                      <span className="bg-green-50 text-green-600 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center w-fit shadow-sm border border-green-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-2" />
                        Present
                      </span>
                    ) : (
                      <span className="bg-red-50 text-red-600 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center w-fit shadow-sm border border-red-100">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2" />
                        Absent
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
