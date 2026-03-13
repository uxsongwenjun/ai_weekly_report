import React from 'react';
import type { Week } from "@/lib/db/schema";

interface FooterSectionProps {
  week?: Week;
}

export default function FooterSection({ week }: FooterSectionProps) {
  const date = week ? week.updated_at || week.created_at : "2026.03.13";
  const formattedDate = new Date(date as string).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' }).replace(/\//g, '.');

  return (
    <div className="mt-20 pt-10 border-t-2 border-[#e3e2e0] dark:border-[#333333]">
      <h2 className="text-[18px] font-bold text-[#37352f] dark:text-[#d4d4d4] mb-8">信息出处</h2>
      
      <div className="flex flex-wrap gap-8 mb-10 text-[14px] font-medium text-[#6b6b6b] dark:text-[#9e9e9e]">
        {[
          { icon: "📰", text: "RSS聚合" },
          { icon: "🎯", text: "官方博客" },
          { icon: "💬", text: "社交平台" },
          { icon: "👥", text: "技术社区" },
          { icon: "📚", text: "中文媒体" },
          { icon: "📄", text: "产业报告" },
          { icon: "🔧", text: "开源社区" }
        ].map(item => (
          <div key={item.text} className="flex flex-col items-center gap-2.5 hover:text-[#37352f] dark:hover:text-[#d4d4d4] transition-colors cursor-default">
            <span className="text-2xl bg-[#f7f6f3] dark:bg-[#2a2a2a] w-12 h-12 flex items-center justify-center rounded-lg border border-[#e3e2e0] dark:border-[#444444]">{item.icon}</span>
            <span>{item.text}</span>
          </div>
        ))}
      </div>
      
      <div className="bg-[#fafafa] dark:bg-[#1a1a1a] rounded-lg p-6 border border-[#e3e2e0]/50 dark:border-[#333333]/50 space-y-4 text-[13px] text-[#6b6b6b] dark:text-[#9e9e9e] font-medium leading-relaxed mb-8">
        <p className="text-[#37352f] dark:text-[#b0b0b0]">所有资讯均由 AI 提取、精简和交叉验证，GitHub 开源项目自动获取最新数据。仅供设计团队内部学习交流。</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-8">
          <div className="flex"><span className="w-20 opacity-70">科技媒体：</span><span className="text-[#37352f] dark:text-[#d4d4d4]">The Verge · TechCrunch</span></div>
          <div className="flex"><span className="w-20 opacity-70">官方博客：</span><span className="text-[#37352f] dark:text-[#d4d4d4]">A16z · OpenAI Blog</span></div>
          <div className="flex"><span className="w-20 opacity-70">社交平台：</span><span className="text-[#37352f] dark:text-[#d4d4d4]">X (Twitter) · 即刻 · 小红书</span></div>
          <div className="flex"><span className="w-20 opacity-70">技术社区：</span><span className="text-[#37352f] dark:text-[#d4d4d4]">Hacker News</span></div>
          <div className="flex"><span className="w-20 opacity-70">中文媒体：</span><span className="text-[#37352f] dark:text-[#d4d4d4]">36氪 · 机器之心</span></div>
          <div className="flex"><span className="w-20 opacity-70">开源社区：</span><span className="text-[#37352f] dark:text-[#d4d4d4]">GitHub Trending</span></div>
        </div>
      </div>

      <div className="text-[12px] font-bold text-[#999] dark:text-[#777] tracking-widest uppercase">
        更新于 {formattedDate}
      </div>
    </div>
  );
}
