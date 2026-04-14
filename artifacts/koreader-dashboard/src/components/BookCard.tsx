import React, { useState } from "react";
import { BookCard as BookCardType } from "@workspace/api-client-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { BookDetailModal } from "./BookDetailModal";
import {
  BookOpen,
  Clock,
  User,
  BookMarked,
  FileText,
  Globe,
  Building2,
  CalendarDays,
  Layers,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

interface BookCardProps {
  book: BookCardType;
  className?: string;
}

export function BookCard({ book, className = "" }: BookCardProps) {
  const [showModal, setShowModal] = useState(false);
  const isCompleted = book.last_progress >= 99.5;
  const isNotStarted = book.last_progress === 0 || !book.last_progress;

  let dateStr = "";
  try {
    if (book.last_read_iso) {
      dateStr = formatDistanceToNow(parseISO(book.last_read_iso), { addSuffix: true });
    }
  } catch {
    // ignore
  }

  let progressColorClass = "bg-primary";
  if (isCompleted) progressColorClass = "bg-teal-500";
  else if (book.last_progress < 25) progressColorClass = "bg-amber-500";
  else progressColorClass = "bg-gradient-to-r from-blue-500 to-teal-400";

  const title  = book.display_title || book.name;
  const author = book.display_author;
  const desc   = book.epub_description?.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

  return (
    <>
    {showModal && <BookDetailModal book={book} onClose={() => setShowModal(false)} />}
    <Card
      onClick={() => setShowModal(true)}
      className={`overflow-hidden border-border bg-card/50 backdrop-blur-sm shadow-md transition-all hover:border-primary/50 hover:shadow-primary/10 cursor-pointer group ${className}`}
    >
      <div className="flex">
        {/* Cover */}
        <div className="relative w-28 shrink-0 bg-muted/30 border-r border-border flex flex-col items-center justify-center self-stretch">
          {book.has_cover ? (
            <img
              src={`/api/koreader/cover/${book.md5}`}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <div className="flex flex-col items-center text-muted-foreground p-3 text-center">
              <BookOpen className="w-7 h-7 mb-1.5 opacity-40" />
              <span className="text-[9px] uppercase font-mono tracking-wider opacity-60">
                {book.ext || "book"}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0 p-3 flex flex-col gap-1.5">
          {/* Title + format badge */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm leading-snug line-clamp-2" title={title}>
              {title}
            </h3>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-sm font-mono shrink-0 bg-background/50 uppercase mt-0.5">
              {book.ext}
            </Badge>
          </div>

          {/* Author */}
          {author && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <User className="w-3 h-3 shrink-0 opacity-70" />
              <span className="truncate">{author}</span>
            </div>
          )}

          {/* Series */}
          {book.epub_series && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
              <Layers className="w-3 h-3 shrink-0 opacity-70" />
              <span className="truncate">
                {book.epub_series}{book.epub_series_index ? ` #${book.epub_series_index}` : ""}
              </span>
            </div>
          )}

          {/* Description */}
          {desc && (
            <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed">
              {desc}
            </p>
          )}

          {/* Meta chips */}
          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-auto pt-1">
            {(book.epub_page_count ?? 0) > 0 && (
              <MetaChip icon={<BookMarked className="w-3 h-3" />}>
                {book.epub_page_count} chapters
              </MetaChip>
            )}
            {book.epub_publisher && (
              <MetaChip icon={<Building2 className="w-3 h-3" />}>
                {book.epub_publisher}
              </MetaChip>
            )}
            {book.epub_language && (
              <MetaChip icon={<Globe className="w-3 h-3" />}>
                {book.epub_language.toUpperCase()}
              </MetaChip>
            )}
            {book.epub_date && (
              <MetaChip icon={<CalendarDays className="w-3 h-3" />}>
                {book.epub_date.slice(0, 4)}
              </MetaChip>
            )}
            {book.size_human && (
              <MetaChip icon={<FileText className="w-3 h-3" />}>
                {book.size_human}
              </MetaChip>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-muted overflow-hidden relative">
        <div
          className={`h-full absolute left-0 top-0 transition-all duration-500 ease-out ${progressColorClass}`}
          style={{ width: `${Math.max(0, Math.min(100, book.last_progress || 0))}%` }}
        />
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 bg-muted/10 border-t border-border flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {dateStr || "Never read"}
        </span>
        <span className={`font-bold ${isCompleted ? "text-teal-400" : isNotStarted ? "text-muted-foreground" : "text-primary"}`}>
          {isCompleted ? "Completed" : `${Math.round(book.last_progress || 0)}%`}
        </span>
      </div>
    </Card>
    </>
  );
}

function MetaChip({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/70">
      {icon}
      {children}
    </span>
  );
}
