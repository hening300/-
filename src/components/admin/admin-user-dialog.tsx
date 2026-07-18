'use client';

import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Users, Calendar, Loader2, Mail } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, orderBy } from "firebase/firestore";
import { UserMetadata } from "@/lib/types";

export function AdminUserDialog() {
  const db = useFirestore();
  const [isOpen, setIsOpen] = useState(false);

  const usersQuery = useMemoFirebase(() => {
    return query(collection(db, "users_metadata"), orderBy("registeredAt", "desc"));
  }, [db]);

  const { data: users, isLoading } = useCollection<UserMetadata>(usersQuery);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2 font-bold text-amber-600 hover:text-amber-700 hover:bg-amber-50 transition-colors">
          <ShieldCheck className="w-4 h-4" />
          <span className="hidden sm:inline">后台管理</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col border-none shadow-2xl rounded-3xl">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center gap-3">
             <div className="bg-amber-100 p-2 rounded-xl">
                <Users className="w-5 h-5 text-amber-600" />
             </div>
             <div>
               <DialogTitle className="text-xl font-black">系统注册用户管理</DialogTitle>
               <DialogDescription className="font-bold text-slate-500 text-xs">
                 查看当前系统已授权的所有用户及其注册轨迹。
               </DialogDescription>
             </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden p-6 pt-2">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-amber-600" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">正在深度检索用户数据库...</p>
            </div>
          ) : (
            <ScrollArea className="h-[450px] border rounded-2xl bg-slate-50/30 overflow-auto">
              <Table>
                <TableHeader className="bg-slate-100/50 sticky top-0 z-10 border-b">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase text-slate-500 pl-6 w-16">#</TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-500"><div className="flex items-center gap-1.5"><Mail className="w-3 h-3" /> 用户登录邮箱</div></TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-500"><div className="flex items-center gap-1.5"><Calendar className="w-3 h-3" /> 注册时间</div></TableHead>
                    <TableHead className="font-black text-[10px] uppercase text-slate-500 text-right pr-6">授权状态</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users?.map((u, i) => (
                    <TableRow key={u.uid} className="hover:bg-white transition-colors border-b last:border-0">
                      <TableCell className="pl-6 py-4 font-black text-[10px] text-slate-400">{i + 1}</TableCell>
                      <TableCell className="font-black text-sm text-slate-700">{u.email}</TableCell>
                      <TableCell className="text-xs font-bold text-slate-500">
                        {u.registeredAt ? new Date(u.registeredAt).toLocaleString('zh-CN', { hour12: false }) : '未知时间'}
                      </TableCell>
                      <TableCell className="text-right pr-6 py-4">
                        <Badge variant="outline" className="text-[9px] font-black uppercase border-amber-200 text-amber-600 bg-amber-50 rounded-lg h-6">
                          永久授权
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {(!users || users.length === 0) && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-24 text-slate-400 font-bold italic border-none bg-white">
                        目前暂无活跃注册用户
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
