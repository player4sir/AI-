import { getAuth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { DEFAULT_CREDITS } from '../../lib/constants';

export async function POST(req: NextRequest) {
  try {
    // 验证自定义请求头
    const apiKey = req.headers.get('x-api-key');
    if (apiKey !== process.env.NEXT_PUBLIC_API_KEY) {
      return Response.json({ 
        error: "Invalid API key",
        success: false 
      }, { 
        status: 401 
      });
    }

    const { userId } = getAuth(req);
    
    if (!userId) {
      return Response.json({ 
        error: "Unauthorized",
        success: false 
      }, { 
        status: 401 
      });
    }

    // 初始化用户次数
    const response = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: {
          remaining: DEFAULT_CREDITS,
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to initialize user credits');
    }

    return Response.json({ 
      success: true,
      message: "Credits initialized successfully"
    });

  } catch (error) {
    console.error('Error initializing user credits:', error);
    return Response.json({ 
      error: "Failed to initialize user credits",
      success: false 
    }, { 
      status: 500 
    });
  }
} 