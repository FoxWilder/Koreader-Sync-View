import React, { useState } from "react";
import { useLocation } from "wouter";
import { useGetStats } from "@workspace/api-client-react";
import { ArrowLeft, BookOpen, Activity, ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DOW_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** All days in a given month as ISO strings */
function daysInMonth(year: number, month: number): string[] {
  const days: string[] = [];
  const d = new Date(year, month, 1);
  while (d.getMonth() === month) {
    days.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

function barColor(count: number): string {
  if (count === 0) return "bg-muted/20";
  if (count === 1) return "bg-primary/30";
  if (count === 2) return "bg-primary/50";
  if (count <= 4) return "bg-primary/70";
  return "bg-primary";
}

function barHeight(count: number, max: number): number {
  if (count === 0 || max === 0) return 0;
  return Math.max(12, Math.round((count / max) * 100));
}

interface MonthStripProps {
  year: number;
  month: number;
  activityByDay: Record<string, number>;
  today: string;
}

function MonthStrip({ year, month, activityByDay, today }: MonthStripProps) {
  const days = daysInMonth(year, month);
  const maxCount = Math.max(1, ...days.map((d) => activityByDay[d] ?? 0));
  const totalSyncs = days.reduce((s, d) => s + (activityByDay[d] ?? 0), 0);
  const activeDays = days.filter((d) => (activityByDay[d] ?? 0) > 0).length;

  return (
    <Card className="bg-card/40 border-border/50 backdrop-blur-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-mono font-semibold text-foreground">
            {MONTH_NAMES[month]} {year}
          </h3>
          <div className="flex items-center gap-3">
            {activeDays > 0 ? (
              <>
                <Badge variant="outline" className="font-mono text-[9px] text-primary border-primary/30">
                  {activeDays} active days
                </Badge>
                <Badge variant="outline" className="font-mono text-[9px] text-muted-foreground">
                  {totalSyncs} syncs
                </Badge>
              </>
            ) : (
              <span className="text-[10px] font-mono text-muted-foreground/40 italic">No activity</span>
            )}
          </div>
        </div>

        <div className="flex items-end gap-[3px] h-[90px]">
          {days.map((date) => {
            const count = activityByDay[date] ?? 0;
            const d = new Date(date + "T12:00:00");
            const dow = d.getDay();
            const dayNum = d.getDate();
            const isToday = date === today;
            const h = barHeight(count, maxCount);

            return (
              <div key={date} className="flex flex-col items-center gap-0.5 flex-1 min-w-0">
                <div className="flex-1 w-full flex items-end">
                  <div
                    className={`w-full rounded-t-[2px] transition-all ${barColor(count)} ${
                      isToday ? "ring-1 ring-primary ring-offset-1 ring-offset-background" : ""
                    }`}
                    style={{ height: count === 0 ? "3px" : `${h}%` }}
                    title={`${date}: ${count} sync${count !== 1 ? "s" : ""}`}
                  />
                </div>
                <div className="flex flex-col items-center leading-none">
                  <span className={`text-[7px] font-mono ${isToday ? "text-primary font-bold" : "text-muted-foreground/40"}`}>
                    {DOW_SHORT[dow]}
                  </span>
                  <span className={`text-[7px] font-mono ${isToday ? "text-primary font-bold" : "text-muted-foreground/30"}`}>
                    {dayNum}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function ActivityPage() {
  const [, navigate] = useLocation();
  const { data: stats, isLoading } = useGetStats({
    query: { queryKey: ["stats"] },
  });

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);

  // Show last 6 months by default, paginate by 3
  const [offset, setOffset] = useState(0); // 0 = most recent
  const MONTHS_PER_PAGE = 6;

  // Build list of months to show (most recent first)
  const months: { year: number; month: number }[] = [];
  for (let i = 0; i < 24; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({ year: d.getFullYear(), month: d.getMonth() });
  }

  const visibleMonths = months.slice(offset, offset + MONTHS_PER_PAGE);
  const activityByDay = stats?.activity_by_day ?? {};

  // Overall stats
  const allDays = Object.keys(activityByDay);
  const totalSyncs = Object.values(activityByDay).reduce((s, n) => s + n, 0);
  const activeDays = allDays.length;
  const streak = (() => {
    let s = 0;
    const d = new Date(today);
    while (true) {
      const key = d.toISOString().slice(0, 10);
      if ((activityByDay[key] ?? 0) === 0) break;
      s++;
      d.setDate(d.getDate() - 1);
    }
    return s;
  })();

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-border/50 bg-background/90 backdrop-blur-md px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
          <div className="w-px h-4 bg-border/50" />
          <h1 className="text-sm font-mono text-primary tracking-widest uppercase flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Reading Activity
          </h1>
        </div>

        {/* Summary badges */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px] border-primary/30 text-primary">
            {activeDays} active days
          </Badge>
          <Badge variant="outline" className="font-mono text-[10px]">
            {totalSyncs} total syncs
          </Badge>
          {streak > 0 && (
            <Badge className="font-mono text-[10px] bg-teal-500/20 text-teal-400 border-teal-500/30">
              🔥 {streak}-day streak
            </Badge>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 max-w-6xl mx-auto w-full">
        {isLoading ? (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            <Activity className="w-6 h-6 animate-pulse text-primary mr-3" />
            <span className="font-mono text-sm uppercase tracking-wider">Loading activity…</span>
          </div>
        ) : (
          <>
            {/* Month grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mb-6">
              {visibleMonths.map(({ year, month }) => (
                <MonthStrip
                  key={`${year}-${month}`}
                  year={year}
                  month={month}
                  activityByDay={activityByDay}
                  today={todayStr}
                />
              ))}
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => setOffset(Math.max(0, offset - MONTHS_PER_PAGE))}
                disabled={offset === 0}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                Newer
              </button>
              <span className="text-[10px] font-mono text-muted-foreground">
                {MONTH_SHORT[visibleMonths[visibleMonths.length - 1]?.month ?? 0]}{" "}
                {visibleMonths[visibleMonths.length - 1]?.year} –{" "}
                {MONTH_SHORT[visibleMonths[0]?.month ?? 0]} {visibleMonths[0]?.year}
              </span>
              <button
                onClick={() => setOffset(Math.min(months.length - MONTHS_PER_PAGE, offset + MONTHS_PER_PAGE))}
                disabled={offset + MONTHS_PER_PAGE >= months.length}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border/50 font-mono text-xs text-muted-foreground hover:text-foreground hover:border-border disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                Older
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
