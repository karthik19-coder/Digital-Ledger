import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from './useAuth';
import { PermissionDialog } from '../components/dialogs/PermissionDialog';

// Define strongly typed permission constants
export const PERMISSIONS = {
  CREATE: 'CREATE',
  EDIT: 'EDIT',
  DELETE: 'DELETE',
  SAVE_SETTINGS: 'SAVE_SETTINGS',
  CLOSE_DAY: 'CLOSE_DAY',
  UNLOCK_DAY: 'UNLOCK_DAY',
  MANAGE_FINANCIALS: 'MANAGE_FINANCIALS',
  MANAGE_EMPLOYEES: 'MANAGE_EMPLOYEES',
  PAY_EMPLOYEE: 'PAY_EMPLOYEE',
  IMPORT_EXPORT: 'IMPORT_EXPORT',
  // Note: Viewers can export/print, so we only restrict data imports or critical exports if needed, 
  // but prompt says "Viewer may ONLY perform read-only operations... Can print, Export PDF, Export Excel"
  // So export is allowed.
} as const;

export type Permission = keyof typeof PERMISSIONS;

interface PermissionContextType {
  isOwner: () => boolean;
  isViewer: () => boolean;
  hasPermission: (permission: Permission) => boolean;
  requirePermission: (e: React.MouseEvent | React.FormEvent) => boolean;
}

const PermissionContext = createContext<PermissionContextType | undefined>(undefined);

export function PermissionProvider({ children }: { children: ReactNode }) {
  const { role } = useAuth();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isOwner = () => role === 'owner';
  const isViewer = () => role === 'viewer';

  // In this model, owners can do everything, viewers can do no mutations
  const hasPermission = (permission: Permission) => {
    return role === 'owner';
  };

  // Helper to attach to onClick events. Returns true if allowed, false if blocked (and shows dialog).
  const requirePermission = (e: React.MouseEvent | React.FormEvent) => {
    if (!isOwner()) {
      e.preventDefault();
      e.stopPropagation();
      setIsDialogOpen(true);
      return false;
    }
    return true;
  };

  const value = {
    isOwner,
    isViewer,
    hasPermission,
    requirePermission
  };

  return (
    <PermissionContext.Provider value={value}>
      {children}
      <PermissionDialog 
        isOpen={isDialogOpen} 
        onClose={() => setIsDialogOpen(false)} 
      />
    </PermissionContext.Provider>
  );
}

export function usePermissions() {
  const context = useContext(PermissionContext);
  if (context === undefined) {
    throw new Error('usePermissions must be used within a PermissionProvider');
  }
  return context;
}
