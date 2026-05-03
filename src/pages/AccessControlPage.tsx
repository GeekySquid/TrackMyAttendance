import React, { useState, useEffect } from 'react';
import { Shield, Users, GripVertical, Check, Plus, XCircle, Loader2, ArrowRightCircle, UserPlus, MoreVertical, Trash2 } from 'lucide-react';
import { listenToCollection, updateUserRole, saveUser, getRoles, saveRoles } from '../services/dbService';
import CustomDropdown from '../components/CustomDropdown';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';

type User = { id: string; uid?: string; name: string; email: string; roleId: string | null };
type Role = { id: string; name: string; modules: string[] };

const AVAILABLE_MODULES = [
  'Dashboard', 'Students', 'Attendance', 'Leave Requests', 'Reports', 'Documents', 'Notifications', 'Settings', 'Geofencing'
];

const INITIAL_ROLES: Role[] = [
  { id: 'r1', name: 'Super Admin', modules: [...AVAILABLE_MODULES] },
  { id: 'r2', name: 'Attendance Manager', modules: ['Dashboard', 'Students', 'Attendance', 'Reports'] },
];

export default function AccessControlPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>(INITIAL_ROLES);
  const [draggedUserId, setDraggedUserId] = useState<string | null>(null);

  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showAddRoleModal, setShowAddRoleModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<string | null>(null);
  const [newRoleName, setNewRoleName] = useState('');
  const [isSavingRole, setIsSavingRole] = useState(false);
  const [selectingRoleForUser, setSelectingRoleForUser] = useState<User | null>(null);
  const [expandedRolePermissions, setExpandedRolePermissions] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = listenToCollection('users', (data) => {
      setUsers(data as User[]);
    });

    // Load roles
    const loadRoles = async () => {
      const dbRoles = await getRoles();
      if (dbRoles && dbRoles.length > 0) {
        setRoles(dbRoles as Role[]);
      } else {
        await saveRoles(INITIAL_ROLES);
      }
    };
    loadRoles();

    return () => unsubscribe();
  }, []);

  const handleDragStart = (e: React.DragEvent, userId: string) => {
    setDraggedUserId(userId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('userId', userId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, roleId: string | null) => {
    e.preventDefault();
    const droppedUserId = e.dataTransfer.getData('userId') || draggedUserId;
    if (droppedUserId) {
      // Optimistic update
      setUsers(users.map(u => (u.id === droppedUserId || u.uid === droppedUserId) ? { ...u, roleId } : u));
      // DB update
      await updateUserRole(droppedUserId, roleId);
      setDraggedUserId(null);
    }
  };

  const toggleModule = async (roleId: string, moduleName: string) => {
    const updatedRoles = roles.map(r => {
      if (r.id === roleId) {
        const hasModule = r.modules.includes(moduleName);
        return {
          ...r,
          modules: hasModule ? r.modules.filter(m => m !== moduleName) : [...r.modules, moduleName]
        };
      }
      return r;
    });
    setRoles(updatedRoles);
    await saveRoles(updatedRoles);
  };

  const handleAddUser = async () => {
    if (!newUserName || !newUserEmail) return;
    const newUser = {
      uid: `u${Date.now()}`,
      name: newUserName,
      email: newUserEmail,
      role: 'admin', // By default, users added here are admins
      roleId: newUserRole === 'unassigned' ? null : newUserRole,
      status: 'Active'
    };
    await saveUser(newUser);
    setNewUserName('');
    setNewUserEmail('');
    setNewUserRole(null);
    setShowAddUserModal(false);
  };

  const handleCreateRole = async () => {
    if (!newRoleName) return;
    setIsSavingRole(true);
    const newRole: Role = {
      id: `r-${Date.now()}`,
      name: newRoleName,
      modules: ['Dashboard'] // Default access
    };
    const updatedRoles = [...roles, newRole];
    setRoles(updatedRoles);
    await saveRoles(updatedRoles);
    setNewRoleName('');
    setShowAddRoleModal(false);
    setIsSavingRole(false);
  };

  const unassignedUsers = users.filter(u => u.roleId === null || u.roleId === undefined);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden mobile-container-padding">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Role-Based Access Control</h2>
          <p className="text-sm text-gray-500">Drag and drop users into roles and configure module access.</p>
        </div>
        <button
          onClick={() => setShowAddUserModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-200"
        >
          <Plus className="w-4 h-4" />
          Add New User
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 flex-1 min-h-0 pb-6 lg:pb-0">
        {/* Unassigned Users Pool - Premium Floating Design on Mobile */}
        <div
          className="w-full lg:w-80 bg-white/80 backdrop-blur-md rounded-3xl border border-gray-100 shadow-xl flex flex-col transition-all overflow-hidden shrink-0 lg:h-full max-h-[300px] lg:max-h-none"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, null)}
        >
          <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
              <Users className="w-4 h-4 text-gray-500" />
            </div>
            <h3 className="font-black text-gray-800 text-sm uppercase tracking-tight">Unassigned Pool</h3>
            <span className="ml-auto bg-blue-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full shadow-lg shadow-blue-100">
              {unassignedUsers.length}
            </span>
          </div>

          <div className="p-4 flex-1 overflow-x-auto lg:overflow-y-auto flex lg:flex-col gap-3 custom-scrollbar min-h-0">
            {unassignedUsers.length === 0 && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center min-w-[200px]">
                <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center mb-2">
                  <Check className="w-6 h-6 text-green-500" />
                </div>
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-tight">All Users<br />Assigned</p>
              </div>
            )}
            {unassignedUsers.map(user => (
              <div
                key={user.id}
                draggable={true}
                onDragStart={(e) => handleDragStart(e, user.id)}
                className="group relative bg-white border border-gray-100 rounded-2xl p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-400 hover:shadow-xl hover:shadow-blue-900/5 transition-all flex items-center gap-3 shrink-0 lg:shrink-1 w-64 lg:w-full border-l-4 border-l-gray-300 hover:border-l-blue-500"
              >
                <div className="hidden lg:flex items-center justify-center text-gray-300 group-hover:text-blue-400 transition-colors">
                  <GripVertical className="w-4 h-4" />
                </div>
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center text-gray-700 font-black text-sm border border-gray-200">
                  {user.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-black text-gray-800 truncate">{user.name}</p>
                  <p className="text-[9px] font-bold text-gray-400 truncate uppercase tracking-tighter">{user.email}</p>
                </div>
                {/* Mobile Quick Assign Button */}
                <button
                  onClick={() => setSelectingRoleForUser(user)}
                  className="lg:hidden p-2 text-blue-600 bg-blue-50 rounded-xl active:scale-90 transition-all"
                >
                  <ArrowRightCircle className="w-5 h-5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Roles Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 min-h-0">
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-12">
            {roles.map(role => {
              const roleUsers = users.filter(u => u.roleId === role.id);
              return (
                <div key={role.id} className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-blue-900/5 flex flex-col h-full overflow-hidden">
                  <div className="p-4 border-b border-gray-100 bg-blue-50/30 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-100">
                        <Shield className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-black text-gray-800 text-sm uppercase tracking-tight">{role.name}</h3>
                        <p className="text-[10px] font-bold text-blue-500 uppercase">{roleUsers.length} Members</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setExpandedRolePermissions(expandedRolePermissions === role.id ? null : role.id)}
                      className="lg:hidden p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="p-4 flex-1 flex flex-col gap-6">
                    {/* Drop Zone for Users */}
                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Assigned Members</h4>
                        <UserPlus className="w-3.5 h-3.5 text-gray-300" />
                      </div>
                      <div
                        className="min-h-[100px] bg-gray-50/50 border-2 border-dashed border-gray-200 rounded-2xl p-3 flex flex-col gap-2 transition-colors hover:border-blue-200"
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, role.id)}
                      >
                        {roleUsers.length === 0 && (
                          <div className="flex-1 flex items-center justify-center text-sm text-gray-400 font-medium">
                            Drag users here
                          </div>
                        )}
                        {roleUsers.map(user => (
                          <div
                            key={user.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, user.id)}
                            className="bg-white border border-gray-100 rounded-2xl p-2.5 shadow-sm cursor-grab active:cursor-grabbing flex items-center gap-3 hover:border-blue-300 hover:shadow-lg transition-all group border-l-4 border-l-blue-400"
                          >
                            <GripVertical className="w-3.5 h-3.5 text-gray-300 group-hover:text-blue-400 transition-colors shrink-0" />
                            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs font-black border border-blue-100 shrink-0">
                              {user.name.charAt(0)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-black text-gray-800 truncate">{user.name}</p>
                              <p className="text-[8px] font-bold text-gray-400 uppercase truncate">Assigned User</p>
                            </div>
                            <button
                              onClick={async () => {
                                // Optimistic update
                                setUsers(prev => prev.map(u => u.id === user.id ? { ...u, roleId: null } : u));
                                try {
                                  await updateUserRole(user.id, null);
                                } catch (err) {
                                  toast.error('Failed to remove user from role');
                                }
                              }}
                              className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all opacity-100 lg:opacity-0 lg:group-hover:opacity-100 bg-gray-50/50 lg:bg-transparent"
                              title="Remove from role"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Module Permissions */}
                    <div className={`${expandedRolePermissions === role.id ? 'block' : 'hidden lg:block'} animate-in fade-in slide-in-from-top-2 duration-300`}>
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Module Access Control</h4>
                        <div className="h-px bg-gray-100 flex-1 ml-4" />
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-2 gap-2">
                        {AVAILABLE_MODULES.map(module => {
                          const isAllowed = role.modules.includes(module);
                          return (
                            <label
                              key={module}
                              className={`flex items-center gap-2 p-2.5 rounded-2xl border transition-all active:scale-[0.98] cursor-pointer ${isAllowed ? 'bg-blue-50 border-blue-200 shadow-sm shadow-blue-50' : 'bg-white border-gray-100 hover:bg-gray-50'
                                }`}
                            >
                              <div className={`w-4 h-4 rounded-lg border flex items-center justify-center shrink-0 transition-all ${isAllowed ? 'bg-blue-600 border-blue-600 rotate-0' : 'border-gray-200 rotate-90'
                                }`}>
                                {isAllowed && <Check className="w-2.5 h-2.5 text-white" />}
                              </div>
                              <input
                                type="checkbox"
                                className="hidden"
                                checked={isAllowed}
                                onChange={() => toggleModule(role.id, module)}
                              />
                              <span className={`text-[10px] font-black uppercase tracking-tight ${isAllowed ? 'text-blue-900' : 'text-gray-400'}`}>
                                {module}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Add New Role Button */}
            <button
              onClick={() => setShowAddRoleModal(true)}
              className="h-[200px] border-2 border-dashed border-gray-300 rounded-xl flex flex-col items-center justify-center text-gray-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all group"
            >
              <div className="w-12 h-12 rounded-full bg-gray-50 group-hover:bg-blue-100 flex items-center justify-center mb-3 transition-colors">
                <Plus className="w-6 h-6" />
              </div>
              <span className="font-bold">Create New Role</span>
            </button>
          </div>
        </div>
      </div>

      {/* Role Picker Modal (Mobile) */}
      <AnimatePresence>
        {selectingRoleForUser && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] shadow-2xl w-full max-w-xs border border-gray-100"
            >
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-black text-gray-800 truncate pr-4">{selectingRoleForUser.name}</h3>
                  <button onClick={() => setSelectingRoleForUser(null)} className="p-2 text-gray-400 hover:text-gray-600">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {roles.map(role => (
                    <button
                      key={role.id}
                      onClick={async () => {
                        await updateUserRole(selectingRoleForUser.id, role.id);
                        setSelectingRoleForUser(null);
                        setExpandedRolePermissions(role.id);
                        toast.success(`Moved to ${role.name}`);
                      }}
                      className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-blue-600 rounded-2xl transition-all group"
                    >
                      <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:bg-white/20">
                        <Shield className="w-4 h-4 text-blue-600 group-hover:text-white" />
                      </div>
                      <span className="text-xs font-black text-gray-700 group-hover:text-white">{role.name}</span>
                    </button>
                  ))}
                  <div className="pt-2">
                    <button
                      onClick={async () => {
                        const userId = selectingRoleForUser.id;
                        // Optimistic update
                        setUsers(prev => prev.map(u => u.id === userId ? { ...u, roleId: null } : u));
                        setSelectingRoleForUser(null);
                        try {
                          await updateUserRole(userId, null);
                        } catch (err) {
                          toast.error('Failed to remove user from role');
                        }
                      }}
                      className="w-full p-3 text-[10px] font-black text-red-500 uppercase tracking-widest hover:bg-red-50 rounded-2xl transition-colors border border-dashed border-red-100"
                    >
                      Remove from Role
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Create New Role</h3>
              <button onClick={() => setShowAddRoleModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6">
              <label className="block text-sm font-bold text-gray-700 mb-1">Role Name</label>
              <input
                type="text"
                autoFocus
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateRole()}
                className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="e.g. Moderator"
              />
              <p className="text-[10px] text-gray-400 mt-2">New roles have basic 'Dashboard' access by default.</p>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowAddRoleModal(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
              <button
                onClick={handleCreateRole}
                disabled={!newRoleName || isSavingRole}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 flex items-center gap-2 disabled:opacity-50"
              >
                {isSavingRole ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Role'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-in fade-in zoom-in duration-200">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">Add New User</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. John Doe"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">Email Address</label>
                <input
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. john@example.com"
                />
              </div>
              <div>
                <CustomDropdown
                  label="Assign Initial Role"
                  options={[
                    { value: 'unassigned', label: 'Unassigned (Assign Later)' },
                    ...roles.map(r => ({ value: r.id, label: r.name }))
                  ]}
                  value={newUserRole || 'unassigned'}
                  onChange={setNewUserRole}
                />
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
              <button onClick={() => setShowAddUserModal(false)} className="px-4 py-2 text-sm font-bold text-gray-600 hover:text-gray-800 transition-colors">Cancel</button>
              <button
                onClick={handleAddUser}
                disabled={!newUserName || !newUserEmail}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md shadow-blue-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add User
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
