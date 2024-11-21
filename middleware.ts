import { clerkMiddleware } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// 定义公开路由
const publicPaths = [
  "/",
  "/api/public(.*)", 
  "/sign-in(.*)", 
  "/sign-up(.*)",
  "/price",  // 添加价格页面到公开路由
  "/price/(.*)",
  "/api/user/metadata",
  "/api/initialize-credits",
  "/api/user-credits",
  "/api/generate-image",
  "/api/activate"
];

function isPublic(path: string) {
  return publicPaths.some(
    (publicPath) => path.match(new RegExp(`^${publicPath}$`)) !== null
  );
}

export default clerkMiddleware(async (auth, req) => {
  const path = req.nextUrl.pathname;
  
  // 如果是公开路由，直接放行
  if (isPublic(path)) {
    return NextResponse.next();
  }

  // 验证请求来源
  if (req.nextUrl.pathname.startsWith('/api/')) {
    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== process.env.NEXT_PUBLIC_API_KEY) {
      return Response.json({ error: 'Invalid API key' }, { status: 401 });
    }
  }

  // 获取认证状态
  const { userId } = await auth();
  
  // 如果用户未登录，重定向到登录页
  if (!userId) {
    const signInUrl = new URL('/sign-in', req.url);
    signInUrl.searchParams.set('redirect_url', req.url);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

// 配置匹配的路由
export const config = {
  matcher: [
    // 匹配所有路径，除了以下情况：
    // 1. 有文件扩展名的路径（如 /image.png）
    // 2. Next.js 特殊路径（如 /_next/static）
    '/((?!.+\\.[\\w]+$|_next).*)',
    // 匹配根路径
    '/',
    // 匹配所有 API 和 tRPC 路由
    '/(api|trpc)(.*)'
  ]
};
