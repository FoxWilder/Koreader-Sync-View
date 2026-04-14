import React, { useState, useEffect } from "react";
import { useSearchLibrary, getSearchLibraryQueryKey } from "@workspace/api-client-react";
import { Input } from "./ui/input";
import { Search, Loader2 } from "lucide-react";
import { BookCard } from "./BookCard";
import { Badge } from "./ui/badge";

export function LibrarySearch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "epub" | "pdf" | "cover" | "recent">("all");

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(searchQuery), 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchParams = {
    q: debouncedQuery,
    ...(filter === "epub" ? { ext: "epub" } : {}),
    ...(filter === "pdf" ? { ext: "pdf" } : {}),
    ...(filter === "cover" ? { cover: "1" } : {}),
    ...(filter === "recent" ? { recent: "1" } : {}),
  };

  const { data: searchResults, isLoading } = useSearchLibrary(searchParams, {
    query: {
      enabled: !!debouncedQuery || filter !== "all",
      queryKey: getSearchLibraryQueryKey(searchParams)
    }
  });

  const filters = [
    { id: "all", label: "All" },
    { id: "epub", label: "EPUB" },
    { id: "pdf", label: "PDF" },
    { id: "cover", label: "With Cover" },
    { id: "recent", label: "Has Progress" }
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden border-r border-border/50 bg-background/50">
      <div className="p-6 pb-4 border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-10">
        <h2 className="text-sm font-mono text-primary mb-4 tracking-widest uppercase flex items-center gap-2">
          <Search className="w-4 h-4" /> Library Search
        </h2>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="Search title, author, or filename..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-card border-border/50 font-mono text-sm focus-visible:ring-primary h-11"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {filters.map(f => (
            <Badge 
              key={f.id}
              variant={filter === f.id ? "default" : "outline"}
              className={`cursor-pointer whitespace-nowrap font-mono text-xs hover:bg-primary/20 ${filter === f.id ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}
              onClick={() => setFilter(f.id as any)}
            >
              {f.label}
            </Badge>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-40 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mb-2" />
            <span className="font-mono text-xs uppercase">Scanning databanks...</span>
          </div>
        ) : searchResults?.length ? (
          <div className="grid grid-cols-1 gap-4">
            {searchResults.map((book) => (
              <BookCard key={book.md5} book={book} />
            ))}
          </div>
        ) : (debouncedQuery || filter !== "all") ? (
          <div className="text-center text-muted-foreground font-mono text-sm py-12 bg-card/30 rounded-lg border border-border/50 border-dashed">
            No matches found for current criteria.
          </div>
        ) : (
          <div className="text-center text-muted-foreground font-mono text-sm py-12 bg-card/30 rounded-lg border border-border/50 border-dashed">
            Enter a query to search your KOReader library.
          </div>
        )}
      </div>
    </div>
  );
}
