'use client';

import { useState, useRef, useEffect } from 'react';

const INPUT_EMOJIS = [
  { name: '打call', tag: '[鸢尾尾直播间表情包_打call]', url: '/ayame_emojis/call.png' },
  { name: 'suki', tag: '[鸢尾尾直播间表情包_suki]', url: '/ayame_emojis/suki.png' },
  { name: '欸', tag: '[鸢尾尾直播间表情包_欸]', url: '/ayame_emojis/ei.png' },
  { name: '疑问', tag: '[鸢尾尾直播间表情包_疑问]', url: '/ayame_emojis/question.png' },
  { name: '呜呜', tag: '[鸢尾尾直播间表情包_呜呜]', url: '/ayame_emojis/wuwu.png' },
  { name: '气气', tag: '[鸢尾尾直播间表情包_气气]', url: '/ayame_emojis/heng.png' },
];

interface InputEmojiPickerProps {
  onSelect: (tag: string) => void;
}

export function InputEmojiPicker({ onSelect }: InputEmojiPickerProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!panelOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPanelOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [panelOpen]);

  const handleSelect = (tag: string) => {
    onSelect(tag);
    setPanelOpen(false);
  };

  return (
    <div ref={pickerRef} className="relative inline-block">
      <button
        type="button"
        onClick={() => setPanelOpen(!panelOpen)}
        className="p-2 text-primary hover:bg-accent rounded transition-all duration-200 border-2 border-dashed border-[var(--fabric-stitch)]"
        title="插入表情"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <path d="M8 14s1.5 2 4 2 4-2 4-2"/>
          <line x1="9" y1="9" x2="9.01" y2="9"/>
          <line x1="15" y1="9" x2="15.01" y2="9"/>
        </svg>
      </button>
      {panelOpen && (
        <div className="absolute bottom-full mb-2 right-0 w-[280px] z-[999] bg-card p-2 rounded border-2 border-dashed border-[var(--fabric-stitch)] grid grid-cols-5 gap-1 shadow-lg">
          {INPUT_EMOJIS.map(({ name, tag, url }) => (
            <div
              key={tag}
              className="flex flex-col items-center justify-center cursor-pointer p-1 rounded hover:bg-accent transition-all duration-200"
              onClick={() => handleSelect(tag)}
              title={name}
            >
              <img src={url} alt={name} className="w-10 h-10 object-contain" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
