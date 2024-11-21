"use client";

import Spinner from "@/app/components/Spinner";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { motion } from "framer-motion";
import { Textarea } from "@/app/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/app/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { SignInButton, useUser } from "@clerk/nextjs";
import { DownloadIcon, RefreshCwIcon, Wand2 } from "lucide-react";
import Image from "next/image";
import { useState, useEffect } from "react";
import Header from "./components/Header";
import Footer from "./components/Footer";
import { domain } from "@/app/lib/domain";
import InfoTooltip from "./components/InfoToolTip";
import type { CreationType } from "./api/generate-image/route";
import { updateHeaderCredits } from './components/Header';

// 创作类型配置
const creationTypes = [
  { id: "wallpaper", name: "壁纸" },
  { id: "logo", name: "Logo" },
  { id: "childrenBook", name: "儿童绘本" },
  { id: "illustration", name: "插画" },
  { id: "portrait", name: "人物肖像" },
  { id: "concept", name: "概念设计" },
  { id: "scene", name: "场景设计" },
  { id: "character", name: "角色设计" },
  { id: "ecommerce", name: "电商" },
] as const;

// 风格配置
const styles = {
  wallpaper: [
    { name: "写实" },
    { name: "艺术" },
    { name: "动漫" },
    { name: "未来" },
    { name: "科幻" },
    { name: "自然" },
    { name: "简约" },
    { name: "创意" }
  ],
  logo: [
    { name: "写实" },
    { name: "艺术" },
    { name: "极简" },
    { name: "现代" },
    { name: "简约" },
    { name: "创意" },
    { name: "优雅" },
    { name: "时尚" }
  ],
  childrenBook: [
    { name: "写实" },
    { name: "艺术" },
    { name: "动漫" },
    { name: "水彩" },
    { name: "卡通" },
    { name: "可爱" },
    { name: "童话" },
    { name: "温馨" },
    { name: "教育" }
  ],
  illustration: [
    { name: "写实" },
    { name: "艺术" },
    { name: "动漫" },
    { name: "水墨" },
    { name: "水彩" },
    { name: "抽象" },
    { name: "创意" },
    { name: "优雅" }
  ],
  portrait: [
    { name: "写实" },
    { name: "艺术" },
    { name: "动漫" },
    { name: "水墨" },
    { name: "时尚" },
    { name: "优雅" }
  ],
  concept: [
    { name: "写实" },
    { name: "科幻" },
    { name: "未来" },
    { name: "工业" },
    { name: "机械" },
    { name: "建筑" }
  ],
  scene: [
    { name: "写实" },
    { name: "艺术" },
    { name: "科幻" },
    { name: "未来" },
    { name: "自然" },
    { name: "史诗" },
    { name: "奇幻" },
    { name: "末日" }
  ],
  character: [
    { name: "写实" },
    { name: "艺术" },
    { name: "动漫" },
    { name: "科幻" },
    { name: "奇幻" }
  ],
  ecommerce: [
    { name: "写实" },
    { name: "清新" },
    { name: "时尚" },
    { name: "简约" },
    { name: "高端" },
    { name: "创意" },
    { name: "优雅" },
    { name: "商务" }
  ],
} as const;

// 尺寸配置
const sizes = [
  { id: "1:1", name: "正方形"},
  { id: "16:9", name: "横向"},
  { id: "9:16", name: "竖向" },
];

// AI 模型配置
const models = [
  { id: "flux", name: "通用" },
  { id: "flux-realism", name: "写实" },
  { id: "flux-anime", name: "动漫" },
  { id: "flux-disney", name: "迪士尼" },
  { id: "flux-pixel", name: "像素" },
  { id: "flux-3d", name: "3D" },
  { id: "flux-4o", name: "4K" },
] as const;

// 定义类型
type StyleName = typeof styles[CreationType][number]['name'];
type ModelId = typeof models[number]['id'];

// 定义尺寸类型
type SizeOption = "1:1" | "16:9" | "9:16";

export default function Page() {
  // 基础状态
  const [userAPIKey, setUserAPIKey] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("userAPIKey") || "";
    }
    return "";
  });
  const [isLoading, setIsLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState("");

  // 创作类型和样式状态
  const [creationType, setCreationType] = useState<CreationType>("wallpaper");
  const [selectedStyle, setSelectedStyle] = useState<StyleName>(styles.wallpaper[0].name);
  const [selectedSize, setSelectedSize] = useState<SizeOption>("1:1");
  const [selectedModel, setSelectedModel] = useState<ModelId>("flux");
  const [additionalInfo, setAdditionalInfo] = useState("");

  const { isSignedIn, isLoaded, user } = useUser();

  // 修改状态名称
  const [remainingCredits, setRemainingCredits] = useState<number | null>(null);

  const handleAPIKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setUserAPIKey(newValue);
    localStorage.setItem("userAPIKey", newValue);
  };

  const fetchUserCredits = async () => {
    if (!isSignedIn) return;
    
    try {
      const response = await fetch('/api/user-credits');
      
      if (!response.ok) {
        throw new Error('Failed to fetch user credits');
      }

      const data = await response.json();
      
      if (data.success) {
        setRemainingCredits(data.credits);
      } else {
        console.error('Error fetching credits:', data.error);
      }
    } catch (error) {
      console.error('Error fetching user credits:', error);
      toast({
        title: "错误",
        description: "获取使用次数失败",
        variant: "destructive",
      });
    }
  };

  // 添加初始化用户次数的函数
  const initializeUserCredits = async () => {
    if (!isSignedIn || !user?.id) return;
    
    try {
      const response = await fetch(`https://api.clerk.com/v1/users/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch user data');
      }

      const userData = await response.json();
      
      // 这里检查 remaining 字段是否存在，如果不存在才会初始化
      if (typeof userData.public_metadata?.remaining !== 'number') {
        const updateResponse = await fetch('/api/initialize-credits', {
          method: 'POST',
        });

        if (!updateResponse.ok) {
          throw new Error('Failed to initialize credits');
        }

        // 重新获取用户次数
        await fetchUserCredits();
      }
    } catch (error) {
      console.error('Error initializing user credits:', error);
    }
  };

  // 在 useEffect 中调用
  useEffect(() => {
    if (isSignedIn && user?.id) {
      const init = async () => {
        await initializeUserCredits();
        await fetchUserCredits();
      };
      init();
    }
  }, [isSignedIn, user?.id, initializeUserCredits, fetchUserCredits]);

  const generateImage = async () => {
    if (!additionalInfo.trim()) {
      toast({
        title: "提示",
        description: "请输入创作描述",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/generate-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: creationType,
          style: selectedStyle,
          additionalInfo: additionalInfo,
          size: selectedSize,
          model: selectedModel,
        }),
      });

      if (response.status === 429) {
        toast({
          title: "提示",
          description: "请求过于频繁，请稍后再试",
          variant: "destructive",
        });
        return;
      }

      // 检查响应头中的成功标志
      const isSuccess = response.headers.get("success") === "true";
      
      if (!isSuccess) {
        const data = await response.json();
        toast({
          title: "错误",
          description: data.error === "No remaining credits" 
            ? "您的次数已用完，请激活无限版本继续使用" 
            : data.error,
          variant: "destructive",
        });
        return;
      }

      // 如果成功，处理图片数据
      const blob = await response.blob();
      setGeneratedImage(URL.createObjectURL(blob));
      
      // 更新剩余次数
      await fetchUserCredits();
      // 触发 Header 更新
      updateHeaderCredits();
      
    } catch (error) {
      toast({
        title: "错误",
        description: "生成图片失败，请重试。",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 获取当前创作类型的样式选项
  const currentStyles = styles[creationType];

  return (
    <div className="flex h-screen flex-col overflow-y-auto overflow-x-hidden bg-[#343434] md:flex-row">
      <Header className="block md:hidden" />

      <div className="flex w-full flex-col md:flex-row">
        <div className="relative flex h-full w-full flex-col bg-[#2C2C2C] text-[#F3F3F3] md:max-w-sm">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setGeneratedImage("");
              generateImage();
            }}
            className="flex h-full w-full flex-col"
          >
            <fieldset className="flex grow flex-col" disabled={!isSignedIn}>
              <div className="flex-grow overflow-y-auto">
                <div className="px-8 pb-0 pt-4 md:px-6 md:pt-6">
                  {/* 创作类型选择 */}
                  <div className="mb-6">
                    <div className="mb-2 flex items-center">
                      <label className="text-xs font-bold uppercase text-[#6F6F6F]">
                        创作类型
                      </label>
                      <InfoTooltip content="选择您要创作的内容类型" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {creationTypes.map((type) => (
                        <button
                          key={type.id}
                          type="button"
                          onClick={() => {
                            setCreationType(type.id as CreationType);
                            setSelectedStyle(styles[type.id as CreationType][0].name as StyleName);
                          }}
                          className={`flex flex-col items-center rounded-lg border p-4 transition-colors ${
                            creationType === type.id
                              ? "border-white bg-gray-800 text-white"
                              : "border-gray-700 text-gray-400 hover:border-gray-600"
                          }`}
                        >
                          <span className="text-lg mb-1">{type.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 移动：附加说明提前 */}
                  <div className="mb-6">
                    <div className="mb-2 flex items-center">
                      <label className="text-xs font-bold uppercase text-[#6F6F6F]">
                        创作描述
                      </label>
                      <InfoTooltip content="描述您想要创作的内容" />
                    </div>
                    <Textarea
                      value={additionalInfo}
                      onChange={(e) => setAdditionalInfo(e.target.value)}
                      placeholder={getPlaceholderByType(creationType)}
                      className="min-h-[100px]"
                    />
                  </div>

                  {/* 风格选择 */}
                  <div className="mb-6">
                    <div className="mb-2 flex items-center">
                      <label className="text-xs font-bold uppercase text-[#6F6F6F]">
                        风格选择
                      </label>
                      <InfoTooltip content="选择作品的风格" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {currentStyles.map((style) => (
                        <button
                          key={style.name}
                          type="button"
                          onClick={() => setSelectedStyle(style.name as StyleName)}
                          className={`flex flex-col items-center rounded-lg border p-4 transition-colors ${
                            selectedStyle === style.name
                              ? "border-white bg-gray-800 text-white"
                              : "border-gray-700 text-gray-400 hover:border-gray-600"
                          }`}
                        >
                          <span className="text-lg">{style.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 尺寸选择 */}
                  <div className="mb-6">
                    <div className="mb-2 flex items-center">
                      <label className="text-xs font-bold uppercase text-[#6F6F6F]">
                        尺寸比例
                      </label>
                      <InfoTooltip content="选择图片的尺寸比例" />
                    </div>
                    <Select 
                      value={selectedSize} 
                      onValueChange={(value: string) => setSelectedSize(value as SizeOption)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择尺寸" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {sizes.map((size) => (
                            <SelectItem key={size.id} value={size.id}>
                              <div className="flex flex-col">
                                <span>{size.name}</span>
                           
                              </div>
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* AI 模型选择 */}
                  <div className="mb-6">
                    <label className="mb-2 block text-xs font-bold uppercase text-[#6F6F6F]">
                      AI 模型
                      <InfoTooltip content="选择生成图片的 AI 模型" />
                    </label>
                    <Select 
                      value={selectedModel} 
                      onValueChange={(value: ModelId) => setSelectedModel(value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="选择模型" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {models.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* 生成按钮 */}
              <div className="px-8 py-4 md:px-6 md:py-6">
                {isSignedIn && remainingCredits !== null && !user?.publicMetadata?.unlimited && (
                  <div className="mb-2 text-sm text-gray-400 text-center">
                    剩余次数：{remainingCredits}
                  </div>
                )}
                <Button
                  size="lg"
                  className="w-full text-base font-bold"
                  type="submit"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <div className="loader mr-2" />
                  ) : (
                    <Wand2 className="mr-2 h-4 w-4" />
                  )}
                  {isLoading ? "生成中..." : "开始创作"}
                </Button>
              </div>
            </fieldset>
          </form>

          {/* 登录提示 */}
          {isLoaded && !isSignedIn && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="absolute inset-0 flex flex-col items-center justify-center bg-black/75 px-6"
            >
              <div className="rounded bg-gray-200 p-4 text-gray-900">
                <p className="text-lg">创建免费账号开始创作：</p>
                <div className="mt-4">
                  <SignInButton
                    mode="modal"
                    signUpForceRedirectUrl={domain}
                    forceRedirectUrl={domain}
                  >
                    <Button
                      size="lg"
                      className="w-full text-base font-semibold"
                      variant="secondary"
                    >
                      登录
                    </Button>
                  </SignInButton>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* 预览区域 */}
        <div className="flex w-full flex-col pt-12 md:pt-0">
          <Header className="hidden md:block" />
          <div className="relative flex flex-grow items-center justify-center px-4">
            <div className="relative aspect-square w-full max-w-lg">
              {generatedImage ? (
                <>
                  <Image
                    className={`${isLoading ? "animate-pulse" : ""}`}
                    width={512}
                    height={512}
                    src={generatedImage}
                    alt="生成的图片"
                  />
                  <div
                    className={`pointer-events-none absolute inset-0 transition ${
                      isLoading ? "bg-black/50 duration-500" : "bg-black/0 duration-0"
                    }`}
                  />

                  <div className="absolute -right-12 top-0 flex flex-col gap-2">
                    <Button size="icon" variant="secondary" asChild>
                      <a href={generatedImage} download="creation.png">
                        <DownloadIcon />
                      </a>
                    </Button>
                    <Button
                      size="icon"
                      onClick={generateImage}
                      variant="secondary"
                    >
                      <Spinner loading={isLoading}>
                        <RefreshCwIcon />
                      </Spinner>
                    </Button>
                  </div>
                </>
              ) : (
                <Spinner loading={isLoading} className="size-8 text-white">
                  <div className="flex aspect-square w-full flex-col items-center justify-center rounded-xl bg-[#2C2C2C]">
                    <h4 className="text-center text-base leading-tight text-white">
                      AI 创作助手
                      <br />
                      让创意触手可及！
                    </h4>
                  </div>
                </Spinner>
              )}
            </div>
          </div>
          <Footer />
        </div>
      </div>
    </div>
  );
}
// 根据创作类型获取占位符文本
function getPlaceholderByType(type: CreationType): string {
  const placeholders = {
    wallpaper: "描述您想要的壁纸场景，例如：一片宁静的薰衣草花田，夕阳西下...",
    logo: "描述您的品牌/公司特点，例如：一家专注于环保科技的创新公司...",
    childrenBook: "描述故事场景或角色，例如：一只爱冒险的小兔子在魔法森林里...",
    illustration: "描述您想要的插画内容，例如：一个未来科技风的城市街景...",
    portrait: "描述人物特征和场景，例如：一位穿着复古礼服的优雅女性，侧光打在脸上...",
    concept: "描述设计概念，例如：一款未来主义风格的电动汽车，流线型车身...",
    scene: "描述场景细节，例如：一座漂浮在云端的未来城市，充满科技感的建筑...",
    character: "描述角色特征，例如：一位身穿盔甲的未来战士，手持能量武器...",
    ecommerce: "描述您的商品特点和场景，例如：一款时尚的女士手提包，采用高级真皮材质，搭配金色五金件...",
  };
  return placeholders[type];
}

