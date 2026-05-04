import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { Calendar, Clock, MapPin, Download, Search, FileText, FileSpreadsheet, FileIcon as FilePdf, Info, Copy, Check, X, RefreshCw, History } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';
import { listenToCollection, getTodayDateStr } from '../services/dbService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';

export default function StudentRecentActivity({ user }: { user?: any }) {
  const [allLogs, setAllLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const uid = user?.id || user?.uid; // Prioritize .id to match StudentCheckInWidget
    if (!uid) return;

    setIsLoading(true);
    const unsubscribe = listenToCollection('attendance', (data) => {
      // 1. Deduplicate by ID
      const uniqueRecords = Array.from(new Map(data.map(item => [item.id, item])).values());

      // 2. Filter for this user and format for the table
      const studentLogs = uniqueRecords
        .filter(r => r.userId === uid)
        .sort((a, b) => {
          // Sort by date DESC, then by createdAt DESC (most authoritative timestamp)
          const dateA = new Date(a.rawDate || a.date).getTime();
          const dateB = new Date(b.rawDate || b.date).getTime();
          if (dateA !== dateB) return dateB - dateA;

          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          return timeB - timeA;
        })
        .map(r => {
          const rawLoc = r.location || '';
          // Format: "Location Name | lat,lng | endTime"
          const parts = rawLoc.split('|').map(s => s.trim());
          let cleanName: string = 'Campus';
          let locationCoords: string | null = null;
          let sessionEndTime: string | null = null;

          if (parts.length >= 2) {
            cleanName = parts[0] || 'Location';
            locationCoords = parts[1] || null;
            if (parts.length >= 3) {
              sessionEndTime = parts[2] === 'N/A' ? null : parts[2];
            }
          } else {
            cleanName = rawLoc
              .replace(/ \(Auto\)$/i, '')
              .replace(/ \(Manual\)$/i, '')
              .replace(/Verified Campus Geofence/i, 'Campus')
              .replace(/Auto-Checkout \(([^)]+)\)/i, '$1')
              .replace(/^Auto-Checkout$/i, 'Automatic Out')
              .trim() || 'Campus';
          }

          const [y, m, d] = r.date.split('-');
          const safeDate = new Date(parseInt(y, 10), parseInt(m, 10) - 1, parseInt(d, 10));

          return {
            id: r.id,
            displayDate: safeDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: '2-digit' }),
            rawDate: r.date, 
            in: (() => {
              if (!r.checkInTime) return '--';
              const d = new Date(r.checkInTime);
              return isNaN(d.getTime()) ? '--' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            })(),
            out: (() => {
              if (!r.checkOutTime) return '--';
              const d = new Date(r.checkOutTime);
              return isNaN(d.getTime()) ? '--' : d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            })(),
            rawInTime: r.checkInTime,
            status: r.status,
            locationName: cleanName,
            locationCoords,
            sessionEndTime,
            lateReason: r.lateReason,
            lateReasonStatus: r.lateReasonStatus,
            image: r.lateReasonImage,
            rejoins: r.rejoins || [],
            checkoutReason: r.checkoutReason || null
          };
        });
      setAllLogs(studentLogs);
      setIsLoading(false);
    }, uid);

    return () => unsubscribe();
  }, [user?.id, user?.uid]);

  const [statusFilter, setStatusFilter] = useState('All');
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
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

  const openTooltip = (id: string) => {
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
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter || (statusFilter === 'Present' && log.status === 'Late');
    
    // Accurate date comparison using raw YYYY-MM-DD
    const matchesDate = (!startDate || log.rawDate >= startDate) && (!endDate || log.rawDate <= endDate);

    return matchesStatus && matchesDate;
  });

  const { visibleItems, sentinelRef } = useInfiniteScroll(filteredLogs, 10, 5);

  const generateDataArray = () => {
    return filteredLogs.map(log => [
      log.displayDate,
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
          `"${log.displayDate}"`, `"${log.in}"`, `"${log.out}"`, `"${log.locationName}"`, `"${log.status}"`
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `activity_log_${getTodayDateStr()}.csv`;
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
      XLSX.writeFile(workbook, `activity_log_${getTodayDateStr()}.xlsx`);
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

      doc.save(`activity_log_${getTodayDateStr()}.pdf`);
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
          <button
            onClick={() => {
              setIsExpanded(!isExpanded);
              setStartDate('');
              setEndDate('');
              setStatusFilter('All');
              if (!isExpanded) toast.success('Showing full history inline');
            }}
            className={`flex items-center gap-2 px-3 py-1.5 transition-all rounded-lg text-xs font-bold shadow-md active:scale-95 ${
              isExpanded ? 'bg-gray-800 text-white shadow-gray-200' : 'bg-blue-600 text-white shadow-blue-100 hover:bg-blue-700'
            }`}
          >
            <History className={`w-3.5 h-3.5 ${isExpanded ? 'animate-spin-slow' : ''}`} />
            <span className="hidden sm:inline">{isExpanded ? 'Minimize View' : 'View All History'}</span>
            <span className="sm:hidden">{isExpanded ? 'Close' : 'History'}</span>
          </button>

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
                <div className="fixed inset-0 z-[100]" onClick={() => setShowExportMenu(false)} />
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-[110] py-2 animate-in fade-in slide-in-from-top-2">
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
              className={`px-4 py-2 text-xs font-bold rounded-md transition-all whitespace-nowrap ${statusFilter === status
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
          <div className={`hidden md:block overflow-y-auto transition-all duration-500 ${isExpanded ? 'max-h-[1200px]' : 'max-h-[calc(100vh-500px)]'}`}>
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
                              {log.displayDate}
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
                                <div className="flex flex-col min-w-0">
                                  <span className="font-medium text-gray-700 truncate max-w-[140px]" title={log.locationName}>{log.locationName}</span>
                                  {log.sessionEndTime && (
                                    <span className="text-[9px] font-black text-blue-500 bg-blue-50 px-1 py-0.5 rounded border border-blue-100 uppercase tracking-tighter w-fit">
                                      Ends {log.sessionEndTime}
                                    </span>
                                  )}
                                </div>
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
                              <button 
                                onClick={() => {
                                  if (log.status === 'Late') {
                                    window.dispatchEvent(new CustomEvent('trigger-late-modal', { detail: { log } }));
                                  }
                                }}
                                className={`inline-flex ml-auto text-xs font-bold px-2.5 py-1.5 rounded-lg border items-center transition-all duration-300 hover:scale-105 ${
                                  log.status === 'Present' ? 'bg-green-50 text-green-700 border-green-200 cursor-default' :
                                  log.status === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-200 ring-2 ring-transparent hover:ring-orange-200 cursor-pointer active:scale-95' :
                                  'bg-red-50 text-red-700 border-red-200 cursor-default'
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full mr-2 ${log.status === 'Present' ? 'bg-green-500' : log.status === 'Late' ? 'bg-orange-500' : 'bg-red-500'}`} />
                                {log.status}
                              </button>
                              {log.status === 'Late' && log.lateReason && (
                                <AnimatePresence>
                                  <motion.div 
                                    initial={{ opacity: 0, x: 10, scale: 0.95 }}
                                    whileHover={{ opacity: 1, x: 0, scale: 1 }}
                                    className="absolute right-full mr-4 top-1/2 -translate-y-1/2 w-64 p-5 bg-white/80 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/20 z-50 opacity-0 group-hover/status:opacity-100 pointer-events-none transition-all duration-300"
                                  >
                                    <div className="flex items-center gap-2 mb-3 border-b border-black/5 pb-3">
                                      <div className="p-1.5 bg-orange-500/10 rounded-lg">
                                        <Info className="w-4 h-4 text-orange-500" />
                                      </div>
                                      <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Late Protocol</span>
                                    </div>
                                    <p className="text-[11px] text-slate-700 font-medium leading-relaxed italic">"{log.lateReason}"</p>
                                    {log.image && (
                                      <div className="mt-4 rounded-2xl overflow-hidden border border-black/5 shadow-inner">
                                        <img src={log.image} alt="Proof" className="w-full h-24 object-cover" />
                                      </div>
                                    )}
                                    <div className="mt-4 pt-3 border-t border-black/5 flex justify-between items-center">
                                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recorded At</span>
                                      <span className="text-[10px] font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">{log.in}</span>
                                    </div>
                                  </motion.div>
                                </AnimatePresence>
                              )}
                            </div>
                            {log.rejoins && log.rejoins.length > 0 && (
                              <div className="mt-1 flex flex-col items-end gap-1">
                                {log.rejoins.map((rj: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-1.5 text-[9px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-100">
                                    <RefreshCw className="w-2.5 h-2.5" />
                                    <span>Rejoined {new Date(rj.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    {rj.exit_reason && <span className="text-gray-400 font-medium ml-1">({rj.exit_reason})</span>}
                                  </div>
                                ))}
                              </div>
                            )}
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
            className={`md:hidden divide-y divide-gray-100 overflow-y-auto transition-all duration-500 touch-pan-y ${isExpanded ? 'max-h-[2000px]' : 'max-h-[calc(100vh-420px)]'}`}
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
                      <span className="text-sm font-black text-gray-800">{log.displayDate}</span>
                    </div>
                    <button 
                      onClick={() => {
                        if (log.status === 'Late') {
                          window.dispatchEvent(new CustomEvent('trigger-late-modal', { detail: { log } }));
                        }
                      }}
                      className={`text-[9px] font-black px-2 py-1 rounded-lg border uppercase tracking-wider transition-all active:scale-95 ${
                        log.out === '--' ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-100' :
                        log.status === 'Present' ? 'bg-green-50 text-green-700 border-green-100' :
                        log.status === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-100 ring-1 ring-orange-200' :
                        'bg-red-50 text-red-700 border-red-100'
                      }`}>
                      {log.out === '--' ? 'LIVE SESSION' : log.status}
                    </button>
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
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Check Out {log.sessionEndTime && <span className="text-gray-300 ml-1 font-mono">(Ends {log.sessionEndTime})</span>}</span>
                      <div className={`flex items-center gap-2 p-2 rounded-xl border ${log.out === '--' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-gray-50 border-gray-100 text-gray-700'}`}>
                        <Clock className={`w-3.5 h-3.5 ${log.out === '--' ? 'text-blue-500' : 'text-purple-500'}`} />
                        <span className="text-xs font-black">{log.out === '--' ? 'ONGOING' : log.out}</span>
                      </div>
                    </div>
                    <div className="col-span-2">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 block">Location</span>
                      <div className="flex items-center gap-2 text-gray-700 bg-gray-50 p-2 rounded-xl border border-gray-100">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        <div className="flex flex-col min-w-0">
                          <span className="text-xs font-bold break-words">{log.locationName || 'Campus'}</span>
                          {log.locationCoords && (
                            <span className="text-[9px] text-gray-400 font-mono tracking-tighter truncate">
                              {log.locationCoords}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {log.status === 'Late' && log.lateReason && (
                    <div className="mt-4 p-3 bg-orange-50/50 rounded-xl border border-orange-100/50">
                      <div className="flex justify-between items-start mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <Info className="w-3.5 h-3.5 text-orange-500" />
                          <span className="text-[9px] font-black uppercase text-orange-700 tracking-tighter">Late Reason</span>
                        </div>
                        <span className="text-[9px] font-bold text-blue-600 uppercase">In: {log.in}</span>
                      </div>
                      <p className="text-[11px] text-gray-600 leading-relaxed italic">"{log.lateReason}"</p>
                    </div>
                  )}

                  {log.rejoins && log.rejoins.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-gray-50">
                      <div className="flex items-center gap-2 mb-2">
                        <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Session Re-joins</span>
                      </div>
                      <div className="space-y-2">
                        {log.rejoins.map((rj: any, idx: number) => (
                          <div key={idx} className="bg-blue-50/50 p-2 rounded-lg border border-blue-100/50">
                            <div className="flex justify-between items-center mb-1">
                              <span className="text-[10px] font-bold text-blue-700">{new Date(rj.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                              <span className="text-[8px] font-black uppercase text-blue-400 tracking-tighter">Re-joined</span>
                            </div>
                            {rj.exit_reason && (
                              <p className="text-[10px] text-gray-500 italic">Left due to: {rj.exit_reason}</p>
                            )}
                          </div>
                        ))}
                      </div>
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
