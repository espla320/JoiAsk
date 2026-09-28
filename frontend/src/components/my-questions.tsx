'use client';

import { useCallback, useEffect, useState } from 'react';
import { Loader2, MessageSquare, X } from 'lucide-react';
import { FormattedContent } from '@/components/formatted-content';
import { Question, getMyQuestions } from '@/lib/api';
import { useAccountAuth } from '@/lib/account-auth';
import { wsManager } from '@/lib/ws';

const SEEN_STORAGE_KEY = 'joiask_reply_seen';
const TOAST_DURATION = 8000;

function loadSeen(): Record<number, string> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = window.localStorage.getItem(SEEN_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<number, string>) : {};
  } catch {
    return {};
  }
}

function saveSeen(seen: Record<number, string>) {
  try {
    window.localStorage.setItem(SEEN_STORAGE_KEY, JSON.stringify(seen));
  } catch {
    // ignore storage failures (private mode, quota, ...)
  }
}

function countUnread(questions: Question[], seen: Record<number, string>): number {
  return questions.filter(
    (question) => question.reply && question.replied_at && seen[question.id] !== question.replied_at
  ).length;
}

export function MyQuestions() {
  const { user } = useAccountAuth();
  const [open, setOpen] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState(false);

  const markSeen = useCallback((list: Question[]) => {
    const seen = loadSeen();
    let changed = false;
    list.forEach((question) => {
      if (question.replied_at && seen[question.id] !== question.replied_at) {
        seen[question.id] = question.replied_at;
        changed = true;
      }
    });
    if (changed) saveSeen(seen);
    return seen;
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await getMyQuestions();
      if (response.code === 200 && response.data) {
        const list = response.data.questions || [];
        setQuestions(list);
        if (open) {
          markSeen(list);
          setUnread(0);
        } else {
          setUnread(countUnread(list, loadSeen()));
        }
      }
    } catch (error) {
      console.error('Failed to load my questions:', error);
    } finally {
      setLoading(false);
    }
  }, [markSeen, open, user]);

  useEffect(() => {
    if (!user) {
      setQuestions([]);
      setUnread(0);
      setOpen(false);
      return;
    }
    refresh();
  }, [refresh, user]);

  // Reply pushes travel over the site WebSocket and only reach the author.
  useEffect(() => {
    if (!user) return;
    const unsubscribe = wsManager.subscribe({
      onReply: () => {
        setToast(true);
        refresh();
      },
    });
    return unsubscribe;
  }, [refresh, user]);

  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(false), TOAST_DURATION);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const openPanel = useCallback(() => {
    setOpen(true);
    setToast(false);
    markSeen(questions);
    setUnread(0);
  }, [markSeen, questions]);

  if (!user) return null;

  return (
    <>
      <button
        type="button"
        onClick={openPanel}
        className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded text-primary-foreground hover:bg-white/10"
        title="我的提问"
        aria-label="我的提问"
      >
        <MessageSquare className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] leading-none text-primary-foreground">
            {unread}
          </span>
        )}
      </button>

      {toast && !open && (
        <button
          type="button"
          onClick={openPanel}
          className="fixed bottom-6 right-6 z-[1300] max-w-[280px] rounded-md border-2 border-dashed border-[var(--fabric-stitch)] bg-card px-4 py-3 text-left text-sm text-foreground shadow-xl"
        >
          管理员回复了你的提问，点击查看
        </button>
      )}

      {open && (
        <div
          className="fixed inset-0 z-[1200] flex items-start justify-center overflow-y-auto bg-black/45 px-4 py-10"
          onMouseDown={() => setOpen(false)}
        >
          <div
            className="w-full max-w-[560px] rounded-md border-2 border-dashed border-[var(--fabric-stitch)] bg-card p-5 text-foreground shadow-xl"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base">我的提问</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded hover:bg-secondary"
                aria-label="关闭"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {loading && questions.length === 0 ? (
              <div className="flex justify-center py-10 text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : questions.length === 0 ? (
              <p className="py-10 text-center text-sm text-muted-foreground">
                还没有提问记录，登录后投稿就会出现在这里。
              </p>
            ) : (
              <ul className="space-y-3">
                {questions.map((question) => (
                  <li
                    key={question.id}
                    className="rounded border border-dashed border-[var(--fabric-stitch)] bg-secondary/40 p-3"
                  >
                    <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(question.created_at).toLocaleString('zh-CN')}</span>
                      <span>{question.is_publish ? '已公开' : '待审核'}</span>
                    </div>
                    <div className="text-sm">
                      <FormattedContent content={question.content} />
                    </div>
                    {question.reply ? (
                      <div className="mt-3 rounded border-l-2 border-[var(--fabric-stitch)] bg-card/70 px-3 py-2">
                        <p className="mb-1 text-xs text-muted-foreground">
                          管理员回复
                          {question.replied_at
                            ? ` · ${new Date(question.replied_at).toLocaleString('zh-CN')}`
                            : ''}
                        </p>
                        <div className="text-sm">
                          <FormattedContent content={question.reply} />
                        </div>
                      </div>
                    ) : (
                      <p className="mt-3 text-xs text-muted-foreground">还没有回复</p>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </>
  );
}
