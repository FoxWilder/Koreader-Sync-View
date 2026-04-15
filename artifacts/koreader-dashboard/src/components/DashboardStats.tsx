import React, { useState } from "react";
import { useGetStats, StatsResponse, BookCard as BookCardType, UserStat } from "@workspace/api-client-react";
import { Card, CardContent } from "./ui/card";
import { BookCard } from "./BookCard";
import { ActivityStrip } from "./ActivityStrip";
import { Badge } from "./ui/badge";
import {
  CheckCircle, Clock, Users, Activity, Target, User,
  ArrowLeft, X, BookOpen, Smartphone, Calendar,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

// ---------------------------------------------------------------------------
// Types for drill-down panels
// ---------------------------------------------------------------------------
type DrillDown =
  | { kind: "in_progress" }
  | { kind: "completed" }
  | { kind: "user"; user: UserStat };

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export function DashboardStats() {
  const { data: stats, isLoading, isError } = useGetStats({
    query: { refetchInterval: 4000, queryKey: ["stats"] },
  });
  const [drillDown, setDrillDown] = useState<DrillDown | null>(null);

  if (isLoading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground bg-background/50">
        <Activity className="w-8 h-8 animate-pulse text-primary mb-4" />
        <span className="font-mono text-sm uppercase tracking-wider">Syncing telemetry...</span>
      </div>
    );
  }

  if (isError || !stats) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive bg-background/50">
        <span className="font-mono text-sm uppercase">Failed to connect to KOReader database.</span>
      </div>
    );
  }

  // Drill-down: show filtered book list
  if (drillDown) {
    return (
      <DrillDownPanel
        drillDown={drillDown}
        stats={stats}
        onClose={() => setDrillDown(null)}
      />
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background/50">
      {/* Sticky header */}
      <div className="p-6 pb-4 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10 flex justify-between items-center">
        <h2 className="text-sm font-mono text-primary tracking-widest uppercase flex items-center gap-2">
          <Activity className="w-4 h-4" /> Telemetry Overview
        </h2>
        {stats.last_activity_iso && (
          <Badge variant="outline" className="font-mono text-[10px] bg-card border-primary/30 text-primary">
            LAST SYNC: {formatDistanceToNow(parseISO(stats.last_activity_iso), { addSuffix: true }).toUpperCase()}
          </Badge>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        {/* KPI Cards — clickable */}
        <div>
          <p className="text-[10px] font-mono text-muted-foreground/50 uppercase tracking-widest mb-3">
            Click a card to explore
          </p>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              title="In Progress"
              value={stats.in_progress}
              icon={<Clock className="w-5 h-5 text-primary" />}
              onClick={() => setDrillDown({ kind: "in_progress" })}
              accent="primary"
            />
            <KpiCard
              title="Completed"
              value={stats.completed}
              icon={<CheckCircle className="w-5 h-5 text-teal-400" />}
              onClick={() => setDrillDown({ kind: "completed" })}
              accent="teal"
            />
            <KpiCard
              title="Avg Progress"
              value={`${Math.round(stats.avg_progress)}%`}
              icon={<Target className="w-5 h-5 text-blue-400" />}
              accent="blue"
            />
            <KpiCard
              title="Active Users"
              value={stats.users}
              icon={<Users className="w-5 h-5 text-purple-400" />}
              accent="purple"
            />
          </div>
        </div>

        {/* Active Users — each card clickable */}
        {stats.users_breakdown && stats.users_breakdown.length > 0 && (
          <div>
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4 border-b border-border/50 pb-2">
              Active Users
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.users_breakdown.map((user) => (
                <UserCard
                  key={user.user}
                  user={user}
                  onClick={() => setDrillDown({ kind: "user", user })}
                />
              ))}
            </div>
          </div>
        )}

        {/* 30-day activity strip */}
        {stats.activity_by_day && (
          <div>
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4 border-b border-border/50 pb-2">
              Reading Activity
            </h3>
            <ActivityStrip activityByDay={stats.activity_by_day} />
          </div>
        )}

        {/* Recent Activity */}
        {stats.top_recent && stats.top_recent.length > 0 && (
          <div>
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4 border-b border-border/50 pb-2">
              Recent Activity
            </h3>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {stats.top_recent.map((book) => (
                <BookCard key={book.md5} book={book} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Drill-down panel
// ---------------------------------------------------------------------------
interface DrillDownPanelProps {
  drillDown: DrillDown;
  stats: StatsResponse;
  onClose: () => void;
}

function DrillDownPanel({ drillDown, stats, onClose }: DrillDownPanelProps) {
  let title = "";
  let books: BookCardType[] = [];
  let meta: React.ReactNode = null;

  if (drillDown.kind === "in_progress") {
    title = "In Progress";
    books = (stats.top_recent ?? []).filter(
      (b) => b.last_progress > 0 && b.last_progress < 99.5
    );
    meta = (
      <span className="text-[10px] font-mono text-muted-foreground">
        {stats.in_progress} books currently being read
      </span>
    );
  } else if (drillDown.kind === "completed") {
    title = "Completed";
    books = (stats.top_recent ?? []).filter((b) => b.last_progress >= 99.5);
    meta = (
      <span className="text-[10px] font-mono text-muted-foreground">
        {stats.completed} books finished
      </span>
    );
  } else if (drillDown.kind === "user") {
    const u = drillDown.user;
    title = u.user;
    books = (stats.top_recent ?? []).filter((b) => b.last_user === u.user);
    meta = (
      <div className="flex items-center gap-3">
        <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <BookOpen className="w-3 h-3" /> {u.books} books
        </span>
        <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
          <Smartphone className="w-3 h-3" /> {u.devices.join(", ")}
        </span>
        {u.last_iso && (
          <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground">
            <Calendar className="w-3 h-3" />
            {formatDistanceToNow(parseISO(u.last_iso), { addSuffix: true })}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background/50">
      {/* Header */}
      <div className="p-6 pb-4 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors font-mono text-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              Overview
            </button>
            <div className="w-px h-4 bg-border/50" />
            <h2 className="text-sm font-mono text-primary tracking-widest uppercase flex items-center gap-2">
              {drillDown.kind === "user" ? (
                <User className="w-4 h-4" />
              ) : drillDown.kind === "completed" ? (
                <CheckCircle className="w-4 h-4" />
              ) : (
                <Clock className="w-4 h-4" />
              )}
              {title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        {meta && <div className="mt-2 ml-[calc(1rem+6px+0.75rem+1px+0.75rem)]">{meta}</div>}
      </div>

      {/* Book list */}
      <div className="flex-1 overflow-y-auto p-6">
        {books.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3 border border-dashed border-border/40 rounded-xl">
            <BookOpen className="w-8 h-8 opacity-20" />
            <p className="font-mono text-xs uppercase tracking-wider">No books to show</p>
            <p className="text-xs text-muted-foreground/50">
              {drillDown.kind === "user"
                ? "This user has no recent activity in the top list."
                : "No books match this filter in recent activity."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {books.map((book) => (
              <BookCard key={book.md5} book={book} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
interface KpiCardProps {
  title: string;
  value: React.ReactNode;
  icon: React.ReactNode;
  onClick?: () => void;
  accent?: "primary" | "teal" | "blue" | "purple";
}

function KpiCard({ title, value, icon, onClick, accent = "primary" }: KpiCardProps) {
  const accentRing: Record<string, string> = {
    primary: "hover:border-primary/50 hover:shadow-primary/10",
    teal:    "hover:border-teal-500/50 hover:shadow-teal-500/10",
    blue:    "hover:border-blue-500/50 hover:shadow-blue-500/10",
    purple:  "hover:border-purple-500/50 hover:shadow-purple-500/10",
  };

  return (
    <Card
      className={`bg-card/40 border-border/50 backdrop-blur-sm transition-all shadow-sm ${
        onClick ? `cursor-pointer ${accentRing[accent]} hover:shadow-md` : ""
      }`}
      onClick={onClick}
    >
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
          <p className="text-3xl font-light font-mono text-foreground">{value}</p>
          {onClick && (
            <p className="text-[9px] font-mono text-muted-foreground/40 mt-1 uppercase tracking-wider">
              Click to explore →
            </p>
          )}
        </div>
        <div className="p-2 bg-background rounded-lg border border-border/50">{icon}</div>
      </CardContent>
    </Card>
  );
}

function UserCard({ user, onClick }: { user: UserStat; onClick: () => void }) {
  let lastStr = "";
  try {
    if (user.last_iso) {
      lastStr = formatDistanceToNow(parseISO(user.last_iso), { addSuffix: true });
    }
  } catch { /* ignore */ }

  return (
    <Card
      className="bg-card/40 border-border/50 backdrop-blur-sm cursor-pointer hover:border-primary/50 hover:shadow-primary/10 hover:shadow-md transition-all"
      onClick={onClick}
    >
      <CardContent className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30 shrink-0">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div>
            <div className="font-bold text-sm">{user.user}</div>
            <div className="text-[10px] font-mono text-muted-foreground">
              {user.devices.length} device{user.devices.length !== 1 ? "s" : ""} · {lastStr || "no activity"}
            </div>
            <div className="text-[9px] font-mono text-muted-foreground/40 mt-0.5 uppercase tracking-wider">
              Click to explore →
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-lg font-bold font-mono">{user.books}</div>
          <div className="text-[10px] font-mono text-muted-foreground uppercase">Books</div>
        </div>
      </CardContent>
    </Card>
  );
}
