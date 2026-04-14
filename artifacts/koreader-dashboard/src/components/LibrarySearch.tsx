import React, { useState, useEffect } from "react";
import { useSearchLibrary, getSearchLibraryQueryKey } from "@workspace/api-client-react";
import { Input } from "./ui/input";
import { Search, Loader2, BookOpen, SlidersHorizontal } from "lucide-react";
import { BookCard } from "./BookCard";
import { Badge } from "./ui/badge";

type Filter = "all" | "epub" | "pdf" | "cover" | "recent";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all",    label: "All" },
  { id: "epub",   label: "EPUB" },
  { id: "pdf",    label: "PDF" },
  { id: "cover",  label: "With Cover" },
  { id: "recent", label: "Has Progress" },
];

export function LibrarySearch() {
  const [searchQuery, setSearchQuery]       = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter]                 = useState<Filter>("all");

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  const searchParams = {
    q: debouncedQuery,
    ...(filter === "epub"   ? { ext: "epub" } : {}),
    ...(filter === "pdf"    ? { ext: "pdf"  } : {}),
    ...(filter === "cover"  ? { cover: "1"  } : {}),
    ...(filter === "recent" ? { recent: "1" } : {}),
  };

  const hasQuery = !!debouncedQuery || filter !== "all";

  const { data: results, isLoading } = useSearchLibrary(searchParams, {
    query: {
      enabled: hasQuery,
      queryKey: getSearchLibraryQueryKey(searchParams),
    },
  });

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background/50">
      {/* Header */}
      <div className="p-5 pb-3 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-mono text-primary tracking-widest uppercase flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            Library
          </h2>
          {results && results.length > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground">
              {results.length} result{results.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Search input */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground animate-spin" />
          )}
          <Input
            placeholder="Title, author, series, filename…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 pr-9 bg-card/60 border-border/50 font-mono text-sm focus-visible:ring-primary h-10"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-0.5 scrollbar-hide">
          <SlidersHorizontal className="w-3 h-3 text-muted-foreground/50 shrink-0 mt-1" />
          {FILTERS.map((f) => (
            <Badge
              key={f.id}
              variant={filter === f.id ? "default" : "outline"}
              onClick={() => setFilter(f.id)}
              className={`cursor-pointer whitespace-nowrap font-mono text-[10px] transition-colors ${
                filter === f.id
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:text-foreground hover:border-primary/50"
              }`}
            >
              {f.label}
            </Badge>
          ))}
        </div>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-48 text-muted-foreground gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary/60" />
            <span className="font-mono text-xs uppercase tracking-widest">Searching…</span>
          </div>
        ) : results && results.length > 0 ? (
          results.map((book) => (
            <BookCard key={book.md5} book={book} />
          ))
        ) : hasQuery ? (
          <EmptyState
            icon={<Search className="w-10 h-10 opacity-20" />}
            title="No results"
            body={`Nothing matched "${debouncedQuery || FILTERS.find((f) => f.id === filter)?.label}". Try a different query or filter.`}
          />
        ) : (
          <EmptyState
            icon={<BookOpen className="w-10 h-10 opacity-20" />}
            title="Search your library"
            body="Type a title, author, series name, or filename. Use the filters above to narrow by format or progress."
          />
        )}
      </div>
    </div>
  );
}

function EmptyState({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center h-56 px-6 rounded-xl border border-dashed border-border/40 bg-card/20 gap-3 mt-2">
      <div className="text-muted-foreground">{icon}</div>
      <p className="font-mono text-sm font-semibold text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-[240px]">{body}</p>
    </div>
  );
}
