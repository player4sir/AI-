"use client";

import { Button } from "@/app/components/ui/button";
import { motion } from "framer-motion";
import Header from "../components/Header";
import Footer from "../components/Footer";

const plans = [
  {
    name: "基础版",
    price: "25",
    credits: "50",
    features: [
      "50次AI创作机会",
      "支持所有创作类型",
      "高清图片下载",
      "商业用途授权"
    ],
    contactLink: "https://mz-4ghuy0411b96894a-1302342593.tcloudbaseapp.com/"
  },
  {
    name: "进阶版",
    price: "100",
    credits: "200",
    features: [
      "200次AI创作机会",
      "支持所有创作类型",
      "高清图片下载",
      "商业用途授权",
      "优先客服支持"
    ],
    popular: true,
    contactLink: "https://mz-4ghuy0411b96894a-1302342593.tcloudbaseapp.com/"
  },
  {
    name: "无限版",
    price: "688",
    credits: "无限",
    features: [
      "无限次AI创作",
      "支持所有创作类型",
      "高清图片下载",
      "商业用途授权",
      "优先客服支持",
      "终身免费更新"
    ],
    contactLink: "https://mz-4ghuy0411b96894a-1302342593.tcloudbaseapp.com/"
  }
];

export default function PricePage() {
  return (
    <div className="min-h-screen bg-[#343434]">
      <Header />
      <main className="container mx-auto px-6 py-12">
        <div className="mb-12 text-center">
          <h1 className="mb-4 text-3xl font-bold text-white">价格方案</h1>
          <p className="text-gray-400">选择最适合您需求的方案</p>
        </div>

        <div className="grid gap-8 md:grid-cols-3">
          {plans.map((plan) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className={`relative rounded-lg border border-gray-700 bg-gray-800 p-6 shadow-lg ${
                plan.popular ? "border-blue-500" : ""
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 transform">
                  <span className="rounded-full bg-blue-500 px-3 py-1 text-sm font-semibold text-white">
                    最受欢迎
                  </span>
                </div>
              )}

              <div className="mb-6 text-center">
                <h2 className="mb-2 text-xl font-bold text-white">{plan.name}</h2>
                <div className="mb-2">
                  <span className="text-3xl font-bold text-white">¥{plan.price}</span>
                </div>
                <p className="text-sm text-gray-400">{plan.credits}次创作机会</p>
              </div>

              <ul className="mb-6 space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center text-gray-300">
                    <svg
                      className="mr-2 h-5 w-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                    {feature}
                  </li>
                ))}
              </ul>

              <Button
                className="w-full"
                size="lg"
                variant={plan.popular ? "default" : "secondary"}
                onClick={() => window.open(plan.contactLink, '_blank')}
              >
                立即购买
              </Button>
            </motion.div>
          ))}
        </div>

        <div className="mt-12 text-center text-gray-400">
          <p className="mb-4">所有方案均包含：</p>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <h3 className="mb-2 font-semibold text-white">安全可靠</h3>
              <p className="text-sm">数据安全存储，隐私保护</p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-white">专业支持</h3>
              <p className="text-sm">专业技术团队支持</p>
            </div>
            <div>
              <h3 className="mb-2 font-semibold text-white">持续更新</h3>
              <p className="text-sm">产品功能持续更新优化</p>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
} 