import React, { useState, useEffect } from 'react';
import { Shield, Users, GripVertical, Check, Plus, XCircle, Loader2 } from 'lucide-react';
import { listenToCollection, updateUserRole, saveUser, getRoles, saveRoles } from '../services/dbService';

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
    <div className="flex-1 overflow-y-auto p-4 sm:p-8">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
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

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Unassigned Users Pool */}
        <div 
          className="w-full lg:w-80 bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col h-[calc(100vh-12rem)]"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, null)}
        >
          <div className="p-4 border-b border-gray-100 bg-gray-50 rounded-t-xl flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-500" />
            <h3 className="font-bold text-gray-700">Unassigned Users</h3>
            <span className="ml-auto bg-gray-200 text-gray-600 text-xs font-bold px-2 py-0.5 rounded-full">
              {unassignedUsers.length}
            </span>
          </div>
          <div className="p-4 flex-1 overflow-y-auto space-y-3">
            {unassignedUsers.length === 0 && (
              <p className="text-sm text-gray-400 text-center mt-10">All users assigned.</p>
            )}
            {unassignedUsers.map(user => (
              <div
                key={user.id}
                draggable
                onDragStart={(e) => handleDragStart(e, user.id)}
                className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 hover:shadow-md transition-all flex items-center gap-3"
              >
                <GripVertical className="w-4 h-4 text-gray-400" />
                <div>
                  <p className="text-sm font-bold text-gray-800">{user.name}</p>
                  <p className="text-xs text-gray-500">{user.email}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Roles Grid */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-2 gap-6 overflow-y-auto h-[calc(100vh-12rem)] pr-2">
          {roles.map(role => {
            const roleUsers = users.filter(u => u.roleId === role.id);
            return (
              <div key={role.id} className="bg-white rounded-xl border border-gray-200 shadow-sm flex flex-col">
                <div className="p-4 border-b border-gray-100 bg-blue-50/50 rounded-t-xl flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <h3 className="font-bold text-gray-800">{role.name}</h3>
                  </div>
                  <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full">
                    {roleUsers.length} Users
                  </span>
                </div>
                
                <div className="p-4 flex-1 flex flex-col gap-6">
                  {/* Drop Zone for Users */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Assigned Users</h4>
                    <div 
                      className="min-h-[100px] bg-gray-50 border-2 border-dashed border-gray-200 rounded-xl p-3 flex flex-col gap-2 transition-colors"
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
                          draggable
                          onDragStart={(e) => handleDragStart(e, user.id)}
                          className="bg-white border border-gray-200 rounded-lg p-2 shadow-sm cursor-grab active:cursor-grabbing flex items-center gap-2"
                        >
                          <GripVertical className="w-4 h-4 text-gray-400 shrink-0" />
                          <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold shrink-0">
                            {user.name.charAt(0)}
                          </div>
                          <p className="text-sm font-bold text-gray-700 truncate">{user.name}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Module Permissions */}
                  <div>
                    <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Module Access</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {AVAILABLE_MODULES.map(module => {
                        const isAllowed = role.modules.includes(module);
                        return (
                          <label 
                            key={module} 
                            className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                              isAllowed ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isAllowed ? 'bg-blue-600 border-blue-600' : 'border-gray-300'
                            }`}>
                              {isAllowed && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <input 
                              type="checkbox" 
                              className="hidden" 
                              checked={isAllowed}
                              onChange={() => toggleModule(role.id, module)}
                            />
                            <span className={`text-xs font-bold ${isAllowed ? 'text-blue-900' : 'text-gray-600'}`}>
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

      {/* Add Role Modal */}
      {showAddRoleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in duration-200">
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
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
                <label className="block text-sm font-bold text-gray-700 mb-1">Assign Role</label>
                <select 
                  value={newUserRole || 'unassigned'}
                  onChange={(e) => setNewUserRole(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="unassigned">Unassigned (Drag and Drop later)</option>
                  {roles.map(role => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
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
