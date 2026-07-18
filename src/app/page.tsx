
"use client";

import React, { useState, useMemo, useEffect, useRef, Fragment } from "react";
import { ContractForm } from "@/components/contract-flow/contract-form";
import { ContractCard } from "@/components/contract-flow/contract-card";
import { FundingOverview } from "@/components/contract-flow/funding-overview";
import { SupportDialog } from "@/components/support/support-dialog";
import { AdminUserDialog } from "@/components/admin/admin-user-dialog";
import { AuditLogDialog } from "@/components/admin/audit-log-dialog";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  FileStack, 
  Upload, 
  LayoutDashboard, 
  LogOut, 
  ChevronUp, 
  ChevronRight, 
  ChevronDown, 
  ListChecks, 
  PieChart, 
  TrendingUp, 
  Calculator, 
  Wallet, 
  CircleDollarSign, 
  User as UserIcon, 
  Trash2,
  Archive,
  Loader2,
  Download
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth } from "@/firebase";
import { collection, query, orderBy, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { Contract, ContractType } from "@/lib/types";
import { AuthScreen } from "@/components/auth/auth-screen";
import { useToast } from "@/hooks/use-toast";
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from "@/firebase/non-blocking-updates";
import { cn } from "@/lib/utils";

export default function ContractFlowApp() {
  const db = useFirestore();
  const auth = useAuth();
  const { toast } = useToast();
  const { user, isUserLoading: isAuthLoading } = useUser();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const contractsQuery = useMemoFirebase(() => {
    if (!user) return null;
    return query(collection(db, "users", user.uid, "contracts"), orderBy("orderIndex", "asc"));
  }, [db, user?.uid]);

  const { data: contracts, isLoading: isDataLoading } = useCollection<Contract>(contractsQuery);

  const [activeTab, setActiveTab] = useState("list");
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [channelFilter, setChannelFilter] = useState<string>("all");
  
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [expandedArchivedProjects, setExpandedArchivedProjects] = useState<Set<string>>(new Set());
  const [isBatchDeleteAlertOpen, setIsBatchDeleteAlertOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const [currentTime, setCurrentTime] = useState<number | null>(null);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [showScrollBottom, setShowScrollBottom] = useState(true);

  useEffect(() => {
    setCurrentTime(Date.now());
    const timer = setInterval(() => setCurrentTime(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const scrollY = window.scrollY;
      
      setShowScrollTop(scrollY > 400);
      setShowScrollBottom(scrollHeight - clientHeight - scrollY > 400);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!user || !contracts || contracts.length === 0) return;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    contracts.forEach(c => {
      if (!c.endDate) return;
      
      const expiry = new Date(c.endDate);
      const baseline = c.settlementAuditPrice || (c.contractPrice || 0) + (c.supplementaryAmount || 0);
      const totalPaid = c.totalPaid || 0;

      if (expiry <= today && (baseline - totalPaid > 0.01)) {
        const storageKey = `maintenance_reminder_v4_${c.id}_${c.endDate}`;
        
        if (!localStorage.getItem(storageKey)) {
          const ticketsRef = collection(db, "support_tickets");
          const newDocRef = doc(ticketsRef);
          
          setDocumentNonBlocking(newDocRef, {
            id: newDocRef.id,
            userId: user.uid,
            userEmail: user.email,
            subject: "【系统自动提醒】维保到期结算通知",
            message: `[维保到期自动提醒]\n\n项目：${c.projectName}\n合同：${c.name}\n签约单位：${c.signingUnit || '未录入'}\n\n该合同维保日期已于 ${c.endDate} 到期。目前系统显示仍有待付余额：¥${(baseline - totalPaid).toLocaleString()}。\n\n请核实项目状况，及时办理结算尾款拨付手续。`,
            status: "pending",
            createdAt: Date.now()
          }, { merge: false });

          localStorage.setItem(storageKey, 'true');
          
          toast({
            title: "自动提醒已生成",
            description: `合同 "${c.name}" 维保已到期，已自动提交结算提醒至留言区。`,
            duration: 5000,
          });
        }
      }
    });
  }, [contracts, user, db, toast]);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToBottom = () => {
    window.scrollTo({ top: document.documentElement.scrollHeight, behavior: "smooth" });
  };

  const scrollToContract = (id: string) => {
    setActiveTab("list");
    setTimeout(() => {
      const element = document.getElementById(`contract-wrapper-${id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
        element.classList.add("ring-4", "ring-primary/40", "rounded-2xl");
        setTimeout(() => {
          element.classList.remove("ring-4", "ring-primary/40");
        }, 2000);
      }
    }, 100);
  };

  const isAdmin = useMemo(() => {
    if (!user || !user.email) return false;
    return user.email.toLowerCase() === "hening300@gmail.com";
  }, [user]);

  const addContract = (newContract: any) => {
    if (!user) return;
    const contractsRef = collection(db, "users", user.uid, "contracts");
    const newDocRef = doc(contractsRef);
    const nextIndex = (contracts?.reduce((max, c) => Math.max(max, c.orderIndex || 0), 0) || 0) + 1;
    
    const contractData = {
      id: newDocRef.id,
      projectName: newContract.projectName || "未分类项目",
      name: newContract.name,
      signingUnit: newContract.signingUnit || "",
      contractPrice: newContract.contractPrice || 0,
      supplementaryAmount: newContract.supplementaryAmount || 0,
      type: newContract.type,
      fundingChannel: newContract.fundingChannel,
      startDate: newContract.startDate || "",
      completionDate: newContract.completionDate || "",
      endDate: newContract.endDate || "",
      acceptanceDate: newContract.acceptanceDate || "",
      totalPaid: newContract.totalPaid || 0,
      settlementAuditPrice: newContract.settlementAuditPrice || 0,
      orderIndex: newContract.orderIndex || nextIndex,
      createdAt: Date.now(),
      updatedAt: new Date().toISOString()
    };

    setDocumentNonBlocking(newDocRef, contractData, { merge: false });

    const auditLogsRef = collection(db, "audit_logs");
    const auditDocRef = doc(auditLogsRef);
    setDocumentNonBlocking(auditDocRef, {
      id: auditDocRef.id,
      userId: user.uid,
      userEmail: user.email,
      action: 'ADD_CONTRACT',
      details: `[新合同录入] 项目：${contractData.projectName} | 合同名：${contractData.name} | 签约单位：${contractData.signingUnit || '空'} | 渠道：${contractData.fundingChannel} | 类型：${contractData.type} | 金额：¥${contractData.contractPrice.toLocaleString()}`,
      timestamp: Date.now()
    }, { merge: false });
  };

  const handleSignOut = () => signOut(auth);

  const allChannels = useMemo(() => {
    if (!contracts) return [];
    return Array.from(new Set(contracts.map(c => c.fundingChannel))).sort();
  }, [contracts]);

  const filteredContracts = useMemo(() => {
    if (!contracts) return [];
    const searchTerms = searchTerm.toLowerCase().split(/\s+/).filter(Boolean);
    return contracts.filter((c) => {
      const contractText = `${c.name} ${c.projectName} ${c.signingUnit} ${c.fundingChannel}`.toLowerCase();
      const matchesSearch = searchTerms.every(term => contractText.includes(term));
      const matchesType = typeFilter === "all" || c.type === typeFilter;
      const matchesChannel = channelFilter === "all" || c.fundingChannel === channelFilter;
      return matchesSearch && matchesType && matchesChannel;
    });
  }, [contracts, searchTerm, typeFilter, channelFilter]);

  const handleExportExcel = async (data: Contract[], filename: string) => {
    if (!data.length) return;
    
    try {
      const ExcelJSImport = await import('exceljs');
      const ExcelJS = (ExcelJSImport as any).default || ExcelJSImport;
      const FileSaver = await import('file-saver');
      const fileSaverObj = (FileSaver as any).default || FileSaver;
      const saveAs = typeof fileSaverObj === 'function' ? fileSaverObj : (fileSaverObj.saveAs || fileSaverObj.default?.saveAs);
      
      if (typeof saveAs !== 'function') throw new Error("Could not find saveAs function");

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('合同财务明细');

      worksheet.views = [{ state: 'frozen', ySplit: 1 }];

      const headers = [
        '序号', '项目名称', '合同细项', '签约单位', '类别', '经费渠道', 
        '原合同价', '补充协议', '最终结算额', 
        '支付次序', '支付日期', '本次支付', '累计已付', '待付余额'
      ];
      worksheet.addRow(headers);

      const headerRow = worksheet.getRow(1);
      headerRow.height = 35;
      headerRow.font = { bold: true, color: { argb: 'FFFFFF' } };
      headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '4472C4' } };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

      let currentRowIdx = 2;
      let totalOriginal = 0;
      let totalSuppl = 0;
      let totalSettlement = 0;
      let totalPaidAll = 0;
      let totalRemainingAll = 0;
      let totalCurrentPaymentSum = 0;

      data.forEach((c, i) => {
        const basePrice = c.contractPrice || 0;
        const suppl = c.supplementaryAmount || 0;
        const baseline = c.settlementAuditPrice || (basePrice + suppl);
        const totalPaidValue = c.totalPaid || 0;
        const remainingValue = Math.max(0, baseline - totalPaidValue);
        
        totalOriginal += basePrice;
        totalSuppl += suppl;
        totalSettlement += baseline;
        totalPaidAll += totalPaidValue;
        totalRemainingAll += remainingValue;

        const paymentParts = c.paymentSummary ? c.paymentSummary.split(', ') : [];
        const parsedPayments = paymentParts.map(part => {
          const match = part.match(/(.*?)\(¥(.*?)\)/);
          if (match) {
            return {
              date: match[1],
              amount: parseFloat(match[2].replace(/,/g, ''))
            };
          }
          return null;
        }).filter(Boolean) as {date: string, amount: number}[];

        const rowCount = Math.max(1, parsedPayments.length);
        const startRowIdx = currentRowIdx;

        if (parsedPayments.length > 0) {
          parsedPayments.forEach((p, pIdx) => {
            totalCurrentPaymentSum += p.amount;
            const row = worksheet.addRow([
              i + 1,
              c.projectName,
              c.name,
              c.signingUnit || '',
              c.type,
              c.fundingChannel,
              basePrice,
              suppl,
              baseline,
              `第 ${pIdx + 1} 次`,
              p.date,
              p.amount,
              totalPaidValue,
              remainingValue
            ]);
            row.height = 35;
            row.alignment = { vertical: 'middle' };
          });
        } else {
          const row = worksheet.addRow([
            i + 1,
            c.projectName,
            c.name,
            c.signingUnit || '',
            c.type,
            c.fundingChannel,
            basePrice,
            suppl,
            baseline,
            '无支付', '-', 0, totalPaidValue,
            remainingValue
          ]);
          row.height = 35;
          row.alignment = { vertical: 'middle' };
        }

        if (rowCount > 1) {
          ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'M', 'N'].forEach(col => {
            worksheet.mergeCells(`${col}${startRowIdx}:${col}${startRowIdx + rowCount - 1}`);
          });
        }
        currentRowIdx += rowCount;
      });

      const footerRowIdx = currentRowIdx;
      const footerRow = worksheet.addRow([
        '合计汇总', '', '', '', '', '',
        totalOriginal,
        totalSuppl,
        totalSettlement,
        '',
        '',
        totalCurrentPaymentSum,
        totalPaidAll,
        totalRemainingAll
      ]);
      footerRow.height = 35;
      footerRow.eachCell((cell, colNumber) => {
        cell.font = { bold: true, color: { argb: 'FFFFFF' } };
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2F5597' } };
        cell.alignment = { vertical: 'middle', horizontal: 'center' };
        if ([7, 8, 9, 12, 13, 14].includes(colNumber)) {
          cell.numFmt = '#,##0.00';
        }
      });
      worksheet.mergeCells(`A${footerRowIdx}:F${footerRowIdx}`);

      worksheet.columns = [
        { width: 8 }, { width: 25 }, { width: 30 }, { width: 30 }, { width: 12 }, { width: 15 },
        { width: 18 }, { width: 18 }, { width: 18 }, { width: 12 }, { width: 15 }, { width: 18 }, { width: 18 }, { width: 18 }
      ];

      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `${filename}.xlsx`);
      toast({ title: "报表导出成功", description: `已下载 ${data.length} 条记录` });
    } catch (error: any) {
      console.error(error);
      toast({ variant: "destructive", title: "导出失败", description: error.message });
    }
  };

  const exportToExcel = () => {
    const fileName = channelFilter === 'all' ? '合同财务汇总报表' : `财务报表_${channelFilter}`;
    handleExportExcel(filteredContracts, fileName);
  };

  const projectBgColors = [
    "bg-blue-50/40 hover:bg-blue-100/60 border-blue-100/50",
    "bg-violet-50/40 hover:bg-violet-100/60 border-violet-100/50",
    "bg-emerald-50/40 hover:bg-emerald-100/60 border-emerald-100/50",
    "bg-orange-50/40 hover:bg-orange-100/60 border-orange-100/50",
    "bg-rose-50/40 hover:bg-rose-100/60 border-rose-100/50",
  ];

  const projectColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (!contracts) return map;
    const projects = Array.from(new Set(contracts.map(c => c.projectName))).sort();
    projects.forEach((name, i) => {
      map[name] = projectBgColors[i % projectBgColors.length];
    });
    return map;
  }, [contracts]);

  const projectStats = useMemo(() => {
    if (!filteredContracts) return { active: [], archived: [] };
    const groups: Record<string, any> = {};
    
    filteredContracts.forEach(c => {
      const pName = c.projectName || "未分类项目";
      if (!groups[pName]) {
        groups[pName] = { projectName: pName, totalSettlement: 0, totalPaid: 0, contractCount: 0, subContracts: [], totalUnpaid: 0 };
      }
      const baseline = c.settlementAuditPrice || (c.contractPrice || 0) + (c.supplementaryAmount || 0);
      groups[pName].totalSettlement += baseline;
      groups[pName].totalPaid += (c.totalPaid || 0);
      groups[pName].contractCount += 1;
      groups[pName].subContracts.push(c);
    });

    const allStats = Object.values(groups).map((group: any) => {
      const totalUnpaid = Math.max(0, group.totalSettlement - group.totalPaid);
      const progress = group.totalSettlement > 0 ? (group.totalPaid / group.totalSettlement) : 0;
      return { ...group, totalUnpaid, progress, isProjectArchived: progress >= 0.9999 };
    });

    return {
      active: allStats.filter(p => !p.isProjectArchived).sort((a, b) => b.totalUnpaid - a.totalUnpaid),
      archived: allStats.filter(p => p.isProjectArchived).sort((a, b) => b.totalSettlement - a.totalSettlement)
    };
  }, [filteredContracts]);

  const globalMetrics = useMemo(() => {
    if (!filteredContracts) return { budget: 0, paid: 0, remaining: 0, rate: 0 };
    const budget = filteredContracts.reduce((sum, c) => sum + (c.settlementAuditPrice || (c.contractPrice || 0) + (c.supplementaryAmount || 0)), 0);
    const paid = filteredContracts.reduce((sum, c) => sum + (c.totalPaid || 0), 0);
    return { budget, paid, remaining: Math.max(0, budget - paid), rate: budget > 0 ? (paid / budget) * 100 : 0 };
  }, [filteredContracts]);

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setIsImporting(true);
    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = (evt) => {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
        
        const newContracts: any[] = [];
        data.forEach((row, idx) => {
          if (idx === 0 || !row[1] || !row[2]) return;
          const rawType = String(row[4] || "");
          const normalizedType: ContractType = rawType.includes("采购") ? "采购合同" : "工程合同";
          newContracts.push({
            projectName: String(row[1]),
            name: String(row[2]),
            signingUnit: String(row[3] || ""),
            type: normalizedType,
            fundingChannel: String(row[5] || "未定义渠道"),
            contractPrice: parseFloat(String(row[6] || "0")) || 0,
            supplementaryAmount: parseFloat(String(row[7] || "0")) || 0,
            settlementAuditPrice: parseFloat(String(row[9] || "0")) || 0,
            totalPaid: parseFloat(String(row[10] || "0")) || 0,
            orderIndex: parseInt(String(row[0] || "0")) || undefined
          });
        });
        newContracts.forEach(c => addContract(c));
        toast({ title: "导入成功", description: `已同步 ${newContracts.length} 条记录` });
      };
      reader.readAsBinaryString(file);
    } catch (error) {
      toast({ variant: "destructive", title: "导入错误" });
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  if (currentTime === null) return null;

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) return <AuthScreen />;

  return (
    <div className="flex flex-col min-h-screen bg-background pb-12">
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b px-4 md:px-6 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="bg-primary p-2 rounded-xl shadow-sm"><LayoutDashboard className="w-5 h-5 text-white" /></div>
          <h1 className="text-lg md:text-xl font-black tracking-tight text-slate-800 uppercase">合同管理系统</h1>
        </div>
        <div className="flex items-center gap-2">
          <div className="hidden md:flex flex-col items-end mr-4">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1"><UserIcon className="w-2.5 h-2.5" /> 已授权空间</span>
            <span className="text-xs font-black text-primary truncate max-w-[180px]">{user?.email}</span>
          </div>
          {isAdmin && (
            <div className="flex items-center gap-1">
              <AdminUserDialog />
              <AuditLogDialog />
            </div>
          )}
          <SupportDialog isAdmin={isAdmin} />
          <Button variant="ghost" size="icon" onClick={handleSignOut} className="rounded-full text-slate-400 hover:text-destructive transition-colors"><LogOut className="w-5 h-5" /></Button>
        </div>
      </header>

      <main className="flex-1 p-4 md:p-6 max-w-[1600px] mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
        <aside className="lg:col-span-3 lg:sticky lg:top-24 self-start space-y-4">
          <ContractForm onAdd={addContract} existingContracts={contracts || []} />
          <FundingOverview contracts={contracts || []} selectedChannel={channelFilter} onSelectChannel={setChannelFilter} />
        </aside>

        <section className="lg:col-span-9 space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <div className="sticky top-16 z-40 bg-white py-4 mb-6 flex flex-wrap items-center justify-between gap-4 border-b">
              <TabsList className="bg-muted/50 p-1 rounded-xl h-auto flex gap-1">
                <TabsTrigger 
                  value="list" 
                  className="rounded-lg font-black text-xs uppercase px-5 py-2 data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  <FileStack className="w-4 h-4 mr-2" /> 合同明细
                </TabsTrigger>
                <TabsTrigger 
                  value="summary" 
                  className="rounded-lg font-black text-xs uppercase px-5 py-2 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  <PieChart className="w-4 h-4 mr-2" /> 执行看板
                </TabsTrigger>
                <TabsTrigger 
                  value="archive" 
                  className="rounded-lg font-black text-xs uppercase px-5 py-2 data-[state=active]:bg-slate-800 data-[state=active]:text-white data-[state=active]:shadow-md transition-all"
                >
                  <Archive className="w-4 h-4 mr-2" /> 结算归档
                </TabsTrigger>
              </TabsList>

              {activeTab === 'list' && (
                <div className="flex flex-1 items-center justify-end gap-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Checkbox 
                      checked={selectedIds.size === (filteredContracts?.length || 0) && (filteredContracts?.length || 0) > 0} 
                      onCheckedChange={(c) => setSelectedIds(c ? new Set(filteredContracts.map(x => x.id)) : new Set())} 
                      className="w-5 h-5 rounded-md" 
                    />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest hidden sm:inline">全选记录</span>
                  </div>
                  
                  {selectedIds.size > 0 && (
                    <Button size="sm" variant="destructive" className="h-8 rounded-lg font-black text-xs px-4" onClick={() => setIsBatchDeleteAlertOpen(true)}>
                      <Trash2 className="w-3.5 h-3.5 mr-2" /> 删除 ({selectedIds.size})
                    </Button>
                  )}

                  <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx, .xls" onChange={handleImportExcel} />
                  <Button variant="outline" size="sm" className="rounded-lg h-9 font-black text-xs" onClick={() => fileInputRef.current?.click()} disabled={isImporting}>
                    {isImporting ? <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> : <Upload className="w-3.5 h-3.5 mr-2" />}
                    导入
                  </Button>
                  
                  <Button variant="outline" size="sm" className="rounded-lg h-9 font-black text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50" onClick={exportToExcel}>
                    <Download className="w-3.5 h-3.5 mr-2" />
                    导出报表
                  </Button>

                  <Select value={typeFilter} onValueChange={setTypeFilter}>
                    <SelectTrigger className="h-9 w-28 rounded-lg text-xs font-black">
                      <SelectValue placeholder="类别" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">全部分类</SelectItem>
                      <SelectItem value="工程合同">工程合同</SelectItem>
                      <SelectItem value="采购合同">采购合同</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  <div className="flex flex-col items-end gap-1 w-full sm:w-[280px]">
                    <div className="relative w-full">
                      <Input 
                        placeholder="检索单位、项目、财务关键词..." 
                        className="pl-10 h-10 rounded-xl bg-white shadow-sm border-slate-200 focus:ring-2 focus:ring-primary/20" 
                        value={searchTerm} 
                        onChange={(e) => setSearchTerm(e.target.value)} 
                      />
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    </div>
                  </div>
                </div>
              )}
            </div>

            <TabsContent value="list" className="space-y-6 m-0 animate-in fade-in duration-500">
              <div className="space-y-4">
                {isDataLoading ? (
                  <div className="text-center py-20 text-slate-400 animate-pulse font-black">检索数据库中...</div>
                ) : (filteredContracts || []).map((c, idx) => (
                  <div key={c.id} id={`contract-wrapper-${c.id}`} className="transition-all duration-500">
                    <ContractCard 
                      index={idx + 1} 
                      contract={c} 
                      isSelected={selectedIds.has(c.id)} 
                      onToggleSelect={() => setSelectedIds(prev => { 
                        const n = new Set(prev); 
                        n.has(c.id) ? n.delete(c.id) : n.add(c.id); 
                        return n; 
                      })} 
                      allChannels={allChannels} 
                      projectColorClass={projectColorMap[c.projectName]} 
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="summary" className="space-y-6 m-0 animate-in fade-in duration-300">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "审计总额", val: `¥${globalMetrics.budget.toLocaleString()}`, color: "bg-blue-600", icon: Calculator },
                  { label: "累计已支付", val: `¥${globalMetrics.paid.toLocaleString()}`, color: "bg-emerald-600", icon: Wallet },
                  { label: "待付余额", val: `¥${globalMetrics.remaining.toLocaleString()}`, color: "bg-orange-600", icon: CircleDollarSign },
                  { label: "执行项目", val: `${projectStats.active.length} 个`, color: "bg-slate-800", icon: ListChecks }
                ].map((m, i) => (
                  <Card key={i} className={`border-none ${m.color} text-white rounded-2xl shadow-lg relative overflow-hidden group`}>
                    <m.icon className="absolute right-[-10px] top-[-10px] w-20 h-20 opacity-10 group-hover:scale-110 transition-transform duration-500" />
                    <CardHeader className="p-4 pb-0 border-none bg-transparent">
                      <p className="text-[10px] font-black uppercase tracking-widest opacity-80 mb-1">{m.label}</p>
                    </CardHeader>
                    <CardContent className="p-4 pt-0">
                      <h3 className="text-lg md:text-xl font-black tracking-tighter">{m.val}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="rounded-2xl shadow-sm overflow-hidden border-slate-200">
                <CardHeader className="bg-slate-50/50 border-b p-6"><CardTitle className="text-base font-black flex items-center gap-2 uppercase tracking-tight"><TrendingUp className="w-5 h-5 text-primary" /> 项目财务监控看板</CardTitle></CardHeader>
                <Table>
                  <TableHeader className="bg-slate-50/30">
                    <TableRow><TableHead className="font-black text-[10px] uppercase text-slate-500 px-6">项目名称 / 合同细分</TableHead><TableHead className="font-black text-[10px] uppercase text-slate-500">结算审定价</TableHead><TableHead className="font-black text-[10px] uppercase text-slate-500">已付金额</TableHead><TableHead className="font-black text-[10px] uppercase text-slate-500">待付余额</TableHead><TableHead className="font-black text-[10px] uppercase text-slate-500 pr-6">拨付进度</TableHead></TableRow>
                  </TableHeader>
                  <TableBody>
                    {projectStats.active.map((p, pIdx) => (
                      <Fragment key={p.projectName}>
                        <TableRow className={cn("border-b transition-colors cursor-pointer", projectBgColors[pIdx % projectBgColors.length])} onClick={() => setExpandedProjects(prev => { const n = new Set(prev); n.has(p.projectName) ? n.delete(p.projectName) : n.add(p.projectName); return n; })}>
                          <TableCell className="px-6 py-4 font-black">
                            <div className="flex items-center gap-2">
                               <div className="w-6 h-6 rounded-full bg-white/80 flex items-center justify-center text-slate-400 shrink-0 shadow-sm border border-slate-100">{expandedProjects.has(p.projectName) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}</div>
                               <span className="text-sm font-black">{p.projectName}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm font-black text-slate-600">¥{p.totalSettlement.toLocaleString()}</TableCell>
                          <TableCell className="text-sm font-black text-emerald-600">¥{p.totalPaid.toLocaleString()}</TableCell>
                          <TableCell className="text-sm font-black text-destructive">¥{p.totalUnpaid.toLocaleString()}</TableCell>
                          <TableCell className="pr-6 py-4"><div className="flex flex-col gap-1 w-32"><span className="text-[10px] font-black text-right">{Math.min(Math.max(p.progress * 100, 0), 100).toFixed(1)}%</span><Progress value={Math.min(Math.max(p.progress * 100, 0), 100)} className="h-1.5 bg-white/60 shadow-inner" /></div></TableCell>
                        </TableRow>
                        {expandedProjects.has(p.projectName) && (p.subContracts || []).map((sub: any, subIdx: number) => {
                          const subBase = (sub.settlementAuditPrice || (sub.contractPrice || 0) + (sub.supplementaryAmount || 0));
                          const subProgress = subBase > 0 ? ((sub.totalPaid || 0) / subBase) * 100 : 0;
                          return (
                            <TableRow key={sub.id} className="border-b bg-white/50 transition-colors hover:bg-white animate-in slide-in-from-top-1 duration-200">
                              <TableCell 
                                className="pl-16 py-3 font-black text-slate-500 text-sm cursor-pointer hover:text-primary hover:underline transition-colors"
                                onClick={(e) => { e.stopPropagation(); scrollToContract(sub.id); }}
                              >
                                └ {subIdx + 1}. {sub.name}
                              </TableCell>
                              <TableCell className="text-sm font-black text-slate-500">¥{subBase.toLocaleString()}</TableCell>
                              <TableCell className="text-sm font-black text-emerald-500/80">¥{(sub.totalPaid || 0).toLocaleString()}</TableCell>
                              <TableCell className="text-sm font-black text-orange-500/80">¥{Math.max(0, subBase - (sub.totalPaid || 0)).toLocaleString()}</TableCell>
                              <TableCell className="pr-6 py-3"><div className="flex flex-col gap-1 w-24"><span className="text-[10px] font-black text-right text-slate-400">{Math.min(Math.max(subProgress, 0), 100).toFixed(1)}%</span><Progress value={Math.min(Math.max(subProgress, 0), 100)} className="h-1" /></div></TableCell>
                            </TableRow>
                          );
                        })}
                      </Fragment>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="archive" className="m-0 animate-in fade-in duration-300">
               <Card className="rounded-2xl shadow-xl bg-slate-900 border-none text-white overflow-hidden">
                 <CardHeader className="p-6 border-b border-slate-800"><CardTitle className="flex items-center gap-2 text-base font-black uppercase tracking-tight text-emerald-400"><Archive className="w-5 h-5" /> 项目结算决算归档库</CardTitle></CardHeader>
                 <Table>
                    <TableHeader className="bg-slate-800/50 border-slate-700">
                      <TableRow>
                        <TableHead className="text-slate-400 font-black px-6 text-[10px] uppercase">项目名称 / 分项</TableHead>
                        <TableHead className="text-slate-400 font-black text-[10px] uppercase">审定总值</TableHead>
                        <TableHead className="text-slate-400 font-black text-right pr-6 text-[10px] uppercase">导出与归档状态</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {projectStats.archived.length > 0 ? projectStats.archived.map((p) => (
                        <Fragment key={p.projectName}>
                          <TableRow className="border-slate-800 hover:bg-slate-800/50 cursor-pointer" onClick={() => setExpandedArchivedProjects(prev => { const n = new Set(prev); n.has(p.projectName) ? n.delete(p.projectName) : n.add(p.projectName); return n; })}>
                            <TableCell className="px-6 py-4 font-black"><div className="flex items-center gap-3"><div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-slate-500 shrink-0 border border-slate-700">{expandedArchivedProjects.has(p.projectName) ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}</div><span className="text-sm font-black">{p.projectName}</span></div></TableCell>
                            <TableCell className="text-emerald-400 font-black text-sm">¥{p.totalSettlement.toLocaleString()}</TableCell>
                            <TableCell className="text-right pr-6 py-4">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="text-[10px] border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-black uppercase h-7 px-3 gap-1.5"
                                onClick={(e) => { e.stopPropagation(); handleExportExcel(p.subContracts, `项目结算报表_${p.projectName}`); }}
                              >
                                <Download className="w-3 h-3" />
                                已结项 (导出)
                              </Button>
                            </TableCell>
                          </TableRow>
                          {expandedArchivedProjects.has(p.projectName) && (p.subContracts || []).map((sub: any, subIdx: number) => {
                            const subBase = (sub.settlementAuditPrice || (sub.contractPrice || 0) + (sub.supplementaryAmount || 0));
                            return (
                              <TableRow key={sub.id} className="border-slate-800 bg-black/20 animate-in slide-in-from-top-1 duration-200">
                                <TableCell 
                                  className="pl-16 py-3 font-black text-slate-400 text-xs cursor-pointer hover:text-emerald-400 hover:underline transition-colors"
                                  onClick={(e) => { e.stopPropagation(); scrollToContract(sub.id); }}
                                >
                                  └ {subIdx + 1}. {sub.name}
                                </TableCell>
                                <TableCell className="text-xs font-black text-emerald-400/70">¥{subBase.toLocaleString()}</TableCell>
                                <TableCell className="text-right pr-6 py-3"><Badge variant="outline" className="text-[10px] border-emerald-500/30 text-emerald-400/50 font-black uppercase">已归档</Badge></TableCell>
                              </TableRow>
                            );
                          })}
                        </Fragment>
                      )) : <TableRow><TableCell colSpan={3} className="text-center py-20 text-slate-500 font-black text-sm uppercase tracking-widest">目前暂无已结项归档记录</TableCell></TableRow>}
                    </TableBody>
                 </Table>
               </Card>
            </TabsContent>
          </Tabs>
        </section>
      </main>

      <div className="fixed bottom-12 right-8 flex flex-col gap-3 z-50">
        {showScrollTop && (
          <Button 
            onClick={scrollToTop} 
            className="w-14 h-14 rounded-full shadow-2xl bg-white text-slate-500 border border-slate-200 hover:text-primary transition-all hover:scale-110 active:scale-95"
          >
            <ChevronUp className="w-6 h-6" />
          </Button>
        )}
        {showScrollBottom && (
          <Button 
            onClick={scrollToBottom} 
            className="w-14 h-14 rounded-full shadow-2xl bg-white text-slate-500 border border-slate-200 hover:text-primary transition-all hover:scale-110 active:scale-95"
          >
            <ChevronDown className="w-6 h-6" />
          </Button>
        )}
      </div>

      <AlertDialog open={isBatchDeleteAlertOpen} onOpenChange={setIsBatchDeleteAlertOpen}>
         <AlertDialogContent className="rounded-2xl p-6">
           <AlertDialogHeader><AlertDialogTitle className="text-xl font-black">确认批量删除选中的 {selectedIds.size} 条记录？</AlertDialogTitle></AlertDialogHeader>
           <AlertDialogFooter className="pt-4 gap-2">
             <AlertDialogCancel className="rounded-lg h-11 font-bold">暂不删除</AlertDialogCancel>
             <AlertDialogAction onClick={() => { 
               if(user) { 
                 const selectedNames: string[] = [];
                 selectedIds.forEach(id => {
                   const c = contracts?.find(x => x.id === id);
                   if (c) selectedNames.push(`[${c.projectName}-${c.name}]`);
                   deleteDocumentNonBlocking(doc(db, "users", user.uid, "contracts", id));
                 });

                 const auditLogsRef = collection(db, "audit_logs");
                 const auditDocRef = doc(auditLogsRef);
                 setDocumentNonBlocking(auditDocRef, {
                   id: auditDocRef.id,
                   userId: user.uid,
                   userEmail: user.email,
                   action: 'BATCH_DELETE',
                   details: `[批量删除记录] 合计删除了 ${selectedIds.size} 条合同记录。受影响项清单：${selectedNames.join(', ')}`,
                   timestamp: Date.now()
                 }, { merge: false });

                 setSelectedIds(new Set()); 
                 toast({ title: "批量操作成功", description: "已从数据库移除所选记录" }); 
               } 
             }} className="bg-destructive text-white rounded-lg h-11 font-black shadow-lg shadow-red-500/20">确认彻底删除</AlertDialogAction>
           </AlertDialogFooter>
         </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
