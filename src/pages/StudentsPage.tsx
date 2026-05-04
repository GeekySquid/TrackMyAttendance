import React, { useState, useEffect, useMemo } from 'react';
import { Users, UserPlus, UserCheck, UserMinus, Plus, Search, Copy, XCircle, Loader2, Trash2, ChevronDown, History, Trophy } from 'lucide-react';
import CustomDropdown from '../components/CustomDropdown';
import CustomDateInput from '../components/CustomDateInput';
import StatCard from '../components/StatCard';
import StudentProfile from '../components/StudentProfile';
import { listenToCollection, saveUser, getMentors, deleteUser, getAttendanceSummary, updateProfile, addNotification, getMonthlyLeaderboard } from '../services/dbService';
import { useInfiniteScroll } from '../hooks/useInfiniteScroll';
import toast from 'react-hot-toast';

// Skeleton for table rows
function SkeletonStudentRow() {
  return (
    <tr className="animate-pulse border-b border-gray-50">
      <td className="py-3 px-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-100" />
          <div className="space-y-1.5">
            <div className="h-3 bg-gray-100 rounded w-28" />
            <div className="h-2.5 bg-gray-100 rounded w-36" />
          </div>
        </div>
      </td>
      <td className="py-3 px-4"><div className="h-3 bg-gray-100 rounded w-20" /></td>
      <td className="py-3 px-4"><div className="h-3 bg-gray-100 rounded w-16" /></td>
      <td className="py-3 px-4"><div className="h-3 bg-gray-100 rounded w-24" /></td>
      <td className="py-3 px-4"><div className="h-5 bg-gray-100 rounded w-14" /></td>
      <td className="py-3 px-4 text-right"><div className="h-5 bg-gray-100 rounded w-5 ml-auto" /></td>
    </tr>
  );
}

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [courseFilter, setCourseFilter] = useState('All Courses');
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [attendanceSummary, setAttendanceSummary] = useState<any[]>([]);
  const [showCourseDropdown, setShowCourseDropdown] = useState(false);
  const [monthlyWinnerId, setMonthlyWinnerId] = useState<string | null>(null);

  // Add Student Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRollNo, setNewRollNo] = useState('');
  const [newCourse, setNewCourse] = useState('MCA');
  const [newPhone, setNewPhone] = useState('');
  const [newMentorId, setNewMentorId] = useState('');
  const [newBloodGroup, setNewBloodGroup] = useState('');
  const [mentors, setMentors] = useState<any[]>([]);

  useEffect(() => {
    const unsubscribe = listenToCollection('users', (data) => {
      const studentUsers = data.filter(u => u.role === 'student');
      setStudents(studentUsers);
      setIsLoading(false);
    });

    const fetchExtraData = async () => {
      const mData = await getMentors();
      setMentors(mData);


      const summary = await getAttendanceSummary();
      setAttendanceSummary(summary);

      const leaderboard = await getMonthlyLeaderboard();
      if (leaderboard.length > 0) {
        setMonthlyWinnerId(leaderboard[0].user_id);
      }
    };
    fetchExtraData();

    return () => unsubscribe();
  }, []);

  const filteredStudents = useMemo(() => {
    // Optimization: Create a map for faster lookup
    const attendanceMap = new Map(attendanceSummary.map(s => [s.user_id, s]));

    return students.map(s => {
      const id = s.uid || s.id;
      const stats = attendanceMap.get(id);
      return {
        ...s,
        attendance: stats ? `${Math.round(stats.attendance_pct)}%` : (s.attendance || '0%'),
        attendance_pct: stats ? stats.attendance_pct : (s.attendance_pct || 0),
        isAwardWinner: id === monthlyWinnerId
      };
    }).filter(student => {
      if (student.name === 'ADMIN SAVED TEST' || student.rollNo === '9999999999') return false;

      const matchesSearch =
        student.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.rollNo?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        student.course?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesCourse = courseFilter === 'All Courses' || student.course === courseFilter;
      
      return matchesSearch && matchesCourse;
    });
  }, [students, attendanceSummary, monthlyWinnerId, searchQuery, courseFilter]);

  // Handle automatic student selection and real-time updates
  useEffect(() => {
    if (!isLoading && filteredStudents.length > 0) {
      const currentId = selectedStudent?.uid || selectedStudent?.id;
      
      if (!currentId) {
        // Initial load: select the first student
        setSelectedStudent(filteredStudents[0]);
        return;
      }

      const updatedStudent = filteredStudents.find(s => (s.uid || s.id) === currentId);
      
      if (updatedStudent) {
        // Update selected student data if it has changed (e.g. attendance update)
        if (JSON.stringify(updatedStudent) !== JSON.stringify(selectedStudent)) {
          setSelectedStudent(updatedStudent);
        }
      } else {
        // Fallback to first student if current selection is no longer in the filtered list
        setSelectedStudent(filteredStudents[0]);
      }
    }
  }, [isLoading, filteredStudents, selectedStudent]);

  const { visibleItems, sentinelRef, hasMore } = useInfiniteScroll(filteredStudents, 10, 5);

  const activeStudents = students.filter(s => s.status === 'Active' || !s.status).length;
  const droppedStudents = students.filter(s => s.status === 'Dropped').length;
  const newEnrollments = students.filter(s => {
    if (!s.createdAt) return false;
    const createdDate = new Date(s.createdAt);
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return createdDate >= thirtyDaysAgo;
  }).length;

  const handleAddStudent = async () => {
    if (!newName || !newEmail || !newRollNo || isSaving) return;

    const tempId = `student_${Date.now()}`;
    const newUser = {
      uid: tempId,
      id: tempId,
      name: newName,
      email: newEmail,
      rollNo: newRollNo,
      course: newCourse,
      phone: newPhone,
      role: 'student',
      status: 'Active',
      attendance: '100%',
      mentorId: newMentorId,
      bloodGroup: newBloodGroup,
      createdAt: new Date().toISOString(),
      onboarded: true,
      profileCompleted: true,
    };

    // Optimistic: add to list immediately
    setStudents(prev => [newUser, ...prev]);
    setShowAddModal(false);
    resetForm();
    toast.success('Student added successfully!');
    setIsSaving(true);
    try {
      await saveUser(newUser);
    } catch {
      // Rollback on failure — realtime will sync
      setStudents(prev => prev.filter(s => s.uid !== tempId));
      toast.error('Failed to save student. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteStudent = async (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDeleteId(studentId);
  };

  const confirmDelete = async () => {
    if (!confirmDeleteId) return;
    const studentId = confirmDeleteId;
    setConfirmDeleteId(null);
    
    // Optimistic update
    setStudents(prev => prev.filter(s => (s.uid || s.id) !== studentId));
    if (selectedStudent?.id === studentId || selectedStudent?.uid === studentId) {
      setSelectedStudent(null);
    }

    try {
      await deleteUser(studentId);
      toast.success('Student removed successfully');
    } catch (err) {
      toast.error('Failed to remove student');
      // Realtime listener will eventually restore if it failed, but let's be proactive if needed
    } finally {
      setIsDeleting(null);
    }
  };

  const handleNavigateProfile = (direction: 'next' | 'prev') => {
    if (filteredStudents.length <= 1) return;

    const currentIndex = filteredStudents.findIndex(s => (s.uid || s.id) === (selectedStudent?.uid || selectedStudent?.id));
    let nextIndex;

    if (direction === 'next') {
      nextIndex = (currentIndex + 1) % filteredStudents.length;
    } else {
      nextIndex = (currentIndex - 1 + filteredStudents.length) % filteredStudents.length;
    }

    setSelectedStudent(filteredStudents[nextIndex]);
  };

  const resetForm = () => {
    setNewName('');
    setNewEmail('');
    setNewRollNo('');
    setNewCourse('MCA');
    setNewPhone('');
    setNewMentorId('');
    setNewBloodGroup('');
  };

  const uniqueCourses = ['All Courses', ...Array.from(new Set(students.map(s => s.course).filter(Boolean)))];
  


  return (
    <div className="flex-1 mobile-container-padding relative">
      <div className="mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center w-full gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-800">Students Directory</h2>
            <p className="text-sm text-gray-500">Manage and view all student profiles</p>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="w-full sm:w-auto bg-blue-600 text-white text-xs py-2.5 px-6 rounded-lg font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-colors flex items-center justify-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add New Student
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {isLoading ? (
          [...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 animate-pulse">
              <div className="flex items-start justify-between mb-4">
                <div className="space-y-2">
                  <div className="h-2.5 bg-gray-100 rounded w-24" />
                  <div className="h-7 bg-gray-100 rounded w-12" />
                </div>
                <div className="w-10 h-10 rounded-lg bg-gray-100" />
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full w-full mb-3" />
              <div className="h-2.5 bg-gray-100 rounded w-20" />
            </div>
          ))
        ) : (
          <>
            <StatCard title="Total Students" value={students.length.toString()} total="" percentage="100%" trend="" trendUp={true}
              icon={<Users className="h-6 w-6 text-blue-600" />} colorClass="text-blue-600" bgClass="bg-blue-50" progressColorClass="bg-blue-500" />
            <StatCard title="New Enrollments (30d)" value={newEnrollments.toString()} total="" percentage={`${students.length > 0 ? Math.round((newEnrollments / students.length) * 100) : 0}%`} trend="" trendUp={true}
              icon={<UserPlus className="h-6 w-6 text-green-500" />} colorClass="text-green-500" bgClass="bg-green-50" progressColorClass="bg-green-500" />
            <StatCard title="Active Students" value={activeStudents.toString()} total={students.length.toString()} percentage={`${students.length > 0 ? Math.round((activeStudents / students.length) * 100) : 0}%`} trend="" trendUp={false}
              icon={<UserCheck className="h-6 w-6 text-orange-400" />} colorClass="text-orange-400" bgClass="bg-orange-50" progressColorClass="bg-orange-400" />
            <StatCard title="Dropped Out" value={droppedStudents.toString()} total={students.length.toString()} percentage={`${students.length > 0 ? Math.round((droppedStudents / students.length) * 100) : 0}%`} trend="" trendUp={false}
              icon={<UserMinus className="h-6 w-6 text-red-500" />} colorClass="text-red-500" bgClass="bg-red-50" progressColorClass="bg-red-400" />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10 lg:gap-12">
        <div className="xl:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 sm:p-6 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <h3 className="text-base font-bold text-gray-800">Student List</h3>
                <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {filteredStudents.length} Total
                </span>
                {isLoading && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
              </div>
              <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                <CustomDropdown
                  options={uniqueCourses.map(c => ({ value: c, label: c }))}
                  value={courseFilter}
                  onChange={setCourseFilter}
                  className="w-full sm:w-48"
                />
                <div className="relative flex-1 sm:w-64">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 transform -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search students..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
            <div className="table-fixed-height">
              {/* Desktop Table View */}
              <table className="w-full text-left border-collapse hidden md:table">
                <thead className="bg-gray-50/50 sticky top-0 z-10 backdrop-blur-md">
                  <tr>
                    <th className="py-4 px-6 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Student Info</th>
                    <th className="py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Roll No</th>
                    <th className="py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Course</th>
                    <th className="py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Mentor</th>
                    <th className="py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-center">Attendance</th>

                    <th className="py-4 px-4 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {isLoading ? (
                    Array(5).fill(0).map((_, i) => <SkeletonStudentRow key={i} />)
                  ) : filteredStudents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-gray-500 text-sm italic">No students found matching your criteria.</td>
                    </tr>
                  ) : (
                    visibleItems.map((student) => (
                      <tr
                        key={student.uid || student.id}
                        onClick={() => setSelectedStudent(student)}
                        className={`hover:bg-blue-50/30 transition-colors cursor-pointer group ${selectedStudent?.uid === student.uid || selectedStudent?.id === student.id ? 'bg-blue-50' : ''}`}
                      >
                        <td className="py-4 px-6">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-sm shrink-0 overflow-hidden border-2 border-white shadow-sm ring-1 ring-blue-50">
                              {student.photoURL ? (
                                <img src={student.photoURL} alt="" className="w-full h-full object-cover" />
                              ) : (
                                <span>{student.name?.charAt(0) || 'S'}</span>
                              )}
                            </div>
                             <div className="min-w-0">
                               <div className="flex items-center gap-1.5">
                                 <p className="text-sm font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{student.name}</p>
                                 {student.isAwardWinner && (
                                   <div className="relative group/trophy ml-1">
                                     <div className="absolute inset-0 bg-orange-400 blur-md opacity-20 group-hover/trophy:opacity-40 animate-pulse"></div>
                                     <Trophy className="w-4 h-4 text-orange-500 fill-orange-200 animate-bounce relative z-10" />
                                   </div>
                                 )}
                               </div>
                               <p className="text-[11px] text-gray-500 truncate">{student.email}</p>
                             </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-sm text-gray-600 font-mono font-medium">{student.rollNo}</span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-600 uppercase tracking-wider">
                            {student.course}
                          </span>
                        </td>
                        <td className="py-4 px-4">
                          <span className="text-xs font-bold text-gray-700">
                            {student.mentors?.name || 'No Mentor'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="inline-flex flex-col items-center gap-1">
                            <span className={`text-xs font-black ${parseInt(student.attendance) >= 75 ? 'text-green-600' :
                              parseInt(student.attendance) >= 60 ? 'text-orange-500' : 'text-red-500'
                              }`}>
                              {student.attendance || '0%'}
                            </span>
                            <div className="w-16 bg-gray-100 rounded-full h-1 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-500 ${parseInt(student.attendance) >= 75 ? 'bg-green-500' :
                                  parseInt(student.attendance) >= 60 ? 'bg-orange-400' : 'bg-red-400'
                                  }`}
                                style={{ width: student.attendance || '0%' }}
                              />
                            </div>
                          </div>
                        </td>

                        <td className="py-4 px-4 text-right">
                          <div className="flex justify-end items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(`${student.name} - ${student.rollNo}`);
                                toast.success('Copied!');
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-gray-100 transition-all"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => handleDeleteStudent(student.uid || student.id, e)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-white rounded-xl shadow-sm border border-transparent hover:border-gray-100 transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>

              {/* Mobile Card View */}
              <div className="md:hidden p-4 space-y-4">
                {isLoading ? (
                  Array(3).fill(0).map((_, i) => (
                    <div key={i} className="animate-pulse bg-gray-50 h-32 rounded-2xl" />
                  ))
                ) : filteredStudents.length === 0 ? (
                  <div className="py-12 text-center text-gray-500 text-sm italic">No students found.</div>
                ) : (
                  visibleItems.map((student) => (
                    <div
                      key={student.uid || student.id}
                      onClick={() => setSelectedStudent(student)}
                      className={`p-4 rounded-2xl border transition-all active:scale-[0.98] ${selectedStudent?.uid === student.uid || selectedStudent?.id === student.id
                        ? 'bg-blue-50 border-blue-200 shadow-md ring-1 ring-blue-100'
                        : 'bg-white border-gray-100 shadow-sm'
                        }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-blue-100 flex items-center justify-center text-blue-600 font-bold overflow-hidden border-2 border-white shadow-sm">
                            {student.photoURL ? (
                              <img src={student.photoURL} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-lg">{student.name?.charAt(0) || 'S'}</span>
                            )}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-sm font-bold text-gray-900">{student.name}</h4>
                              {student.isAwardWinner && (
                                <Trophy className="w-3.5 h-3.5 text-orange-500 fill-orange-200 animate-bounce" />
                              )}
                            </div>
                            <p className="text-[10px] text-gray-500 font-medium uppercase tracking-tight">{student.course} • {student.rollNo}</p>
                            <p className="text-[9px] text-blue-600 font-black uppercase tracking-widest mt-1">Mentor: {student.mentors?.name || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(`${student.name} - ${student.rollNo}`);
                              toast.success('Copied!');
                            }}
                            className="p-2 text-gray-400 bg-gray-50 rounded-xl"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between bg-white/50 rounded-xl p-3 border border-gray-50">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Attendance</span>
                          <span className={`text-sm font-black ${parseInt(student.attendance) >= 75 ? 'text-green-600' :
                            parseInt(student.attendance) >= 60 ? 'text-orange-500' : 'text-red-500'
                            }`}>
                            {student.attendance || '0%'}
                          </span>
                        </div>
                        <div className="w-32 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-700 ${parseInt(student.attendance) >= 75 ? 'bg-green-500' :
                              parseInt(student.attendance) >= 60 ? 'bg-orange-400' : 'bg-red-400'
                              }`}
                            style={{ width: student.attendance || '0%' }}
                          />
                        </div>
                        <button
                          onClick={(e) => handleDeleteStudent(student.uid || student.id, e)}
                          className="p-2 text-red-400 bg-red-50 rounded-xl ml-2"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div ref={sentinelRef} className="h-10 flex items-center justify-center pb-4">
                {hasMore && (
                  <div className="flex items-center gap-2 text-xs text-gray-400 animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Loading more students...
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
        <div className="col-span-1">
          <StudentProfile 
            student={selectedStudent} 
            onClose={() => setSelectedStudent(null)} 
            onNavigate={handleNavigateProfile}
            isAdmin={true}
            isLoading={isLoading}
          />
        </div>
        </div>


      {/* Add Student Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Add New Student</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. john@example.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Roll Number</label>
                  <input
                    type="text"
                    value={newRollNo}
                    onChange={(e) => setNewRollNo(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. 2505304049"
                  />
                </div>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Course</label>
                  <input
                    type="text"
                    value={newCourse}
                    onChange={(e) => setNewCourse(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="e.g. MCA"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. +91 9876543210"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Blood Group</label>
                  <select
                    value={newBloodGroup}
                    onChange={(e) => setNewBloodGroup(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select Blood Group</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
                <div className="pt-0">
                  <CustomDropdown
                    label="Assign Mentor"
                    options={[
                      { value: "", label: "No Mentor Assigned" },
                      ...mentors.map(m => ({ value: m.id, label: m.name }))
                    ]}
                    value={newMentorId}
                    onChange={setNewMentorId}
                  />
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddStudent}
                disabled={!newName || !newEmail || !newRollNo || isSaving}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 disabled:opacity-50 flex items-center gap-2"
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Student
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      {confirmDeleteId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Trash2 className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Remove Student?</h3>
              <p className="text-sm text-gray-500 mb-8">
                Are you sure you want to remove <strong>{students.find(s => (s.uid || s.id) === confirmDeleteId)?.name}</strong>? This action will permanently delete their profile data.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="flex-1 py-3 px-4 bg-red-500 hover:bg-red-600 text-white rounded-xl font-bold transition-colors shadow-lg shadow-red-100"
                >
                  Remove
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
