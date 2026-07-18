
'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { History, Search, Loader2, Activity, User } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { AuditLog } from "@/lib/types";

export function AuditLogDialog() {
  const db = useFirestore();
  const [isOpen, setIsOpen] = useState(false);

  const logsQuery = useMemoFirebase(() => {
    return query(collection(db, "audit_logs"), orderBy("timestamp", "desc"), limit(200));
  }, [db]);

  const { data: logs, isLoading } = useCollection<AuditLog>(logsQuery);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'ADD_CONTRACT': return <Badge className="bg-blue-100 text-blue-600 border-blue-200">录入合同</Badge>;
      case 'ADD_PAYMENT': return <Badge className="bg-emerald-100 text-emerald-600 border-emerald-200">新增支出</Badge>;
      case 'REMOVE_PAYMENT': return <Badge className="bg-red-100 text-red-600 border-red-200">移除支出</Badge>;
      case 'UPDATE_CONTRACT': return <Badge className="bg-amber-100 text-amber-600 border-amber-200">修改合同</Badge>;
      case 'DELETE_CONTRACT': return <Badge className="bg-slate-100 text-slate-600 border-slate-200">删除合同</Badge>;
      case 'BATCH_DELETE': return <Badge className="bg-rose-100 text-rose-600 border-rose-200">批量删除</Badge>;
      default: return <Badge variant="outline">{action}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 font-bold text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-colors">
          <History className="w-4 h-4" />
          <span className="hidden sm:inline">操作审计</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col border-none shadow-2xl rounded-3xl">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-3">
             <div className="bg-blue-100 p-2 rounded-xl">
                <Activity className="w-5 h-5 text-blue-600" />
             </div>
             <div>
               <DialogTitle className="text-xl font-black">系统操作审计流水</DialogTitle>
               <DialogDescription className="font-bold text-slate-500 text-xs">
                 记录系统中所有关键的合同录入、财务支付及信息变更。
               </DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-6 pt-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">正在检索审计日志...</p>
            </div>
          ) : (
            <ScrollArea className="h-[480px] border rounded-2xl bg-slate-50/30 overflow-auto">
              <Table>
                <TableHeader className="bg-slate-100/50 sticky top-0 z-10 border-b">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase text-slate-500 pl-6 w-[180px]">时间</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-500 w-[120px]">操作账号</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-500 w-[100px]">动作</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-500 pr-6">详情描述</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs?.map((log) => (
                    <TableRow key={log.id} className="hover:bg-white transition-colors border-b last:border-0">
                      <TableCell className="pl-6 py-4 text-xs font-bold text-slate-500">
                        {new Date(log.timestamp).toLocaleString('zh-CN', { hour12: false })}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <User className="w-3 h-3 text-slate-400" />
                          <span className="text-xs font-black text-slate-700 truncate max-w-[100px]">{log.userEmail.split('@')[0]}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getActionBadge(log.action)}
                      </TableCell>
                      <TableCell className="pr-6 text-xs font-bold text-slate-600 leading-relaxed">
                        {log.details}
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!logs || logs.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-32 text-slate-400 font-bold italic border-none bg-white">
                        暂无任何操作记录
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
