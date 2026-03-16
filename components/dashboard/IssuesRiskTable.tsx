'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, ArrowUpDown, AlertTriangle, AlertCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { type Issue } from '@/lib/schemas/issue-schema';

interface IssuesRiskTableProps {
  issues: Issue[];
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

// Pick a consistent color from initials
function avatarColor(name: string): string {
  const colors = [
    'bg-blue-100 text-blue-700',
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

type SortField = 'nr' | 'responsible' | 'deadline';

export function IssuesRiskTable({ issues: rawIssues }: IssuesRiskTableProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<SortField>('nr');

  const issues = [...rawIssues].sort((a, b) => {
    if (sortBy === 'nr') return a.issue_nr - b.issue_nr;
    if (sortBy === 'responsible') return a.responsible.localeCompare(b.responsible);
    if (sortBy === 'deadline') {
      const aAsap = a.deadline.toUpperCase() === 'ASAP';
      const bAsap = b.deadline.toUpperCase() === 'ASAP';
      if (aAsap && bAsap) return 0;
      if (aAsap) return -1;
      if (bAsap) return 1;
      return new Date(a.deadline).getTime() - new Date(b.deadline).getTime();
    }
    return 0;
  });

  const overdueCount = issues.filter((i) => isOverdue(i.deadline)).length;

  function SortBtn({ field, label }: { field: SortField; label: string }) {
    const active = sortBy === field;
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setSortBy(field)}
        className={`h-7 px-2 text-xs font-semibold uppercase tracking-wider gap-1 ${
          active ? 'text-blue-600 bg-blue-50 hover:bg-blue-50' : 'text-gray-400 hover:text-gray-700'
        }`}
      >
        {label}
        <ArrowUpDown className="w-3 h-3" />
      </Button>
    );
  }

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <h2 className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
          Issues &amp; Risk Register
        </h2>
        <Separator className="flex-1" />
        <Badge variant="secondary" className="font-bold text-xs rounded-full px-2.5">
          {issues.length} issues
        </Badge>
        {overdueCount > 0 && (
          <Badge
            variant="outline"
            className="gap-1 font-bold text-xs rounded-full bg-red-50 text-red-700 border-red-200"
          >
            <AlertCircle className="w-3 h-3" />
            {overdueCount} overdue
          </Badge>
        )}
      </div>

      {/* Overdue alert banner */}
      {overdueCount > 0 && (
        <Alert variant="destructive" className="mb-4 border-red-200 bg-red-50 text-red-800">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertTitle className="text-red-800 font-semibold">Attention required</AlertTitle>
          <AlertDescription className="text-red-700">
            {overdueCount} issue{overdueCount > 1 ? 's are' : ' is'} past their deadline or marked ASAP.
          </AlertDescription>
        </Alert>
      )}

      <Card className="shadow-sm border-gray-100 overflow-hidden">
        {/* Table header with sort controls */}
        <CardHeader className="px-5 py-3 bg-gray-50 border-b border-gray-100">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-gray-400 mr-2 font-semibold uppercase tracking-wider">Sort:</span>
            <SortBtn field="nr" label="Nr" />
            <SortBtn field="responsible" label="Responsible" />
            <SortBtn field="deadline" label="Deadline" />
          </div>
        </CardHeader>

        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs w-12 text-gray-500">#</TableHead>
              <TableHead className="text-xs text-gray-500">Problem</TableHead>
              <TableHead className="text-xs text-gray-500 w-36">Responsible</TableHead>
              <TableHead className="text-xs text-gray-500 w-36">Deadline</TableHead>
              <TableHead className="w-8" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {issues.map((issue) => {
              const expanded = expandedId === issue.issue_nr;
              const overdue = isOverdue(issue.deadline);
              const aColor = avatarColor(issue.responsible);

              return (
                <>
                  <TableRow
                    key={issue.issue_nr}
                    onClick={() => setExpandedId(expanded ? null : issue.issue_nr)}
                    className={`cursor-pointer transition-colors ${
                      expanded ? 'bg-blue-50/40 hover:bg-blue-50/40' : 'hover:bg-gray-50/70'
                    } ${overdue ? 'border-l-2 border-l-red-400' : ''}`}
                  >
                    <TableCell>
                      <span className="text-xs font-bold text-gray-300 tabular-nums">
                        #{issue.issue_nr}
                      </span>
                    </TableCell>

                    <TableCell className="max-w-xs">
                      <p className={`text-sm font-medium leading-snug ${expanded ? '' : 'line-clamp-1'} text-gray-900`}>
                        {issue.problem}
                      </p>
                    </TableCell>

                    <TableCell>
                      <div className="flex items-center gap-2">
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
                        <Badge
                          variant="outline"
                          className="gap-1 text-xs font-semibold bg-red-50 text-red-700 border-red-200"
                        >
                          <AlertCircle className="w-3 h-3" />
                          {formatDeadline(issue.deadline)}
                        </Badge>
                      ) : (
                        <span className="text-xs text-gray-500 tabular-nums">
                          {formatDeadline(issue.deadline)}
                        </span>
                      )}
                    </TableCell>

                    <TableCell>
                      {expanded ? (
                        <ChevronUp className="w-4 h-4 text-blue-500" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-300" />
                      )}
                    </TableCell>
                  </TableRow>

                  {expanded && (
                    <TableRow key={`${issue.issue_nr}-detail`} className="bg-blue-50/30 hover:bg-blue-50/30">
                      <TableCell />
                      <TableCell colSpan={4} className="py-5 pr-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          <div>
                            <div className="flex items-center gap-1.5 mb-2">
                              <FileText className="w-3.5 h-3.5 text-gray-400" />
                              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                Problem Description
                              </p>
                            </div>
                            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-white rounded-lg p-3 border border-gray-100 shadow-xs">
                              {issue.problem}
                            </p>
                          </div>
                          {issue.handling_plan && (
                            <div>
                              <div className="flex items-center gap-1.5 mb-2">
                                <FileText className="w-3.5 h-3.5 text-blue-400" />
                                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                  Action Plan / Updates
                                </p>
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-line bg-white rounded-lg p-3 border border-blue-100 shadow-xs">
                                {issue.handling_plan}
                              </p>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </Card>
    </section>
  );
}
