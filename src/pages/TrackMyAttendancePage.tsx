import React, { useState, useEffect } from 'react';
import { 
  ClipboardList, Download, FileText, FileSpreadsheet, File as FilePdf, 
  Calendar, Clock, MapPin, Search, Info, MessageSquare, X, Copy,
  TrendingUp, CheckCircle, XCircle, History
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { listenToCollection } from '../services/dbService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import CustomInput from '../components/CustomInput';
import CustomDropdown from '../components/CustomDropdown';

export default function TrackMyAttendancePage({ userId }: { userId?: string }) {
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [selectedLog, setSelectedLog] = useState<any>(null);
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showExportMenu, setShowExportMenu] = useState(false);

  const headers = ['Date', 'Check In', 'Check Out', 'Hours', 'Location', 'Status'];

  useEffect(() => {
    if (!userId) return;

    const unsubscribe = listenToCollection('attendance', (data) => {
      const mappedData = data.map(r => {
        // Calculate hours for mapped display
        let hoursDisplay = '--';
        if (r.checkInTime && r.checkOutTime) {
          const checkIn = new Date(r.checkInTime);
          const checkOut = new Date(r.checkOutTime);
          
          if (!isNaN(checkIn.getTime()) && !isNaN(checkOut.getTime())) {
            const diffMs = checkOut.getTime() - checkIn.getTime();
            const h = Math.floor(diffMs / 3600000);
            const m = Math.floor((diffMs % 3600000) / 60000);
            hoursDisplay = `${h}h ${m}m`;
          }
        }

        const dateStr = r.date || '--';
        const locationStr = r.location || r.locationName || 'Campus';

        return {
          id: r.id,
          date: dateStr,
          rawDate: r.date || '',
          in: r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
          out: r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
          hours: hoursDisplay,
          location: locationStr,
          locationName: (locationStr.split('|')[0] || 'Campus').trim(),
          locationCoords: locationStr.includes('|') ? locationStr.split('|')[1].trim() : null,
          status: r.status || 'Present',
          lateReason: r.lateReason,
          lateReasonStatus: r.lateReasonStatus,
          lateReasonImage: r.lateReasonImage
        };
      });
      setAllLogs(mappedData);
      setIsLoading(false);
    }, userId);

    return () => unsubscribe();
  }, [userId]);

  const filteredLogs = allLogs.filter(log => {
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = (log.date || '').toLowerCase().includes(searchLower) ||
      (log.location || '').toLowerCase().includes(searchLower);

    // Date Range Filter
    const logDate = log.rawDate ? new Date(log.rawDate) : null;
    const logTime = logDate && !isNaN(logDate.getTime()) ? logDate.getTime() : 0;
    const start = startDate ? new Date(startDate).getTime() : 0;
    const end = endDate ? new Date(endDate).getTime() : Infinity;
    const matchesDate = logTime >= start && logTime <= end;

    return matchesStatus && matchesSearch && matchesDate;
  });

  const { visibleItems, sentinelRef } = useInfiniteScroll(filteredLogs, 10, 5);

  const generateDataArray = () => {
    return filteredLogs.map(log => [
      log.date, log.in, log.out, log.hours, log.location, log.status
    ]);
  };

  const exportCSV = () => {
    try {
      const csvContent = [
        headers.join(','),
        ...filteredLogs.map(log => [
          `"${log.date}"`, `"${log.in}"`, `"${log.out}"`, `"${log.hours}"`, `"${log.location}"`, `"${log.status}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `attendance_log_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('CSV Exported Successfully');
    } catch (e) {
      toast.error('Failed to export CSV');
    }
  };

  const exportExcel = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(filteredLogs.map(log => ({
        Date: log.date,
        'Check In': log.in,
        'Check Out': log.out,
        Hours: log.hours,
        Location: log.location,
        Status: log.status
      })));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance');
      XLSX.writeFile(workbook, `attendance_log_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel Exported Successfully');
    } catch (e) {
      toast.error('Failed to export Excel');
    }
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.text("Attendance Log", 14, 15);
      autoTable(doc, {
        head: [headers],
        body: generateDataArray(),
        startY: 20,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [37, 99, 235] }
      });
      doc.save(`attendance_log_${new Date().toISOString().split('T')[0]}.pdf`);
      toast.success('PDF Exported Successfully');
    } catch (e) {
      toast.error('Failed to export PDF');
    }
  };

  const handleExport = (type: 'csv' | 'excel' | 'pdf') => {
    if (filteredLogs.length === 0) {
      toast.error('No data to export');
      return;
    }
    setShowExportMenu(false);
    if (type === 'csv') exportCSV();
    if (type === 'excel') exportExcel();
    if (type === 'pdf') exportPDF();
  };

  return (
    <div className="flex-1 overflow-y-auto mobile-container-padding bg-gray-50/50">
      <div className="max-w-[1600px] mx-auto w-full">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden w-full">
        {/* Header Section */}
        <div className="p-6 border-b border-gray-100 bg-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-200">
                <ClipboardList className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Attendance Logs</h1>
                <p className="text-sm font-bold text-gray-500">Track your presence and history</p>
              </div>
            </div>

            <div className="relative">
              <button
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="flex items-center gap-2 bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-800 transition-all shadow-lg shadow-gray-200"
              >
                <Download className="w-4 h-4" />
                Export Data
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-[100]" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl border border-gray-100 z-[110] py-2 animate-in fade-in zoom-in-95 duration-200">
                    <button onClick={() => handleExport('csv')} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors">
                      <FileText className="w-4 h-4 mr-3 text-gray-400" />
                      Download CSV
                    </button>
                    <button onClick={() => handleExport('excel')} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors">
                      <FileSpreadsheet className="w-4 h-4 mr-3 text-green-500" />
                      Download Excel
                    </button>
                    <button onClick={() => handleExport('pdf')} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors">
                      <FilePdf className="w-4 h-4 mr-3 text-red-500" />
                      Download PDF
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Filters Area */}
          <div className="mt-8 flex flex-col lg:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <CustomInput
                icon={Search}
                placeholder="Search by date or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                label="Search Records"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
              <CustomDropdown
                label="Filter by Status"
                icon={TrendingUp}
                options={[
                  { value: 'All', label: 'All Records', icon: ClipboardList },
                  { value: 'Present', label: 'Present', icon: CheckCircle },
                  { value: 'Late', label: 'Late', icon: Clock },
                  { value: 'Absent', label: 'Absent', icon: XCircle }
                ]}
                value={statusFilter}
                onChange={setStatusFilter}
                className="w-full sm:w-56"
              />
            </div>
          </div>
        </div>

        {/* Table Section */}
        <div className="table-fixed-height flex-1 bg-gray-50/30 p-4 sm:p-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse table-responsive">
              <thead className="bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  {headers.map(h => (
                    <th key={h} className="py-4 px-5 text-[10px] font-black text-gray-400 uppercase tracking-widest">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm font-bold text-gray-500">Syncing records...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length > 0 ? (
                  visibleItems.map((log, i) => (
                    <tr key={log.id || i} className="hover:bg-blue-50/40 transition-colors group">
                      <td className="py-4 px-5 text-sm font-black text-gray-800" data-label="Date">{log.date}</td>
                      <td className="py-4 px-5" data-label="Check In">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                          <Clock className="w-3.5 h-3.5 text-blue-500" />
                          {log.in}
                        </div>
                      </td>
                      <td className="py-4 px-5" data-label="Check Out">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                          <Clock className="w-3.5 h-3.5 text-orange-500" />
                          {log.out}
                        </div>
                      </td>
                      <td className="py-4 px-5 text-sm font-black text-gray-700" data-label="Hours">{log.hours}</td>
                      <td className="py-4 px-5" data-label="Location">
                        <div className="flex items-center gap-2 text-sm font-bold text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                          <div className="flex flex-col text-right sm:text-left">
                            <span className="truncate sm:whitespace-normal max-w-[120px] sm:max-w-none">
                              {log.locationName.replace(/ \(Auto\)$/i, '').replace(/ \(Manual\)$/i, '')}
                            </span>
                            {log.locationCoords && (
                              <span className="text-[9px] text-gray-400 font-mono tracking-tight sm:hidden">
                                {log.locationCoords}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5" data-label="Status">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-tight ${log.status === 'Present' ? 'bg-green-100 text-green-700' :
                              log.status === 'Late' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                            }`}>
                            {log.status}
                          </span>

                          {log.status === 'Late' && (
                            <button
                              onClick={() => { setSelectedLog(log); setShowReasonModal(true); }}
                              className="p-1.5 hover:bg-orange-100 rounded-lg text-orange-400 transition-colors"
                              title="View Reason"
                            >
                              <Info className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
                          <Search className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-base font-black text-gray-800">No records found</p>
                        <p className="text-sm font-bold text-gray-500 mt-1">Try adjusting your filters.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div ref={sentinelRef} className="h-4" />
          </div>
        </div>
      </div>

      {/* Late Reason Modal */}
      {showReasonModal && selectedLog && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-orange-50 to-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-orange-100 flex items-center justify-center text-orange-600 shadow-inner">
                  <MessageSquare className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Late Reason</h3>
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-widest">{selectedLog.date}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReasonModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Submitted Reason</label>
                <div className="p-5 bg-gray-50 rounded-[1.5rem] border border-gray-100">
                  <p className="text-gray-700 leading-relaxed font-medium">
                    {selectedLog.lateReason || 'No reason provided.'}
                  </p>
                </div>
              </div>

              {selectedLog.lateReasonImage && (
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Submitted Proof</label>
                  <div className="rounded-[1.5rem] overflow-hidden border border-gray-100 shadow-inner h-48">
                    <img src={selectedLog.lateReasonImage} alt="Late Proof" className="w-full h-full object-cover" />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between p-4 bg-orange-50 rounded-2xl border border-orange-100">
                <div>
                  <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Review Status</p>
                  <p className={`text-sm font-black uppercase tracking-tight ${selectedLog.lateReasonStatus === 'Approved' ? 'text-green-600' :
                      selectedLog.lateReasonStatus === 'Rejected' ? 'text-red-600' :
                        'text-orange-600'
                    }`}>
                    {selectedLog.lateReasonStatus || 'Pending'}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${selectedLog.lateReasonStatus === 'Approved' ? 'bg-green-100 text-green-600' :
                    selectedLog.lateReasonStatus === 'Rejected' ? 'bg-red-100 text-red-600' :
                      'bg-orange-100 text-orange-600'
                  }`}>
                  <Info className="w-5 h-5" />
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowReasonModal(false)}
                className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-lg shadow-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Detailed History Modal (Reusing/Extending the same modal logic for simplicity or creating a new one) */}
      {showReasonModal && selectedLog && !selectedLog.lateReason && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-gradient-to-r from-blue-50 to-white">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 shadow-inner">
                  <History className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 tracking-tight">Record History</h3>
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-widest">{selectedLog.date}</p>
                </div>
              </div>
              <button
                onClick={() => setShowReasonModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-in</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-blue-500" />
                    <p className="text-sm font-bold text-gray-800">{selectedLog.in}</p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Check-out</p>
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-orange-500" />
                    <p className="text-sm font-bold text-gray-800">{selectedLog.out}</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Total Duration</p>
                <p className="text-sm font-black text-blue-600">{selectedLog.hours}</p>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Location Details</p>
                <div className="flex items-start gap-3 mt-1">
                  <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-gray-800">{selectedLog.locationName}</p>
                    {selectedLog.locationCoords && (
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">{selectedLog.locationCoords}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Status</p>
                  <p className={`text-sm font-black uppercase tracking-tight ${selectedLog.status === 'Present' ? 'text-green-600' : 'text-red-600'}`}>
                    {selectedLog.status}
                  </p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${selectedLog.status === 'Present' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                  Verified
                </div>
              </div>
            </div>

            <div className="p-6 bg-gray-50 flex justify-end">
              <button
                onClick={() => setShowReasonModal(false)}
                className="px-8 py-3 bg-gray-900 text-white rounded-2xl font-black text-sm hover:bg-black transition-all shadow-lg shadow-gray-200"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
