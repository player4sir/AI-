import { getAuth } from "@clerk/nextjs/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import dedent from "dedent";
import { NextRequest } from "next/server";
import { z } from "zod";

// 初始化 rate limiter
let ratelimit: Ratelimit | undefined;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });
  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 d"),
  });
}

export const runtime = "edge";

const requestSchema = z.object({
  prompt: z.string(),
  style: z.string(),
  color: z.string(),
  background: z.string(),
  companyName: z.string(),
});

// 定义风格类型
interface StyleDescription {
  [key: string]: string;
}

// 简化风格描述
const styleDescriptions: StyleDescription = {
  "时尚": "modern and eye-catching design with metallic accents",
  "科技": "clean and minimalist tech style with subtle geometric patterns",
  "现代": "contemporary design with clean lines and balanced composition",
  "活泼": "playful and energetic design with rounded shapes",
  "抽象": "creative abstract design with unique artistic elements",
  "简约": "minimal and elegant design with essential elements only"
};

async function enhancePrompt(basePrompt: string, companyName: string, additionalInfo: string): Promise<string> {
  try {
    const response = await fetch('https://text.pollinations.ai/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages: [
          {
            role: 'system',
            content: 'You are a logo designer. Create natural and concise logo design prompts that capture the essence of the company and design requirements.'
          },
          {
            role: 'user',
            content: `Create a logo design prompt for ${companyName}.
Style: ${basePrompt}
Additional requirements: ${additionalInfo}`
          }
        ],
        model: 'openai',
        seed: Math.floor(Math.random() * 1000000),
        jsonMode: true
      })
    });

    if (!response.ok) {
      throw new Error('Failed to enhance prompt');
    }

    const enhancedPrompt = await response.text();
    return enhancedPrompt;
  } catch (error) {
    console.error('Error enhancing prompt:', error);
    return basePrompt;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    const body = await req.json();
    const { prompt, style, color, background, companyName } = requestSchema.parse(body);

    // Rate limiting
    if (ratelimit) {
      const identifier = userId ?? "anonymous";
      const result = await ratelimit.limit(identifier);
      if (!result.success) {
        return new Response("Rate limit exceeded", { status: 429 });
      }
    }

    // 简化基础 prompt
    const basePrompt = dedent`
      Professional logo for ${companyName}. ${styleDescriptions[style] || styleDescriptions["简约"]}.
      Use ${color.toLowerCase()} as main color on ${background.toLowerCase()} background.
    `;

    // 使用 AI 增强 prompt
    const enhancedPrompt = await enhancePrompt(basePrompt, companyName, prompt);
    console.log('Enhanced prompt:', enhancedPrompt);

    // 构建图片生成 URL 和参数
    const params = new URLSearchParams({
      prompt: enhancedPrompt,
      size: '1:1',  // 使用 1:1 比例
      model: 'flux', // 使用 flux 模型
      seed: Math.floor(Math.random() * 1000000).toString()
    });

    // 使用正确的 API 端点和参数
    const imageUrl = `https://api.airforce/v1/imagine?${params.toString()}`;
    console.log('Image generation URL:', imageUrl); // 调试用

    const response = await fetch(imageUrl);

    if (!response.ok) {
      console.error('Image generation failed:', await response.text());
      throw new Error(`Failed to generate image: ${response.statusText}`);
    }

    // 确保响应是图片
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('image/')) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }

    const imageData = await response.blob();

    // 更新用户使用次数
    if (userId) {
      try {
        const response = await fetch(`${process.env.CLERK_API_URL}/users/${userId}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }

        const userData = await response.json();
        const currentRemaining = (userData.public_metadata?.remaining as number) ?? 3;

        await fetch(`${process.env.CLERK_API_URL}/users/${userId}/metadata`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            public_metadata: {
              remaining: currentRemaining - 1,
            },
          }),
        });
      } catch (error) {
        console.error('Error updating user metadata:', error);
      }
    }

    return new Response(imageData, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, must-revalidate",
      },
    });
  } catch (error) {
    console.error("Logo generation error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate logo" }), 
      { 
        status: 500,
        headers: { "Content-Type": "application/json" }
      }
    );
  }
}
