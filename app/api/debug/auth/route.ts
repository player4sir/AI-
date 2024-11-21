import { getAuth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { getAdminIds } from "@/app/lib/constants";

export async function GET(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return Response.json({ 
        success: false,
        error: "Unauthorized" 
      }, { 
        status: 401 
      });
    }

    const adminIds = getAdminIds();
    const isAdmin = adminIds.has(userId);

    if (process.env.NODE_ENV === 'production') {
      return Response.json({
        success: true,
        data: {
          isAdmin: isAdmin
        }
      });
    } else {
      return Response.json({
        success: true,
        data: {
          isAdmin: isAdmin,
          userId: userId,
          environment: process.env.NODE_ENV
        }
      });
    }
  } catch {
    console.error('Auth check failed');
    return Response.json({ 
      success: false,
      error: "Internal server error" 
    }, { 
      status: 500 
    });
  }
} 