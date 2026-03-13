import React from 'react';
import { Sparkle } from 'lucide-react';

interface AIReaderButtonProps {
  onClick: (e: React.MouseEvent) => void;
}

export const AIReaderButton = ({ onClick }: AIReaderButtonProps) => (
  <button 
    onClick={onClick}
    className="flex items-center text-xs font-medium text-[#9b59b6] dark:text-[#c486dd] bg-[#faf5fc] dark:bg-[#312236] hover:bg-[#f3eaf5] dark:hover:bg-[#3b2d41] px-3 py-1.5 rounded-md transition-all border border-[#eedcef] dark:border-[#4d3353] hover:border-[#e2bde5] dark:hover:border-[#6a4273] cursor-help z-10"
  >
    AI解读 <Sparkle className="w-3.5 h-3.5 ml-1.5" />
  </button>
);
