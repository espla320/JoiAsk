'use client';

import { useState, useRef, useEffect } from 'react';

const EMOJI_GROUPS = [
  {
    key: 'live',
    label: '直播表情包',
    emojis: [
      { name: '打call', tag: '[鸢尾尾直播间表情包_打call]', url: '/ayame_emojis/call.png' },
      { name: 'suki', tag: '[鸢尾尾直播间表情包_suki]', url: '/ayame_emojis/suki.png' },
      { name: '欸', tag: '[鸢尾尾直播间表情包_欸]', url: '/ayame_emojis/ei.png' },
      { name: '疑问', tag: '[鸢尾尾直播间表情包_疑问]', url: '/ayame_emojis/question.png' },
      { name: '呜呜', tag: '[鸢尾尾直播间表情包_呜呜]', url: '/ayame_emojis/wuwu.png' },
      { name: '气气', tag: '[鸢尾尾直播间表情包_气气]', url: '/ayame_emojis/heng.png' },
    ],
  },
  {
    key: 'custom',
    label: '创意工坊',
    emojis: [
      { name: '不赖', tag: '[鸢尾尾创意工坊表情包_不赖]', url: '/ayame_emojis_custom/bulai.jpg' },
      { name: '肥嘟嘟', tag: '[鸢尾尾创意工坊表情包_肥嘟嘟]', url: '/ayame_emojis_custom/feidudu.jpg' },
      { name: 'omg', tag: '[鸢尾尾创意工坊表情包_omg]', url: '/ayame_emojis_custom/omg.gif' },
      { name: '我一直在看着你', tag: '[鸢尾尾创意工坊表情包_我一直在看着你]', url: '/ayame_emojis_custom/shikan.png' },
      { name: '😭', tag: '[鸢尾尾创意工坊表情包_😭]', url: '/ayame_emojis_custom/work.jpg' },
    ],
  },
];

interface InputEmojiPickerProps {
  onSelect: (tag: string) => void;
}

export function InputEmojiPicker({ onSelect }: InputEmojiPickerProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [activeGroup, setActiveGroup] = useState(EMOJI_GROUPS[0].key);
  const pickerRef = useRef<HTMLDivElement>(null);

  const activeEmojis =
    EMOJI_GROUPS.find((group) => group.key === activeGroup)?.emojis ?? EMOJI_GROUPS[0].emojis;

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
        <div className="absolute bottom-full mb-2 right-0 w-[300px] z-[999] rounded border-2 border-dashed border-[var(--fabric-stitch)] bg-card p-2 shadow-lg">
          <div className="mb-2 flex gap-1 rounded bg-secondary p-0.5">
            {EMOJI_GROUPS.map((group) => (
              <button
                key={group.key}
                type="button"
                onClick={() => setActiveGroup(group.key)}
                className={`flex-1 rounded px-2 py-1 text-xs transition-colors ${
                  activeGroup === group.key
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {group.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-6 gap-1">
            {activeEmojis.map(({ name, tag, url }) => (
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
        </div>
      )}
    </div>
  );
}
