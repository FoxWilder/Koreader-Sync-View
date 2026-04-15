import React, { useState, useEffect } from "react";
import { useSearchLibrary, getSearchLibraryQueryKey, useGetStats } from "@workspace/api-client-react";
import { Input } from "./ui/input";
import { Search, Loader2, BookOpen, SlidersHorizontal, X, ChevronDown, ChevronUp } from "lucide-react";
import { BookCard } from "./BookCard";
import { Badge } from "./ui/badge";

// ---------------------------------------------------------------------------
// Filter definitions
// ---------------------------------------------------------------------------

type FormatFilter = "all" | "epub" | "pdf" | "mobi" | "cbz";
type StatusFilter = "all" | "in_progress" | "completed" | "not_started";
type CoverFilter  = "all" | "cover";
type SortOrder    = "recent" | "title" | "author" | "progress";

interface Filters {
  format: FormatFilter;
  status: StatusFilter;
  cover: CoverFilter;
  user: string;   // "" = all
  lang: string;   // "" = all
  sort: SortOrder;
}

const DEFAULT_FILTERS: Filters = {
  format: "all",
  status: "all",
  cover: "all",
  user: "",
  lang: "",
  sort: "recent",
};

function filtersActive(f: Filters): boolean {
  return (
    f.format !== "all" ||
    f.status !== "all" ||
    f.cover !== "all" ||
    f.user !== "" ||
    f.lang !== "" ||
    f.sort !== "recent"
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function LibrarySearch() {
  const [searchQuery, setSearchQuery]       = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filters, setFilters]               = useState<Filters>(DEFAULT_FILTERS);
  const [showFilters, setShowFilters]       = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Pull user list from stats
  const { data: stats } = useGetStats({ query: { queryKey: ["stats"] } });
  const users = stats?.users_breakdown?.map((u) => u.user) ?? [];

  const searchParams = {
    q: debouncedQuery,
    ...(filters.format !== "all"   ? { ext: filters.format }          : {}),
    ...(filters.cover  === "cover" ? { cover: "1" }                   : {}),
    ...(filters.status !== "all"   ? { status: filters.status }       : {}),
    ...(filters.user   !== ""      ? { user: filters.user }           : {}),
    ...(filters.lang   !== ""      ? { lang: filters.lang }           : {}),
    ...(filters.sort   !== "recent"? { sort: filters.sort }           : {}),
    // "recent" status also maps to the legacy `recent=1` param for compat
    ...(filters.status === "in_progress" || filters.status === "completed"
      ? { recent: "1" }
      : {}),
  };

  const hasQuery = !!debouncedQuery || filtersActive(filters);

  const { data: results, isLoading } = useSearchLibrary(searchParams, {
    query: {
      enabled: hasQuery,
      queryKey: getSearchLibraryQueryKey(searchParams),
    },
  });

  function setFilter<K extends keyof Filters>(key: K, value: Filters[K]) {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }

  function resetFilters() {
    setFilters(DEFAULT_FILTERS);
  }

  const activeCount = [
    filters.format !== "all",
    filters.status !== "all",
    filters.cover  !== "all",
    filters.user   !== "",
    filters.lang   !== "",
    filters.sort   !== "recent",
  ].filter(Boolean).length;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background/50">
      {/* Header */}
      <div className="p-5 pb-3 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-mono text-primary tracking-widest uppercase flex items-center gap-2">
            <Search className="w-3.5 h-3.5" />
            Library
          </h2>
          <div className="flex items-center gap-2">
            {results && results.length > 0 && (
              <span className="text-[10px] font-mono text-muted-foreground">
                {results.length} result{results.length !== 1 ? "s" : ""}
              </span>
            )}
            <button
              onClick={() => setShowFilters((v) => !v)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md border font-mono text-[10px] transition-colors ${
                showFilters || activeCount > 0
                  ? "border-primary/50 bg-primary/10 text-primary"
                  : "border-border/50 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              <SlidersHorizontal className="w-3 h-3" />
              Filters
              {activeCount > 0 && (
                <span className="ml-0.5 bg-primary text-primary-foreground rounded-full w-3.5 h-3.5 flex items-center justify-center text-[8px] font-bold">
                  {activeCount}
                </span>
              )}
              {showFilters ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>
        </div>

        {/* Search input */}
        <div className="relative mb-2">
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

        {/* Expanded filter panel */}
        {showFilters && (
          <div className="mt-2 space-y-2.5 pb-1">
            {/* Format */}
            <FilterRow label="Format">
              {(["all", "epub", "pdf", "mobi", "cbz"] as FormatFilter[]).map((f) => (
                <FilterChip
                  key={f}
                  active={filters.format === f}
                  onClick={() => setFilter("format", f)}
                >
                  {f === "all" ? "Any" : f.toUpperCase()}
                </FilterChip>
              ))}
            </FilterRow>

            {/* Status */}
            <FilterRow label="Status">
              {([
                { id: "all",         label: "Any" },
                { id: "in_progress", label: "In Progress" },
                { id: "completed",   label: "Completed" },
                { id: "not_started", label: "Not Started" },
              ] as { id: StatusFilter; label: string }[]).map(({ id, label }) => (
                <FilterChip
                  key={id}
                  active={filters.status === id}
                  onClick={() => setFilter("status", id)}
                >
                  {label}
                </FilterChip>
              ))}
            </FilterRow>

            {/* Cover */}
            <FilterRow label="Cover">
              <FilterChip active={filters.cover === "all"}   onClick={() => setFilter("cover", "all")}>Any</FilterChip>
              <FilterChip active={filters.cover === "cover"} onClick={() => setFilter("cover", "cover")}>With Cover</FilterChip>
            </FilterRow>

            {/* Reader (user) */}
            {users.length > 0 && (
              <FilterRow label="Reader">
                <FilterChip active={filters.user === ""} onClick={() => setFilter("user", "")}>Anyone</FilterChip>
                {users.map((u) => (
                  <FilterChip key={u} active={filters.user === u} onClick={() => setFilter("user", u)}>
                    {u}
                  </FilterChip>
                ))}
              </FilterRow>
            )}

            {/* Language */}
            <FilterRow label="Language">
              {([
                { id: "",   label: "Any" },
                { id: "en", label: "EN" },
                { id: "de", label: "DE" },
                { id: "fr", label: "FR" },
                { id: "es", label: "ES" },
                { id: "nl", label: "NL" },
              ]).map(({ id, label }) => (
                <FilterChip key={id} active={filters.lang === id} onClick={() => setFilter("lang", id)}>
                  {label}
                </FilterChip>
              ))}
            </FilterRow>

            {/* Sort */}
            <FilterRow label="Sort by">
              {([
                { id: "recent",   label: "Recent" },
                { id: "title",    label: "Title" },
                { id: "author",   label: "Author" },
                { id: "progress", label: "Progress" },
              ] as { id: SortOrder; label: string }[]).map(({ id, label }) => (
                <FilterChip key={id} active={filters.sort === id} onClick={() => setFilter("sort", id)}>
                  {label}
                </FilterChip>
              ))}
            </FilterRow>

            {/* Reset */}
            {activeCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground transition-colors mt-1"
              >
                <X className="w-3 h-3" /> Reset all filters
              </button>
            )}
          </div>
        )}

        {/* Active filter badges (collapsed view) */}
        {!showFilters && activeCount > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {filters.format !== "all" && (
              <ActiveBadge onRemove={() => setFilter("format", "all")}>{filters.format.toUpperCase()}</ActiveBadge>
            )}
            {filters.status !== "all" && (
              <ActiveBadge onRemove={() => setFilter("status", "all")}>
                {filters.status.replace("_", " ")}
              </ActiveBadge>
            )}
            {filters.cover !== "all" && (
              <ActiveBadge onRemove={() => setFilter("cover", "all")}>With cover</ActiveBadge>
            )}
            {filters.user !== "" && (
              <ActiveBadge onRemove={() => setFilter("user", "")}>@{filters.user}</ActiveBadge>
            )}
            {filters.lang !== "" && (
              <ActiveBadge onRemove={() => setFilter("lang", "")}>{filters.lang.toUpperCase()}</ActiveBadge>
            )}
            {filters.sort !== "recent" && (
              <ActiveBadge onRemove={() => setFilter("sort", "recent")}>↕ {filters.sort}</ActiveBadge>
            )}
          </div>
        )}
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
            body="Nothing matched your query or filters. Try adjusting the search or clearing some filters."
          />
        ) : (
          <EmptyState
            icon={<BookOpen className="w-10 h-10 opacity-20" />}
            title="Search your library"
            body="Type a title, author, series, or filename. Use the Filters button to narrow by format, status, reader, or language."
          />
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[9px] font-mono text-muted-foreground/50 uppercase tracking-wider w-14 shrink-0 pt-1">
        {label}
      </span>
      <div className="flex flex-wrap gap-1">{children}</div>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-2 py-0.5 rounded-sm font-mono text-[10px] border transition-colors whitespace-nowrap ${
        active
          ? "bg-primary text-primary-foreground border-primary"
          : "border-border/50 text-muted-foreground hover:text-foreground hover:border-primary/40"
      }`}
    >
      {children}
    </button>
  );
}

function ActiveBadge({ children, onRemove }: { children: React.ReactNode; onRemove: () => void }) {
  return (
    <Badge
      variant="outline"
      className="font-mono text-[9px] border-primary/40 text-primary bg-primary/10 flex items-center gap-1 cursor-pointer hover:bg-primary/20 transition-colors"
      onClick={onRemove}
    >
      {children}
      <X className="w-2.5 h-2.5" />
    </Badge>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center h-56 px-6 rounded-xl border border-dashed border-border/40 bg-card/20 gap-3 mt-2">
      <div className="text-muted-foreground">{icon}</div>
      <p className="font-mono text-sm font-semibold text-muted-foreground">{title}</p>
      <p className="text-xs text-muted-foreground/60 leading-relaxed max-w-[240px]">{body}</p>
    </div>
  );
}
