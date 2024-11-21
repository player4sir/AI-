import { getAuth } from "@clerk/nextjs/server";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import dedent from "dedent";
import { NextRequest } from "next/server";
import { z } from "zod";

// 初始化 rate limiter
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const ratelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "1h"), // 每小时限制10次
});

export const runtime = "edge";

// 定义创作类型
export type CreationType = 
  | "wallpaper" 
  | "logo" 
  | "childrenBook" 
  | "illustration" 
  | "portrait"    // 人物肖像
  | "concept"     // 概念设计
  | "scene"       // 场景设计
  | "character"   // 角色设计
  | "ecommerce";  // 添加电商类型

// 验证请求数据
const requestSchema = z.object({
  type: z.enum([
    "wallpaper", 
    "logo", 
    "childrenBook", 
    "illustration", 
    "portrait", 
    "concept", 
    "scene", 
    "character",
    "ecommerce"  // 添加电商类型
  ]),
  style: z.string(),
  additionalInfo: z.string(),
  size: z.enum(["1:1", "16:9", "9:16"]).default("1:1"),
  model: z.enum([
    "flux",
    "flux-realism",
    "flux-4o",
    "flux-pixel",
    "flux-3d",
    "flux-anime",
    "flux-disney"
  ]).default("flux"),
});

// 为每种创作类型定义专门的系统提示词
const systemPrompts: Record<CreationType, string> = {
  wallpaper: `You are a wallpaper design expert. Enhance the given prompt to create stunning wallpapers.
Focus on:
- Composition and focal points
- Lighting and atmosphere
- Color harmony and mood
- Resolution and detail quality
- Overall aesthetic appeal
Do not include these instructions in the output. Return only the enhanced prompt.`,

  logo: `You are a professional logo designer. Enhance the given prompt to create distinctive logos.
Focus on:
- Brand identity and recognition
- Simplicity and memorability
- Scalability and versatility
- Professional appearance
- Visual balance
Do not include these instructions in the output. Return only the enhanced prompt.`,

  childrenBook: `You are a children's book illustrator. Enhance the given prompt to create engaging illustrations.
Focus on:
- Age-appropriate content and style
- Engaging and fun elements
- Clear and simple compositions
- Warm and inviting colors
- Story-telling elements
Do not include these instructions in the output. Return only the enhanced prompt.`,

  illustration: `You are an expert illustrator. Enhance the given prompt to create impactful illustrations.
Focus on:
- Artistic style and technique
- Visual storytelling
- Composition and balance
- Color theory and mood
- Detail and texture
Do not include these instructions in the output. Return only the enhanced prompt.`,

  portrait: `You are a portrait photography expert. Enhance the given prompt to create striking portraits.
Focus on:
- Character expression and emotion
- Lighting and shadows
- Pose and composition
- Background and context
- Personal characteristics
Do not include these instructions in the output. Return only the enhanced prompt.`,

  concept: `You are a concept art director. Enhance the given prompt to create innovative concept designs.
Focus on:
- Design innovation and creativity
- Functionality and purpose
- Material and texture
- Environmental context
- Technical feasibility
Do not include these instructions in the output. Return only the enhanced prompt.`,

  scene: `You are an environment design expert. Enhance the given prompt to create immersive scenes.
Focus on:
- Atmosphere and mood
- Lighting and time of day
- Environmental storytelling
- Scale and perspective
- Detail distribution
Do not include these instructions in the output. Return only the enhanced prompt.`,

  character: `You are a character design expert. Enhance the given prompt to create memorable characters.
Focus on:
- Personality and expression
- Costume and accessories
- Pose and gesture
- Anatomical accuracy
- Character backstory elements
Do not include these instructions in the output. Return only the enhanced prompt.`,

  ecommerce: `You are a professional e-commerce product photographer. Enhance the given prompt to create attractive product images.
Focus on:
- Product details and features
- Lighting and shadows
- Material textures
- Composition and angles
- Brand identity and style
- Commercial appeal
Do not include these instructions in the output. Return only the enhanced prompt.`,
};

// 更风格属性，为每种风格添加完整的描述和关键词
const styleAttributes = {
  "写实": {
    keywords: "photorealistic, ultra detailed photography",
    modifiers: "hyperrealistic details, professional photography, 8k quality",
    lighting: "natural lighting, perfect exposure, high dynamic range",
    rendering: "octane render, ray tracing, photographic quality"
  },
  "艺术": {
    keywords: "artistic style, fine art, professional artwork",
    modifiers: "masterful brushwork, gallery quality, artistic interpretation",
    lighting: "dramatic lighting, artistic composition, expressive shadows",
    rendering: "oil painting technique, textured canvas, fine art quality"
  },
  "动漫": {
    keywords: "anime style, manga art, Japanese animation",
    modifiers: "cel shaded, clean lines, anime aesthetics",
    lighting: "anime lighting, vibrant colors, dramatic shadows",
    rendering: "2D animation style, sharp details, smooth gradients"
  },
  "水墨": {
    keywords: "chinese ink painting style, traditional Asian art",
    modifiers: "traditional brushwork, flowing ink, elegant strokes",
    lighting: "subtle gradients, negative space, ink wash effects",
    rendering: "rice paper texture, ink wash technique, traditional materials"
  },
  "像素": {
    keywords: "pixel art, 16-bit style, retro gaming",
    modifiers: "pixelated details, limited color palette, retro aesthetic",
    lighting: "pixel-perfect shading, dithering effects",
    rendering: "pixel grid alignment, crisp edges, retro resolution"
  },
  "复古": {
    keywords: "vintage style, retro aesthetic, classic design",
    modifiers: "aged texture, nostalgic elements, period-accurate details",
    lighting: "vintage color grading, soft focus, film grain",
    rendering: "analog photography look, vintage print effects"
  },
  "未来": {
    keywords: "futuristic style, sci-fi aesthetic, advanced technology",
    modifiers: "high-tech elements, sleek surfaces, advanced materials",
    lighting: "neon accents, holographic effects, dynamic lighting",
    rendering: "glossy surfaces, metallic reflections, tech sheen"
  },
  "科幻": {
    keywords: "science fiction, high tech, advanced civilization",
    modifiers: "otherworldly elements, advanced technology, innovative design",
    lighting: "dramatic sci-fi lighting, energy effects, tech glow",
    rendering: "high-tech materials, complex machinery, futuristic details"
  },
  "自然": {
    keywords: "natural style, organic forms, environmental themes",
    modifiers: "botanical details, organic textures, natural patterns",
    lighting: "natural sunlight, environmental atmosphere, soft shadows",
    rendering: "organic materials, natural colors, environmental harmony"
  },
  "抽象": {
    keywords: "abstract art, non-representational, conceptual design",
    modifiers: "geometric shapes, color theory, dynamic composition",
    lighting: "artistic lighting, color contrasts, bold shadows",
    rendering: "mixed media, textural effects, artistic freedom"
  },
  "极简": {
    keywords: "minimalist design, clean aesthetic, simple elegance",
    modifiers: "minimal elements, essential forms, refined details",
    lighting: "clean lighting, subtle shadows, balanced exposure",
    rendering: "precise lines, clear spaces, refined finish"
  },
  "史诗": {
    keywords: "epic style, dramatic scenes, grand scale",
    modifiers: "cinematic quality, dramatic elements, powerful imagery",
    lighting: "dramatic lighting, atmospheric effects, epic scale",
    rendering: "high detail, cinematic quality, dramatic atmosphere"
  },
  "梦幻": {
    keywords: "dreamy ethereal magical, fantasy elements",
    modifiers: "soft focus, ethereal effects, magical elements",
    lighting: "soft dreamy lighting, magical glow, ethereal atmosphere",
    rendering: "soft edges, magical particles, dreamlike quality"
  },
  "时尚": {
    keywords: "fashion style, trendy design, contemporary aesthetic",
    modifiers: "high fashion elements, modern trends, stylish details",
    lighting: "fashion photography lighting, studio quality, professional setup",
    rendering: "magazine quality, fashion photography style"
  },
  "现代": {
    keywords: "modern style, contemporary design, current trends",
    modifiers: "contemporary elements, clean design, updated aesthetics",
    lighting: "modern lighting techniques, contemporary atmosphere",
    rendering: "current design standards, professional finish"
  },
  "简约": {
    keywords: "simple clean design, uncluttered style",
    modifiers: "minimal elements, clean lines, essential details",
    lighting: "clean simple lighting, minimal shadows",
    rendering: "crisp edges, clean finish, professional quality"
  },
  "创意": {
    keywords: "creative unique design, innovative approach",
    modifiers: "unique elements, innovative techniques, original concepts",
    lighting: "creative lighting effects, artistic interpretation",
    rendering: "experimental techniques, unique style"
  },
  "优雅": {
    keywords: "elegant sophisticated style, refined aesthetic",
    modifiers: "refined details, sophisticated elements, graceful design",
    lighting: "elegant lighting, sophisticated shadows, refined atmosphere",
    rendering: "high-end finish, luxurious quality"
  },
  "卡通": {
    keywords: "cartoon style, fun design, animated look",
    modifiers: "cartoon elements, playful details, animated features",
    lighting: "cartoon lighting, bright colors, simple shadows",
    rendering: "cartoon aesthetics, clean lines, fun atmosphere"
  },
  "水彩": {
    keywords: "watercolor painting style, artistic medium",
    modifiers: "watercolor effects, paint bleeding, artistic strokes",
    lighting: "soft watercolor lighting, color blending",
    rendering: "watercolor paper texture, paint flow effects"
  },
  "可爱": {
    keywords: "cute kawaii style, adorable design",
    modifiers: "kawaii elements, cute details, endearing features",
    lighting: "soft friendly lighting, warm atmosphere",
    rendering: "smooth finish, rounded edges, cute aesthetics"
  },
  "童话": {
    keywords: "fairy tale style, whimsical design",
    modifiers: "fairy tale elements, magical details, storybook features",
    lighting: "magical lighting, enchanted atmosphere",
    rendering: "storybook quality, enchanted effects"
  },
  "温馨": {
    keywords: "warm cozy style, comfortable aesthetic",
    modifiers: "cozy elements, warm tones, comfortable atmosphere",
    lighting: "warm lighting, soft shadows, inviting glow",
    rendering: "comfortable textures, warm finish"
  },
  "教育": {
    keywords: "educational clear style, instructional design",
    modifiers: "clear elements, educational focus, informative details",
    lighting: "clear lighting, good visibility, professional setup",
    rendering: "clean presentation, clear details"
  },
  "工业": {
    keywords: "industrial technical style, mechanical design",
    modifiers: "industrial elements, technical details, mechanical features",
    lighting: "technical lighting, industrial atmosphere",
    rendering: "mechanical precision, technical accuracy"
  },
  "生物": {
    keywords: "biological scientific style, natural science",
    modifiers: "biological details, scientific accuracy, natural elements",
    lighting: "scientific lighting, clear observation",
    rendering: "scientific precision, biological accuracy"
  },
  "建筑": {
    keywords: "architectural design style, structural focus",
    modifiers: "architectural elements, structural details, building features",
    lighting: "architectural lighting, structural emphasis",
    rendering: "architectural precision, professional quality"
  },
  "机械": {
    keywords: "mechanical engineering style, technical design",
    modifiers: "mechanical parts, engineering details, technical precision",
    lighting: "technical lighting, mechanical clarity",
    rendering: "engineering accuracy, technical quality"
  },
  "奇幻": {
    keywords: "fantasy magical style, mythical design",
    modifiers: "fantasy elements, magical details, mythical features",
    lighting: "magical lighting, fantasy atmosphere",
    rendering: "magical effects, fantasy quality"
  },
  "末日": {
    keywords: "post-apocalyptic style, dystopian design",
    modifiers: "apocalyptic elements, dystopian details, survival features",
    lighting: "dramatic dystopian lighting, harsh atmosphere",
    rendering: "weathered effects, dystopian atmosphere"
  }
} as const;

// 更新提示词模板，整合风格属性
const promptTemplates: Record<CreationType, (style: string, additionalInfo: string) => string> = {
  wallpaper: (style, additionalInfo) => {
    const styleAttr = styleAttributes[style as keyof typeof styleAttributes];
    return dedent`
      Create a stunning wallpaper: ${additionalInfo}
      Style: ${styleAttr.keywords}
      Technical requirements: ${styleAttr.modifiers}
      Lighting: ${styleAttr.lighting}
      Rendering: ${styleAttr.rendering}
      Additional requirements: professional quality, perfect composition, 8k ultra-high definition, suitable for desktop or mobile display
    `;
  },

  logo: (style, additionalInfo) => {
    const styleAttr = styleAttributes[style as keyof typeof styleAttributes];
    return dedent`
      Design a professional logo: ${additionalInfo}
      Style: ${styleAttr.keywords}
      Technical requirements: ${styleAttr.modifiers}
      Visual elements: ${styleAttr.lighting}
      Rendering: ${styleAttr.rendering}
      Additional requirements: vector art style, minimalist approach, scalable design, professional branding, clean lines and shapes
    `;
  },

  childrenBook: (style, additionalInfo) => {
    const styleAttr = styleAttributes[style as keyof typeof styleAttributes];
    return dedent`
      Create a children's book illustration: ${additionalInfo}
      Style: ${styleAttr.keywords}
      Technical requirements: ${styleAttr.modifiers}
      Lighting: ${styleAttr.lighting}
      Rendering: ${styleAttr.rendering}
      Additional requirements: child-friendly, colorful palette, storybook art style, engaging composition, clear storytelling elements
    `;
  },

  illustration: (style, additionalInfo) => {
    const styleAttr = styleAttributes[style as keyof typeof styleAttributes];
    return dedent`
      Create a professional illustration: ${additionalInfo}
      Style: ${styleAttr.keywords}
      Technical requirements: ${styleAttr.modifiers}
      Lighting: ${styleAttr.lighting}
      Rendering: ${styleAttr.rendering}
      Additional requirements: artistic excellence, detailed artwork, balanced composition, strong visual impact
    `;
  },

  portrait: (style, additionalInfo) => {
    const styleAttr = styleAttributes[style as keyof typeof styleAttributes];
    return dedent`
      Create a striking portrait: ${additionalInfo}
      Style: ${styleAttr.keywords}
      Technical requirements: ${styleAttr.modifiers}
      Lighting: ${styleAttr.lighting}
      Rendering: ${styleAttr.rendering}
      Additional requirements: professional photography style, perfect lighting, emotional depth, character focus, high detail
    `;
  },

  concept: (style, additionalInfo) => {
    const styleAttr = styleAttributes[style as keyof typeof styleAttributes];
    return dedent`
      Create a concept design: ${additionalInfo}
      Style: ${styleAttr.keywords}
      Technical requirements: ${styleAttr.modifiers}
      Lighting: ${styleAttr.lighting}
      Rendering: ${styleAttr.rendering}
      Additional requirements: innovative approach, detailed visualization, technical accuracy, professional design standards
    `;
  },

  scene: (style, additionalInfo) => {
    const styleAttr = styleAttributes[style as keyof typeof styleAttributes];
    return dedent`
      Create an environment scene: ${additionalInfo}
      Style: ${styleAttr.keywords}
      Technical requirements: ${styleAttr.modifiers}
      Lighting: ${styleAttr.lighting}
      Rendering: ${styleAttr.rendering}
      Additional requirements: atmospheric quality, detailed background, proper perspective, environmental storytelling
    `;
  },

  character: (style, additionalInfo) => {
    const styleAttr = styleAttributes[style as keyof typeof styleAttributes];
    return dedent`
      Create a character design: ${additionalInfo}
      Style: ${styleAttr.keywords}
      Technical requirements: ${styleAttr.modifiers}
      Lighting: ${styleAttr.lighting}
      Rendering: ${styleAttr.rendering}
      Additional requirements: full body shot, detailed features, clear silhouette, distinctive personality, proper proportions
    `;
  },

  ecommerce: (style, additionalInfo) => {
    const styleAttr = styleAttributes[style as keyof typeof styleAttributes];
    return dedent`
      Create an attractive product image: ${additionalInfo}
      Style: ${styleAttr.keywords}
      Technical requirements: ${styleAttr.modifiers}
      Lighting: ${styleAttr.lighting}
      Rendering: ${styleAttr.rendering}
      Additional requirements: professional photography style, perfect lighting, high detail, product focus, commercial appeal
    `;
  },
};

// 更新 enhancePrompt 函数
async function enhancePrompt(type: CreationType, basePrompt: string): Promise<string> {
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
            content: systemPrompts[type]
          },
          {
            role: 'user',
            content: basePrompt
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

    return await response.text();
  } catch (error) {
    console.error('Error enhancing prompt:', error);
    return basePrompt;
  }
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return Response.json({ 
        error: "Unauthorized - No user ID",
        success: false 
      }, { 
        status: 401 
      });
    }

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

    // 速率限制检查
    const ip = req.ip ?? "anonymous";
    const { success, limit, reset, remaining } = await ratelimit.limit(ip);
    
    if (!success) {
      return Response.json({ 
        error: "Rate limit exceeded",
        success: false,
        reset,
        remaining 
      }, { 
        status: 429,
        headers: {
          'Retry-After': reset.toString(),
          'X-RateLimit-Remaining': remaining.toString()
        }
      });
    }

    const body = await req.json();
    const { type, style, additionalInfo, size, model } = requestSchema.parse(body);

    // 在生成图片之前检查用户权限
    const userResponse = await fetch(`https://api.clerk.com/v1/users/${userId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!userResponse.ok) {
      throw new Error('Failed to fetch user data');
    }

    const userData = await userResponse.json();

    // 如果不是无限制用户，则检查剩余次数
    if (!userData.public_metadata?.unlimited) {
      const remaining = userData.public_metadata?.remaining ?? 0;
      
      if (remaining <= 0) {
        return Response.json({ 
          error: "No remaining credits",
          success: false 
        }, { 
          status: 403 
        });
      }

      // 扣除使用次数
      await fetch(`https://api.clerk.com/v1/users/${userId}/metadata`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          public_metadata: {
            ...userData.public_metadata,
            remaining: remaining - 1,
          },
        }),
      });
    }

    // 生成基础提示词
    const basePrompt = promptTemplates[type as CreationType](style, additionalInfo);
    const enhancedPrompt = await enhancePrompt(type as CreationType, basePrompt);

    // 构建图片生成 URL 和参数
    const params = new URLSearchParams({
      prompt: enhancedPrompt,
      size,
      model,
      seed: Math.floor(Math.random() * 1000000).toString()
    });

    // 使用 API 生成图片
    const imageUrl = `https://api.airforce/v1/imagine?${params.toString()}`;
    const response = await fetch(imageUrl);

    if (!response.ok) {
      throw new Error(`Failed to generate image: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('image/')) {
      throw new Error(`Unexpected content type: ${contentType}`);
    }

    const imageData = await response.blob();

    return new Response(imageData, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "no-store, must-revalidate",
        "success": "true"
      },
    });
  } catch (error) {
    console.error('Image generation error:', error);
    return Response.json({ 
      error: error instanceof Error ? error.message : "Failed to generate image",
      success: false 
    }, { 
      status: 500 
    });
  }
} 