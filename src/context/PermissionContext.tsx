import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { listenToCollection } from '../services/dbService';

interface Role {
  id: string;
  name: string;
  modules: string[];
}

interface PermissionContextType {
  roles: Role[];
  currentUserRole: Role | null;
  canAccess: (module: string) => boolean;
  isLoading: boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export const PermissionProvider: React.FC<{ children: React.ReactNode; userProfile: any }> = ({ children, userProfile }) => {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = listenToCollection('roles', (data) => {
      setRoles(data as Role[]);
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const currentUserRole = useMemo(() => {
    if (!userProfile || roles.length === 0) return null;
    const targetRoleId = userProfile.roleId || userProfile.role;
    return roles.find(r => r.id === targetRoleId) || null;
  }, [userProfile, roles]);

  const canAccess = (moduleName: string) => {
    // Super Admin Bypass
    const superAdminEmails = ['ramkrishna0x0@gmail.com', 'admin@trackmy.demo'];
    const isSuperAdminEmail = superAdminEmails.includes(userProfile?.email || '');
    const isSuperAdminRole = currentUserRole?.name === 'Super Admin' || currentUserRole?.name === 'Supper Admin';
    
    if (isSuperAdminEmail || isSuperAdminRole) return true;

    // Core modules always accessible
    const coreModules = ['Dashboard', 'Support'];
    if (coreModules.includes(moduleName)) return true;

    if (!currentUserRole || !currentUserRole.modules) return false;
    
    // Case-insensitive check to be safe
    const normalizedModules = currentUserRole.modules.map(m => m.toLowerCase());
    return normalizedModules.includes(moduleName.toLowerCase());
  };

  return (
    <PermissionContext.Provider value={{ roles, currentUserRole, canAccess, isLoading }}>
      {children}
    </PermissionContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionContext);
  if (!context) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
};
