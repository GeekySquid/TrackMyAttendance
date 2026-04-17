import React, { useState } from 'react';
import { Calendar, Clock, MapPin, Download, Search, FileText, FileSpreadsheet, FileIcon as FilePdf } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import toast from 'react-hot-toast';

export default function StudentRecentActivity() {
  const allLogs = [
    { date: 'Today, Oct 14', in: '08:25 AM', out: '04:00 PM', status: 'Present', location: 'Main Campus' },
    { date: 'Yesterday, Oct 13', in: '08:30 AM', out: '03:45 PM', status: 'Present', location: 'Main Campus' },
    { date: 'Mon, Oct 12', in: '08:45 AM', out: '03:30 PM', status: 'Late', location: 'Main Campus' },
    { date: 'Fri, Oct 09', in: '--', out: '--', status: 'Absent', location: '--' },
    { date: 'Thu, Oct 08', in: '08:20 AM', out: '03:30 PM', status: 'Present', location: 'North Wing' },
    { date: 'Wed, Oct 07', in: '08:15 AM', out: '04:15 PM', status: 'Present', location: 'Science Block' },
    { date: 'Tue, Oct 06', in: '09:05 AM', out: '03:30 PM', status: 'Late', location: 'Main Campus' },
  ];

  const [statusFilter, setStatusFilter] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showExportMenu, setShowExportMenu] = useState(false);

  const filteredLogs = allLogs.filter(log => {
    const matchesStatus = statusFilter === 'All' || log.status === statusFilter;
    const matchesSearch = log.location.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.date.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const generateDataArray = () => {
    return filteredLogs.map(log => [
      log.date,
      log.in,
      log.out,
      log.location,
      log.status
    ]);
  };

  const headers = ['Date', 'Check In', 'Check Out', 'Location', 'Status'];

  const exportCSV = () => {
    try {
      const csvContent = [
        headers.join(','),
        ...filteredLogs.map(log => [
          `"${log.date}"`, `"${log.in}"`, `"${log.out}"`, `"${log.location}"`, `"${log.status}"`
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
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm flex flex-col overflow-hidden h-full">
      {/* Header section */}
      <div className="bg-gradient-to-r from-blue-50/50 to-white px-5 sm:px-6 py-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-100">
        <div>
          <h3 className="text-lg font-bold text-gray-800 flex items-center gap-3">
            <div className="bg-blue-600 p-2 rounded-lg text-white shadow-sm shadow-blue-200">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
            </div>
            Recent Activity Log
          </h3>
          <p className="text-[13px] text-gray-500 mt-1 ml-11 sm:ml-12">Track your daily attendance history</p>
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
      <div className="px-5 sm:px-6 py-4 border-b border-gray-100 flex flex-col lg:flex-row gap-4 bg-gray-50/50">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input 
            type="text" 
            placeholder="Search by date or location..." 
            className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 shrink-0 overflow-x-auto pb-1 sm:pb-0 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {['All', 'Present', 'Late', 'Absent'].map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-4 py-2 text-[13px] font-bold rounded-lg border whitespace-nowrap transition-all ${
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
      
      {/* Table section */}
      <div className="flex-1 overflow-auto bg-gray-50/30 p-4 sm:p-6">
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[650px] border-collapse">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Check In</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Check Out</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="py-3 px-5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredLogs.length > 0 ? (
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
                      <td className="py-3 px-5 text-right whitespace-nowrap">
                        <span className={`inline-flex ml-auto text-xs font-bold px-2.5 py-1.5 rounded-lg border items-center ${
                          log.status === 'Present' ? 'bg-green-50 text-green-700 border-green-200 shadow-sm shadow-green-100' :
                          log.status === 'Late' ? 'bg-orange-50 text-orange-700 border-orange-200 shadow-sm shadow-orange-100' :
                          'bg-red-50 text-red-700 border-red-200 shadow-sm shadow-red-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full mr-2 ${
                            log.status === 'Present' ? 'bg-green-500' :
                            log.status === 'Late' ? 'bg-orange-500' : 'bg-red-500'
                          }`} />
                          {log.status}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      <div className="flex flex-col items-center justify-center text-gray-500">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4 border border-gray-100">
                          <Search className="w-6 h-6 text-gray-400" />
                        </div>
                        <p className="text-base font-bold text-gray-800">No activities found</p>
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
  );
}
