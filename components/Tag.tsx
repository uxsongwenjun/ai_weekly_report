import React from 'react';

interface TagProps {
  children: React.ReactNode;
  active?: boolean;
  color?: 'gray' | 'blue' | 'purple' | 'orange' | 'green';
}

export const Tag = ({ children, active, color = 'gray' }: TagProps) => {
  let bgClass = 'bg-[#f1f1ef] dark:bg-[#333333]';
  let textClass = 'text-[#787774] dark:text-[#a0a0a0]';

  if (active || color === 'blue') {
    bgClass = 'bg-[#0b6e99]/10 dark:bg-[#2eaadc]/10';
    textClass = 'text-[#0b6e99] dark:text-[#52c1e8]';
  } else if (color === 'purple') {
    bgClass = 'bg-[#9b59b6]/10 dark:bg-[#c486dd]/10';
    textClass = 'text-[#9b59b6] dark:text-[#c486dd]';
  } else if (color === 'orange') {
    bgClass = 'bg-[#e9a23b]/10 dark:bg-[#e9a23b]/20';
    textClass = 'text-[#cc8114] dark:text-[#f3c27b]';
  } else if (color === 'green') {
    bgClass = 'bg-[#00b894]/10 dark:bg-[#00b894]/20';
    textClass = 'text-[#009b7c] dark:text-[#55efc4]';
  }

  return (
    <span className={`inline-flex items-center justify-center whitespace-nowrap text-[12px] font-normal px-2 py-[3px] rounded-[3px] tracking-wide transition-colors ${bgClass} ${textClass}`}>
      {children}
    </span>
  );
};
