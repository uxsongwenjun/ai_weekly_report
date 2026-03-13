import React from 'react';
import { Sparkle, X } from 'lucide-react';

interface AIReaderModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  insight: string;
}

export const AIReaderModal = ({ isOpen, onClose, title, insight }: AIReaderModalProps) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200" onClick={onClose}>
      <div className="bg-white dark:bg-[#202020] rounded-[8px] shadow-[0_8px_30px_rgb(0,0,0,0.12)] w-full max-w-[640px] max-h-[85vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-[#f1f1ef] dark:border-[#333333]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4 border-b border-[#f1f1ef] dark:border-[#333333]">
          <div className="flex items-center gap-2 text-[#9b59b6] dark:text-[#c486dd] font-bold text-[17px]">
            <Sparkle className="w-5 h-5" />
            AI 解读
          </div>
          <button onClick={onClose} className="p-1 hover:bg-[#f1f1ef] dark:hover:bg-[#333333] rounded-full transition-colors text-[#999] dark:text-[#666]">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {/* Content */}
        <div className="px-6 md:px-8 py-6 md:py-8 overflow-y-auto flex-1 bg-white dark:bg-[#202020]">
          <h2 className="text-[22px] md:text-[24px] font-bold text-[#37352f] dark:text-[#d4d4d4] mb-6 leading-tight tracking-tight">{title}</h2>
          
          <p className="text-[15px] text-[#37352f] dark:text-[#d4d4d4] leading-relaxed mb-8 font-normal tracking-wide">
            {insight}
          </p>
          
          <div className="space-y-8">
            <div>
              <h3 className="text-[14px] font-bold text-[#787774] dark:text-[#9e9e9e] mb-4 flex items-center gap-2">
                
                影响 & 依据
              </h3>
              <ul className="space-y-4 text-[#37352f] dark:text-[#b0b0b0] text-[15px] pl-[13px] border-l-2 border-[#f1f1ef] dark:border-[#333333] ml-[3px]">
                <li className="relative pl-4 before:absolute before:left-0 before:top-[11px] before:w-2 before:h-[1px] before:bg-[#9b59b6] dark:before:bg-[#c486dd] tracking-wide">
                  <strong className="font-semibold text-[#37352f] dark:text-[#d4d4d4]">对设计师工作流的影响：</strong> <span className="font-normal">显著降低了重复性劳动的成本，改变了传统原型设计的效率瓶颈。</span>
                </li>
                <li className="relative pl-4 before:absolute before:left-0 before:top-[11px] before:w-2 before:h-[1px] before:bg-[#9b59b6] dark:before:bg-[#c486dd] tracking-wide">
                  <strong className="font-semibold text-[#37352f] dark:text-[#d4d4d4]">支撑的数据/案例：</strong> <span className="font-normal">在最近的基准测试和社区反馈中，表现出超越往代模型数倍的处理速度和精度。</span>
                </li>
              </ul>
            </div>
            
            {/* 建议动作 */}
            <div className="relative px-7 py-8 mb-0 bg-gradient-to-br from-[#fbf9fc] to-[#f4f0f7] dark:from-[#2a262c] dark:to-[#221e24] rounded-[8px] border border-[#ebdff0] dark:border-[#3a323d] overflow-hidden transition-colors">
              <h3 className="text-[15px] font-bold dark:text-white mb-3 flex items-center gap-2 text-[#212121]">
                
                建议动作
              </h3>
              <p className="text-[#37352f] dark:text-[#d4d4d4] text-[15px] leading-relaxed font-normal tracking-wide">
                选一个当前的设计需求,尝试使用该工具/方法输出测试样本，评估其对团队工作流的实际提效价值。
              </p>
            </div>
          </div>
        </div>
        
        {/* Footer */}
        <div className="px-6 py-4 border-t border-[#f1f1ef] dark:border-[#333333] flex justify-end items-center">
          <button className="dark:text-[#d4d4d4] font-medium text-[14px] hover:text-[#9b59b6] dark:hover:text-[#c486dd] transition-colors flex items-center gap-1.5 group text-[#171717]">
            查看原文 
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="transition-transform group-hover:translate-x-0.5">
              <path d="M5 12h14" />
              <path d="m12 5 7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
