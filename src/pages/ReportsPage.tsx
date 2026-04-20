import React, { useState, useEffect, useRef } from 'react';
import { BarChart2, Download, FileText, PieChart, TrendingUp, Users, Filter, Search, Calendar, ChevronDown, CheckSquare, Square, FileSpreadsheet, FileIcon as FilePdf } from 'lucide-react';
import { listenToCollection } from '../services/dbService';
import toast from 'react-hot-toast';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';

export default function ReportsPage() {
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  
  // Filters
  const [selectedStudent, setSelectedStudent] = useState('All');
  const [selectedCourse, setSelectedCourse] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Export Columns
  const [showColumnDropdown, setShowColumnDropdown] = useState(false);
  
  type ExportColumnKey = 'studentName' | 'rollNo' | 'course' | 'date' | 'checkIn' | 'checkOut' | 'status';
  type ExportColumnInfo = { label: string; selected: boolean };
  
  const [exportColumns, setExportColumns] = useState<Record<ExportColumnKey, ExportColumnInfo>>({
    studentName: { label: 'Student Name', selected: true },
    rollNo: { label: 'Roll No', selected: true },
    course: { label: 'Course', selected: true },
    date: { label: 'Date', selected: true },
    checkIn: { label: 'Check-in Time', selected: true },
    checkOut: { label: 'Check-out Time', selected: true },
    status: { label: 'Status', selected: true },
  });
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowColumnDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const unsubAtt = listenToCollection('attendance', (data) => setAttendanceData(data));
    const unsubUsers = listenToCollection('users', (data) => setStudents(data.filter(u => u.role === 'student')));
    return () => {
      unsubAtt();
      unsubUsers();
    };
  }, []);

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  // Derived lists for dropdowns
  const courses = Array.from(new Set([
    ...students.map(s => s.course),
    ...attendanceData.map(r => r.course)
  ].filter(Boolean)));

  // Filter logic
  let filteredData = attendanceData.filter(record => {
    let match = true;
    
    // Check student match (by ID or Name)
    if (selectedStudent !== 'All') {
      const studentObj = students.find(s => (s.uid || s.id) === selectedStudent);
      const studentName = studentObj ? (studentObj.name || studentObj.userName || '').toLowerCase() : '';
      
      const recordName = (record.userName || record.name || record.studentName || '').toLowerCase();
      const isIdMatch = record.userId === selectedStudent || record.id === selectedStudent;
      const isNameMatch = studentName && recordName && recordName.includes(studentName);
      
      if (!isIdMatch && !isNameMatch) {
        match = false;
      }
    }
    
    if (selectedCourse !== 'All' && record.course !== selectedCourse) match = false;
    if (statusFilter !== 'All' && record.status !== statusFilter) match = false;
    if (startDate && record.date < startDate) match = false;
    if (endDate && record.date > endDate) match = false;
    return match;
  });

  // Sorting logic
  if (sortConfig !== null) {
    filteredData.sort((a, b) => {
      let aValue = a[sortConfig.key] || '';
      let bValue = b[sortConfig.key] || '';
      
      if (sortConfig.key === 'userName') {
        aValue = a.userName || a.name || a.studentName || '';
        bValue = b.userName || b.name || b.studentName || '';
      }

      if (aValue < bValue) {
        return sortConfig.direction === 'asc' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'asc' ? 1 : -1;
      }
      return 0;
    });
  } else {
    // Default sort by date descending
    filteredData.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const toggleColumn = (key: keyof typeof exportColumns) => {
    setExportColumns(prev => ({
      ...prev,
      [key]: { ...prev[key], selected: !prev[key].selected }
    }));
  };

  const handleExport = (type: 'csv' | 'excel' | 'pdf') => {
    if (filteredData.length === 0) {
      toast.error("No data to export.");
      return;
    }
    
    const activeColumns = (Object.entries(exportColumns) as [string, ExportColumnInfo][]).filter(([_, col]) => col.selected);
    if (activeColumns.length === 0) {
      toast.error("Please select at least one column to export.");
      return;
    }

    setShowExportOptions(false);
    const dateToday = new Date().toISOString().split('T')[0];

    if (type === 'csv') {
      const headers = activeColumns.map(([_, col]) => col.label);
      const csvContent = [
        headers.join(','),
        ...filteredData.map(r => {
          const rowData = [];
          const recordName = r.userName || r.name || r.studentName || 'Unknown';
          if (exportColumns.studentName.selected) rowData.push(`"${recordName}"`);
          if (exportColumns.rollNo.selected) rowData.push(`"${r.rollNo || ''}"`);
          if (exportColumns.course.selected) rowData.push(`"${r.course || ''}"`);
          if (exportColumns.date.selected) rowData.push(`"${r.date || ''}"`);
          if (exportColumns.checkIn.selected) rowData.push(`"${r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}"`);
          if (exportColumns.checkOut.selected) rowData.push(`"${r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}"`);
          if (exportColumns.status.selected) rowData.push(`"${r.status || ''}"`);
          return rowData.join(',');
        })
      ].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `custom_report_${dateToday}.csv`;
      link.click();
      toast.success("CSV exported successfully!");
    } else if (type === 'excel') {
      const data = filteredData.map(r => {
        const rowObj: any = {};
        const recordName = r.userName || r.name || r.studentName || 'Unknown';
        if (exportColumns.studentName.selected) rowObj['Student Name'] = recordName;
        if (exportColumns.rollNo.selected) rowObj['Roll No'] = r.rollNo || '';
        if (exportColumns.course.selected) rowObj['Course'] = r.course || '';
        if (exportColumns.date.selected) rowObj['Date'] = r.date || '';
        if (exportColumns.checkIn.selected) rowObj['Check-in'] = r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
        if (exportColumns.checkOut.selected) rowObj['Check-out'] = r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--';
        if (exportColumns.status.selected) rowObj['Status'] = r.status || '';
        return rowObj;
      });
      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Custom Report");
      XLSX.writeFile(workbook, `custom_report_${dateToday}.xlsx`);
      toast.success("Excel exported successfully!");
    } else if (type === 'pdf') {
      const doc = new jsPDF();
      doc.text("Attendance Report", 14, 15);
      const headers = [activeColumns.map(([_, col]) => col.label)];
      const body = filteredData.map(r => {
        const row = [];
        const recordName = r.userName || r.name || r.studentName || 'Unknown';
        if (exportColumns.studentName.selected) row.push(recordName);
        if (exportColumns.rollNo.selected) row.push(r.rollNo || '');
        if (exportColumns.course.selected) row.push(r.course || '');
        if (exportColumns.date.selected) row.push(r.date || '');
        if (exportColumns.checkIn.selected) row.push(r.checkInTime ? new Date(r.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--');
        if (exportColumns.checkOut.selected) row.push(r.checkOutTime ? new Date(r.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--');
        if (exportColumns.status.selected) row.push(r.status || '');
        return row;
      });
      autoTable(doc, {
        head: headers,
        body: body,
        startY: 20,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [37, 99, 235] }
      });
      doc.save(`custom_report_${dateToday}.pdf`);
      toast.success("PDF exported successfully!");
    }
  };

  const reports = [
    { title: 'Monthly Attendance Summary', description: 'Overview of attendance across all courses for the current month.', icon: BarChart2, color: 'text-blue-600', bg: 'bg-blue-50' },
    { title: 'Defaulters List', description: 'List of students with attendance below the required 75% threshold.', icon: Users, color: 'text-red-600', bg: 'bg-red-50' },
    { title: 'Leave Analysis', description: 'Breakdown of leave types and frequency over the academic year.', icon: PieChart, color: 'text-orange-600', bg: 'bg-orange-50' },
    { title: 'Performance Correlation', description: 'Correlation between attendance rates and academic performance.', icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Reports & Analytics</h2>
            <p className="text-sm text-gray-500">Generate and download detailed system reports</p>
          </div>
        </div>
      </div>

      {/* Custom Report Generator */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 mb-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Filter className="w-5 h-5 text-blue-600" />
              Custom Report Generator
            </h3>
            <p className="text-sm text-gray-500">Filter and export specific attendance records for any student or course.</p>
          </div>
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => setShowColumnDropdown(!showColumnDropdown)}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-bold rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
              >
                Columns
                <ChevronDown className="w-4 h-4" />
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => setShowExportOptions(!showExportOptions)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
                >
                  <Download className="w-4 h-4" />
                  Export
                  <ChevronDown className="w-4 h-4" />
                </button>

                {showExportOptions && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setShowExportOptions(false)} />
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 z-40 py-2 animate-in fade-in slide-in-from-top-2">
                      <button
                        onClick={() => handleExport('csv')}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                      >
                        <FileText className="w-4 h-4 mr-3 text-green-600" />
                        Download CSV
                      </button>
                      <button
                        onClick={() => handleExport('excel')}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                      >
                        <FileSpreadsheet className="w-4 h-4 mr-3 text-emerald-600" />
                        Download Excel
                      </button>
                      <button
                        onClick={() => handleExport('pdf')}
                        className="w-full flex items-center px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 font-medium transition-colors"
                      >
                        <FilePdf className="w-4 h-4 mr-3 text-red-500" />
                        Download PDF
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
            
            {/* Column Selection Dropdown */}
            {showColumnDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 z-10 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="p-3 border-b border-gray-50 bg-gray-50/50">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Select Columns to Export</p>
                </div>
                <div className="p-2 max-h-64 overflow-y-auto">
                  {(Object.entries(exportColumns) as [string, ExportColumnInfo][]).map(([key, col]) => (
                    <button
                      key={key}
                      onClick={() => toggleColumn(key as keyof typeof exportColumns)}
                      className="w-full flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg transition-colors text-left"
                    >
                      {col.selected ? (
                        <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
                      ) : (
                        <Square className="w-4 h-4 text-gray-300 shrink-0" />
                      )}
                      <span className={`text-sm ${col.selected ? 'text-gray-800 font-medium' : 'text-gray-500'}`}>
                        {col.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Student</label>
            <select 
              value={selectedStudent} 
              onChange={e => setSelectedStudent(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Students</option>
              {students.map(s => (
                <option key={s.uid || s.id} value={s.uid || s.id}>{s.name} ({s.rollNo})</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Course</label>
            <select 
              value={selectedCourse} 
              onChange={e => setSelectedCourse(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Courses</option>
              {courses.map(c => (
                <option key={c as string} value={c as string}>{c as string}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Status</label>
            <select 
              value={statusFilter} 
              onChange={e => setStatusFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Absent">Absent</option>
              <option value="Late">Late</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">From Date</label>
            <input 
              type="date" 
              value={startDate}
              onChange={e => setStartDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">To Date</label>
            <input 
              type="date" 
              value={endDate}
              onChange={e => setEndDate(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto border border-gray-100 rounded-lg">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100 text-xs uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('date')}>
                  Date {sortConfig?.key === 'date' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('userName')}>
                  Student {sortConfig?.key === 'userName' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('course')}>
                  Course {sortConfig?.key === 'course' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('checkInTime')}>
                  Check-in {sortConfig?.key === 'checkInTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('checkOutTime')}>
                  Check-out {sortConfig?.key === 'checkOutTime' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
                <th className="px-4 py-3 font-bold cursor-pointer hover:bg-gray-100 transition-colors" onClick={() => handleSort('status')}>
                  Status {sortConfig?.key === 'status' && (sortConfig.direction === 'asc' ? '↑' : '↓')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500 text-sm">No records found for the selected filters.</td>
                </tr>
              ) : (
                filteredData.slice(0, 50).map((record, i) => {
                  const recordName = record.userName || record.name || record.studentName || 'Unknown';
                  return (
                  <tr key={record.id || i} className="hover:bg-gray-50/50 text-sm transition-colors">
                    <td className="px-4 py-3 text-gray-600">{record.date}</td>
                    <td className="px-4 py-3 font-medium text-gray-800">{recordName} <span className="text-xs text-gray-400 font-normal ml-1">({record.rollNo})</span></td>
                    <td className="px-4 py-3 text-gray-600">{record.course}</td>
                    <td className="px-4 py-3 text-gray-600">{record.checkInTime ? new Date(record.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                    <td className="px-4 py-3 text-gray-600">{record.checkOutTime ? new Date(record.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center justify-center px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wider ${
                        record.status === 'Present' ? 'bg-green-100 text-green-700' :
                        record.status === 'Late' ? 'bg-orange-100 text-orange-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {record.status}
                      </span>
                    </td>
                  </tr>
                )})
              )}
            </tbody>
          </table>
          {filteredData.length > 50 && (
            <div className="p-3 text-center text-xs text-gray-500 bg-gray-50 border-t border-gray-100">
              Showing 50 of {filteredData.length} records. Export to view all.
            </div>
          )}
        </div>
      </div>

      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800">Quick Reports</h3>
        <p className="text-sm text-gray-500">Pre-configured report templates</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reports.map((report, idx) => (
          <div key={idx} className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 flex flex-col">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${report.bg}`}>
                <report.icon className={`w-6 h-6 ${report.color}`} />
              </div>
              <div>
                <h3 className="text-base font-bold text-gray-800">{report.title}</h3>
                <p className="text-sm text-gray-500 mt-1">{report.description}</p>
              </div>
            </div>
            <div className="mt-auto pt-4 border-t border-gray-50 flex gap-3">
              <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-50 hover:bg-gray-100 text-gray-700 text-sm font-bold rounded-lg transition-colors">
                <FileText className="w-4 h-4" />
                View
              </button>
              <button className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 text-sm font-bold rounded-lg transition-colors">
                <Download className="w-4 h-4" />
                Download CSV
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
