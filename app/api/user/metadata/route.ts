import { getAuth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import type { UserMetadata, UserPrivateMetadata } from "@/app/lib/types";

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    
    if (!userId) {
      return Response.json({ 
        error: "Unauthorized",
        success: false 
      }, { 
        status: 401 
      });
    }

    const response = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error('Failed to fetch user data');
    }

    const userData = await response.json();
    
    // 分别获取不同类型的元数据
    const publicMetadata = userData.public_metadata as UserMetadata;
    const privateMetadata = userData.private_metadata as UserPrivateMetadata;

    return Response.json({ 
      success: true,
      metadata: {
        public: publicMetadata,
        private: privateMetadata,
      }
    });

  } catch (error) {
    console.error('Error fetching user metadata:', error);
    return Response.json({ 
      error: "Failed to fetch user metadata",
      success: false 
    }, { 
      status: 500 
    });
  }
} 