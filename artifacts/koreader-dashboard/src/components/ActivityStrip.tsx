import React from "react";
import { useLocation } from "wouter";
import { ChevronRight, BookOpen } from "lucide-react";

interface ActivityStripProps {
  activityByDay: Record<string, number>;
}

/** Returns last N days as ISO date strings, oldest first */
function lastNDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

const DOW_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTH_SHORT = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

function barHeight(count: number, max: number): number {
  if (count === 0 || max === 0) return 0;
  return Math.max(15, Math.round((count / max) * 100));
}

function barColor(count: number): string {
  if (count === 0) return "bg-muted/20";
  if (count === 1) return "bg-primary/30";
  if (count === 2) return "bg-primary/50";
  if (count <= 4) return "bg-primary/70";
  return "bg-primary";
}

export function ActivityStrip({ activityByDay }: ActivityStripProps) {
  const [, navigate] = useLocation();
  const days = lastNDays(30);
  const today = new Date().toISOString().slice(0, 10);
  const maxCount = Math.max(1, ...days.map((d) => activityByDay[d] ?? 0));

  const totalSyncs = days.reduce((s, d) => s + (activityByDay[d] ?? 0), 0);
  const activeDays = days.filter((d) => (activityByDay[d] ?? 0) > 0).length;

  return (
    <div
      className="rounded-xl border border-border/50 bg-card/40 backdrop-blur-sm p-4 cursor-pointer hover:border-primary/40 transition-colors group"
      onClick={() => navigate("/activity")}
      title="Click to see full reading activity"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <BookOpen className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
            Reading activity · last 30 days
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-mono text-muted-foreground">
            {activeDays} active · {totalSyncs} syncs
          </span>
          <span className="flex items-center gap-0.5 text-[10px] font-mono text-primary/60 group-hover:text-primary transition-colors">
            Full history <ChevronRight className="w-3 h-3" />
          </span>
        </div>
      </div>

      {/* Day columns */}
      <div className="flex items-end gap-[3px] h-[80px]">
        {days.map((date, i) => {
          const count = activityByDay[date] ?? 0;
          const d = new Date(date + "T12:00:00");
          const dow = d.getDay();
          const dayNum = d.getDate();
          const isToday = date === today;

          // Detect month crossover: first day of month or first day in our array
          const prevDate = i > 0 ? days[i - 1] : null;
          const isMonthStart = dayNum === 1 || (prevDate && new Date(prevDate + "T12:00:00").getMonth() !== d.getMonth());

          const h = barHeight(count, maxCount);

          return (
            <div key={date} className="flex flex-col items-center gap-0.5 flex-1 min-w-0 relative">
              {/* Month label at crossover */}
              {isMonthStart && (
                <div className="absolute -top-5 left-0 right-0 flex justify-center">
                  <span className="text-[8px] font-mono text-primary/70 whitespace-nowrap bg-card/80 px-0.5 rounded">
                    {MONTH_SHORT[d.getMonth()]}
                  </span>
                </div>
              )}
              {/* Month crossover line */}
              {isMonthStart && i > 0 && (
                <div className="absolute inset-y-0 -left-[2px] w-px bg-primary/20" />
              )}

              {/* Bar */}
              <div className="flex-1 w-full flex items-end">
                <div
                  className={`w-full rounded-t-[2px] transition-all ${barColor(count)} ${isToday ? "ring-1 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                  style={{ height: count === 0 ? "3px" : `${h}%` }}
                  title={`${date}: ${count} sync${count !== 1 ? "s" : ""}`}
                />
              </div>

              {/* Day label: dow abbrev + date number */}
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
    </div>
  );
}
