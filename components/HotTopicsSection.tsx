"use client";

import React, { useState } from 'react';
import type { Item } from "@/lib/db/schema";
import { AIReaderButton } from './AIReaderButton';
import { AIReaderModal } from './AIReaderModal';
import { Tag } from './Tag';
import { toast } from 'sonner';
import { safeJsonParse } from '@/lib/utils/json';

interface HotTopicsSectionProps {
  items: Item[];
}

const HotTopicCard = ({ item }: { item: Item }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleCardClick = (url?: string) => {
    if (url) {
      toast.success(`正在跳转`);
      window.open(url, '_blank');
    }
  };

  const tags = safeJsonParse<string[]>(item.tags, []);
  
  // Clean highlight from HTML tags if needed, though src-sample uses innerHTML-like replacement or just text
  // The src-sample uses a replace regex: .replace(/<[^>]+>/g, '')
  const highlightText = (item.highlight || "").replace(/<[^>]+>/g, '');
  
  // But src-sample also has HTML in the mock data: <span ...>...</span>. 
  // If the real data has HTML, we should render it or strip it.
  // The sample code renders it with dangerouslySetInnerHTML? No, it strips it: {data.highlight.replace(/<[^>]+>/g, '')}
  // Wait, in src-sample code:
  // <p ...>{data.highlight.replace(/<[^>]+>/g, '')}</p>
  // So it strips HTML.
  
  return (
    <>
      <div 
        onClick={() => handleCardClick(item.source_url ?? undefined)}
        className="group flex flex-col p-5 md:p-6 rounded-lg border border-[#e3e2e0] dark:border-[#333333] bg-white dark:bg-[#202020] hover:bg-[#fcfcfc] dark:hover:bg-[#252525] transition-all duration-300 h-full cursor-pointer"
      >
        {/* Quote Area */}
        <div className="relative px-7 py-8 mb-5 bg-gradient-to-br from-[#fbf9fc] to-[#f4f0f7] dark:from-[#2a262c] dark:to-[#221e24] rounded-lg border border-[#ebdff0] dark:border-[#3a323d] overflow-hidden group-hover:border-[#d4c5d9] transition-colors h-[140px] flex items-center justify-center">
          <span className="absolute top-2 left-3 text-[72px] font-serif text-[#9b59b6] opacity-10 select-none leading-none">“</span>
          <p className="text-[#37352f] dark:text-[#d4d4d4] text-[15px] font-bold leading-[1.6] relative z-10 tracking-[0.02em] line-clamp-3 text-center">
            {highlightText || item.summary || "暂无观点"}
          </p>
          <span className="absolute -bottom-6 right-3 text-[80px] font-serif text-[#9b59b6] opacity-10 select-none leading-none">”</span>
        </div>

        <div className="flex flex-col gap-5 mt-auto">
          {/* Tags */}
          <div className="flex flex-wrap gap-2 px-1">
            <Tag color="gray">#{item.category?.replace(/^#/, '') || "观点"}</Tag>
            {tags.map(tag => (
              <Tag key={tag} color="gray">#{tag.replace(/^#/, '')}</Tag>
            ))}
          </div>

          {/* Footer Info */}
          <div className="flex justify-between items-center pt-4 border-t border-[#f1f1ef] dark:border-[#333333]">
            <div className="flex items-center gap-2.5 min-w-0">
              {/* Avatar */}
              <img 
                src={item.author_avatar || "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=64&h=64&q=80"} 
                alt={item.author || "User"}
                className="w-8 h-8 rounded-full border border-[#e3e2e0] dark:border-[#444444] object-cover shrink-0"
              />
              {/* Text Info */}
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-[13px] text-[#37352f] dark:text-[#d4d4d4] font-medium truncate">{item.author || "匿名"}</span>
                  {item.author_label && (
                    <span className="text-[#787774] dark:text-[#999] text-[10px] font-medium px-1.5 py-0.5 bg-[#f1f1ef] dark:bg-[#333333] rounded-sm shrink-0">
                      {item.author_label}
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#787774] dark:text-[#999] truncate">{item.source_platform || "未知平台"}</span>
              </div>
            </div>
            <div className="flex-shrink-0">
              <AIReaderButton onClick={(e) => { e.stopPropagation(); setIsOpen(true); }} />
            </div>
          </div>
        </div>
      </div>
      <AIReaderModal 
        isOpen={isOpen} 
        onClose={() => setIsOpen(false)} 
        title={item.title || `题: ${item.category || "观点"}`} 
        insight={item.ai_detail || item.ai_summary || highlightText} 
      />
    </>
  );
};

export default function HotTopicsSection({ items }: HotTopicsSectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <div id="topics" className="mb-16 scroll-mt-24">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-[26px]">🔥</span>
        <h2 className="text-[24px] font-bold text-[#37352f] dark:text-[#d4d4d4]">热门议题</h2>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {items.map((item, index) => (
          <HotTopicCard key={item.id || index} item={item} />
        ))}
      </div>
    </div>
  );
}
