import Link from "next/link";
import {
  SignInButton,
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { Button } from "@/app/components/ui/button";
import { useState, useEffect } from "react";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
} from "@/app/components/ui/sheet";

// 添加更新触发器
export const updateHeaderCredits = () => {
  window.dispatchEvent(new Event('updateCredits'));
};

export default function Header({ className = "" }: { className?: string }) {
  const { user } = useUser();
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);
  const [isUnlimited, setIsUnlimited] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchCredits = async () => {
      if (!user) return;
      
      try {
        const response = await fetch('/api/user-credits', {
          headers: {
            'x-api-key': process.env.NEXT_PUBLIC_API_KEY!,
            'Content-Type': 'application/json',
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch credits');
        
        const data = await response.json();
        if (data.success) {
          setRemainingCredits(data.credits);
          setIsUnlimited(data.isUnlimited);
        }
      } catch (error) {
        console.error('Error fetching credits:', error);
      }
    };

    fetchCredits();

    const handleUpdate = () => fetchCredits();
    window.addEventListener('updateCredits', handleUpdate);

    return () => {
      window.removeEventListener('updateCredits', handleUpdate);
    };
  }, [user]);

  // 导航链接组件
  const NavLinks = () => (
    <>
      <Link
        href="/"
        className="text-sm text-gray-400 transition-colors hover:text-white"
      >
        创作
      </Link>
      <Link
        href="/price"
        className="text-sm text-gray-400 transition-colors hover:text-white"
      >
        价格
      </Link>
      <Link
        href="/activate"
        className="text-sm text-gray-400 transition-colors hover:text-white"
      >
        激活
      </Link>
    </>
  );

  // 用户信息组件
  const UserInfo = () => (
    <div className="flex items-center gap-4">
      <SignedIn>
        {!isUnlimited && remainingCredits !== null && (
          <div className="text-sm text-gray-400">
            剩余次数：{remainingCredits}
          </div>
        )}
        {isUnlimited && (
          <div className="rounded-full bg-blue-500 px-3 py-1 text-sm text-white">
            无限版
          </div>
        )}
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: {
              avatarBox: "w-8 h-8"
            }
          }}
        />
      </SignedIn>
      <SignedOut>
        <SignInButton mode="modal">
          <Button variant="secondary" size="sm">
            登录
          </Button>
        </SignInButton>
      </SignedOut>
    </div>
  );

  return (
    <header className={`sticky top-0 z-50 w-full border-b border-[#343434] bg-[#343434] px-4 py-3 backdrop-blur-sm md:px-6 ${className}`}>
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* 桌面版布局 */}
        <div className="flex items-center gap-8">
          <Link href="/" className="text-xl font-bold text-white">
            AI创作助手
          </Link>
          <nav className="hidden md:flex md:gap-6">
            <NavLinks />
          </nav>
        </div>

        {/* 桌面版用户信息 */}
        <div className="hidden md:block">
          <UserInfo />
        </div>

        {/* 移动版菜单 */}
        <div className="flex items-center gap-4 md:hidden">
          <UserInfo />
          <Sheet open={isOpen} onOpenChange={setIsOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64 bg-gray-900">
              <nav className="flex flex-col gap-4 pt-10">
                <NavLinks />
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
