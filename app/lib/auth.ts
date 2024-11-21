import { getAdminIds } from './constants';

export function isAdmin(userId: string | null): boolean {
  if (!userId) return false;
  const adminIds = getAdminIds();
  return adminIds.has(userId);
} 