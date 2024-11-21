export const DEFAULT_CREDITS = 10;

export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin'
} as const;

export type UserRole = typeof USER_ROLES[keyof typeof USER_ROLES];

// 创建一个函数来获取管理员ID集合
export function getAdminIds(): Set<string> {
  const adminIdsString = process.env.ADMIN_USER_IDS || '';
  return new Set<string>(
    adminIdsString.split(',').filter(id => id.length > 0)
  );
} 