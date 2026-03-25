'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Bot, User, ChevronDown } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Button } from '@/components/ui/button';
import { type DashboardData } from '@/lib/data-service';
import { type Project } from '@/lib/schemas/project-schema';
import { type ExcelData, type HistoryEntry, getProjectsFromExcel, getBudgetFromExcel, getMilestonesFromExcel, getIssuesFromExcel } from '@/lib/excel-service';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

function MarkdownContent({ content, isUser }: { content: string; isUser: boolean }) {
  if (isUser) {
    return <span className="whitespace-pre-wrap">{content}</span>;
  }
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => <h1 className="text-base font-bold mt-3 mb-1 first:mt-0">{children}</h1>,
        h2: ({ children }) => <h2 className="text-sm font-bold mt-3 mb-1 first:mt-0">{children}</h2>,
        h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-0.5 first:mt-0">{children}</h3>,
        p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc list-outside pl-4 mb-2 space-y-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside pl-4 mb-2 space-y-0.5">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        code: ({ children, className }) => {
          const isBlock = className?.includes('language-');
          return isBlock
            ? <code className="block bg-gray-100 border border-gray-200 rounded-md px-3 py-2 text-xs font-mono whitespace-pre-wrap my-2">{children}</code>
            : <code className="bg-gray-100 text-teal-700 rounded px-1 py-0.5 text-xs font-mono">{children}</code>;
        },
        pre: ({ children }) => <pre className="my-2">{children}</pre>,
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-teal-400 pl-3 my-2 text-gray-600 italic">{children}</blockquote>
        ),
        table: ({ children }) => (
          <div className="overflow-x-auto my-2">
            <table className="text-xs border-collapse w-full">{children}</table>
          </div>
        ),
        thead: ({ children }) => <thead className="bg-gray-100">{children}</thead>,
        th: ({ children }) => <th className="border border-gray-200 px-2 py-1 font-semibold text-left text-gray-700">{children}</th>,
        td: ({ children }) => <td className="border border-gray-200 px-2 py-1 text-gray-700">{children}</td>,
        hr: () => <hr className="border-gray-200 my-2" />,
        a: ({ children, href }) => (
          <a href={href} className="text-teal-600 underline hover:text-teal-800" target="_blank" rel="noopener noreferrer">{children}</a>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}

interface AIChatPanelProps {
  dashboardData?: DashboardData | null;
  allProjects?: Project[];
  isPortfolio?: boolean;
  historicalSnapshots?: { entry: HistoryEntry; data: ExcelData }[];
}

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('no-NO', { day: '2-digit', month: '2-digit', year: '2-digit' });
  } catch { return iso; }
}

function buildContext(
  dashboardData: DashboardData | null | undefined,
  allProjects: Project[] | undefined,
  isPortfolio: boolean,
  historicalSnapshots: { entry: HistoryEntry; data: ExcelData }[] | undefined,
): string {
  const lines: string[] = [];

  // ── Current period ──────────────────────────────────────────────────────────
  if (isPortfolio && allProjects && allProjects.length > 0) {
    lines.push(`## Nåværende portefølje (${allProjects.length} prosjekter)`);
    for (const p of allProjects) {
      lines.push(
        `- **${p.project_name}** (${p.project_id}): Status=${p.overall_status}, Tid=${p.time_status}, Kost=${p.cost_status}, Kvalitet=${p.quality_status}, Leder=${p.project_manager}, Ferdigstillingsgrad=${p.completion_rate}%`
      );
    }
  }

  if (dashboardData) {
    const { project, budget, milestones, issues } = dashboardData;
    lines.push(`## Nåværende rapport: ${project.project_name} (${project.project_id})`);
    lines.push(`- Prosjektleder: ${project.project_manager}, Selskap: ${project.company}, Rapportdato: ${project.report_date}`);
    lines.push(`- Overordnet status: ${project.overall_status}`);
    lines.push(`- Tid: ${project.time_status} – ${project.time_comment}`);
    lines.push(`- Kost: ${project.cost_status} – ${project.cost_comment}`);
    lines.push(`- Kvalitet: ${project.quality_status} – ${project.quality_comment}`);
    lines.push(`- Ferdigstillingsgrad: ${project.completion_rate}%`);
    if (project.risk_comment) lines.push(`- Risiko: ${project.risk_comment}`);

    if (budget.length > 0) {
      lines.push(`\n### Budsjett`);
      for (const b of budget) {
        lines.push(`- ${b.budget_post}: Budsjett=${(b.budget_nok / 1e6).toFixed(1)} MNOK, Betalt=${(b.paid_nok / 1e6).toFixed(1)} MNOK, EAC=${(b.eac_nok / 1e6).toFixed(1)} MNOK`);
      }
    }
    if (milestones.length > 0) {
      lines.push(`\n### Milepæler`);
      for (const m of milestones) lines.push(`- M${m.milestone_nr} ${m.name}: Dato=${m.date}, Status=${m.status}`);
    }
    if (issues.length > 0) {
      lines.push(`\n### Saker`);
      for (const i of issues) lines.push(`- #${i.issue_nr} ${i.problem}: Ansvarlig=${i.responsible}, Frist=${i.deadline}`);
    }
  }

  // ── Historical snapshots ────────────────────────────────────────────────────
  if (historicalSnapshots && historicalSnapshots.length > 0) {
    lines.push(`\n---\n## Historiske rapporter (${historicalSnapshots.length} tidligere perioder)`);
    for (const { entry, data: snap } of historicalSnapshots) {
      lines.push(`\n### Rapport: ${entry.fileName} (${formatDate(entry.uploadedAt)})`);
      const projects = getProjectsFromExcel(snap);
      for (const p of projects) {
        lines.push(`- **${p.project_name}** (${p.project_id}): Status=${p.overall_status}, Tid=${p.time_status}, Kost=${p.cost_status}, Ferdigstillingsgrad=${p.completion_rate}%`);

        // Budget summary (only SUM line to save context space)
        const budget = getBudgetFromExcel(snap, p.project_id).filter(b => b.budget_post.toUpperCase().includes('SUM'));
        for (const b of budget) {
          lines.push(`  Budsjett total: ${(b.budget_nok / 1e6).toFixed(1)} MNOK, Betalt: ${(b.paid_nok / 1e6).toFixed(1)} MNOK, EAC: ${(b.eac_nok / 1e6).toFixed(1)} MNOK`);
        }

        // Issues
        const issues = getIssuesFromExcel(snap, p.project_id);
        if (issues.length > 0) {
          lines.push(`  Saker (${issues.length}): ${issues.map(i => i.problem.slice(0, 60)).join(' | ')}`);
        }
      }
    }
  }

  return lines.join('\n');
}

export function AIChatPanel({ dashboardData, allProjects, isPortfolio = false, historicalSnapshots }: AIChatPanelProps) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Focus input when panel opens
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  const sendMessage = useCallback(async () => {
    const text = input.trim();
    if (!text || streaming) return;

    const userMessage: Message = { role: 'user', content: text };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setError(null);
    setStreaming(true);

    const context = buildContext(dashboardData, allProjects, isPortfolio, historicalSnapshots);

    abortRef.current = new AbortController();

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: newMessages, context }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) {
        const text = await res.text();
        let message = `Server error ${res.status}`;
        try {
          const data = JSON.parse(text) as { error?: string };
          message = data.error ?? message;
        } catch {
          // response was not JSON (e.g. Next.js HTML error page)
          message = text.slice(0, 200) || message;
        }
        throw new Error(message);
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error('No response body');

      const decoder = new TextDecoder();
      let assistantContent = '';

      // Add placeholder for assistant message
      setMessages((prev) => [...prev, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        assistantContent += decoder.decode(value, { stream: true });
        setMessages((prev) => {
          const updated = [...prev];
          updated[updated.length - 1] = { role: 'assistant', content: assistantContent };
          return updated;
        });
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setError((err as Error).message);
      // Remove the empty assistant placeholder if something went wrong
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === 'assistant' && last.content === '') {
          return prev.slice(0, -1);
        }
        return prev;
      });
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  }, [input, streaming, messages, dashboardData, allProjects, isPortfolio, historicalSnapshots]);

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendMessage();
    }
  }

  function handleStop() {
    abortRef.current?.abort();
    setStreaming(false);
  }

  function handleClear() {
    setMessages([]);
    setError(null);
  }

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Lukk AI-chat' : 'Åpne AI-chat'}
        className="fixed bottom-6 right-6 z-50 w-13 h-13 rounded-full bg-teal-700 hover:bg-teal-600 text-white shadow-lg shadow-teal-900/40 flex items-center justify-center transition-all duration-200 hover:scale-105 active:scale-95"
        style={{ width: 52, height: 52 }}
      >
        {open ? <X className="w-5 h-5" /> : <MessageCircle className="w-5 h-5" />}
      </button>

      {/* Chat panel */}
      {open && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-2rem)] flex flex-col rounded-2xl shadow-2xl shadow-black/20 border border-gray-200 bg-white overflow-hidden"
          style={{ height: 520 }}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-teal-950 text-white shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-teal-600 flex items-center justify-center">
                <Bot className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-semibold leading-none">AI-assistent</p>
                <p className="text-[10px] text-teal-400/80 mt-0.5">Drevet av OpenAI</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {messages.length > 0 && (
                <button
                  onClick={handleClear}
                  className="text-teal-300 hover:text-white text-xs px-2 py-1 rounded hover:bg-teal-800 transition-colors"
                >
                  Tøm
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-teal-300 hover:text-white p-1 rounded hover:bg-teal-800 transition-colors"
                aria-label="Lukk"
              >
                <ChevronDown className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Messages */}
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gray-50"
          >
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center text-gray-400 gap-3">
                <Bot className="w-10 h-10 text-teal-300" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Hva kan jeg hjelpe deg med?</p>
                  <p className="text-xs mt-1">Spør om prosjektstatus, budsjett, milepæler eller risikoer.</p>
                </div>
                <div className="flex flex-wrap gap-2 justify-center mt-2">
                  {[
                    'Hva er prosjektstatus?',
                    'Vis budsjettavvik',
                    'Hva har endret seg siden forrige rapport?',
                    'Hvilke risikoer finnes?',
                    'Sammenlign ferdigstillingsgrad over tid',
                    'Oppsummer milepælene',
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      onClick={() => {
                        setInput(suggestion);
                        inputRef.current?.focus();
                      }}
                      className="text-xs bg-white border border-gray-200 text-gray-600 px-3 py-1.5 rounded-full hover:bg-teal-50 hover:border-teal-300 hover:text-teal-700 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center mt-0.5 ${
                  msg.role === 'user'
                    ? 'bg-teal-600 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
                </div>
                <div
                  className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-teal-700 text-white rounded-tr-sm leading-relaxed'
                      : 'bg-white text-gray-800 border border-gray-100 rounded-tl-sm shadow-sm'
                  }`}
                >
                  <MarkdownContent content={msg.content} isUser={msg.role === 'user'} />
                  {msg.role === 'assistant' && streaming && i === messages.length - 1 && (
                    <span className="inline-block w-1.5 h-4 bg-teal-500 ml-0.5 animate-pulse rounded-sm align-text-bottom" />
                  )}
                </div>
              </div>
            ))}

            {error && (
              <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}
          </div>

          {/* Input area */}
          <div className="shrink-0 border-t border-gray-100 bg-white px-3 py-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                placeholder="Skriv en melding… (Enter for å sende)"
                className="flex-1 resize-none text-sm text-gray-800 placeholder-gray-400 outline-none border border-gray-200 rounded-xl px-3 py-2 focus:border-teal-400 focus:ring-1 focus:ring-teal-200 transition-all min-h-[38px] max-h-24 overflow-y-auto"
                style={{ fieldSizing: 'content' } as React.CSSProperties}
                disabled={streaming}
              />
              {streaming ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleStop}
                  className="shrink-0 h-[38px] px-3 text-red-500 border-red-200 hover:bg-red-50"
                >
                  Stop
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={!input.trim()}
                  onClick={() => void sendMessage()}
                  className="shrink-0 h-[38px] px-3 bg-teal-700 hover:bg-teal-600 text-white"
                >
                  <Send className="w-3.5 h-3.5" />
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
