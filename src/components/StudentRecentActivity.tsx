import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Calendar, Clock, MapPin, Download, Search, FileText, FileSpreadsheet, FileIcon as FilePdf, Info, Copy, Check, X } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { listenToCollection } from '../services/dbService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

export default function StudentRecentActivity({ user }: { user?: any }) {
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const uid = user?.uid || user?.id;
    if (!uid) return;
    
    setIsLoading(true);
    const unsubscribe = listenToCollection('attendance', (data) => {
      // 1. Deduplicate by ID
      const uniqueRecords = Array.from(new Map(data.map(item => [item.id, item])).values());
      
      // 2. Filter for this user and format for the table
      const studentLogs = uniqueRecords
        .filter(r => r.userId === uid)
        .sort((a, b) => {
          // Sort by date DESC, then by checkInTime DESC
          const dateA = new Date(a.date).getTime();
          const dateB = new Date(b.date).getTime();
          if (dateA !== dateB) return dateB - dateA;
          
          const timeA = a.checkInTime ? new Date(a.checkInTime).getTime() : 0;
          const timeB = b.checkInTime ? new Date(b.checkInTime).getTime() : 0;
          return timeB - timeA;
        })
        .map(r => {
          const rawLoc = r.location || '';
          // Format: "Location Name|lat,lng"
          const pipeIdx = rawLoc.indexOf('|');
          let cleanName: string;
          let locationCoords: string | null = null;

          if (pipeIdx >= 0) {
            cleanName    = rawLoc.substring(0, pipeIdx).trim() || 'Location';
            locationCoords = rawLoc.substring(pipeIdx + 1).trim() || null;
          } else {
            cleanName = rawLoc
              .replace(/ \(Auto\)$/i, '')
              .replace(/ \(Manual\)$/i, '')
              .replace(/Verified Campus Geofence/i, 'Campus')
              .replace(/Auto-Checkout \(([^)]+)\)/i, '$1')
              .replace(/^Auto-Checkout$/i, 'Automatic Out')
              .trim() || 'Campus';
            locationCoords = null;
          }

          return {
            id: r.id,
            date: new Date(r.date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' }),
            in: r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
            out: r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--',
            rawInTime: r.checkInTime,
            status: r.status,
            locationName: cleanName,
            locationCoords,
            lateReason: r.lateReason,
            lateReasonStatus: r.lateReasonStatus,
            image: r.lateReasonImage
          };
        });
      setAllLogs(studentLogs);
      setIsLoading(false);
    }, uid);

    return () => unsubscribe();
  }, [user?.uid, user?.id]);

  const [statusFilter, setStatusFilter] = useState('All');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const filters = ['All', 'Present', 'Late', 'Absent'];
  
  const handleSwipe = (direction: 'left' | 'right') => {
    const currentIndex = filters.indexOf(statusFilter);
    if (direction === 'left' && currentIndex < filters.length - 1) {
      setStatusFilter(filters[currentIndex + 1]);
    } else if (direction === 'right' && currentIndex > 0) {
      setStatusFilter(filters[currentIndex - 1]);
    }
  };

  // Track which location cell is showing its tooltip (state-driven, no CSS gap problems)
  const [hoveredLocId, setHoveredLocId] = useState<string | null>(null);
  const hoverLeaveTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const openTooltip  = (id: string) => {
    if (hoverLeaveTimerRef.current) clearTimeout(hoverLeaveTimerRef.current);
    setHoveredLocId(id);
  };
  const closeTooltip = () => {
    // Small delay so moving from cell → tooltip doesn't flicker
    hoverLeaveTimerRef.current = setTimeout(() => setHoveredLocId(null), 80);
  };

  const handleCopyCoords = (coords: string, id: string) => {
    navigator.clipboard.writeText(coords).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const filteredLogs = allLogs.filter(log => {
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    const logDate = new Date(log.date);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;
      
    const matchesDate = (!start || logDate >= start) && (!end || logDate <= end);
      
    return matchesStatus && matchesDate;
  });

  const { visibleItems, sentinelRef } = useInfiniteScroll(filteredLogs, 10, 5);

  const generateDataArray = () => {
    return filteredLogs.map(log => [
      log.date,
      log.in,
      log.out,
      log.locationName,
      log.status
    ]);
  };

  const headers = ['Date', 'Check In', 'Check Out', 'Location', 'Status'];

  const exportCSV = () => {
    try {
      const csvContent = [
        headers.join(','),
        ...filteredLogs.map(log => [
          `"${log.date}"`, `"${log.in}"`, `"${log.out}"`, `"${log.locationName}"`, `"${log.status}"`
        ].join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `activity_log_${new Date().toISOString().split('T')[0]}.csv`;
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
      XLSX.utils.book_append_sheet(workbook, worksheet, "Activity Log");
      XLSX.writeFile(workbook, `activity_log_${new Date().toISOString().split('T')[0]}.xlsx`);
      toast.success('Excel Exported Successfully');
    } catch (e) {
      toast.error('Failed to export Excel');
    }
  };

  const exportPDF = () => {
    try {
      const doc = new jsPDF();
      doc.text("Student Activity Log", 14, 15);
      
      autoTable(doc, {
        head: [headers],
        body: generateDataArray(),
        startY: 20,
        styles: { fontSize: 10 },
        headStyles: { fillColor: [37, 99, 235] }
      });
      
      doc.save(`activity_log_${new Date().toISOString().split('T')[0]}.pdf`);
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
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col overflow-hidden h-full">
      {/* Header section */}
      <div className="bg-gradient-to-r from-blue-50/50 to-white px-4 sm:px-5 py-3 flex flex-row justify-between items-center gap-2 border-b border-gray-100">
        <div className="min-w-0">
          <h3 className="text-sm sm:text-lg font-bold text-gray-800 flex items-center gap-2 sm:gap-3">
            <div className="bg-blue-600 p-1.5 sm:p-2 rounded-lg text-white shadow-sm shadow-blue-200 shrink-0">
              <Calendar className="w-3.5 h-3.5 sm:w-5 sm:h-5" />
            </div>
            <span className="truncate">Recent Activity Log</span>
          </h3>
          <p className="text-[10px] sm:text-[13px] text-gray-500 mt-0.5 ml-9 sm:ml-12 truncate">Daily attendance history</p>
        </div>
        
        {/* Actions section */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative">
            <button 
              onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 text-xs font-bold rounded-lg hover:bg-gray-50 transition-all shadow-sm active:scale-95"
            >
              <Download className="w-3.5 h-3.5 text-blue-600" />
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
      </div>
      
      <div className="px-4 sm:px-6 py-3 border-b border-gray-100 flex flex-col xl:flex-row justify-between items-center gap-3 bg-gray-50/50">
        <div className="flex flex-col md:flex-row gap-3">
          
          <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-gray-200 shadow-sm">
            <Calendar className="w-3.5 h-3.5 text-blue-600" />
            <input 
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="text-xs font-bold text-gray-600 focus:outline-none bg-transparent"
            />
            <span className="text-gray-300 font-bold">-</span>
            <input 
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="text-xs font-bold text-gray-600 focus:outline-none bg-transparent"
            />
            {(startDate || endDate) && (
              <button 
                onClick={() => { setStartDate(''); setEndDate(''); }}
                className="ml-1 text-[10px] text-blue-600 font-bold hover:underline"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="flex gap-1.5 bg-white p-1 rounded-lg border border-gray-100 shadow-sm overflow-x-auto scrollbar-hide">
          {['All', 'Present', 'Late', 'Absent'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap ${
                statusFilter === status 
                ? 'bg-blue-600 text-white shadow-sm' 
                : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              {status}
            </button>
          ))}
        </div>
      </div>
      
      {/* Table section */}
      <div className="flex-1 p-3 sm:p-4">
        <div className="table-fixed-height bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Desktop View: Professional Table */}
          <div className="hidden md:block overflow-y-auto max-h-[calc(100vh-500px)]">
            <table className="w-full text-left border-collapse table-responsive">
              <thead className="sticky top-0 z-20 bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="py-2.5 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="py-2.5 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Check In</th>
                  <th className="py-2.5 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Check Out</th>
                  <th className="py-2.5 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="py-2.5 px-5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-20 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                        <p className="text-sm font-medium text-gray-500">Syncing your activity...</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredLogs.length > 0 ? (
                  <>
                    {visibleItems.map((log, i) => {
                      const isNew = log.in !== '--' && (Date.now() - new Date(log.rawInTime || 0).getTime() < 30000);
                      return (
                        <tr key={log.id} className={`transition-colors group ${isNew ? 'bg-blue-50/60' : 'hover:bg-blue-50/40'}`}>
                          <td className="py-2.5 px-5 text-sm font-bold text-gray-800 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              {log.date}
                              {isNew && <span className="bg-blue-600 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded-full animate-pulse shadow-sm shadow-blue-200">Just Now</span>}
                            </div>
                          </td>
                          <td className="py-2.5 px-5 text-sm text-gray-600 whitespace-nowrap">
                            {log.in !== '--' ? (
                              <div className="flex items-center gap-2 bg-gray-50 w-fit px-2.5 py-1.5 rounded-md border border-gray-200 group-hover:bg-white transition-colors">
                                <Clock className="w-3.5 h-3.5 text-blue-500" /> 
                                <span className="font-semibold">{log.in}</span>
                              </div>
                            ) : <span className="text-gray-400 font-medium ml-2">--</span>}
                          </td>
                          <td className="py-2.5 px-5 text-sm text-gray-600 whitespace-nowrap">
                            {log.out !== '--' ? (
                              <div className="flex items-center gap-2 bg-gray-50 w-fit px-2.5 py-1.5 rounded-md border border-gray-200 group-hover:bg-white transition-colors">
                                <Clock className="w-3.5 h-3.5 text-purple-500" /> 
                                <span className="font-semibold">{log.out}</span>
                              </div>
                            ) : <span className="text-gray-400 font-medium ml-2">--</span>}
                          </td>
                          <td className="py-2.5 px-5 text-sm text-gray-600 whitespace-nowrap">
                            {log.locationName ? (
                              <div className="flex items-center gap-2 relative" onMouseEnter={() => log.locationCoords && openTooltip(log.id)} onMouseLeave={closeTooltip}>
                                <div className="w-7 h-7 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100">
                                  <MapPin className="w-3.5 h-3.5 text-blue-600" />
                                </div>
                                <span className="font-medium text-gray-700 max-w-[140px] truncate" title={log.locationName}>{log.locationName}</span>
                                {log.locationCoords && hoveredLocId === log.id && (
                                  <div className="absolute left-0 top-full pt-1.5 z-50">
                                    <div className="flex items-center gap-2 bg-gray-900 text-white text-[11px] font-mono px-3 py-2 rounded-xl shadow-xl whitespace-nowrap">
                                      <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
                                      <span>{log.locationCoords}</span>
                                      <button onMouseDown={(e) => { e.stopPropagation(); handleCopyCoords(log.locationCoords!, log.id); }} className="ml-1 p-1 rounded hover:bg-white/20 transition-colors">
                                        {copiedId === log.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5 text-gray-300 hover:text-white" />}
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ) : <span className="text-gray-400 ml-3">--</span>}
                          </td>
                          <td className="py-2.5 px-5 text-right whitespace-nowrap relative">
                            <div className="flex justify-end items-center group/status">
                              <span className={`inline-flex ml-auto text-xs font-bold px-2.5 py-1.5 rounded-lg border items-center cursor-help transition-all duration-300 hover:scale-105 ${
                                log.status === 'Present' ? 'bg-green-50 text-green-700 border-green-200' :
                                log.status === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-200 ring-2 ring-transparent hover:ring-orange-200' :
                                'bg-red-50 text-red-700 border-red-200'
                              }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${log.status === 'Present' ? 'bg-green-500' : log.status === 'Late' ? 'bg-orange-500' : 'bg-red-500'}`} />
                                {log.status}
                              </span>
                              {log.status === 'Late' && log.lateReason && (
                                <div className="absolute right-full mr-3 top-1/2 -translate-y-1/2 w-64 p-4 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 opacity-0 group-hover/status:opacity-100 pointer-events-none transition-all duration-300 transform translate-x-2 group-hover/status:translate-x-0 scale-95 group-hover/status:scale-100 backdrop-blur-sm">
                                  <div className="flex items-center gap-2 mb-2 border-b border-gray-50 pb-2">
                                    <Info className="w-4 h-4 text-orange-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Late Reason</span>
                                  </div>
                                  <p className="text-xs text-gray-700 font-medium leading-relaxed italic">"{log.lateReason}"</p>
                                  {log.image && <img src={log.image} alt="Late Proof" className="mt-3 rounded-lg w-full h-24 object-cover border border-gray-100" />}
                                  <div className="mt-3 pt-2 border-t border-gray-50 flex justify-between items-center">
                                    <span className="text-[10px] font-bold text-gray-400 uppercase">Status</span>
                                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${log.lateReasonStatus === 'Approved' ? 'bg-green-100 text-green-700' : log.lateReasonStatus === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700 animate-pulse'}`}>
                                      {log.lateReasonStatus || 'Pending'}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                ) : (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-gray-500">No activities found</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View: High-Fidelity Cards with Swipe */}
          <motion.div 
            className="md:hidden divide-y divide-gray-100 overflow-y-auto max-h-[calc(100vh-350px)] touch-pan-y"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) handleSwipe('left');
              if (info.offset.x > 50) handleSwipe('right');
            }}
          >
            {isLoading ? (
              <div className="py-20 text-center flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4" />
                <p className="text-sm font-medium text-gray-500 italic">Syncing logs...</p>
              </div>
            ) : filteredLogs.length > 0 ? (
              filteredLogs.slice(0, visibleItems.length).map((log) => (
                <div key={log.id} className="p-4 bg-white active:bg-gray-50 transition-colors">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Date</span>
                      <span className="text-sm font-black text-gray-800">{log.date}</span>
                    </div>
                    <span className={`text-[9px] font-black px-2 py-1 rounded-lg border uppercase tracking-wider ${
                      log.status === 'Present' ? 'bg-green-50 text-green-700 border-green-100' :
                      log.status === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-100' :
                      'bg-red-50 text-red-700 border-red-100'
                    }`}>
                      {log.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-4 gap-y-4">
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Check In</span>
                      <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <Clock className="w-3.5 h-3.5 text-blue-500" />
                        <span className="text-xs font-black">{log.in}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Check Out</span>
                      <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <Clock className="w-3.5 h-3.5 text-purple-500" />
                        <span className="text-xs font-black">{log.out}</span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Location</span>
                      <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        <span className="text-xs font-bold truncate">{log.locationName || 'Campus'}</span>
                      </div>
                    </div>
                  </div>

                  {log.status === 'Late' && log.lateReason && (
                    <div className="mt-4 p-3 bg-orange-50/50 rounded-xl border border-orange-100/50">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Info className="w-3.5 h-3.5 text-orange-500" />
                        <span className="text-[9px] font-black uppercase text-orange-700 tracking-tighter">Late Reason</span>
                      </div>
                      <p className="text-[11px] text-gray-600 leading-relaxed italic">"{log.lateReason}"</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div className="py-20 text-center text-gray-400 text-sm italic">
                No {statusFilter !== 'All' ? statusFilter.toLowerCase() : ''} activities found
                <p className="text-[10px] mt-2 font-normal text-gray-300">Swipe left/right to change filters</p>
              </div>
            )}
          </motion.div>
          <div ref={sentinelRef} className="h-4" />
        </div>
      </div>
    </div>
  );
}
