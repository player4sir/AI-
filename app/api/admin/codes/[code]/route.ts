import { getAuth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { getAdminIds } from "@/app/lib/constants";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ACTIVATION_CODE_PREFIX = "activation_code:";
const USED_CODE_PREFIX = "used_code:";

export async function DELETE(
  req: NextRequest,
  { params }: { params: { code: string } }
) {
  try {
    const { userId } = getAuth(req);
    const adminIds = getAdminIds();
    
    if (!userId || !adminIds.has(userId)) {
      return Response.json({ 
        error: "Unauthorized",
        success: false 
      }, { 
        status: 401 
      });
    }

    const { code } = params;
    const key = ACTIVATION_CODE_PREFIX + code;
    const usedKey = USED_CODE_PREFIX + code;

    // 删除激活码和使用记录
    await redis.del(key);
    await redis.del(usedKey);

    return Response.json({ 
      success: true,
      message: "Activation code deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting code:", error);
    return Response.json({ 
      error: "Failed to delete activation code",
      success: false 
    }, { 
      status: 500 
    });
  }
} 