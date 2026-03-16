"use client";

import React, { useState } from 'react';
import type { Item } from "@/lib/db/schema";
import { AIReaderButton } from './AIReaderButton';
import { AIReaderModal } from './AIReaderModal';
import { Tag } from './Tag';
import { toast } from 'sonner';

interface Top3SectionProps {
  items: Item[];
}

const Top3Card = ({ item }: { item: Item }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const handleCardClick = (title: string) => {
    toast.success(`正在跳转至: ${title}`);
    // In a real app, you might want to window.open(item.source_url)
    if (item.source_url) {
        window.open(item.source_url, '_blank');
    }
  };

  // Helper to extract first char
  const iconChar = item.title ? item.title.charAt(0).toUpperCase() : '?';
  
  // Use category from item or default
  const category = item.category || "热点";
  
  // Use image_url or placeholder
  const imageUrl = item.image_url;

  return (
    <>
      <div 
        onClick={() => handleCardClick(item.title)}
        className="group flex flex-col p-6 rounded-lg border border-[#e3e2e0] dark:border-[#333333] bg-white dark:bg-[#202020] hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden"
      >
        <div className="flex gap-6 items-start">
          <div className="w-[110px] h-[110px] rounded-lg overflow-hidden shrink-0 border border-[#e3e2e0] dark:border-[#333333] relative flex items-center justify-center bg-[#f7f6f3] dark:bg-[#1a1a1a]">
            {/* Background Image with Mask - Zoomed to hide text and show pure gradient */}
            <div className="absolute inset-0 overflow-hidden">
              {imageUrl ? (
                <img 
                  src={imageUrl} 
                  alt={item.title} 
                  className="absolute inset-0 w-full h-full object-cover opacity-90 contrast-[1.1] saturate-[1.1] scale-[3.5]" 
                  style={{ objectPosition: 'center' }}
                />
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/20 dark:to-purple-900/20"></div>
              )}
            </div>
            {/* Refined Overlay Mask */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/10 via-transparent to-white/5 dark:from-black/20 dark:to-black/10"></div>
            <div className="absolute inset-0 backdrop-blur-[1px]"></div>
            
            {/* The "Letter" (iconChar) */}
            <span className="relative z-10 text-[56px] font-black text-[#37352f]/10 dark:text-white/10 select-none tracking-tighter">
              {iconChar}
            </span>
          </div>
          
          <div className="flex flex-col flex-1 pt-0.5">
            <div className="flex items-center gap-2 mb-2">
              <Tag color="gray">#{category}</Tag>
            </div>
            <div className="mb-2 self-start relative">
              <h3 className="text-[16px] font-semibold text-[#37352f] dark:text-[#f0f0f0] leading-tight tracking-tight">
                {item.title}
              </h3>
              
            </div>
            <p className="text-[14px] font-light text-[#6b6b6b] dark:text-[#a0a0a0] leading-relaxed line-clamp-2">
              {item.summary}
            </p>
          </div>
        </div>

        <div className="bg-[#f7f6f3] dark:bg-[#2c2c2c] border-l-[3px] border-[#d3d3d3] dark:border-[#555] rounded-[4px] py-2.5 px-3 mt-5 mb-5 flex items-start overflow-hidden">
          <div className="text-[14px] text-[#6b6b6b] dark:text-[#a0a0a0] font-normal leading-relaxed flex-1">
            {item.ai_summary || item.highlight || "暂无AI解读"}
          </div>
        </div>

        <div className="h-px bg-[#e3e2e0] dark:bg-[#333333] w-full mb-4" />

        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2 text-[13px] font-normal text-[#999] dark:text-[#777]">
            <span>来源:</span>
            <span className="text-[#666] dark:text-[#aaa]">{item.source_platform || item.author || "未知来源"}</span>
          </div>
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

export default function Top3Section({ items }: Top3SectionProps) {
  if (!items || items.length === 0) return null;

  return (
    <div id="top3" className="mb-16 scroll-mt-24">
      <div className="mb-6 flex items-center gap-3">
        <span className="text-[26px]">👀</span>
        <h2 className="text-[24px] font-bold text-[#37352f] dark:text-[#d4d4d4]">TOP3 热点</h2>
      </div>
      <div className="flex flex-col gap-6">
        {items.map((item, index) => (
          <Top3Card key={item.id || index} item={item} />
        ))}
      </div>
    </div>
  );
}
