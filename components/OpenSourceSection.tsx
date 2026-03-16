"use client";

import React from 'react';
import type { Item } from "@/lib/db/schema";
import { safeJsonParse } from '@/lib/utils/json';

import { toast } from 'sonner';

interface OpenSourceSectionProps {
  items: Item[];
}

const OpenSourceCard = ({ item }: { item: Item }) => {
  const iconChar = item.title ? item.title.charAt(0).toUpperCase() : '?';
  /** heat_data 支持 stars(GitHub) 和 installs(SkillsMP) 两类 */
  const heatData = safeJsonParse<{ stars?: string | number; installs?: string | number }>(item.heat_data, {});
  const heatDisplay = heatData.stars
    ? `⭐ ${heatData.stars}`
    : heatData.installs
      ? `📦 ${heatData.installs} 安装`
      : null;
  
  const handleCardClick = () => {
    if (item.source_url) {
      const w = window.open(item.source_url, '_blank');
      if (w) toast.success(`正在跳转: ${item.title}`);
      else toast.error('请允许弹窗以打开链接');
    }
  };
  
  return (
    <div 
      onClick={handleCardClick}
      className="flex flex-col p-5 rounded-lg border border-[#e3e2e0] dark:border-[#333333] bg-white dark:bg-[#202020] hover:-translate-y-1 transition-all duration-300 h-full group cursor-pointer"
    >
      <div className="flex items-start justify-between mb-4 h-[44px]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="w-8 h-8 bg-[#f7f6f3] dark:bg-[#2c2c2c] border border-[#e3e2e0] dark:border-[#444444] rounded-lg flex items-center justify-center text-[15px] font-semibold text-[#37352f] dark:text-[#d4d4d4] shrink-0">
            {iconChar}
          </div>
          <div className="relative overflow-hidden">
            <h4 className="text-[15px] font-semibold tracking-tight text-[#37352f] dark:text-[#d4d4d4] line-clamp-2 leading-tight">{item.title}</h4>
            
          </div>
        </div>
        {heatDisplay && (
          <div className="text-[12px] font-normal text-[#6b6b6b] dark:text-[#b0b0b0] flex items-center bg-[#f1f1ef] dark:bg-[#2c2c2c] px-2 py-1 rounded-lg shrink-0 ml-2">
            {heatDisplay}
          </div>
        )}
      </div>
      
      <p className="text-[13px] font-light text-[#6b6b6b] dark:text-[#a0a0a0] leading-relaxed line-clamp-2 mb-6 min-h-[42px]">
        {item.summary}
      </p>
      
      <div className="flex justify-between items-center mt-auto border-t border-[#f1f1ef] dark:border-[#333333] pt-4">
        <span className="text-[12px] font-normal text-[#999] dark:text-[#777] tracking-wide uppercase">{item.category || "开源工具"}</span>
        <div className="flex items-center gap-1.5 text-[12px] font-medium text-[#37352f] dark:text-[#d4d4d4] bg-[#f7f6f3] dark:bg-[#2c2c2c] hover:bg-[#e3e2e0] dark:hover:bg-[#444444] px-3 py-1.5 rounded-lg transition-colors">
          查看 
        </div>
      </div>
    </div>
  );
};

export default function OpenSourceSection({ items }: OpenSourceSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <div id="opensource" className="mb-16 scroll-mt-24">
      <div className="mb-8">
        <h2 className="text-[24px] font-bold text-[#37352f] dark:text-[#d4d4d4] flex items-center gap-2">
          <span className="text-[26px]">🛠</span> 开源推荐
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {items.map((item, index) => (
          <OpenSourceCard key={item.id || index} item={item} />
        ))}
      </div>
    </div>
  );
}
