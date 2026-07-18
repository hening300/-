'use client';

import React, { useMemo, type ReactNode } from 'react';
import { FirebaseProvider } from './provider';
import { initializeFirebase } from './init';

interface FirebaseClientProviderProps {
  children: ReactNode;
}

/**
 * 客户端 Firebase Provider 封装
 * 确保 Firebase SDK 在客户端生命周期内秒速初始化。
 */
export function FirebaseClientProvider({ children }: FirebaseClientProviderProps) {
  const firebaseServices = useMemo(() => {
    try {
      return initializeFirebase();
    } catch (error) {
      console.error("Critical: Firebase Initialization Failed", error);
      return null;
    }
  }, []);

  // 移除了显式的加载提示，确保进入过程更直接
  if (!firebaseServices) return null;

  return (
    <FirebaseProvider
      firebaseApp={firebaseServices.firebaseApp}
      auth={firebaseServices.auth}
      firestore={firebaseServices.firestore}
    >
      {children}
    </FirebaseProvider>
  );
}
