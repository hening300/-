
'use client';

/**
 * Firebase 模块导出中心 (Barrel File)
 * 简化导出结构，仅保留核心服务，减少冗余代码。
 */

export * from './init';
export * from './provider';
export * from './client-provider';
export * from './firestore/use-collection';
export * from './firestore/use-doc';
export * from './non-blocking-updates';
export * from './non-blocking-login';
