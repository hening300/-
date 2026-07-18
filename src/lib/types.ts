
export type ContractType = '工程合同' | '采购合同';

export interface Payment {
  id: string;
  date: string;
  amount: number;
}

export interface Contract {
  id: string;
  projectName: string;
  name: string;
  signingUnit?: string; 
  price: number; // 立项金额
  contractPrice: number; // 合同价
  type: ContractType;
  fundingChannel: string;
  
  // 时间节点
  startDate?: string; // 开工日期
  completionDate?: string; // 竣工日期
  endDate?: string;   // 合同终止/维保到期日期
  acceptanceDate?: string; // 验收日期
  initiationDate?: string; // 立项日期
  budgetSubmissionDate?: string; // 预算送审日期
  budgetDate?: string; // 预算审核日期
  settlementDate?: string; // 结算送审日期
  settlementAuditDate?: string; // 结算审定日期
  
  plannedDuration?: number; // 计划工期
  budgetAmount?: number; // 预算金额 (送审)
  priceAudit?: number; // 预算审核金额
  settlementPrice?: number; // 结算送审金额
  settlementAuditPrice?: number; // 结算审核金额 (审定价)
  supplementaryAmount?: number;
  targetRatio?: number;
  totalPaid: number; 
  paymentSummary?: string; 
  createdAt: number;
  orderIndex?: number; 
  updatedAt?: string;
}

export interface UserMetadata {
  uid: string;
  email: string;
  registeredAt: string;
  expiresAt: number;
}

export interface SupportTicket {
  id: string;
  userId: string;
  userEmail: string;
  subject?: string;
  message: string;
  status: 'pending' | 'replied';
  adminReply?: string;
  createdAt: number;
  repliedAt?: number;
}

export interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  details: string;
  timestamp: number;
}
