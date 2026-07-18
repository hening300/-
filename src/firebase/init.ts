'use client';

import { firebaseConfig } from '@/firebase/config';
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * 核心 SDK 获取函数
 * @param firebaseApp 初始化后的 Firebase App 实例
 */
export function getSdks(firebaseApp: FirebaseApp) {
  return {
    firebaseApp,
    auth: getAuth(firebaseApp),
    firestore: getFirestore(firebaseApp)
  };
}

/**
 * Firebase 核心初始化函数
 * 独立于 index.ts 以彻底打破循环依赖链，确保在所有环境下稳定运行
 */
export function initializeFirebase() {
  const apps = getApps();
  if (!apps.length) {
    // 强制使用配置对象初始化，确保在客户端环境下始终可用
    const firebaseApp = initializeApp(firebaseConfig);
    return getSdks(firebaseApp);
  }
  // 如果已存在实例，直接获取
  return getSdks(getApp());
}
