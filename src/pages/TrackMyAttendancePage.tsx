import React, { useState, useEffect } from 'react';
import { ClipboardList, Download, FileText, FileSpreadsheet, FileIcon as FilePdf, Calendar, Clock, MapPin, Search, Info } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { listenToCollection } from '../services/dbService';

export default function TrackMyAttendancePage({ userId }: { userId?: string }) {
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const headers = ['Date', 'Check In', 'Check Out', 'Hours', 'Location', 'Status'];

  useEffect(() => {
    if (!userId) return;
    
    setIsLoading(true);
    const unsubscribe = listenToCollection('attendance', (data) => {
      // Filter for this user and format for the table
      const studentLogs = data
        .filter(r => r.userId === userId)
        .sort((a, b) => {
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateB - dateA;
          
          const timeA = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
          const timeB = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
          return timeB - timeA;
        })
        .map(r => ({
          id: r.id,
          date: new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit', year: 'numeric' }),
          in: r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
          out: r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
          status: r.status,
          location: r.location || 'Campus',
          lateReason: r.lateReason,
          lateReasonStatus: r.lateReasonStatus,
          image: r.lateReasonImage,
          hours: r.checkInTime && r.checkOutTime 
            ? `${Math.floor((new Date(r.checkOutTime).getTime() - new Date(r.checkInTime).getTime()) / 3600000)}h ${Math.floor(((new Date(r.checkOutTime).getTime() - new Date(r.checkInTime).getTime()) % 3600000) / 60000)}m`
            : '0h 0m'
        }));
      setAllLogs(studentLogs);
      setIsLoading(false);
    }, userId);

    return () => unsubscribe();
  }, [userId]);

  const filteredLogs = allLogs.filter(log => {
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    const matchesSearch = log.date.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         log.location.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

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
      link.href = URL.createObjectURL(blob);
      link.download = `attendance_log_${new Date().toISOString().split('T')[0]}.csv`;
      link.click();
      toast.success('CSV Exported Successfully');
    } catch (e) {
      toast.error('Failed to export CSV');
    }
  };

  const exportExcel = () => {
    try {
      const worksheet = XLSX.utils.json_to_sheet(filteredLogs);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Log");
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
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-gray-50/50">
      
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden max-w-6xl mx-auto">
        {/* Header section */}
        <div className="bg-gradient-to-r from-blue-50/50 to-white px-5 sm:px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-3">
              <div className="bg-blue-600 p-2 rounded-lg text-white shadow-sm shadow-blue-200">
                <ClipboardList className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              My Attendance Log
            </h3>
            <p className="text-[13px] text-gray-500 mt-1 ml-11 sm:ml-12">Track your daily attendance history and download reports</p>
          </div>
          
          {/* Export Button */}
          <div className="relative self-end sm:self-auto ml-11 sm:ml-0">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-all shadow-sm active:scale-95"
            >
              <Download className="w-4 h-4 text-blue-600" />
              Export
            </button>
            
            {showExportMenu && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-20 py-2 animate-in fade-in slide-in-from-top-2">
                  <button onClick={() => handleExport('csv')} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors">
                    <FileText className="w-4 h-4 mr-3 text-green-600" />
                    Download CSV
                  </button>
                  <button onClick={() => handleExport('excel')} className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors">
                    <FileSpreadsheet className="w-4 h-4 mr-3 text-emerald-600" />
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
        
        {/* Filters section */}
        <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex flex-col lg:flex-row gap-4 bg-gray-50/50 justify-between">
          <div className="flex items-center gap-2">
            <select className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 h-10">
              <option>October 2026</option>
              <option>September 2026</option>
              <option>August 2026</option>
            </select>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-4 h-10">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input 
                type="text" 
                placeholder="Search by date or location..." 
                className="w-full pl-9 pr-4 py-2 h-full text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
              {['All', 'Present', 'Half Day', 'Late', 'Absent'].map(status => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-4 h-full text-[13px] font-bold rounded-lg border whitespace-nowrap transition-all ${
                    statusFilter === status 
                    ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-200' 
                    : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        </div>
        
        {/* Table section */}
        <div className="flex-1 overflow-auto bg-gray-50/30 p-4 sm:p-6">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[750px] border-collapse">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50">
                    <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Check In</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Check Out</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Hours</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-20 text-center">
                        <div className="flex flex-col items-center justify-center">
                          <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                          <p className="text-sm font-medium text-gray-500">Syncing your records...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredLogs.length > 0 ? (
                    filteredLogs.map((log, i) => (
                      <tr key={i} className="hover:bg-blue-50/40 transition-colors group">
                        <td className="py-3 px-5 text-sm font-bold text-gray-800 whitespace-nowrap">{log.date}</td>
                        <td className="py-3 px-5 text-sm text-gray-600 whitespace-nowrap">
                          {log.in !== '--' ? (
                            <div className="flex items-center gap-2 bg-gray-50 w-fit px-2.5 py-1.5 rounded-md border border-gray-200 group-hover:bg-white transition-colors">
                              <Clock className="w-3.5 h-3.5 text-blue-500" /> 
                              <span className="font-semibold">{log.in}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-medium ml-2">--</span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-sm text-gray-600 whitespace-nowrap">
                          {log.out !== '--' ? (
                            <div className="flex items-center gap-2 bg-gray-50 w-fit px-2.5 py-1.5 rounded-md border border-gray-200 group-hover:bg-white transition-colors">
                              <Clock className="w-3.5 h-3.5 text-purple-500" /> 
                              <span className="font-semibold">{log.out}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 font-medium ml-2">--</span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-sm font-medium text-gray-700 whitespace-nowrap">
                          {log.hours}
                        </td>
                        <td className="py-3 px-5 text-sm text-gray-600 whitespace-nowrap">
                          {log.location !== '--' ? (
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                              </div>
                              <span className="font-medium text-gray-700">{log.location}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400 ml-3">--</span>
                          )}
                        </td>
                        <td className="py-3 px-5 text-right whitespace-nowrap relative">
                          <div className="flex justify-end items-center group/status">
                            <span className={`inline-flex ml-auto text-xs font-bold px-2.5 py-1.5 rounded-lg border items-center cursor-help transition-all duration-300 hover:scale-105 ${
                              log.status === 'Present' ? 'bg-green-50 text-green-700 border-green-200 shadow-sm shadow-green-100' :
                              log.status === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm shadow-orange-100 ring-2 ring-transparent hover:ring-orange-200' :
                              log.status === 'Half Day' ? 'bg-yellow-50 text-yellow-700 border-yellow-200 shadow-sm shadow-yellow-100' :
                              'bg-red-50 text-red-700 border-red-200 shadow-sm shadow-red-100'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                                log.status === 'Present' ? 'bg-green-500' :
                                log.status === 'Late' ? 'bg-orange-500' : 
                                log.status === 'Half Day' ? 'bg-yellow-500' : 'bg-red-500'
                              }`} />
                              {log.status}
                            </span>

                            {log.status === 'Late' && log.lateReason && (
                              <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 w-64 p-4 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 opacity-0 group-hover/status:opacity-100 pointer-events-none transition-all duration-500 transform translate-x-2 group-hover/status:translate-x-0 scale-95 group-hover/status:scale-100 backdrop-blur-sm shadow-orange-100/50">
                                <div className="flex items-center gap-2 mb-2 border-b border-gray-50 pb-2">
                                  <Info className="w-4 h-4 text-orange-500" />
                                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Late Submission Info</span>
                                </div>
                                <p className="text-xs text-gray-700 font-medium leading-relaxed italic">"{log.lateReason}"</p>
                                {log.image && (
                                  <div className="mt-3 rounded-lg overflow-hidden border border-gray-100 shadow-inner h-24">
                                    <img src={log.image} alt="Late Proof" className="w-full h-full object-cover" />
                                  </div>
                                )}
                                <div className="mt-3 pt-2 border-t border-gray-50 flex justify-between items-center">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase">Review Status</span>
                                  <span className={`text-[10px] font-black uppercase tracking-tighter px-2 py-0.5 rounded ${
                                    log.lateReasonStatus === 'Approved' ? 'bg-green-100 text-green-700' :
                                    log.lateReasonStatus === 'Rejected' ? 'bg-red-100 text-red-700' :
                                    'bg-orange-100 text-orange-700 animate-pulse'
                                  }`}>
                                    {log.lateReasonStatus || 'Pending'}
                                  </span>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-16 text-center">
                        <div className="flex flex-col items-center justify-center text-gray-500">
                          <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                            <Search className="w-6 h-6 text-gray-400" />
                          </div>
                          <p className="text-base font-bold text-gray-800">No attendance records found</p>
                          <p className="text-sm text-gray-500 mt-1">Try adjusting your search query or status filter.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
