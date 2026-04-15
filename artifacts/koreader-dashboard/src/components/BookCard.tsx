import React, { useState } from "react";
import { BookCard as BookCardType } from "@workspace/api-client-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { BookDetailModal } from "./BookDetailModal";
import {
  BookOpen,
  Clock,
  User,
  Tag,
  FileText,
  HardDrive,
  Layers,
  Info,
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
  const tags   = book.epub_subjects ?? [];

  return (
    <>
    {showModal && <BookDetailModal book={book} onClose={() => setShowModal(false)} />}
    <Card
      onClick={() => setShowModal(true)}
      className={`overflow-hidden border-border bg-card/50 backdrop-blur-sm shadow-md transition-all hover:border-primary/50 hover:shadow-primary/10 cursor-pointer group flex flex-col ${className}`}
    >
      {/* Main row: cover + content */}
      <div className="flex flex-1 min-h-0">
        {/* Cover — fixed width, fills full card height */}
        <div className="relative w-28 shrink-0 bg-muted/30 border-r border-border self-stretch min-h-[160px]">
          {book.has_cover ? (
            <img
              src={`/api/koreader/cover/${book.md5}`}
              alt={title}
              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground p-2 text-center gap-1">
              <BookOpen className="w-7 h-7 opacity-30" />
              <span className="text-[9px] uppercase font-mono tracking-wider opacity-50">
                No cover
              </span>
            </div>
          )}
        </div>

        {/* Content — always renders all rows */}
        <div className="flex-1 min-w-0 p-3 flex flex-col gap-1.5">
          {/* Title + format badge */}
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-bold text-sm leading-snug line-clamp-2" title={title}>
              {title}
            </h3>
            <Badge variant="outline" className="text-[9px] px-1.5 py-0 rounded-sm font-mono shrink-0 bg-background/50 uppercase mt-0.5">
              {book.ext || "—"}
            </Badge>
          </div>

          {/* Author — always shown */}
          <MetaRow icon={<User className="w-3 h-3 shrink-0 opacity-70" />}>
            {author ? author : <span className="italic opacity-40">Author unknown</span>}
          </MetaRow>

          {/* Series */}
          {book.epub_series ? (
            <MetaRow icon={<Layers className="w-3 h-3 shrink-0 opacity-70" />}>
              {book.epub_series}{book.epub_series_index ? ` #${book.epub_series_index}` : ""}
            </MetaRow>
          ) : null}

          {/* Description — always shown, placeholder if missing */}
          <p className="text-[11px] text-muted-foreground/80 line-clamp-2 leading-relaxed flex-1 min-h-[28px]">
            {desc || <span className="italic opacity-40">No description available</span>}
          </p>

          {/* Tags — always shown */}
          <div className="flex items-start gap-1 min-h-[18px]">
            <Tag className="w-3 h-3 shrink-0 opacity-50 mt-0.5" />
            {tags.length > 0 ? (
              <div className="flex flex-wrap gap-1">
                {tags.slice(0, 3).map((t) => (
                  <span key={t} className="text-[9px] font-mono bg-primary/10 text-primary/70 px-1.5 py-0.5 rounded-sm">
                    {t}
                  </span>
                ))}
                {tags.length > 3 && (
                  <span className="text-[9px] font-mono text-muted-foreground/50">+{tags.length - 3}</span>
                )}
              </div>
            ) : (
              <span className="text-[10px] font-mono text-muted-foreground/30 italic">No tags</span>
            )}
          </div>

          {/* File size + page count — always shown */}
          <div className="flex items-center gap-3 mt-auto pt-0.5">
            <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60">
              <HardDrive className="w-3 h-3" />
              {book.size_human || <span className="italic opacity-40">—</span>}
            </span>
            {(book.epub_page_count ?? 0) > 0 && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60">
                <FileText className="w-3 h-3" />
                {book.epub_page_count} ch.
              </span>
            )}
            {book.last_user && (
              <span className="flex items-center gap-1 text-[10px] font-mono text-muted-foreground/60 ml-auto">
                <Info className="w-3 h-3" />
                {book.last_user}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 w-full bg-muted overflow-hidden relative shrink-0">
        <div
          className={`h-full absolute left-0 top-0 transition-all duration-500 ease-out ${progressColorClass}`}
          style={{ width: `${Math.max(0, Math.min(100, book.last_progress || 0))}%` }}
        />
      </div>

      {/* Footer */}
      <div className="px-3 py-1.5 bg-muted/10 border-t border-border flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase tracking-wider shrink-0">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3 h-3" />
          {dateStr || "Never read"}
        </span>
        <span className={`font-bold ${isCompleted ? "text-teal-400" : isNotStarted ? "text-muted-foreground" : "text-primary"}`}>
          {isCompleted ? "Completed" : isNotStarted ? "Not started" : `${Math.round(book.last_progress || 0)}%`}
        </span>
      </div>
    </Card>
    </>
  );
}

function MetaRow({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
      {icon}
      <span className="truncate">{children}</span>
    </div>
  );
}
