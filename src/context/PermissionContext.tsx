import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { listenToCollection } from '../services/dbService';

export interface Role {
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

// Named export for the context object itself (sometimes helps with minifier/bundler issues)
export const PermissionContext = createContext<PermissionContextType | null>(null);

export function PermissionProvider({ children, userProfile }: { children: React.ReactNode; userProfile: any }) {
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = listenToCollection('roles', (data) => {
      if (data) {
        setRoles(data as Role[]);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const currentUserRole = useMemo(() => {
    if (!userProfile || !roles || roles.length === 0) return null;
    const targetRoleId = userProfile.roleId || userProfile.role;
    return roles.find(r => r.id === targetRoleId) || null;
  }, [userProfile?.roleId, userProfile?.role, roles]);

  const canAccess = (moduleName: string): boolean => {
    // 1. Super Admin Bypass (Email or Role Name)
    const superAdminEmails = ['ramkrishna0x0@gmail.com', 'admin@trackmy.demo'];
    const userEmail = userProfile?.email || '';
    const isSuperAdminEmail = superAdminEmails.includes(userEmail);
    
    const isSuperAdminRole = currentUserRole?.name === 'Super Admin' || 
                             currentUserRole?.name === 'Supper Admin' || 
                             currentUserRole?.id === 'admin';
    
    if (isSuperAdminEmail || isSuperAdminRole) return true;

    // 2. Core Modules (Always visible)
    const coreModules = ['Dashboard', 'Support'];
    if (coreModules.includes(moduleName)) return true;

    // 3. Role-based Check
    if (!currentUserRole || !currentUserRole.modules) return false;
    
    const normalizedModules = currentUserRole.modules.map(m => m.toLowerCase());
    return normalizedModules.includes(moduleName.toLowerCase());
  };

  // Memoize the context value to prevent unnecessary re-renders of consumers
  const value = useMemo(() => ({
    roles,
    currentUserRole,
    canAccess,
    isLoading
  }), [roles, currentUserRole, userProfile]);

  return (
    <PermissionContext.Provider value={value}>
      {children}
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  // Default fallback to prevent "cannot access before initialization" style crashes 
  // if the hook is called in a very early lifecycle stage.
  if (!context) {
    return {
      roles: [],
      currentUserRole: null,
      canAccess: () => false,
      isLoading: true
    };
  }
  return context;
}
