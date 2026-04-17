import React, { useState, useEffect } from 'react';
import { Filter, Download, Search } from 'lucide-react';
import { listenToCollection } from '../services/dbService';
import toast from 'react-hot-toast';

export default function AttendanceTable() {
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilter, setShowFilter] = useState(false);

  useEffect(() => {
    const unsubscribe = listenToCollection('attendance', (data) => {
      // Sort by date and checkInTime descending
      const sorted = data.sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.checkInTime || '00:00:00'}`).getTime();
        const dateB = new Date(`${b.date}T${b.checkInTime || '00:00:00'}`).getTime();
        return dateB - dateA;
      });
      setAttendanceRecords(sorted);
    });

    return () => unsubscribe();
  }, []);

  const filteredRecords = attendanceRecords.filter(record => {
    const searchLower = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
                          (record.userName || '').toLowerCase().includes(searchLower) ||
                          (record.rollNo || '').toLowerCase().includes(searchLower) ||
                          (record.course || '').toLowerCase().includes(searchLower);
    const matchesStatus = statusFilter === 'All' || record.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatTime = (isoString: string | null) => {
    if (!isoString) return '--:--';
    return new Date(isoString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleExport = () => {
    if (filteredRecords.length === 0) {
      toast.error("No data to export.");
      return;
    }
    
    const headers = ['Student Name', 'Roll No', 'Course', 'Date', 'Check-in Time', 'Check-out Time', 'Status'];
    const csvContent = [
      headers.join(','),
      ...filteredRecords.map(r => [
        `"${r.userName || ''}"`,
        `"${r.rollNo || ''}"`,
        `"${r.course || ''}"`,
        `"${r.date || ''}"`,
        `"${formatTime(r.checkInTime)}"`,
        `"${formatTime(r.checkOutTime)}"`,
        `"${r.status || ''}"`
      ].join(','))
    ].join('\n');

    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
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
    <div className="col-span-1 lg:col-span-2 bg-white rounded-xl border border-gray-100 shadow-sm p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div>
          <h3 className="text-base font-bold text-gray-800">Daily Attendance</h3>
          <p className="text-xs text-gray-500">Today's students check-in / check-out status</p>
        </div>
        <div className="flex space-x-2 w-full sm:w-auto relative">
          <button 
            onClick={() => setShowFilter(!showFilter)}
            className="flex-1 sm:flex-none justify-center items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 flex transition-colors"
          >
            <Filter className="h-3 w-3 mr-1.5" />
            Filter
          </button>
          {showFilter && (
            <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-10 py-1">
              {['All', 'Present', 'Late', 'Absent'].map(status => (
                <button
                  key={status}
                  onClick={() => { setStatusFilter(status); setShowFilter(false); }}
                  className={`w-full text-left px-4 py-2 text-xs hover:bg-gray-50 ${statusFilter === status ? 'font-bold text-blue-600' : 'text-gray-700'}`}
                >
                  {status}
                </button>
              ))}
            </div>
          )}
          <button 
            onClick={handleExport}
            className="flex-1 sm:flex-none justify-center items-center px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 flex transition-colors"
          >
            <Download className="h-3 w-3 mr-1.5" />
            Export
          </button>
        </div>
      </div>
      <div className="relative mb-4">
        <input 
          className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500" 
          placeholder="Search by name, roll no, or course" 
          type="text" 
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-gray-400" />
        </span>
      </div>
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
                <td colSpan={6} className="py-8 text-center text-gray-500 text-sm">No attendance records found.</td>
              </tr>
            )}
            {filteredRecords.map((record, idx) => (
              <tr key={record.id || idx} className="text-xs hover:bg-gray-50/50 transition-colors">
                <td className="py-4 px-2">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                      {record.userName?.charAt(0) || 'U'}
                    </div>
                    <div>
                      <p className="font-semibold text-gray-800">{record.userName}</p>
                      <p className="text-[10px] text-gray-400">{record.rollNo}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 px-2 text-gray-600">{record.course}</td>
                <td className="py-4 px-2 text-gray-600">{record.date}</td>
                <td className="py-4 px-2 text-gray-600">
                  {formatTime(record.checkInTime)}
                </td>
                <td className="py-4 px-2 text-gray-600">
                  {formatTime(record.checkOutTime)}
                </td>
                <td className="py-4 px-2">
                  {record.status === 'Late' ? (
                    <span className="bg-orange-50 text-orange-600 px-2 py-1 rounded text-[10px] font-bold flex items-center w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-orange-400 mr-1.5"></span>
                      Late
                    </span>
                  ) : record.status === 'Present' ? (
                    <span className="bg-green-50 text-green-600 px-2 py-1 rounded text-[10px] font-bold flex items-center w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5"></span>
                      Present
                    </span>
                  ) : (
                    <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-[10px] font-bold flex items-center w-fit">
                      <span className="w-1.5 h-1.5 rounded-full bg-red-500 mr-1.5"></span>
                      Absent
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
