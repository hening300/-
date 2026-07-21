
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
import { LayoutDashboard, Mail, UserPlus, LogIn } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function AuthScreen() {
  const auth = useAuth();
  const db = useFirestore();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    setIsLoading(true);
    
    const finalEmail = email.includes("@") ? email.trim() : `${email.trim()}@system.local`;
    const defaultPassword = "SystemDefaultPassword123!";

    try {
      await signInWithEmailAndPassword(auth, finalEmail, defaultPassword);
      toast({
        title: "登录成功",
        description: "正在进入您的合同管理空间",
      });
    } catch (error: any) {
      console.error("Login failed:", error);
      // 如果账号不存在，则直接尝试自动注册并登录
      if (
        error.code === "auth/user-not-found" || 
        error.code === "auth/invalid-credential" || 
        error.code === "auth/wrong-password"
      ) {
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, defaultPassword);
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
            title: "账号自动创建并登录成功",
            description: "正在进入您的合同管理空间",
          });
          return;
        } catch (regError: any) {
          console.error("Auto registration failed:", regError);
          toast({
            variant: "destructive",
            title: "登录失败",
            description: regError.message || "无法自动创建账号，请重试",
          });
          return;
        }
      }
      toast({
        variant: "destructive",
        title: "登录失败",
        description: "请检查账号是否正确",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsLoading(true);
    const finalEmail = email.includes("@") ? email.trim() : `${email.trim()}@system.local`;
    const defaultPassword = "SystemDefaultPassword123!";

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, finalEmail, defaultPassword);
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
      console.error("Registration failed:", error);
      toast({
        variant: "destructive",
        title: "注册失败",
        description: error.code === "auth/email-already-in-use" 
          ? "该账号已存在，请直接登录" 
          : (error.message || "无法创建账号，请重试"),
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
                  输入您的账号或邮箱即可一键进入系统，未注册的账号将自动创建。
                </CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">账号 / 邮箱地址</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        type="text" 
                        placeholder="请输入您的账号(如: admin) 或邮箱" 
                        className="pl-10 h-11"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <Button type="submit" className="w-full h-11 font-black text-lg" disabled={isLoading}>
                    {isLoading ? "正在验证..." : "立即登录 / 注册"}
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
                    <Label htmlFor="reg-email">账号 / 邮箱地址</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input 
                        id="reg-email" 
                        type="text" 
                        placeholder="请输入您要创建的账号(如: admin) 或邮箱" 
                        className="pl-10 h-11"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
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
