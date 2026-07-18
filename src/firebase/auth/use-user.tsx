'use client';

import { useFirebase, type UserHookResult } from '@/firebase/provider';

/**
 * 获取当前 Firebase 认证用户状态的 Hook
 * 
 * @returns {UserHookResult} 包含 user 对象、加载状态和可能的错误
 */
export const useUser = (): UserHookResult => {
  const { user, isUserLoading, userError } = useFirebase();
  return { user, isUserLoading, userError };
};
