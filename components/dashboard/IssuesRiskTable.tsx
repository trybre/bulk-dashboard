'use client';

import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronUp, AlertCircle, FileText, Pencil, Check, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { type Issue } from '@/lib/schemas/issue-schema';
import { type Project } from '@/lib/schemas/project-schema';

interface IssuesRiskTableProps {
  issues: Issue[];
  project: Project;
}

function formatDeadline(deadline: string): string {
  if (deadline.toUpperCase() === 'ASAP') return 'ASAP';
  try {
    return new Date(deadline).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return deadline;
  }
}

function isOverdue(deadline: string): boolean {
  if (deadline.toUpperCase() === 'ASAP') return true;
  try {
    return new Date(deadline).getTime() < Date.now();
  } catch {
    return false;
  }
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function avatarColor(name: string): string {
  const colors = [
    'bg-teal-100 text-teal-700',
    'bg-violet-100 text-violet-700',
    'bg-emerald-100 text-emerald-700',
    'bg-rose-100 text-rose-700',
    'bg-amber-100 text-amber-700',
    'bg-cyan-100 text-cyan-700',
  ];
  let sum = 0;
  for (const c of name) sum += c.charCodeAt(0);
  return colors[sum % colors.length];
}

function RiskEditor({ projectId, initialText }: { projectId: string; initialText: string }) {
  const storageKey = `risk_comment_${projectId}`;
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(storageKey) ?? initialText;
    }
    return initialText;
  });
  const [draft, setDraft] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored !== null) setText(stored);
  }, [storageKey]);

  function startEdit() {
    setDraft(text);
    setEditing(true);
    setTimeout(() => textareaRef.current?.focus(), 0);
  }

  function save() {
    setText(draft);
    localStorage.setItem(storageKey, draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(text);
    setEditing(false);
  }

  const bullets = text
    .split(/\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);

  return (
    <div className="relative group">
      {!editing && (
        <button
          onClick={startEdit}
          className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md bg-teal-50 border border-teal-200 text-teal-600 hover:bg-teal-100"
          title="Rediger"
        >
          <Pencil className="w-3 h-3" />
        </button>
      )}

      {editing ? (
        <div className="p-3">
          <textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            className="w-full text-xs text-gray-700 leading-relaxed border border-teal-300 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-teal-400 bg-white"
            rows={8}
            placeholder="Skriv risiko og utfordringer, én per linje..."
          />
          <div className="flex gap-2 mt-2 justify-end">
            <button
              onClick={cancel}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md border border-gray-200 text-gray-500 hover:bg-gray-50"
            >
              <X className="w-3 h-3" /> Avbryt
            </button>
            <button
              onClick={save}
              className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-md bg-teal-700 text-white hover:bg-teal-800"
            >
              <Check className="w-3 h-3" /> Lagre
            </button>
          </div>
        </div>
      ) : (
        <ul className="space-y-2 p-4">
          {bullets.length === 0 ? (
            <li className="text-xs text-gray-400 italic">Klikk blyant-ikonet for å legge til risiko og utfordringer.</li>
          ) : (
            bullets.map((b, i) => (
              <li key={i} className="flex gap-2 text-xs text-gray-600 leading-relaxed">
                <span className="text-teal-600 font-bold shrink-0 mt-0.5">›</span>
                <span>{b}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}

export function IssuesRiskTable({ issues: rawIssues, project }: IssuesRiskTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const issues = [...rawIssues].sort((a, b) => a.issue_nr - b.issue_nr);
  const overdueCount = issues.filter((i) => isOverdue(i.deadline)).length;

  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Left: Risk & Challenges */}
      <Card className="shadow-sm border-teal-100 overflow-hidden">
        <div className="bg-teal-700 text-white px-4 py-1.5">
          <p className="text-[10px] font-bold uppercase tracking-wide">Risk &amp; Challenges Upcoming Months</p>
        </div>
        <CardContent className="p-0">
          <RiskEditor projectId={project.project_id} initialText={project.risk_comment ?? ''} />
        </CardContent>
      </Card>

      {/* Right: Issues register */}
      <Card className="shadow-sm border-teal-100 overflow-hidden">
        <div className="bg-teal-700 text-white px-4 py-1.5 flex items-center justify-between">
          <p className="text-[10px] font-bold uppercase tracking-wide">Issues Register</p>
          <div className="flex items-center gap-2">
            <Badge className="bg-teal-600 text-white border-teal-500 text-[9px] px-1.5 h-4">
              {issues.length} issues
            </Badge>
            {overdueCount > 0 && (
              <Badge className="bg-red-500 text-white border-red-400 text-[9px] px-1.5 h-4 gap-0.5">
                <AlertCircle className="w-2.5 h-2.5" />
                {overdueCount} overdue
              </Badge>
            )}
          </div>
        </div>
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50 hover:bg-gray-50">
              <TableHead className="text-xs w-10 text-gray-500">#</TableHead>
              <TableHead className="text-xs text-gray-500">Problem</TableHead>
              <TableHead className="text-xs text-gray-500 w-24">Responsible</TableHead>
              <TableHead className="text-xs text-gray-500 w-24">Deadline</TableHead>
              <TableHead className="w-6" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue) => {
              const expanded = expandedId === issue.issue_nr;
              const overdue = isOverdue(issue.deadline);
              const aColor = avatarColor(issue.responsible);

              return (
                <React.Fragment key={issue.issue_nr}>
                  <TableRow
                    onClick={() => setExpandedId(expanded ? null : issue.issue_nr)}
                    className={`cursor-pointer transition-colors ${
                      expanded ? 'bg-teal-50/40 hover:bg-teal-50/40' : 'hover:bg-gray-50/70'
                    } ${overdue ? 'border-l-2 border-l-red-400' : ''}`}
                  >
                    <TableCell>
                      <span className="text-xs font-bold text-gray-300 tabular-nums">#{issue.issue_nr}</span>
                    </TableCell>
                    <TableCell className="max-w-xs">
                      <p className={`text-xs font-medium leading-snug ${expanded ? '' : 'line-clamp-1'} text-gray-900`}>
                        {issue.problem}
                      </p>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <Avatar size="sm" className="shrink-0">
                          <AvatarFallback className={`text-[9px] font-bold ${aColor}`}>
                            {getInitials(issue.responsible)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-gray-700 font-medium">{issue.responsible}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {overdue ? (
                        <Badge variant="outline" className="gap-1 text-[10px] font-semibold bg-red-50 text-red-700 border-red-200">
                          <AlertCircle className="w-2.5 h-2.5" />
                          {formatDeadline(issue.deadline)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-500 tabular-nums">{formatDeadline(issue.deadline)}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {expanded ? (
                        <ChevronUp className="w-3.5 h-3.5 text-teal-500" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 text-gray-300" />
                      )}
                    </TableCell>
                  </TableRow>

                  {expanded && (
                    <TableRow key={`${issue.issue_nr}-detail`} className="bg-teal-50/20 hover:bg-teal-50/20">
                      <TableCell />
                      <TableCell colSpan={4} className="py-4 pr-4">
                        <div className="space-y-3">
                          <div>
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <FileText className="w-3 h-3 text-gray-400" />
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Problem</p>
                            </div>
                            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line bg-white rounded p-2.5 border border-gray-100">
                              {issue.problem}
                            </p>
                          </div>
                          {issue.handling_plan && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-1.5">
                                <FileText className="w-3 h-3 text-teal-400" />
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Action Plan</p>
                              </div>
                              <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-line bg-white rounded p-2.5 border border-teal-100">
                                {issue.handling_plan}
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
