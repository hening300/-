
"use client";

import { useState } from "react";
import { useAuth, useFirestore } from "@/firebase";
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutDashboard, Lock, Mail, UserPlus, LogIn, KeyRound } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "登录成功",
        description: "正在进入您的合同管理空间",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "登录失败",
        description: "请检查账号密码是否正确",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 注册后直接设置永久授权
      const creationTimeStr = user.metadata.creationTime || new Date().toISOString();
      const creationTimeMs = new Date(creationTimeStr).getTime();
      const ninetyNineYearsMs = 99 * 365 * 24 * 60 * 60 * 1000;
      
      await setDoc(doc(db, "users_metadata", user.uid), {
        uid: user.uid,
        email: user.email,
        registeredAt: creationTimeStr,
        expiresAt: creationTimeMs + ninetyNineYearsMs
      });
      
      toast({
        title: "账号创建成功",
        description: "您的专属空间已就绪",
      });
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "注册失败",
        description: error.message || "无法创建账号，请重试",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6">
      <div className="w-full max-w-md space-y-8 animate-in fade-in zoom-in duration-500">
        <div className="text-center space-y-2">
          <div className="inline-flex p-3 bg-primary rounded-2xl mb-4 shadow-lg shadow-primary/20">
            <LayoutDashboard className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-primary uppercase">
            合同管理系统
          </h1>
          <p className="text-muted-foreground font-medium">
            专业合同财务管理云平台
          </p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12 bg-muted/50 p-1 rounded-xl">
            <TabsTrigger value="login" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              账号登录
            </TabsTrigger>
            <TabsTrigger value="register" className="rounded-lg font-bold data-[state=active]:bg-white data-[state=active]:shadow-sm">
              创建账号
            </TabsTrigger>
          </TabsList>

          <TabsContent value="login" className="mt-6">
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <LogIn className="w-5 h-5 text-primary" />
                  欢迎回来
                </CardTitle>
                <CardDescription>
                  请输入您的账号密码进入管理系统
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">邮箱地址</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        type="email" 
                        placeholder="name@example.com" 
                        className="pl-10 h-11"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">密码</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="password" 
                        type="password" 
                        placeholder="••••••••" 
                        className="pl-10 h-11"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full h-11 font-black text-lg" disabled={isLoading}>
                    {isLoading ? "正在验证..." : "立即登录"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>

          <TabsContent value="register" className="mt-6">
            <Card className="border-none shadow-xl bg-white/80 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-xl font-bold flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-primary" />
                  开启新空间
                </CardTitle>
                <CardDescription>
                  注册即享永久系统使用权限
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleRegister}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-email">邮箱地址</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="reg-email" 
                        type="email" 
                        placeholder="name@example.com" 
                        className="pl-10 h-11"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-password">设置密码</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="reg-password" 
                        type="password" 
                        placeholder="至少6位字符" 
                        className="pl-10 h-11"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full h-11 font-black text-lg" disabled={isLoading}>
                    {isLoading ? "正在创建..." : "创建并登录"}
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </TabsContent>
        </Tabs>
        
        <p className="text-center text-xs text-muted-foreground font-medium">
          数据采用云端加密存储，仅限本人通过账号访问
        </p>
      </div>
    </div>
  );
}
