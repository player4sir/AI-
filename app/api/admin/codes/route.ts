import { getAuth } from "@clerk/nextjs/server";
import { NextRequest } from "next/server";
import { Redis } from "@upstash/redis";
import { z } from "zod";
import { getAdminIds } from "@/app/lib/constants";
import { nanoid } from "nanoid";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ACTIVATION_CODE_PREFIX = "activation_code:";

// 验证请求数据
const createCodeSchema = z.object({
  code: z.string().optional(),
  type: z.enum(["unlimited", "credits"]),
  credits: z.number().optional(),
  maxUses: z.number().min(1).optional(),
  expiresIn: z.number().min(0).optional(), // 毫秒
});

// 获取所有激活码
export async function GET(req: NextRequest) {
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

    // 获取所有激活码
    const keys = await redis.keys(ACTIVATION_CODE_PREFIX + "*");
    const codes = await Promise.all(
      keys.map(async (key) => {
        try {
          // 直接获取字符串数据
          const data = await redis.get(key);
          // 如果数据不是字符串，转换为字符串
          const dataString = typeof data === 'string' ? data : JSON.stringify(data);
          return dataString ? JSON.parse(dataString) : null;
        } catch (error) {
          console.error(`Error parsing data for key ${key}:`, error);
          return null;
        }
      })
    );

    // 过滤掉无效的数据
    const validCodes = codes.filter(Boolean);

    return Response.json({ 
      success: true,
      codes: validCodes
    });

  } catch (error) {
    console.error("Error fetching codes:", error);
    return Response.json({ 
      error: "Failed to fetch codes",
      success: false,
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500 
    });
  }
}

// 创建新激活码
export async function POST(req: NextRequest) {
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

    const body = await req.json();
    const { code, type, credits, maxUses, expiresIn } = createCodeSchema.parse(body);

    // 生成或使用提供的激活码
    const activationCode = code || nanoid(10);
    const key = ACTIVATION_CODE_PREFIX + activationCode;

    // 检查激活码是否已存在
    const exists = await redis.exists(key);
    if (exists === 1) {
      return Response.json({ 
        error: "Activation code already exists",
        success: false 
      }, { 
        status: 400 
      });
    }

    // 创建激活码数据
    const codeData = {
      code: activationCode,
      type,
      ...(type === "credits" && { credits }),
      maxUses,
      currentUses: 0,
      ...(expiresIn && { expiresAt: Date.now() + expiresIn }),
      createdAt: Date.now(),
    };

    // 存储激活码
    const setResult = await redis.set(key, JSON.stringify(codeData));
    
    if (setResult !== 'OK') {
      throw new Error('Failed to save activation code to Redis');
    }

    return Response.json({ 
      success: true,
      code: codeData
    });

  } catch (error) {
    console.error("Error creating code:", error);
    return Response.json({ 
      error: "Failed to create activation code",
      success: false,
      details: error instanceof Error ? error.message : String(error)
    }, { 
      status: 500 
    });
  }
} 