"use client";

import { useState, useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";

interface ActivationCode {
  code: string;
  type: "unlimited" | "credits";
  credits?: number;
  expiresAt?: number;
  maxUses?: number;
  currentUses: number;
  createdAt: number;
}

export default function AdminPage() {
  const { user, isSignedIn } = useUser();
  const [isAdmin, setIsAdmin] = useState(false);
  const [codes, setCodes] = useState<ActivationCode[]>([]);
  const [loading, setLoading] = useState(false);

  // 新激活码表单状态
  const [newCode, setNewCode] = useState("");
  const [codeType, setCodeType] = useState<"unlimited" | "credits">("unlimited");
  const [credits, setCredits] = useState<number>(10);
  const [maxUses, setMaxUses] = useState<number>(1);
  const [expiresIn, setExpiresIn] = useState<number>(30); // 数

  // 检查管理员权限
  useEffect(() => {
    const checkAdmin = async () => {
      if (!isSignedIn || !user?.id) {
        console.log('Not signed in or no user ID');
        setIsAdmin(false);
        return;
      }
      
      try {
        const response = await fetch("/api/debug/auth");
        const data = await response.json();
        
        console.log('Auth response:', data);
        
        if (!response.ok) {
          console.error('Failed to check admin status:', data.error);
          throw new Error(data.error || 'Failed to check admin status');
        }
        
        if (!data.success) {
          console.error('Invalid response format:', data.error);
          throw new Error(data.error || 'Invalid response format');
        }

        setIsAdmin(data.data.isAdmin);
      } catch (err) {
        console.error("Error checking admin status:", err);
        setIsAdmin(false);
      }
    };

    checkAdmin();
  }, [isSignedIn, user?.id]);

  // 获取激活码列表
  const fetchCodes = async () => {
    try {
      const response = await fetch("/api/admin/codes");
      const data = await response.json();
      
      if (data.success) {
        setCodes(data.codes);
      } else {
        console.error('Failed to fetch codes:', data.error);
        toast({
          title: "错误",
          description: "获取激活码列表失败",
          variant: "destructive",
        });
      }
    } catch (err) {
      console.error('Error fetching codes:', err);
      toast({
        title: "错误",
        description: "获取激活码列表失败",
        variant: "destructive",
      });
    }
  };

  // 生成新激活码
  const generateCode = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/admin/codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          code: newCode || undefined,
          type: codeType,
          credits: codeType === "credits" ? credits : undefined,
          maxUses,
          expiresIn: expiresIn * 24 * 60 * 60 * 1000,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "成功",
          description: "激活码创建成功",
        });
        setNewCode("");
        fetchCodes();
      } else {
        console.error('Failed to generate code:', data.error);
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error generating code:', err);
      toast({
        title: "错误",
        description: "创建激活码失败",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // 删除激活码
  const deleteCode = async (code: string) => {
    try {
      const response = await fetch(`/api/admin/codes/${code}`, {
        method: "DELETE",
      });

      const data = await response.json();
      
      if (data.success) {
        toast({
          title: "成功",
          description: "激活码删除成功",
        });
        fetchCodes();
      } else {
        console.error('Failed to delete code:', data.error);
        throw new Error(data.error);
      }
    } catch (err) {
      console.error('Error deleting code:', err);
      toast({
        title: "错误",
        description: "删除激活码失败",
        variant: "destructive",
      });
    }
  };

  // 初始加载激活码列表
  useEffect(() => {
    if (isAdmin) {
      fetchCodes();
    }
  }, [isAdmin]);

  if (!isSignedIn || !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-red-500">无权访问</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="mb-8 text-2xl font-bold">激活码管理</h1>
      
      {/* 创建新激活码表单 */}
      <div className="mb-8 rounded-lg bg-gray-800 p-4 md:p-6">
        <h2 className="mb-4 text-xl font-semibold">创建新激活码</h2>
        <div className="grid gap-4">
          {/* 第一行：激活码和类型 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm">激活码 (可选)</label>
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="留空自动生成"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm">类型</label>
              <Select value={codeType} onValueChange={(value: "unlimited" | "credits") => setCodeType(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="选择类型" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">无限制</SelectItem>
                  <SelectItem value="credits">次数</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* 次数输入框（条件渲染） */}
          {codeType === "credits" && (
            <div className="w-full md:w-1/2">
              <label className="mb-2 block text-sm">次数</label>
              <Input
                type="number"
                value={credits}
                onChange={(e) => setCredits(Number(e.target.value))}
                min={1}
              />
            </div>
          )}
          
          {/* 最后一行：最大使用次数和有效期 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm">最大使用次数</label>
              <Input
                type="number"
                value={maxUses}
                onChange={(e) => setMaxUses(Number(e.target.value))}
                min={1}
              />
            </div>
            <div>
              <label className="mb-2 block text-sm">有效期 (天)</label>
              <Input
                type="number"
                value={expiresIn}
                onChange={(e) => setExpiresIn(Number(e.target.value))}
                min={1}
              />
            </div>
          </div>
          
          <Button onClick={generateCode} disabled={loading}>
            {loading ? "创建中..." : "创建激活码"}
          </Button>
        </div>
      </div>

      {/* 激活码列表 */}
      <div className="rounded-lg bg-gray-800 p-4 md:p-6">
        <h2 className="mb-4 text-xl font-semibold">激活码列表</h2>
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="min-w-[800px] md:min-w-0">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="p-2 text-left">激活码</th>
                  <th className="p-2 text-left">类型</th>
                  <th className="p-2 text-left">次数</th>
                  <th className="p-2 text-left">使用情况</th>
                  <th className="p-2 text-left">过期时间</th>
                  <th className="p-2 text-left">操作</th>
                </tr>
              </thead>
              <tbody>
                {codes.map((code) => (
                  <tr key={code.code} className="border-b border-gray-700">
                    <td className="p-2 break-all">{code.code}</td>
                    <td className="p-2 whitespace-nowrap">{code.type === "unlimited" ? "无限制" : "次数"}</td>
                    <td className="p-2 whitespace-nowrap">{code.type === "credits" ? code.credits : "无限"}</td>
                    <td className="p-2 whitespace-nowrap">
                      {code.currentUses}/{code.maxUses || "∞"}
                    </td>
                    <td className="p-2 whitespace-nowrap">
                      {code.expiresAt
                        ? new Date(code.expiresAt).toLocaleDateString()
                        : "永久"}
                    </td>
                    <td className="p-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => deleteCode(code.code)}
                      >
                        删除
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
} 