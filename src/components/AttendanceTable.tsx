import React, { useState, useEffect } from 'react';
import { Filter, Download, Search, Info, CalendarDays, History, Loader2, MapPin, Navigation, Clock, FileText, FileSpreadsheet, FileIcon as FilePdf, MessageSquare, X, Copy } from 'lucide-react';
import { listenToCollection, updateAttendance } from '../services/dbService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

const TODAY = new Date().toLocaleDateString('en-CA');

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="animate-pulse">
      {[...Array(6)].map((_, i) => (
        <td key={i} className="py-4 px-2">
          <div className="h-3 bg-gray-100 rounded-full" style={{ width: `${60 + (i * 11) % 35}%` }} />
        </td>
      ))}
    </tr>
  );
}

export default function AttendanceTable({ onClose }: { onClose?: () => void }) {
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showFilter, setShowFilter] = useState(false);
  const [viewMode, setViewMode] = useState<'today' | 'all'>('today');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [showReasonModal, setShowReasonModal] = useState(false);

  // Hover & Copy toolkit
  const [hoveredLocId, setHoveredLocId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const hoverLeaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const openTooltip = (id: string) => {
    if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
    setHoveredLocId(id);
  };
  const closeTooltip = () => {
    hoverLeaveTimerRef.current = setTimeout(() => setHoveredLocId(null), 80);
  };

  const handleCopyCoords = (coords: string, id: string) => {
    navigator.clipboard.writeText(coords).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  useEffect(() => {
    setIsLoading(true);
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
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

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

  const { visibleItems, sentinelRef } = useInfiniteScroll(filteredRecords, 10, 5);

  const formatTime = (timeStr: string | null) => {
    if (!timeStr) return '--:--';
    const date =
      timeStr.includes('T') || timeStr.includes('-')
        ? new Date(timeStr)
        : new Date(`2000-01-01T${timeStr}`);
    if (isNaN(date.getTime())) return '--:--';
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const exportCSV = () => {
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

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `attendance_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    toast.success('CSV exported successfully!');
  };

  const exportExcel = () => {
    const data = filteredRecords.map(r => ({
      'Student Name': r.userName || '',
      'Roll No': r.rollNo || '',
      'Course': r.course || '',
      'Date': r.date || '',
      'Check-in Time': formatTime(r.checkInTime),
      'Check-out Time': formatTime(r.checkOutTime),
      'Status': r.status || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");
    XLSX.writeFile(workbook, `attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel exported successfully!');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Attendance Report", 14, 15);
    const headers = [['Student Name', 'Roll', 'Course', 'Date', 'In', 'Out', 'Status']];
    const body = filteredRecords.map(r => [
      r.userName || '',
      r.rollNo || '',
      r.course || '',
      r.date || '',
      formatTime(r.checkInTime),
      formatTime(r.checkOutTime),
      r.status || ''
    ]);

    autoTable(doc, {
      head: headers,
      body: body,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save(`attendance_report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF exported successfully!');
  };

  const handleExport = (type: 'csv' | 'excel' | 'pdf') => {
    if (filteredRecords.length === 0) {
      toast.error('No data to export.');
      return;
    }
    setShowExportMenu(false);
    if (type === 'csv') exportCSV();
    if (type === 'excel') exportExcel();
    if (type === 'pdf') exportPDF();
  };

  return (
    <div className="col-span-1 lg:col-span-2 bg-white rounded-3xl border border-gray-100/80 shadow-sm p-2 sm:p-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-2 sm:mb-3 gap-2">
        <div className="flex items-center justify-between w-full sm:w-auto">
          <div>
            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">
              {viewMode === 'today' ? "Today's Attendance" : 'All Attendance Records'}
              {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />}
            </h3>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="sm:hidden p-1.5 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap sm:flex-nowrap pb-1 sm:pb-0">
          <div className="flex items-center bg-gray-50 p-1 rounded-xl border border-gray-100/50 shrink-0">
            <button
              onClick={() => setViewMode('today')}
              className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${viewMode === 'today' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              Today
            </button>
            <button
              onClick={() => setViewMode('all')}
              className={`px-3 py-1.5 text-[10px] sm:text-xs font-bold rounded-lg transition-all ${viewMode === 'all' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
            >
              History
            </button>
          </div>

          <div className="relative shrink-0">
            <button
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-[10px] sm:text-xs font-bold rounded-lg hover:bg-gray-50 transition-all shadow-sm active:scale-95"
            >
              <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-blue-600" />
              <span>Export</span>
            </button>

            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[70] py-2 animate-in fade-in slide-in-from-top-2">
                  <button onClick={() => { handleExport('csv'); setShowExportMenu(false); }} className="w-full flex items-center px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                    <FileText className="h-3.5 w-3.5 mr-2 text-green-600" /> CSV
                  </button>
                  <button onClick={() => { handleExport('excel'); setShowExportMenu(false); }} className="w-full flex items-center px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-emerald-600" /> Excel
                  </button>
                  <button onClick={() => { handleExport('pdf'); setShowExportMenu(false); }} className="w-full flex items-center px-4 py-2 text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                    <FilePdf className="h-3.5 w-3.5 mr-2 text-red-500" /> PDF
                  </button>
                </div>
              </>
            )}
          </div>

          <div className="relative shrink-0">
            <button
              onClick={() => setShowFilter(!showFilter)}
              className={`flex items-center px-3 py-1.5 text-[10px] sm:text-xs font-bold border rounded-lg transition-colors ${statusFilter !== 'All'
                  ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                }`}
            >
              <Filter className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 text-blue-600" />
              {statusFilter === 'All' ? 'Filter' : statusFilter}
            </button>
            {showFilter && (
              <>
                <div className="fixed inset-0 z-[60]" onClick={() => setShowFilter(false)} />
                <div className="absolute top-full right-0 mt-2 w-40 bg-white border border-gray-100 rounded-2xl shadow-2xl z-[70] py-1 animate-in fade-in slide-in-from-top-2">
                  {['All', 'Present', 'Late', 'Absent'].map(status => (
                    <button
                      key={status}
                      onClick={() => { setStatusFilter(status); setShowFilter(false); }}
                      className={`w-full text-left px-4 py-2 text-xs font-bold hover:bg-gray-50 ${statusFilter === status ? 'text-blue-600' : 'text-gray-700'
                        }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>

          {onClose && (
            <button
              onClick={onClose}
              className="hidden sm:block p-1 hover:bg-gray-100 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative mb-2 sm:mb-3">
        <input
          className="w-full pl-8 pr-3 py-1.5 text-[10px] sm:text-xs border border-gray-200 rounded-xl bg-white placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
          placeholder="Search name, roll, or course..."
          type="text"
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />
        <span className="absolute inset-y-0 left-0 pl-2.5 flex items-center pointer-events-none">
          <Search className="h-3.5 w-3.5 text-gray-400" />
        </span>
      </div>

      {/* Table Container with Fixed Height & Infinite Scroll */}
      <div className="flex-1 table-fixed-height">
        <table className="w-full table-responsive relative">
          <thead className="sticky top-0 bg-white z-10 shadow-[0_1px_0_0_#f9fafb]">
            <tr className="text-left text-[9px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-50">
              <th className="pb-2 px-2">Student</th>
              <th className="pb-2 px-2">Course</th>
              <th className="pb-2 px-2">Date</th>
              <th className="pb-2 px-2">Check-in</th>
              <th className="pb-2 px-2">Check-out</th>
              <th className="pb-2 px-2">Location</th>
              <th className="pb-2 px-2">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {isLoading ? (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            ) : filteredRecords.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-gray-500 text-sm sm:table-cell flex flex-col items-center justify-center w-full">
                  <div className="flex flex-col items-center justify-center gap-3 w-full">
                    <div className="p-4 bg-gray-50 rounded-full border border-gray-100 mb-2">
                      <CalendarDays className="w-10 h-10 text-gray-200" />
                    </div>
                    <span className="font-bold tracking-tight px-4">
                      {viewMode === 'today'
                        ? 'No check-ins recorded yet today.'
                        : 'No attendance records found.'}
                    </span>
                  </div>
                </td>
              </tr>
            ) : (
              visibleItems.map((record, idx) => {
                const checkInTimestamp = record.checkInTime
                  ? record.checkInTime.includes('T') || record.checkInTime.includes('-')
                    ? new Date(record.checkInTime).getTime()
                    : new Date(`${record.date}T${record.checkInTime}`).getTime()
                  : 0;
                const isNew = checkInTimestamp > 0 && Date.now() - checkInTimestamp < 30000;

                return (
                  <tr
                    key={record.id || idx}
                    className={`text-[11px] sm:text-xs transition-all duration-500 ${isNew
                        ? 'bg-blue-50/80 animate-in fade-in slide-in-from-left-2'
                        : 'hover:bg-gray-50/50'
                      }`}
                  >
                    <td className="py-2.5 px-1 sm:py-3 sm:px-2" data-label="Student">
                      <div className="flex items-center space-x-2.5">
                        <div className="relative shrink-0">
                          <div
                            className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-[10px] sm:text-xs transition-colors shadow-sm overflow-hidden border ${isNew ? 'bg-blue-600 text-white border-blue-400' : 'bg-blue-100 text-blue-600 border-blue-50'
                              }`}
                          >
                            {record.userPhoto ? (
                              <img
                                src={record.userPhoto}
                                alt={record.userName}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(record.userName || 'U')}`;
                                }}
                              />
                            ) : (
                              <span>{record.userName?.charAt(0) || 'U'}</span>
                            )}
                          </div>
                          {isNew && (
                            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 border-2 border-white rounded-full animate-ping" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="font-bold text-gray-800 truncate">{record.userName}</p>
                            {isNew && (
                              <span className="bg-blue-600 text-white text-[6px] font-black uppercase px-1 py-0.5 rounded-full tracking-tighter shrink-0">
                                NEW
                              </span>
                            )}
                          </div>
                          <p className="text-[9px] text-gray-400 font-medium">{record.rollNo}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-1 sm:py-3 sm:px-2 text-gray-600 font-medium" data-label="Course">{record.course}</td>
                    <td className="py-2.5 px-1 sm:py-3 sm:px-2 text-gray-600" data-label="Date">{record.date}</td>
                    <td className="py-2.5 px-1 sm:py-3 sm:px-2 text-gray-600 font-bold" data-label="Check-in">{formatTime(record.checkInTime)}</td>
                    <td className="py-2.5 px-1 sm:py-3 sm:px-2 text-gray-600 font-bold" data-label="Check-out">{formatTime(record.checkOutTime)}</td>
                    <td className="py-2.5 px-1 sm:py-3 sm:px-2 text-gray-600" data-label="Location">
                      {(() => {
                        const rawLoc = record.location || '';
                        const pipeIdx = rawLoc.indexOf('|');
                        let cleanName: string;
                        let locationCoords: string | null = null;

                        if (pipeIdx >= 0) {
                          cleanName = rawLoc.substring(0, pipeIdx).trim() || 'Location';
                          locationCoords = rawLoc.substring(pipeIdx + 1).trim() || null;
                        } else {
                          cleanName = rawLoc
                            .replace(/ \(Auto\)$/i, '')
                            .replace(/ \(Manual\)$/i, '')
                            .replace(/Verified Campus Geofence/i, 'Campus')
                            .replace(/Auto-Checkout \(([^)]+)\)/i, '$1')
                            .replace(/^Auto-Checkout$/i, 'Automatic Out')
                            .trim() || 'Campus';
                        }

                        return (
                          <div
                            className="flex items-center gap-1.5 relative group-cell justify-end sm:justify-start"
                            onMouseEnter={() => locationCoords && openTooltip(record.id)}
                            onMouseLeave={closeTooltip}
                          >
                            <div className={`w-5 h-5 rounded-lg flex items-center justify-center shrink-0 border transition-colors ${isNew ? 'bg-blue-600 border-blue-500' : 'bg-gray-50 border-gray-100 group-hover:bg-white'
                              }`}>
                              <MapPin className={`w-2.5 h-2.5 ${isNew ? 'text-white' : 'text-blue-500'}`} />
                            </div>
                            <div className="flex flex-col text-right sm:text-left min-w-0">
                              <span className="font-semibold text-gray-700 truncate sm:whitespace-normal max-w-[100px] sm:max-w-none" title={cleanName}>
                                {cleanName}
                              </span>
                              {locationCoords && (
                                <span className="text-[9px] text-gray-400 font-mono tracking-tighter sm:hidden truncate">
                                  {locationCoords}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-2.5 px-1 sm:py-3 sm:px-2" data-label="Status">
                      {record.status === 'Late' ? (
                        <div className="relative flex justify-end sm:justify-start">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedRecord(record);
                              setShowReasonModal(true);
                            }}
                            className="flex items-center gap-1 px-2 py-1 bg-orange-50 text-orange-600 rounded-lg hover:bg-orange-100 transition-all border border-orange-100 shadow-sm group"
                          >
                            <span className="w-1 h-1 rounded-full bg-orange-500 animate-pulse" />
                            <span className="text-[9px] font-black uppercase">Late</span>
                            <MessageSquare className="w-2.5 h-2.5 ml-0.5 opacity-60 group-hover:opacity-100 transition-opacity" />
                          </button>
                        </div>
                      ) : record.status === 'Present' ? (
                        <div className="flex justify-end sm:justify-start">
                          <span className="bg-green-50 text-green-600 px-2 py-1 rounded-lg text-[9px] font-black flex items-center w-fit shadow-sm border border-green-100 uppercase tracking-tighter">
                            <span className="w-1 h-1 rounded-full bg-green-500 mr-1.5" />
                            Present
                          </span>
                        </div>
                      ) : (
                        <div className="flex justify-end sm:justify-start">
                          <span className="bg-red-50 text-red-600 px-2 py-1 rounded-lg text-[9px] font-black flex items-center w-fit shadow-sm border border-red-100 uppercase tracking-tighter">
                            <span className="w-1 h-1 rounded-full bg-red-500 mr-1.5" />
                            Absent
                          </span>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
        <div ref={sentinelRef} className="h-4" />
      </div>

      {/* Late Reason Modal */}
      {showReasonModal && selectedRecord && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-orange-50/50 to-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-inner">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Late Reason</h3>
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">{selectedRecord.userName}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReasonModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors group"
              >
                <X className="w-6 h-6 text-gray-400 group-hover:text-gray-900" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Student's Explanation</label>
                <div className="p-6 bg-gray-50 rounded-[1.5rem] border border-gray-100 relative">
                  <p className="text-sm text-gray-700 italic leading-relaxed font-medium">
                    "{selectedRecord.lateReason || 'No reason provided.'}"
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100">
                  <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-1">Check-in Time</p>
                  <p className="text-sm font-bold text-blue-700">{selectedRecord.checkInTime ? new Date(selectedRecord.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</p>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Date</p>
                  <p className="text-sm font-bold text-gray-700">{selectedRecord.date}</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowReasonModal(false)}
                className="flex-1 py-4 px-6 bg-white border border-gray-200 text-gray-900 text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-gray-100 transition-all shadow-sm"
              >
                Close
              </button>
              <button
                onClick={async () => {
                  try {
                    await updateAttendance(selectedRecord.id, {
                      status: 'Present',
                      lateReasonStatus: 'Approved'
                    });
                    toast.success('Appeal approved successfully!');
                    setShowReasonModal(false);
                  } catch (err) {
                    toast.error('Failed to approve appeal.');
                  }
                }}
                className="flex-1 py-4 px-6 bg-blue-600 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
