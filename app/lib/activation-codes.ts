import { Redis } from "@upstash/redis";

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// 激活码前缀
const ACTIVATION_CODE_PREFIX = "activation_code:";
const USED_CODE_PREFIX = "used_code:";

export interface ActivationCode {
  code: string;
  type: "unlimited" | "credits";
  credits?: number;
  expiresAt?: number; // Unix timestamp
  maxUses?: number;
  currentUses: number;
  createdAt: number;    // 添加创建时间
}

export const activationCodes = {
  // 验证激活码
  async validate(code: string): Promise<ActivationCode | null> {
    try {
      const key = ACTIVATION_CODE_PREFIX + code;
      const data = await redis.get<string>(key);
      
      if (!data) return null;
      
      // 确保数据是字符串格式
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const activationCode = JSON.parse(dataString) as ActivationCode;
      
      // 检查使用次数
      if (activationCode.maxUses && activationCode.currentUses >= activationCode.maxUses) {
        return null;
      }
      
      // 检查是否过期
      if (activationCode.expiresAt && Date.now() > activationCode.expiresAt) {
        return null;
      }
      
      return activationCode;
    } catch (error) {
      return null;
    }
  },

  // 标记激活码已使用
  async markAsUsed(code: string, userId: string): Promise<boolean> {
    try {
      const key = ACTIVATION_CODE_PREFIX + code;
      const usedKey = USED_CODE_PREFIX + code;
      const userKey = `${usedKey}:${userId}`;
      
      const hasUsed = await redis.get(userKey);
      if (hasUsed) return false;
      
      const data = await redis.get<string>(key);
      if (!data) return false;
      
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      const activationCode = JSON.parse(dataString) as ActivationCode;
      
      activationCode.currentUses += 1;
      await redis.set(key, JSON.stringify(activationCode));
      
      await redis.set(userKey, "1");
      return true;
    } catch (error) {
      return false;
    }
  },

  // 获取激活码信息
  async get(code: string): Promise<ActivationCode | null> {
    try {
      const key = ACTIVATION_CODE_PREFIX + code;
      const data = await redis.get<string>(key);
      if (!data) return null;
      
      // 确保数据是字符串格式
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      return JSON.parse(dataString) as ActivationCode;
    } catch (error) {
      return null;
    }
  }
}; 