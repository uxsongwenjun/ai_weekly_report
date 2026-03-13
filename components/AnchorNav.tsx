"use client";

import React, { useState, useEffect } from 'react';

export default function AnchorNav() {
  const [hovered, setHovered] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      setIsScrolling(true);
      clearTimeout(timeout);
      timeout = setTimeout(() => setIsScrolling(false), 800);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearTimeout(timeout);
    };
  }, []);

  // Intersection Observer to track active section
  useEffect(() => {
    const observerOptions = {
      root: null,
      rootMargin: '-20% 0px -60% 0px', // Notion-style threshold
      threshold: 0
    };

    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          setActiveSection(entry.target.id);
        }
      });
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    
    const sections = ['overview', 'top3', 'industry', 'opensource', 'topics'];
    sections.forEach(id => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);
  
  const sections = [
    { id: 'overview', title: '本周速览' },
    { id: 'top3', title: 'TOP3 热点' },
    { id: 'industry', title: '行业动态' },
    { id: 'opensource', title: '开源推荐' },
    { id: 'topics', title: '热门议题' }
  ];

  const scrollTo = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      const y = el.getBoundingClientRect().top + window.scrollY - 100;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  return (
    <div 
      className={`fixed right-8 top-1/3 flex-col z-40 hidden lg:flex transition-opacity duration-500 w-44 ${isScrolling || hovered ? 'opacity-100' : 'opacity-30'}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div className="text-[11px] font-semibold text-[#999] dark:text-[#777] mb-3 px-1 tracking-wider uppercase">目录</div>
      <div className="flex flex-col gap-0.5">
        {sections.map(sec => {
          const isActive = activeSection === sec.id;
          return (
            <button 
              key={sec.id} 
              onClick={() => scrollTo(sec.id)}
              className={`relative text-left px-3 py-2 text-[13px] transition-all duration-200 w-full group rounded-md ${
                isActive 
                  ? 'text-[#37352f] dark:text-[#f0f0f0] font-semibold scale-[1.02]' 
                  : 'text-[#9b9b9b] dark:text-[#6b6b6b] font-medium hover:text-[#6b6b6b] dark:hover:text-[#9e9e9e] hover:bg-[#f7f6f3] dark:hover:bg-[#2a2a2a]'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-4 bg-[#9b59b6] rounded-full"></span>
              )}
              <span className={`block truncate transition-transform duration-200 ${isActive ? 'translate-x-1' : ''}`}>
                {sec.title}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
