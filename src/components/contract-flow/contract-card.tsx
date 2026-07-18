
"use client";

import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { Plus, Trash2, Building2, Check, Edit2, Clock, ShieldCheck, Wallet, Calculator, CheckCircle2, ArrowRight, History, AlertCircle } from "lucide-react";
import { Contract, Payment, ContractType } from "@/lib/types";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, doc, query, orderBy } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { updateDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";

interface ContractCardProps {
  contract: Contract;
  index?: number;
  isSelected?: boolean;
  onToggleSelect?: () => void;
  allChannels?: string[];
  projectColorClass?: string;
}

export function ContractCard({ contract, index, isSelected = false, onToggleSelect, allChannels = [], projectColorClass }: ContractCardProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [newPaymentDate, setNewPaymentDate] = useState("");
  const [newPaymentAmount, setNewPaymentAmount] = useState("");
  const [isEditingInfo, setIsEditingInfo] = useState(false);
  const [tempPrice, setTempPrice] = useState(contract.contractPrice?.toString() || "0");
  const [tempSupplementary, setTempSupplementary] = useState(contract.supplementaryAmount?.toString() || "");
  const [tempSettlement, setTempSettlement] = useState(contract.settlementAuditPrice?.toString() || "");

  useEffect(() => {
    setNewPaymentDate(new Date().toISOString().split('T')[0]);
  }, []);

  const paymentsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users", user.uid, "contracts", contract.id, "payments"), orderBy("date", "asc"));
  }, [db, contract.id, user?.uid]);

  const { data: payments } = useCollection<Payment>(paymentsQuery);
  const totalPaid = payments?.reduce((sum, p) => sum + p.amount, 0) || 0;

  useEffect(() => {
    if (user && payments !== null) {
      const summary = payments.map(p => `${p.date}(¥${p.amount.toLocaleString()})`).join(", ");
      const hasChanged = totalPaid !== contract.totalPaid || summary !== contract.paymentSummary;
      
      if (hasChanged) {
        updateDocumentNonBlocking(doc(db, "users", user.uid, "contracts", contract.id), {
          totalPaid: totalPaid,
          paymentSummary: summary,
          updatedAt: new Date().toISOString()
        });
      }
    }
  }, [totalPaid, user, db, contract.id, payments, contract.totalPaid, contract.paymentSummary]);
  
  const totalBaseAmount = (contract.contractPrice || 0) + (contract.supplementaryAmount || 0);
  const baseline = contract.settlementAuditPrice || totalBaseAmount || 0;
  const progress = baseline > 0 ? (totalPaid / baseline) * 100 : 0;

  const handleUpdate = (updates: Partial<Contract>) => {
    if (!user) return; 

    // 构建审计日志描述
    let logDetail = `[修改合同信息] 项目：${contract.projectName} | 合同：${contract.name}\n`;
    const changes: string[] = [];

    if (updates.contractPrice !== undefined && updates.contractPrice !== contract.contractPrice) {
      changes.push(`- 合同价：¥${contract.contractPrice.toLocaleString()} -> ¥${updates.contractPrice.toLocaleString()}`);
    }
    if (updates.supplementaryAmount !== undefined && updates.supplementaryAmount !== contract.supplementaryAmount) {
      const diff = updates.supplementaryAmount - (contract.supplementaryAmount || 0);
      changes.push(`- 补充协议：增加了 ¥${diff.toLocaleString()} (新总额: ¥${updates.supplementaryAmount.toLocaleString()})`);
    }
    if (updates.settlementAuditPrice !== undefined && updates.settlementAuditPrice !== contract.settlementAuditPrice) {
      changes.push(`- 结算审定价：设置为 ¥${updates.settlementAuditPrice.toLocaleString()}`);
    }

    const dateLabels: Record<string, string> = {
      startDate: '计划开工日期',
      completionDate: '计划竣工日期',
      acceptanceDate: '竣工验收日期',
      endDate: '维保到期日期'
    };

    Object.keys(dateLabels).forEach(key => {
      const val = (updates as any)[key];
      const oldVal = (contract as any)[key];
      if (val !== undefined && val !== oldVal) {
        changes.push(`- ${dateLabels[key]}：${oldVal || '未填'} -> ${val}`);
      }
    });

    if (updates.projectName && updates.projectName !== contract.projectName) {
      changes.push(`- 归属项目变更：${contract.projectName} -> ${updates.projectName}`);
    }
    if (updates.name && updates.name !== contract.name) {
      changes.push(`- 合同名称变更：${contract.name} -> ${updates.name}`);
    }

    if (changes.length > 0) {
      logDetail += changes.join('\n');
      const auditLogsRef = collection(db, "audit_logs");
      const auditDocRef = doc(auditLogsRef);
      setDocumentNonBlocking(auditDocRef, {
        id: auditDocRef.id,
        userId: user.uid,
        userEmail: user.email,
        action: 'UPDATE_CONTRACT',
        details: logDetail,
        timestamp: Date.now()
      }, { merge: false });
    }

    updateDocumentNonBlocking(doc(db, "users", user.uid, "contracts", contract.id), { 
      ...updates, 
      updatedAt: new Date().toISOString() 
    });
  };

  const handleAddPayment = () => {
    if (!user || !newPaymentAmount) return;
    const amount = parseFloat(newPaymentAmount);
    if (isNaN(amount) || amount <= 0) return;
    
    const paymentColRef = collection(db, "users", user.uid, "contracts", contract.id, "payments");
    const newDocRef = doc(paymentColRef);
    
    setDocumentNonBlocking(newDocRef, {
      id: newDocRef.id,
      contractId: contract.id,
      date: newPaymentDate,
      amount: amount,
      createdAt: new Date().toISOString()
    }, { merge: false });

    // 记录详细审计日志
    const auditLogsRef = collection(db, "audit_logs");
    const auditDocRef = doc(auditLogsRef);
    setDocumentNonBlocking(auditDocRef, {
      id: auditDocRef.id,
      userId: user.uid,
      userEmail: user.email,
      action: 'ADD_PAYMENT',
      details: `[新增支出] 项目：${contract.projectName} | 合同：${contract.name}\n- 支付金额：¥${amount.toLocaleString()}\n- 支付日期：${newPaymentDate}`,
      timestamp: Date.now()
    }, { merge: false });

    setNewPaymentAmount("");
    toast({ title: "支付记录已添加" });
  };

  const handleRemovePayment = (paymentId: string) => {
    if (!user) return;
    const p = payments?.find(x => x.id === paymentId);
    deleteDocumentNonBlocking(doc(db, "users", user.uid, "contracts", contract.id, "payments", paymentId));
    
    // 记录详细审计日志
    if (p) {
      const auditLogsRef = collection(db, "audit_logs");
      const auditDocRef = doc(auditLogsRef);
      setDocumentNonBlocking(auditDocRef, {
        id: auditDocRef.id,
        userId: user.uid,
        userEmail: user.email,
        action: 'REMOVE_PAYMENT',
        details: `[移除支出记录] 项目：${contract.projectName} | 合同：${contract.name}\n- 被删金额：¥${p.amount.toLocaleString()}\n- 账期日期：${p.date}`,
        timestamp: Date.now()
      }, { merge: false });
    }
    
    toast({ title: "支付记录已移除" });
  };

  const handleDeleteContract = () => {
    if (!user) return;
    deleteDocumentNonBlocking(doc(db, "users", user.uid, "contracts", contract.id));

    // 记录彻底删除日志
    const auditLogsRef = collection(db, "audit_logs");
    const auditDocRef = doc(auditLogsRef);
    setDocumentNonBlocking(auditDocRef, {
      id: auditDocRef.id,
      userId: user.uid,
      userEmail: user.email,
      action: 'DELETE_CONTRACT',
      details: `[彻底删除合同] 项目：${contract.projectName} | 合同：${contract.name} | 结算审定价/基准价：¥${baseline.toLocaleString()} | 累计已付：¥${totalPaid.toLocaleString()}`,
      timestamp: Date.now()
    }, { merge: false });
  };

  const getCalcValue = (ratio: number) => {
    const targetAmount = baseline * ratio;
    return Math.max(0, targetAmount - totalPaid);
  };

  const getRemainingValue = () => {
    return Math.max(0, baseline - totalPaid);
  };

  const fillPaymentAmount = (val: number) => {
    setNewPaymentAmount(val.toFixed(2));
    setIsCalcOpen(false);
    toast({ title: "已填入试算金额" });
  };

  const [isCalcOpen, setIsCalcOpen] = useState(false);

  const isMaintenanceExpired = useMemo(() => {
    if (!contract.endDate) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const expiry = new Date(contract.endDate);
    return expiry <= today;
  }, [contract.endDate]);

  const hasUnpaidBalance = useMemo(() => {
    return baseline - totalPaid > 0.01;
  }, [baseline, totalPaid]);

  return (
    <Card className={cn(
      "overflow-hidden border border-slate-200 shadow-sm rounded-2xl transition-all",
      isSelected ? 'ring-2 ring-primary/20 border-primary/30' : '',
      projectColorClass
    )}>
      <CardHeader className={cn(
        "p-4 md:p-6 border-b",
        projectColorClass ? "bg-black/5" : "bg-slate-50/50"
      )}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-1 gap-4">
            <div className="flex-1 space-y-3 overflow-hidden">
              <div className="flex flex-wrap items-center gap-2">
                {isEditingInfo ? (
                  <Select value={contract.type} onValueChange={(val) => handleUpdate({ type: val as ContractType })}>
                    <SelectTrigger className="h-8 w-24 text-[10px] font-black rounded-full bg-white border-slate-300 px-2 uppercase tracking-wider justify-center shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="工程合同" className="text-xs font-black uppercase">工程合同</SelectItem>
                      <SelectItem value="采购合同" className="text-xs font-black uppercase">采购合同</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={cn(
                    "h-8 w-24 justify-center rounded-full text-[10px] font-black uppercase tracking-wider border shadow-none",
                    contract.type === '工程合同' 
                      ? "bg-blue-50 text-blue-600 border-blue-100" 
                      : "bg-amber-50 text-amber-600 border-amber-100"
                  )}>
                    {contract.type}
                  </Badge>
                )}

                {isEditingInfo ? (
                  <Select value={contract.fundingChannel} onValueChange={(val) => handleUpdate({ fundingChannel: val })}>
                    <SelectTrigger className="h-8 w-24 text-[10px] font-black rounded-full bg-white border-slate-300 px-2 uppercase tracking-wider justify-center shadow-none">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>{allChannels.map(ch => <SelectItem key={ch} value={ch} className="text-xs font-black uppercase">{ch}</SelectItem>)}</SelectContent>
                  </Select>
                ) : (
                  <Badge variant="outline" className="h-8 w-24 justify-center rounded-full text-[10px] font-black bg-indigo-50 text-indigo-600 border-indigo-100 uppercase tracking-wider truncate shadow-none">
                    {contract.fundingChannel || "渠道待定"}
                  </Badge>
                )}
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => { 
                      if(isEditingInfo) {
                        handleUpdate({ 
                          contractPrice: parseFloat(tempPrice) || 0,
                          supplementaryAmount: parseFloat(tempSupplementary) || 0,
                          settlementAuditPrice: parseFloat(tempSettlement) || 0
                        });
                      } 
                      setIsEditingInfo(!isEditingInfo); 
                    }} 
                    className={cn(
                      "h-8 w-24 justify-center text-[10px] font-black rounded-full shadow-none transition-all border",
                      isEditingInfo 
                        ? "bg-emerald-50 border-emerald-200 text-emerald-600 hover:bg-emerald-100" 
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                    )}
                  >
                    {isEditingInfo ? <Check className="w-3.5 h-3.5 mr-1" /> : <Edit2 className="w-3.5 h-3.5 mr-1" />}
                    {isEditingInfo ? "保存" : "修改"}
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-8 w-24 justify-center text-[10px] text-red-600 bg-red-50 border-red-100 hover:bg-red-100 rounded-full font-black shadow-none transition-all">
                        <Trash2 className="w-3.5 h-3.5 mr-1" />
                        删除
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="rounded-2xl p-6">
                      <AlertDialogHeader><AlertDialogTitle className="text-lg font-black">确认彻底删除此合同记录？</AlertDialogTitle></AlertDialogHeader>
                      <AlertDialogFooter className="pt-4 gap-2">
                        <AlertDialogCancel className="rounded-lg h-10 px-4 font-bold">取消</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteContract} className="bg-destructive text-white rounded-lg h-10 px-6 font-black">确认删除</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
                
                {isMaintenanceExpired && hasUnpaidBalance && (
                  <Badge className="bg-destructive text-white border-none animate-pulse rounded-full text-[9px] font-black uppercase tracking-tighter flex items-center gap-1 h-8 px-4">
                    <AlertCircle className="w-3 h-3" />
                    维保到期请付尾款
                  </Badge>
                )}
              </div>
              
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-2 mr-2">
                    {index !== undefined && (
                      <span className="text-[10px] font-black text-slate-400 bg-white/80 w-5 h-5 rounded-full flex items-center justify-center shrink-0 border border-slate-100 shadow-sm">
                        {index}
                      </span>
                    )}
                    <Checkbox checked={isSelected} onCheckedChange={onToggleSelect} className="w-5 h-5 rounded-md bg-white border-slate-300" />
                  </div>

                  <div className="flex items-center gap-1.5 text-blue-600 font-black text-base md:text-lg uppercase tracking-tight shrink-0">
                    <Building2 className="w-4 h-4" />
                    {isEditingInfo ? (
                      <Input 
                        className="h-8 p-1 text-xs w-40 rounded-md font-bold bg-white" 
                        value={contract.projectName} 
                        onChange={e => handleUpdate({ projectName: e.target.value })} 
                      />
                    ) : (
                      <span className="truncate max-w-[150px] md:max-w-none">{contract.projectName}</span>
                    )}
                  </div>

                  <div className="h-5 w-px bg-slate-300/40 hidden md:block" />

                  <h3 className="text-base md:text-lg font-black text-slate-800 tracking-tight truncate leading-none">
                    {isEditingInfo ? (
                      <Input 
                        className="h-8 text-xs font-black rounded-md w-full bg-white" 
                        value={contract.name} 
                        onChange={e => handleUpdate({ name: e.target.value })} 
                      />
                    ) : (
                      contract.name
                    )}
                  </h3>

                  <div className="h-5 w-px bg-slate-300/40 hidden md:block" />

                  <div className="text-xs md:text-base font-bold text-slate-500/80 truncate uppercase tracking-wide">
                    {isEditingInfo ? (
                      <Input 
                        className="h-8 text-xs rounded-md w-56 bg-white" 
                        value={contract.signingUnit} 
                        onChange={e => handleUpdate({ signingUnit: e.target.value })} 
                      />
                    ) : (
                      contract.signingUnit || "未录入合作单位"
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-row lg:flex-col gap-2 shrink-0">
            <div className="p-3 md:p-4 bg-white/60 border border-slate-100 rounded-xl md:rounded-2xl flex-1 md:min-w-[220px] shadow-sm space-y-1.5 backdrop-blur-sm">
              <div className="flex justify-between items-center gap-3">
                <p className="text-[13px] font-black text-slate-400 uppercase tracking-widest shrink-0">合同金额</p>
                {isEditingInfo ? (
                  <div className="flex items-center gap-1 text-primary font-black">
                    <span className="text-[13px]">¥</span>
                    <Input type="number" className="h-6 p-1 text-[13px] font-black rounded-md border-primary/20 bg-white" value={tempPrice} onChange={e => setTempPrice(e.target.value)} />
                  </div>
                ) : (
                  <p className="text-[13px] font-black text-slate-700 tracking-tight">¥{(contract.contractPrice || 0).toLocaleString()}</p>
                )}
              </div>
              <div className="flex justify-between items-center gap-3">
                <p className="text-[13px] font-black text-slate-400 uppercase tracking-widest shrink-0">补充协议</p>
                {isEditingInfo ? (
                  <div className="flex items-center gap-1 text-orange-600 font-black">
                    <span className="text-[13px]">¥</span>
                    <Input type="number" className="h-6 p-1 text-[13px] font-black rounded-md border-orange-200 bg-white" value={tempSupplementary} onChange={e => setTempSupplementary(e.target.value)} />
                  </div>
                ) : (
                  <p className="text-[13px] font-black text-orange-600 tracking-tight">¥{(contract.supplementaryAmount || 0).toLocaleString()}</p>
                )}
              </div>
              <div className="pt-1.5 border-t border-slate-200/50 flex justify-between items-center gap-3">
                <p className="text-[13px] font-black text-primary uppercase tracking-widest shrink-0">合计总额</p>
                <p className="text-[13px] font-black text-primary tracking-tight">¥{totalBaseAmount.toLocaleString()}</p>
              </div>
              
              {(contract.settlementAuditPrice || isEditingInfo) && (
                <div className="pt-2 border-t border-blue-200/60 mt-1 flex flex-col items-end gap-0.5 animate-in fade-in zoom-in-95 duration-500">
                  <p className="text-[13px] font-black text-blue-600 uppercase tracking-widest w-full text-right">最终结算审定价</p>
                  <p className="text-xl md:text-3xl font-black text-blue-600 tracking-tighter leading-none">
                    ¥{(contract.settlementAuditPrice || 0).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <Tabs defaultValue="finance" className="w-full">
          <TabsList className="w-full h-12 bg-white/30 border-b rounded-none justify-start px-4 md:px-6 gap-2 overflow-x-auto">
            <TabsTrigger value="finance" className="h-8 px-4 rounded-lg border border-slate-200 data-[state=active]:border-primary data-[state=active]:text-primary font-black text-[9px] md:text-xs uppercase shadow-none tracking-widest gap-2 bg-white/50">
              <Wallet className="w-3.5 h-3.5" /> 财务结算
            </TabsTrigger>
            <TabsTrigger value="schedule" className="h-8 px-4 rounded-lg border border-slate-200 data-[state=active]:border-primary data-[state=active]:text-primary font-black text-[9px] md:text-xs uppercase shadow-none tracking-widest gap-2 bg-white/50">
              <Clock className="w-3.5 h-3.5" /> 工程节点
            </TabsTrigger>
          </TabsList>

          <TabsContent value="finance" className="p-4 md:p-6 m-0 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8">
              <div className="space-y-6">
                <div className="bg-white/40 p-4 md:p-6 rounded-2xl border border-white/50 space-y-4 shadow-inner backdrop-blur-sm">
                  <div className="flex justify-between items-end">
                    <h4 className="text-[9px] md:text-[10px] font-black text-slate-500 uppercase tracking-widest">累计资金支付进度</h4>
                    <span className="text-sm md:text-base font-black text-primary">{(progress).toFixed(1)}%</span>
                  </div>
                  <Progress value={Math.min(progress, 100)} className="h-2.5 rounded-full bg-white shadow-none" />
                  <div className="flex flex-col sm:flex-row justify-between text-xs md:text-sm font-bold gap-1.5">
                    <span className="text-slate-500">已支: ¥{totalPaid.toLocaleString()}</span>
                    {progress >= 99.999 ? (
                      <span className="text-emerald-600 font-black flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" /> 已付清
                      </span>
                    ) : (
                      <span className="text-destructive font-black">待付: ¥{Math.max(0, baseline - totalPaid).toLocaleString()}</span>
                    )}
                  </div>
                  {isMaintenanceExpired && hasUnpaidBalance && (
                    <div className="p-2.5 bg-destructive/5 border border-destructive/20 rounded-xl flex items-center gap-2 animate-pulse mt-2">
                      <AlertCircle className="w-4 h-4 text-destructive" />
                      <p className="text-[10px] font-black text-destructive uppercase">维保已到期，请尽快拨付剩余尾款 ¥{Math.max(0, baseline - totalPaid).toLocaleString()}</p>
                    </div>
                  )}
                </div>

                <div className="p-4 md:p-6 bg-blue-500/5 border border-blue-500/10 rounded-2xl space-y-3 md:space-y-4">
                  <h4 className="text-[9px] md:text-[10px] font-black text-blue-700/70 uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" /> 录入最终结算审定价
                  </h4>
                  
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                       <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-blue-300 text-base">¥</span>
                       <Input type="number" placeholder="审计金额..." className="h-10 md:h-11 pl-8 text-sm font-black text-blue-700 bg-white border-blue-200 rounded-xl" value={tempSettlement} onChange={e => setTempSettlement(e.target.value)} />
                    </div>
                    <Button onClick={() => { handleUpdate({ settlementAuditPrice: parseFloat(tempSettlement) || 0 }); toast({ title: "审定价已更新" }); }} className="h-10 md:h-11 px-4 md:px-6 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-lg shadow-blue-900/10 text-xs">确认</Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <History className="w-4 h-4" /> 支付流水追踪
                  </h4>
                  <Dialog open={isCalcOpen} onOpenChange={setIsCalcOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" className="h-7 px-2 rounded-lg border-slate-200 font-black text-[9px] md:text-[10px] text-primary hover:bg-primary/5 gap-1.5 bg-white/80">
                        <Calculator className="w-3 h-3" /> 试算
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="rounded-2xl sm:max-w-md p-6 border-none shadow-2xl">
                      <DialogHeader>
                        <DialogTitle className="text-lg font-black">进度款/尾款试算</DialogTitle>
                        <DialogDescription className="font-bold text-xs">
                          {contract.settlementAuditPrice ? '基准：审定价' : '基准：合计总金额'}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-3 py-3">
                        <div className="grid gap-2">
                          {[0.8, 0.95, 0.97].map(ratio => {
                            const val = getCalcValue(ratio);
                            return (
                              <button 
                                key={ratio} 
                                onClick={() => fillPaymentAmount(val)}
                                className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 hover:border-primary hover:bg-primary/5 transition-all text-left group"
                              >
                                <div className="space-y-0.5">
                                  <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest group-hover:text-primary">支付至 {ratio * 100}%</p>
                                  <p className="text-sm md:text-base font-black text-slate-800">¥{val.toLocaleString()}</p>
                                </div>
                                <div className="h-7 w-7 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                                  <ArrowRight className="w-4 h-4" />
                                </div>
                              </button>
                            );
                          })}
                          
                          <button 
                            onClick={() => progress < 99.999 && fillPaymentAmount(getRemainingValue())}
                            className={`flex items-center justify-between p-3 rounded-xl border transition-all text-left group ${
                              progress >= 99.999 
                                ? 'bg-emerald-50 border-emerald-200 cursor-default' 
                                : 'bg-primary/5 border-primary/20 hover:bg-primary/10'
                            }`}
                          >
                            <div className="space-y-0.5">
                              <p className={`text-[8px] font-black uppercase tracking-widest ${progress >= 99.999 ? 'text-emerald-600' : 'text-primary'}`}>
                                {progress >= 99.999 ? '支付状态' : '尾款全额'}
                              </p>
                              <p className={`text-sm md:text-base font-black ${progress >= 99.999 ? 'text-emerald-700' : 'text-primary'}`}>
                                {progress >= 99.999 ? '已付清' : `¥${getRemainingValue().toLocaleString()}`}
                              </p>
                            </div>
                            <div className={`h-8 w-8 flex items-center justify-center ${progress >= 99.999 ? 'text-emerald-600' : 'text-primary'}`}>
                              {progress >= 99.999 ? <CheckCircle2 className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                            </div>
                          </button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 md:gap-3">
                  <Input 
                    type="date" 
                    className="h-10 md:h-11 sm:w-40 text-xs font-bold rounded-xl border-slate-200 bg-white" 
                    value={newPaymentDate} 
                    onChange={e => setNewPaymentDate(e.target.value)} 
                  />
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-black text-slate-400 text-xs">¥</span>
                    <Input type="number" placeholder="金额" className="h-10 md:h-11 pl-7 text-xs font-bold rounded-xl border-slate-200 bg-white" value={newPaymentAmount} onChange={e => setNewPaymentAmount(e.target.value)} />
                  </div>
                  <Button onClick={handleAddPayment} size="icon" className="h-10 w-full sm:w-11 md:h-11 md:w-11 rounded-xl shadow-lg shadow-primary/10 shrink-0"><Plus className="w-5 h-5" /></Button>
                </div>
                <div className="space-y-1">
                  {payments?.length ? [...payments].reverse().map((p, i) => (
                    <div key={p.id} className="flex items-center justify-between py-1.5 px-3 text-[10px] md:text-xs bg-white/40 rounded-lg border border-white/60 group hover:border-primary/20 transition-colors w-full backdrop-blur-sm">
                      <div className="flex items-center gap-3">
                         <span className="w-5 h-5 flex items-center justify-center bg-white border border-slate-200 rounded-full text-[8px] font-black text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">{payments.length - i}</span>
                         <span className="font-black text-slate-800 tracking-tight">{p.date}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-black text-slate-900 text-xs md:text-sm">¥{p.amount.toLocaleString()}</span>
                        <button onClick={() => handleRemovePayment(p.id)} className="text-slate-300 hover:text-destructive opacity-0 group-hover:opacity-100 transition-all duration-300">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )) : (
                    <div className="text-center py-10 text-slate-400 text-xs font-bold italic border-2 border-dashed rounded-2xl bg-white/20">
                      暂无流水
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="schedule" className="p-4 md:p-6 m-0 animate-in fade-in duration-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {[
                { label: "计划开工日期", key: "startDate" },
                { label: "计划竣工日期", key: "completionDate" },
                { label: "竣工验收日期", key: "acceptanceDate" },
                { label: "维保到期日期", key: "endDate" }
              ].map(item => (
                <div key={item.key} className="space-y-2 p-4 bg-white/40 rounded-2xl border border-white/60 shadow-sm group hover:border-primary/20 transition-colors backdrop-blur-sm relative">
                  <Label className="text-[9px] md:text-[10px] font-black text-slate-400 uppercase tracking-widest block">{item.label}</Label>
                  <Input 
                    type="date" 
                    className={cn(
                      "h-9 md:h-10 text-xs font-bold bg-white rounded-lg border-slate-200 focus:border-primary",
                      item.key === 'endDate' && isMaintenanceExpired && hasUnpaidBalance ? "border-destructive text-destructive" : ""
                    )} 
                    value={(contract as any)[item.key] || ""} 
                    onChange={e => handleUpdate({ [item.key]: e.target.value })} 
                    disabled={!isEditingInfo} 
                  />
                  {item.key === 'endDate' && isMaintenanceExpired && hasUnpaidBalance && (
                    <div className="flex items-center gap-1.5 pt-1.5 text-destructive animate-pulse">
                      <AlertCircle className="w-3 h-3" />
                      <span className="text-[10px] font-black">维保到期，请提醒甲方支付尾款</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
