import React from "react";

interface ActivityHeatmapProps {
  activityByDay: Record<string, number>;
}

const WEEKS = 16;
const DAYS = 7;

function getDateGrid(): string[][] {
  // Build a WEEKS×DAYS grid of ISO date strings, ending today, starting on Monday
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find the most recent Sunday (end of last complete week column)
  const dayOfWeek = today.getDay(); // 0=Sun
  const endDate = new Date(today);
  endDate.setDate(today.getDate() + (6 - dayOfWeek)); // end on Saturday of current week

  const grid: string[][] = [];
  for (let w = WEEKS - 1; w >= 0; w--) {
    const week: string[] = [];
    for (let d = 0; d < DAYS; d++) {
      const date = new Date(endDate);
      date.setDate(endDate.getDate() - w * 7 - (6 - d));
      week.push(date.toISOString().slice(0, 10));
    }
    grid.push(week);
  }
  return grid;
}

function getMonthLabels(grid: string[][]): { label: string; col: number }[] {
  const labels: { label: string; col: number }[] = [];
  let lastMonth = "";
  grid.forEach((week, col) => {
    const month = week[0].slice(0, 7); // YYYY-MM
    if (month !== lastMonth) {
      labels.push({
        label: new Date(week[0] + "T12:00:00").toLocaleString("default", { month: "short" }),
        col,
      });
      lastMonth = month;
    }
  });
  return labels;
}

function cellColor(count: number): string {
  if (count === 0) return "bg-muted/30";
  if (count === 1) return "bg-primary/30";
  if (count === 2) return "bg-primary/55";
  if (count <= 4) return "bg-primary/75";
  return "bg-primary";
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function ActivityHeatmap({ activityByDay }: ActivityHeatmapProps) {
  const grid = getDateGrid();
  const monthLabels = getMonthLabels(grid);
  const today = new Date().toISOString().slice(0, 10);

  const totalSyncs = Object.values(activityByDay).reduce((s, n) => s + n, 0);
  const activeDays = Object.keys(activityByDay).length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs font-mono text-muted-foreground uppercase tracking-widest">
          Reading activity · last 16 weeks
        </p>
        <p className="text-[10px] font-mono text-muted-foreground">
          {activeDays} active days · {totalSyncs} syncs
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-block min-w-full">
          {/* Month labels */}
          <div className="flex mb-1 ml-7">
            {grid.map((_, col) => {
              const label = monthLabels.find((m) => m.col === col);
              return (
                <div key={col} className="w-3.5 shrink-0 mr-0.5">
                  {label && (
                    <span className="text-[9px] font-mono text-muted-foreground/60 whitespace-nowrap">
                      {label.label}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div className="flex gap-0.5">
            {/* Day labels */}
            <div className="flex flex-col gap-0.5 mr-1">
              {DAY_LABELS.map((d, i) => (
                <div key={d} className="h-3 flex items-center">
                  {i % 2 === 1 && (
                    <span className="text-[9px] font-mono text-muted-foreground/50 w-6 text-right pr-1">
                      {d.slice(0, 1)}
                    </span>
                  )}
                  {i % 2 === 0 && <span className="w-6" />}
                </div>
              ))}
            </div>

            {/* Cells */}
            {grid.map((week, col) => (
              <div key={col} className="flex flex-col gap-0.5">
                {week.map((date, row) => {
                  const count = activityByDay[date] || 0;
                  const isToday = date === today;
                  return (
                    <div
                      key={row}
                      title={`${date}: ${count} sync${count !== 1 ? "s" : ""}`}
                      className={`w-3 h-3 rounded-[2px] transition-colors ${cellColor(count)} ${
                        isToday ? "ring-1 ring-primary ring-offset-1 ring-offset-background" : ""
                      }`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 mt-2 ml-7">
            <span className="text-[9px] font-mono text-muted-foreground/50">Less</span>
            {[0, 1, 2, 3, 5].map((n) => (
              <div key={n} className={`w-3 h-3 rounded-[2px] ${cellColor(n)}`} />
            ))}
            <span className="text-[9px] font-mono text-muted-foreground/50">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
