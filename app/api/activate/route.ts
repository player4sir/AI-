import { getAuth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { z } from "zod";
import { activationCodes } from "@/app/lib/activation-codes";

const requestSchema = z.object({
  code: z.string(),
});

export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { code } = requestSchema.parse(body);

    // 验证激活码
    const activationCode = await activationCodes.validate(code);
    if (!activationCode) {
      return Response.json({ 
        error: "Invalid or expired activation code",
        success: false 
      }, { 
        status: 400 
      });
    }

    // 标记激活码使用
    const marked = await activationCodes.markAsUsed(code, userId);
    if (!marked) {
      return Response.json({ 
        error: "Activation code already used by this user",
        success: false 
      }, { 
        status: 400 
      });
    }

    // 更新用户元数据
    const response = await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        public_metadata: {
          unlimited: activationCode.type === "unlimited",
          ...(activationCode.type === "credits" && {
            remaining: (activationCode.credits || 0),
          }),
        },
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to update user metadata');
    }

    return Response.json({ 
      success: true,
      message: "Successfully activated",
      type: activationCode.type
    });
    
  } catch (error) {
    console.error('Activation error:', error);
    return Response.json({ 
      error: "Failed to activate code",
      success: false,
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500 
    });
  }
} 