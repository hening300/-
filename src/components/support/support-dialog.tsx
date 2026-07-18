
'use client';

import { useState, useMemo, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Send, History, CheckCircle2, Clock, Reply, User, AlertCircle } from "lucide-react";
import { useFirestore, useCollection, useUser, useMemoFirebase } from "@/firebase";
import { collection, doc, query, where, orderBy } from "firebase/firestore";
import { SupportTicket } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";
import { setDocumentNonBlocking, updateDocumentNonBlocking } from "@/firebase/non-blocking-updates";

interface SupportDialogProps {
  isAdmin?: boolean;
}

export function SupportDialog({ isAdmin = false }: SupportDialogProps) {
  const db = useFirestore();
  const { user } = useUser();
  const { toast } = useToast();
  
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [replyText, setReplyText] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // 动态构建查询：管理员查看全量，用户必须带 userId 过滤
  const ticketsQuery = useMemoFirebase(() => {
    if (!user || !user.uid) return null;
    
    const ticketsRef = collection(db, "support_tickets");
    if (isAdmin) {
      return query(ticketsRef, orderBy("createdAt", "desc"));
    } else {
      return query(
        ticketsRef,
        where("userId", "==", user.uid)
      );
    }
  }, [db, user?.uid, isAdmin]);

  const { data: rawTickets, isLoading } = useCollection<SupportTicket>(ticketsQuery);

  const tickets = useMemo(() => {
    return (rawTickets || []).sort((a, b) => b.createdAt - a.createdAt);
  }, [rawTickets]);

  // 角标逻辑监控：计算待处理或未读数量
  useEffect(() => {
    if (!tickets || tickets.length === 0) {
      setUnreadCount(0);
      return;
    }

    if (isAdmin) {
      // 管理员：计算所有 pending 的数量
      const count = tickets.filter(t => t.status === 'pending').length;
      setUnreadCount(count);
    } else {
      // 用户：计算所有 replied 且 localStorage 没记过（未读）的数量
      const count = tickets.filter(t => t.status === 'replied' && !localStorage.getItem(`read_ticket_${t.id}`)).length;
      setUnreadCount(count);
    }
  }, [tickets, isAdmin]);

  const onOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (open && tickets) {
      if (!isAdmin) {
        // 用户打开对话框，标记所有当前可见的回复为已读
        tickets.forEach(t => {
          if (t.status === 'replied') {
            localStorage.setItem(`read_ticket_${t.id}`, 'true');
          }
        });
        setUnreadCount(0);
      }
    }
  };

  const handleSendTicket = () => {
    if (!user || !message) return;
    
    const ticketsRef = collection(db, "support_tickets");
    const newDocRef = doc(ticketsRef);
    
    setDocumentNonBlocking(newDocRef, {
      id: newDocRef.id,
      userId: user.uid,
      userEmail: user.email,
      subject: subject || "咨询反馈",
      message: message,
      status: "pending",
      createdAt: Date.now()
    }, { merge: false });

    toast({ title: "提交成功", description: "您的留言已发送，我们将尽快处理。" });
    setMessage("");
    setSubject("");
  };

  const handleReplyTicket = (ticketId: string) => {
    if (!isAdmin || !replyText) return;
    
    const ticketRef = doc(db, "support_tickets", ticketId);
    updateDocumentNonBlocking(ticketRef, {
      adminReply: replyText,
      status: "replied",
      repliedAt: Date.now()
    });
    
    toast({ title: "回复成功", description: "回复已提交。" });
    setReplyText("");
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        <div className="relative inline-block">
          <Button variant="ghost" size="sm" className="gap-2 font-bold text-muted-foreground hover:text-primary transition-colors">
            <MessageSquare className="w-4 h-4" />
            <span className="hidden sm:inline">留言区</span>
          </Button>
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-black text-white shadow-sm ring-2 ring-white animate-in zoom-in duration-300">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-primary" />
            系统支持与反馈
          </DialogTitle>
          <DialogDescription>
            {isAdmin ? "管理用户反馈并进行回复" : "提交您在使用过程中遇到的问题或建议"}
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue={isAdmin ? "manage" : "new"} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            {isAdmin ? (
              <>
                <TabsTrigger value="manage" className="font-bold">留言管理</TabsTrigger>
                <TabsTrigger value="stats" className="font-bold">数据概览</TabsTrigger>
              </>
            ) : (
              <>
                <TabsTrigger value="new" className="font-bold">发送新留言</TabsTrigger>
                <TabsTrigger value="history" className="font-bold">历史与回复</TabsTrigger>
              </>
            )}
          </TabsList>

          <TabsContent value="new" className="mt-4 space-y-4 animate-in fade-in slide-in-from-bottom-2">
            <div className="p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm font-medium text-primary/80 leading-relaxed">
                <span className="font-black">温馨提示：</span>为了方便我们尽快为您解决问题，请务必在正文中<span className="text-primary font-black underline underline-offset-4">留下您的手机号或常用邮箱</span>。
              </p>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">主题 (可选)</Label>
              <Input placeholder="请简述您的问题..." value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold uppercase text-muted-foreground">详细内容</Label>
              <Textarea 
                placeholder="请详细描述您的问题，并附上联系方式（手机/邮箱）..." 
                className="min-h-[150px]"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
              />
            </div>
            <Button className="w-full h-11 font-black text-lg shadow-lg shadow-primary/20" onClick={handleSendTicket}>
              <Send className="w-4 h-4 mr-2" />
              立即发送反馈
            </Button>
          </TabsContent>

          <TabsContent value="history" className="mt-4 flex-1 overflow-hidden">
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-20 animate-pulse text-muted-foreground font-bold">加载留言中...</div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground italic border-2 border-dashed rounded-2xl">
                    暂无历史留言记录
                  </div>
                ) : (
                  tickets.map((t) => (
                    <Card key={t.id} className="border-muted/60 bg-muted/20 overflow-hidden">
                      <CardHeader className="p-4 pb-2 bg-white/40 border-b border-white">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-sm font-black text-primary">{t.subject}</CardTitle>
                          <Badge variant={t.status === 'replied' ? 'default' : 'secondary'} className="text-[10px] font-black">
                            {t.status === 'replied' ? '已回复' : '待处理'}
                          </Badge>
                        </div>
                        <p className="text-[10px] text-muted-foreground font-bold">{new Date(t.createdAt).toLocaleString()}</p>
                      </CardHeader>
                      <CardContent className="p-4 space-y-3">
                        <div className="text-sm bg-white/60 p-3 rounded-lg border border-white">
                          <p className="font-medium text-foreground whitespace-pre-wrap">{t.message}</p>
                        </div>
                        {t.adminReply && (
                          <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 space-y-1 animate-in zoom-in-95">
                            <div className="flex items-center gap-1.5 text-primary font-black text-[10px] uppercase">
                              <Reply className="w-3 h-3" />
                              管理员回复：
                            </div>
                            <p className="text-sm font-bold text-primary leading-relaxed">{t.adminReply}</p>
                            <p className="text-[9px] text-primary/60 text-right font-bold">{t.repliedAt ? new Date(t.repliedAt).toLocaleString() : ''}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="manage" className="mt-4 flex-1 overflow-hidden">
            <ScrollArea className="h-[500px] pr-4">
              <div className="space-y-4">
                {isLoading ? (
                  <div className="text-center py-20 animate-pulse text-muted-foreground font-bold">加载管理列表...</div>
                ) : tickets.length === 0 ? (
                  <div className="text-center py-20 text-muted-foreground italic border-2 border-dashed rounded-2xl">
                    目前没有收到任何留言
                  </div>
                ) : (
                  tickets.map((t) => (
                    <Card key={t.id} className={t.status === 'pending' ? "border-amber-200 bg-amber-50/30" : "border-muted/60"}>
                      <CardHeader className="p-4 pb-2 border-b border-dashed">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-2">
                            <User className="w-3 h-3 text-muted-foreground" />
                            <span className="text-xs font-black text-muted-foreground">{t.userEmail}</span>
                          </div>
                          <Badge variant={t.status === 'replied' ? 'outline' : 'destructive'} className="text-[10px] font-black">
                            {t.status === 'replied' ? '已结项' : '需回复'}
                          </Badge>
                        </div>
                        <CardTitle className="text-sm font-black pt-1">{t.subject}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 space-y-4">
                        <p className="text-sm font-bold bg-white p-3 rounded-lg border whitespace-pre-wrap">{t.message}</p>
                        
                        {t.status === 'pending' ? (
                          <div className="space-y-3 pt-2">
                            <Textarea 
                              placeholder="输入回复内容..." 
                              className="text-sm min-h-[80px] bg-white border-primary/20"
                              value={replyText}
                              onChange={(e) => setReplyText(e.target.value)}
                            />
                            <Button size="sm" className="w-full h-9 text-xs font-black bg-primary" onClick={() => handleReplyTicket(t.id)}>
                              确认回复并发送通知
                            </Button>
                          </div>
                        ) : (
                          <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100 flex gap-2">
                            <Reply className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                            <p className="text-xs font-black text-emerald-800">已回复：{t.adminReply}</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="stats" className="mt-4">
            <div className="grid grid-cols-2 gap-4">
              <Card className="p-6 flex flex-col items-center justify-center border-amber-100 bg-amber-50/50">
                <Clock className="w-10 h-10 text-amber-500 mb-2" />
                <span className="text-3xl font-black text-amber-600">{tickets.filter(t => t.status === 'pending').length}</span>
                <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">待处理反馈</span>
              </Card>
              <Card className="p-6 flex flex-col items-center justify-center border-emerald-100 bg-emerald-50/50">
                <CheckCircle2 className="w-10 h-10 text-emerald-500 mb-2" />
                <span className="text-3xl font-black text-emerald-600">{tickets.filter(t => t.status === 'replied').length}</span>
                <span className="text-xs font-black text-muted-foreground uppercase tracking-wider">已处理记录</span>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
