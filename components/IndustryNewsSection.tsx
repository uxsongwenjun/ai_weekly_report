"use client";

import React, { useState } from 'react';
import type { Item } from "@/lib/db/schema";
import { AIReaderButton } from './AIReaderButton';
import { AIReaderModal } from './AIReaderModal';
import { Tag } from './Tag';
import { toast } from 'sonner';
import { safeJsonParse } from '@/lib/utils/json';

interface IndustryNewsSectionProps {
  items: Item[];
}

const NewsCard = ({ item }: { item: Item }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleCardClick = (title: string) => {
    toast.success(`正在跳转至: ${title}`);
    if (item.source_url) {
        window.open(item.source_url, '_blank');
    }
  };

  const iconChar = item.title ? item.title.charAt(0).toUpperCase() : '?';
  const tags = safeJsonParse<string[]>(item.tags, []);
  const mainCategory = item.category || (tags.length > 0 ? tags[0] : "动态");
  const subCategory = tags.length > 1 ? tags[1] : "";
  const displayTags = tags.length > 2 ? tags.slice(2) : [];

  return (
    <>
      <div 
        onClick={() => handleCardClick(item.title)}
        className="group flex flex-col p-6 rounded-lg border border-[#e3e2e0] dark:border-[#333333] bg-white dark:bg-[#202020] hover:-translate-y-1 transition-all duration-300 h-full cursor-pointer"
      >
        <div className="flex gap-4 items-start mb-5 h-[84px]">
          <div className="w-[48px] h-[48px] bg-[#f7f6f3] dark:bg-[#2c2c2c] rounded-lg flex items-center justify-center shrink-0 border border-[#e3e2e0]/50 dark:border-[#444444]">
            <span className="text-xl font-bold text-[#37352f] dark:text-[#d4d4d4]">{iconChar}</span>
          </div>
          <div className="flex flex-col flex-1">
            <div className="mb-1.5 self-start relative">
              <h3 className="text-[15px] font-semibold text-[#37352f] dark:text-[#d4d4d4] leading-snug group-hover:text-[#9b59b6] dark:group-hover:text-[#c486dd] transition-colors tracking-tight line-clamp-1">{item.title}</h3>
              
            </div>
            <p className="text-[13px] font-light text-[#6b6b6b] dark:text-[#a0a0a0] leading-relaxed line-clamp-2">{item.summary}</p>
          </div>
        </div>

        <div className="bg-[#f7f6f3] dark:bg-[#2c2c2c] border-l-[3px] border-[#dfab01] rounded-[4px] py-2.5 px-3 mb-5 flex items-center overflow-hidden h-[60px]">
          <div className="text-[13px] text-[#6b6b6b] dark:text-[#a0a0a0] font-normal leading-relaxed flex-1 line-clamp-2">
            {item.highlight || item.ai_summary || "暂无摘要"}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-6 mt-auto overflow-hidden max-h-[28px]">
          <Tag color="blue">#{mainCategory.replace(/^#/, '')}</Tag>
          {subCategory && <Tag color="gray">{subCategory.replace(/^#/, '')}</Tag>}
          {displayTags.map(tag => (
            <Tag key={tag} color="gray">{tag.replace(/^#/, '')}</Tag>
          ))}
        </div>

        <div className="flex justify-between items-center pt-4 border-t border-[#f1f1ef] dark:border-[#333333]">
          <span className="text-[13px] font-normal text-[#999] dark:text-[#777]">{item.source_platform || item.author || "未知来源"}</span>
          <AIReaderButton onClick={(e) => { e.stopPropagation(); setIsOpen(true); }} />
        </div>
      </div>
      <AIReaderModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={item.title} 
        insight={item.ai_detail || item.ai_summary || item.highlight || ""} 
      />
    </>
  );
};

export default function IndustryNewsSection({ items }: IndustryNewsSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <div id="industry" className="mb-16 scroll-mt-24">
      <div className="mb-8">
        <h2 className="text-[24px] font-bold text-[#37352f] dark:text-[#d4d4d4] flex items-center gap-2">
          <span className="text-[26px]">🌊</span> 行业动态
        </h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {items.map((item, index) => (
          <NewsCard key={item.id || index} item={item} />
        ))}
      </div>
    </div>
  );
}
