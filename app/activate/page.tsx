"use client";

import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { useState } from "react";
import { toast } from "@/hooks/use-toast";
import Header from "../components/Header";
import Footer from "../components/Footer";
import { useUser } from "@clerk/nextjs";
import { motion } from "framer-motion";

export default function ActivatePage() {
  const [activationCode, setActivationCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useUser();

  const handleActivate = async () => {
    if (!activationCode.trim()) {
      toast({
        title: "提示",
        description: "请输入激活码",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/activate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: activationCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "成功",
          description: "激活成功",
        });
        
        // 清空激活码输入
        setActivationCode("");
        
        // 刷新页面以更新用户状态
        window.location.reload();
      } else {
        throw new Error(data.error || "激活失败");
      }
    } catch (error) {
      toast({
        title: "错误",
        description: "激活码无效或已使用",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#343434]">
      <Header />
      <main className="container mx-auto px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mx-auto max-w-md"
        >
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg">
            <h1 className="mb-6 text-center text-2xl font-bold text-white">
              激活码
            </h1>
            
            <div className="mb-6">
              <label className="mb-2 block text-sm font-medium text-gray-400">
                输入激活码
              </label>
              <Input
                value={activationCode}
                onChange={(e) => setActivationCode(e.target.value)}
                placeholder="请输入您的激活码"
                className="bg-gray-700"
              />
            </div>

            <Button
              className="w-full"
              onClick={handleActivate}
              disabled={isLoading}
            >
              {isLoading ? "激活中..." : "立即激活"}
            </Button>

            <div className="mt-6 text-center text-sm text-gray-400">
              <p>没有激活码？</p>
              <Button
                variant="link"
                className="text-blue-400 hover:text-blue-300"
                onClick={() => window.location.href = '/price'}
              >
                查看套餐价格
              </Button>
            </div>
          </div>
        </motion.div>
      </main>
      <Footer />
    </div>
  );
} 