import React from "react";
import { useGetStats } from "@workspace/api-client-react";
import { Card, CardContent } from "./ui/card";
import { BookCard } from "./BookCard";
import { Book, CheckCircle, Clock, Users, Activity, Target, User } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { Badge } from "./ui/badge";

export function DashboardStats() {
  const { data: stats, isLoading, isError } = useGetStats({
    query: { refetchInterval: 4000, queryKey: ['stats'] }
  });

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

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background/50">
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

      <div className="flex-1 overflow-y-auto p-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <KpiCard 
            title="In Progress" 
            value={stats.in_progress} 
            icon={<Clock className="w-5 h-5 text-primary" />} 
          />
          <KpiCard 
            title="Completed" 
            value={stats.completed} 
            icon={<CheckCircle className="w-5 h-5 text-teal-400" />} 
          />
          <KpiCard 
            title="Avg Progress" 
            value={`${Math.round(stats.avg_progress)}%`} 
            icon={<Target className="w-5 h-5 text-blue-400" />} 
          />
          <KpiCard 
            title="Active Users" 
            value={stats.users} 
            icon={<Users className="w-5 h-5 text-purple-400" />} 
          />
        </div>

        {/* Top Users */}
        {stats.users_breakdown && stats.users_breakdown.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4 border-b border-border/50 pb-2">Active Users</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stats.users_breakdown.map((user) => (
                <Card key={user.user} className="bg-card/40 border-border/50 backdrop-blur-sm">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center border border-primary/30">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <div className="font-bold text-sm">{user.user}</div>
                        <div className="text-[10px] font-mono text-muted-foreground uppercase">
                          {user.devices.length} Devices
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-bold font-mono">{user.books}</div>
                      <div className="text-[10px] font-mono text-muted-foreground uppercase">Books</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Recent Activity */}
        {stats.top_recent && stats.top_recent.length > 0 && (
          <div>
            <h3 className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-4 border-b border-border/50 pb-2">Recent Activity</h3>
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

function KpiCard({ title, value, icon }: { title: string; value: React.ReactNode; icon: React.ReactNode }) {
  return (
    <Card className="bg-card/40 border-border/50 backdrop-blur-sm">
      <CardContent className="p-5 flex items-start justify-between">
        <div>
          <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-1">{title}</p>
          <p className="text-3xl font-light font-mono text-foreground">{value}</p>
        </div>
        <div className="p-2 bg-background rounded-lg border border-border/50">
          {icon}
        </div>
      </CardContent>
    </Card>
  );
}
