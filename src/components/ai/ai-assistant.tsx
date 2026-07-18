"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, Send, Bot, User, Loader2, XCircle, TrendingUp } from "lucide-react";
import { contractQA } from "@/ai/flows/contract-qa-flow";
import { Contract } from "@/lib/types";

interface AIAssistantProps {
  contracts: Contract[];
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export function AIAssistant({ contracts }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages, isLoading]);

  const globalStats = useMemo(() => {
    if (!contracts.length) return null;
    const totalSettlement = contracts.reduce((sum, c) => sum + (c.settlementAuditPrice || c.contractPrice || 0), 0);
    const totalPaid = contracts.reduce((sum, c) => sum + (c.totalPaid || 0), 0);
    const totalRemaining = totalSettlement - totalPaid;
    const executionRate = totalSettlement > 0 ? (totalPaid / totalSettlement) * 100 : 0;
    const channelCount = new Set(contracts.map(c => c.fundingChannel)).size;

    return {
      totalContracts: contracts.length,
      totalBudget: totalSettlement,
      totalPaid: totalPaid,
      totalRemaining: totalRemaining,
      budgetExecutionRate: `${executionRate.toFixed(2)}%`,
      uniqueChannels: channelCount
    };
  }, [contracts]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const currentInput = input;
    const userMessage: Message = { role: 'user', content: currentInput };
    setMessages(prev => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    try {
      // 提取核心合同数据进行摘要，限制前100条以防Token溢出
      const summarizedData = contracts.slice(0, 100).map(c => {
        const base = c.settlementAuditPrice || c.contractPrice || 0;
        return {
          id: c.orderIndex,
          projectName: c.projectName,
          name: c.name,
          signingUnit: c.signingUnit || "未填写单位",
          settlement: base,
          paid: c.totalPaid,
          remaining: Math.max(0, base - c.totalPaid),
          progress: base > 0 ? `${((c.totalPaid / base) * 100).toFixed(1)}%` : '0%',
          channel: c.fundingChannel,
          type: c.type,
          paymentHistory: c.paymentSummary || "暂无支出记录"
        };
      });

      const response = await contractQA({
        query: currentInput,
        history: messages,
        contractsData: JSON.stringify(summarizedData),
        globalStats: JSON.stringify(globalStats)
      });

      setMessages(prev => [...prev, { role: 'assistant', content: response.answer }]);
    } catch (error) {
      console.error("AI Assistant Error:", error);
      setMessages(prev => [...prev, { role: 'assistant', content: "抱歉，分析数据时出现了一点小问题（可能是网络超时或数据量过大），请稍后再试。" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  const quickQuestions = [
    "帮我汇总下'中铁'公司的所有合同支付。",
    "列出所有属于'监理'类别的合同清单。",
    "统计当前在建项目的整体进度。",
    "分析待付余额最高的前五个合同。",
    "查看最近的支付流水情况"
  ];

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button 
          className="fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg bg-primary hover:scale-110 transition-transform duration-300 z-50 p-0"
        >
          <Sparkles className="w-6 h-6 text-white" />
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col p-0 border-l border-slate-200">
        <SheetHeader className="p-6 border-b bg-slate-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="bg-primary p-1.5 rounded-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <SheetTitle className="text-xl font-black text-slate-800">AI 合同专家</SheetTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={handleClear} className="h-8 w-8 text-slate-400 hover:text-destructive">
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
          <SheetDescription className="font-bold text-slate-500">
            支持上下文对话、模糊企业搜索与自动清单汇总。
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 p-6 bg-slate-50/20" ref={scrollAreaRef}>
          <div className="space-y-6">
            {messages.length === 0 && (
              <div className="space-y-6">
                <div className="text-center py-6 space-y-4">
                  <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                    <TrendingUp className="w-8 h-8 text-primary" />
                  </div>
                  <div className="space-y-2">
                    <p className="text-sm font-black text-slate-800">您好！我是您的智能财务助手。</p>
                    <p className="text-xs font-medium text-slate-500 px-4">
                      您可以尝试问我：<br/>“统计某某公司的支付进度”<br/>或“某月我一共支出了多少钱？”
                    </p>
                  </div>
                </div>
                
                <div className="grid gap-2">
                  <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest pl-1">功能推荐：</p>
                  {quickQuestions.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => { setInput(q); }}
                      className="text-left p-3 text-xs font-bold bg-white border border-slate-200 rounded-xl hover:border-primary hover:bg-slate-50 transition-all text-slate-600 shadow-sm"
                    >
                      “{q}”
                    </button>
                  ))}
                </div>
              </div>
            )}
            
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                <div className={`max-w-[90%] flex gap-3 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 shadow-none ${m.role === 'user' ? 'bg-primary' : 'bg-white border border-slate-200'}`}>
                    {m.role === 'user' ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-primary" />}
                  </div>
                  <div className={`p-3.5 rounded-2xl text-sm leading-relaxed border shadow-none whitespace-pre-wrap ${
                    m.role === 'user' 
                      ? 'bg-primary text-white border-primary rounded-tr-none font-medium' 
                      : 'bg-white border-slate-200 text-slate-800 rounded-tl-none font-medium'
                  }`}>
                    {m.content}
                  </div>
                </div>
              </div>
            ))}
            
            {isLoading && (
              <div className="flex justify-start animate-pulse">
                <div className="max-w-[90%] flex gap-3">
                  <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0">
                    <Loader2 className="w-4 h-4 text-primary animate-spin" />
                  </div>
                  <div className="p-3.5 bg-white border border-slate-200 rounded-2xl rounded-tl-none">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-primary uppercase tracking-tighter">AI 正在深度检索企业财务上下文...</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-6 border-t bg-white">
          <form 
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-center gap-2"
          >
            <Input 
              placeholder="输入企业、项目或财务关键词..." 
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 h-12 rounded-xl border-slate-200 focus:ring-primary font-medium"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              size="icon" 
              className="w-12 h-12 rounded-xl shrink-0 shadow-none"
              disabled={isLoading || !input.trim()}
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
          <div className="flex items-center justify-center gap-1.5 mt-4">
             <div className="h-1 w-1 bg-primary rounded-full animate-pulse"></div>
             <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
               Contextual Intelligence Powered by Genkit
             </p>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
