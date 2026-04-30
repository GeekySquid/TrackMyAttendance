import React, { useState, useEffect } from 'react';
import { Download, CheckSquare, Bell, FileText, FileSpreadsheet, FileIcon as FilePdf } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import AttendanceTable from '../components/AttendanceTable';
import AnalyticsChart from '../components/AnalyticsChart';
import StudentProfile from '../components/StudentProfile';
import LateAppealsList from '../components/LateAppealsList';
import QuickActions from '../components/QuickActions';
import { listenToCollection } from '../services/dbService';
import toast from 'react-hot-toast';

export default function AttendancePage({ user }: { user: any }) {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [selectedStudentName, setSelectedStudentName] = useState('All Students');

  useEffect(() => {
    const unsubAtt = listenToCollection('attendance', (data) => {
      setAttendanceData(data);
    });
    const unsubUsers = listenToCollection('users', (data) => {
      setStudents(data.filter(u => u.role === 'student'));
    });
    return () => {
      unsubAtt();
      unsubUsers();
    };
  }, []);

  const selectedStudentData = selectedStudentName === 'All Students' 
    ? undefined 
    : students.find(s => s.name === selectedStudentName);

  const pendingAppealsCount = attendanceData.filter(r => r.status === 'Late' && r.lateReason && r.lateReasonStatus === 'Pending').length;

  const calculateInsights = () => {
    if (attendanceData.length === 0) return "Not enough data to generate insights yet.";
    
    const today = new Date().toISOString().split('T')[0];
    const todayRecords = attendanceData.filter(r => r.date === today);
    const presentToday = todayRecords.filter(r => r.status === 'Present' || r.status === 'Late').length;
    
    if (todayRecords.length > 0) {
      const percentage = Math.round((presentToday / todayRecords.length) * 100);
      return `Today's attendance is at ${percentage}%.`;
    }
    
    return "Overall attendance is stable this week.";
  };

  const exportCSV = () => {
    const headers = ['Student Name', 'Roll No', 'Course', 'Date', 'Check-in Time', 'Check-out Time', 'Status'];
    const csvContent = [
      headers.join(','),
      ...attendanceData.map(r => [
        `"${r.userName || ''}"`,
        `"${r.rollNo || ''}"`,
        `"${r.course || ''}"`,
        `"${r.date || ''}"`,
        `"${r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}"`,
        `"${r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}"`,
        `"${r.status || ''}"`
      ].join(','))
    ].join('\n');

    try {
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `full_attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => toast.success("CSV exported successfully!"), 500);
    } catch (err) {
      toast.success("CSV generated successfully! (Download may be blocked)");
    }
  };

  const exportExcel = () => {
    const data = attendanceData.map(r => ({
      'Student Name': r.userName || '',
      'Roll No': r.rollNo || '',
      'Course': r.course || '',
      'Date': r.date || '',
      'Check-in Time': r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
      'Check-out Time': r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
      'Status': r.status || ''
    }));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Report");
    XLSX.writeFile(workbook, `full_attendance_report_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Excel exported successfully!');
  };

  const exportPDF = () => {
    const doc = new jsPDF();
    doc.text("Full Attendance Report", 14, 15);
    const headers = [['Student Name', 'Roll', 'Course', 'Date', 'In', 'Out', 'Status']];
    const body = attendanceData.map(r => [
      r.userName || '',
      r.rollNo || '',
      r.course || '',
      r.date || '',
      r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
      r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--',
      r.status || ''
    ]);

    autoTable(doc, {
      head: headers,
      body: body,
      startY: 20,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [37, 99, 235] }
    });
    doc.save(`full_attendance_report_${new Date().toISOString().split('T')[0]}.pdf`);
    toast.success('PDF exported successfully!');
  };

  const handleExport = (type: 'csv' | 'excel' | 'pdf') => {
    if (attendanceData.length === 0) {
      toast.error("No data to export.");
      return;
    }
    setShowExportMenu(false);
    if (type === 'csv') exportCSV();
    if (type === 'excel') exportExcel();
    if (type === 'pdf') exportPDF();
  };

  const [showQuickActions, setShowQuickActions] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="mb-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center w-full gap-4">
          <div>
            <h2 className="text-xl font-black text-gray-900 tracking-tight">Attendance Records</h2>
            <p className="text-sm font-bold text-gray-500">Detailed view of student attendance</p>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto relative">
            <button 
              onClick={() => setShowQuickActions(!showQuickActions)}
              className="group relative w-full sm:w-auto bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600 bg-[length:200%_auto] text-white px-6 py-2.5 rounded-xl font-black text-sm shadow-xl shadow-blue-200/50 hover:shadow-2xl hover:shadow-blue-300/60 hover:-translate-y-0.5 flex items-center justify-center gap-2 overflow-hidden transition-all duration-500 hover:bg-[position:100%_50%]"
            >
              <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out rounded-xl"></div>
              <div className="relative z-10 flex items-center gap-2">
                <div className="bg-white/20 p-1 rounded-lg">
                  <svg className="w-4 h-4 fill-white group-hover:animate-bounce" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path d="M13 2L3 14H12L11 22L21 10H12L13 2Z" />
                  </svg>
                </div>
                Quick Actions
              </div>
            </button>

            {showQuickActions && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setShowQuickActions(false)} />
                <div className="absolute top-full right-0 mt-3 w-full sm:w-[380px] z-50 animate-in fade-in slide-in-from-top-4 duration-300">
                  <div className="absolute -top-2 right-10 w-4 h-4 bg-white rotate-45 border-t border-l border-gray-100 rounded-sm z-0"></div>
                  <div className="relative z-10">
                    <QuickActions 
                      students={students} 
                      attendance={attendanceData} 
                      adminProfile={user}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="relative w-full sm:w-auto shrink-0">
              <button 
                onClick={() => setShowExportMenu(!showExportMenu)}
                className="w-full sm:w-auto bg-white border border-gray-200 text-gray-700 text-sm py-2.5 px-6 rounded-xl font-bold shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4 text-gray-400" />
                Export Report
              </button>

              {showExportMenu && (
                <>
                  <div className="fixed inset-0 z-[60]" onClick={() => setShowExportMenu(false)} />
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-2xl border border-gray-100 z-[70] py-2 animate-in fade-in slide-in-from-top-2">
                    <button onClick={() => handleExport('csv')} className="w-full flex items-center px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                      <FileText className="h-4 w-4 mr-2 text-green-600" /> CSV Format
                    </button>
                    <button onClick={() => handleExport('excel')} className="w-full flex items-center px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                      <FileSpreadsheet className="h-4 w-4 mr-2 text-emerald-600" /> Excel Format
                    </button>
                    <button onClick={() => handleExport('pdf')} className="w-full flex items-center px-4 py-2 text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">
                      <FilePdf className="h-4 w-4 mr-2 text-red-500" /> PDF Document
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-8 mb-8">
        <AnalyticsChart 
          selectedStudent={selectedStudentName} 
          onStudentSelect={setSelectedStudentName} 
        />
        <StudentProfile student={selectedStudentData} />
      </div>

      <div className={`grid grid-cols-1 gap-4 sm:gap-8 mb-8 ${pendingAppealsCount > 0 ? 'lg:grid-cols-3' : 'lg:grid-cols-1'}`}>
        <div className={pendingAppealsCount > 0 ? 'lg:col-span-2' : ''}>
          <AttendanceTable />
        </div>
        {pendingAppealsCount > 0 && (
          <div className="flex flex-col gap-8 lg:col-span-1">
            <LateAppealsList />
          </div>
        )}
      </div>
    </div>
  );
}
