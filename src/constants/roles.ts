export const ROLES = {
  OWNER: 'owner',
  VIEWER: 'viewer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];
