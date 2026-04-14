import React from "react";
import { BookCard as BookCardType } from "@workspace/api-client-react";
import { Badge } from "./ui/badge";
import {
  X,
  BookOpen,
  User,
  Layers,
  Building2,
  Globe,
  CalendarDays,
  BookMarked,
  FileText,
  Tag,
  Clock,
  CheckCircle,
  HardDrive,
} from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";

interface BookDetailModalProps {
  book: BookCardType;
  onClose: () => void;
}

export function BookDetailModal({ book, onClose }: BookDetailModalProps) {
  const isCompleted = book.last_progress >= 99.5;
  const isNotStarted = !book.last_progress;

  let dateStr = "";
  try {
    if (book.last_read_iso) {
      dateStr = formatDistanceToNow(parseISO(book.last_read_iso), { addSuffix: true });
    }
  } catch {
    // ignore
  }

  const progressColor = isCompleted
    ? "bg-teal-500"
    : book.last_progress < 25
    ? "bg-amber-500"
    : "bg-gradient-to-r from-blue-500 to-teal-400";

  const desc = book.epub_description
    ?.replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  // Close on Escape
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={handleBackdrop}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-border/60 bg-background shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header: cover + title block */}
        <div className="flex gap-0 overflow-hidden rounded-t-xl">
          {/* Cover */}
          <div className="relative w-36 shrink-0 bg-muted/30 self-stretch min-h-[180px]">
            {book.has_cover ? (
              <img
                src={`/api/koreader/cover/${book.md5}`}
                alt={book.display_title || book.name}
                className="absolute inset-0 w-full h-full object-cover"
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                <BookOpen className="w-10 h-10 opacity-30" />
                <span className="text-[10px] font-mono uppercase mt-2 opacity-50">
                  {book.ext}
                </span>
              </div>
            )}
          </div>

          {/* Title block */}
          <div className="flex-1 p-6 bg-card/60 border-b border-border/50">
            <div className="flex items-start gap-2 mb-2 pr-8">
              <h2 className="text-lg font-bold leading-snug flex-1">
                {book.display_title || book.name}
              </h2>
              <Badge variant="outline" className="font-mono text-[10px] uppercase shrink-0 mt-0.5">
                {book.ext}
              </Badge>
            </div>

            {book.display_author && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-1">
                <User className="w-3.5 h-3.5 shrink-0" />
                {book.display_author}
              </div>
            )}

            {book.epub_series && (
              <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-3">
                <Layers className="w-3.5 h-3.5 shrink-0" />
                {book.epub_series}
                {book.epub_series_index ? ` #${book.epub_series_index}` : ""}
              </div>
            )}

            {/* Progress */}
            <div className="mt-3">
              <div className="flex justify-between text-xs font-mono text-muted-foreground mb-1">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {dateStr || "Never read"}
                </span>
                <span className={isCompleted ? "text-teal-400 font-bold" : isNotStarted ? "" : "text-primary font-bold"}>
                  {isCompleted ? (
                    <span className="flex items-center gap-1">
                      <CheckCircle className="w-3 h-3" /> Completed
                    </span>
                  ) : `${Math.round(book.last_progress || 0)}%`}
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${progressColor}`}
                  style={{ width: `${Math.max(0, Math.min(100, book.last_progress || 0))}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Description */}
          {desc && (
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2">
                Description
              </p>
              <p className="text-sm text-muted-foreground/90 leading-relaxed">{desc}</p>
            </div>
          )}

          {/* Metadata grid */}
          <div>
            <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-3">
              Details
            </p>
            <div className="grid grid-cols-2 gap-3">
              {book.epub_publisher && (
                <MetaRow icon={<Building2 className="w-3.5 h-3.5" />} label="Publisher">
                  {book.epub_publisher}
                </MetaRow>
              )}
              {book.epub_language && (
                <MetaRow icon={<Globe className="w-3.5 h-3.5" />} label="Language">
                  {book.epub_language.toUpperCase()}
                </MetaRow>
              )}
              {book.epub_date && (
                <MetaRow icon={<CalendarDays className="w-3.5 h-3.5" />} label="Published">
                  {book.epub_date.slice(0, 10)}
                </MetaRow>
              )}
              {(book.epub_page_count ?? 0) > 0 && (
                <MetaRow icon={<BookMarked className="w-3.5 h-3.5" />} label="Chapters">
                  {book.epub_page_count}
                </MetaRow>
              )}
              {book.size_human && (
                <MetaRow icon={<HardDrive className="w-3.5 h-3.5" />} label="File size">
                  {book.size_human}
                </MetaRow>
              )}
              {book.folder && (
                <MetaRow icon={<FileText className="w-3.5 h-3.5" />} label="Folder">
                  {book.folder}
                </MetaRow>
              )}
              {book.last_user && (
                <MetaRow icon={<User className="w-3.5 h-3.5" />} label="Last reader">
                  {book.last_user}
                </MetaRow>
              )}
              {book.last_device && (
                <MetaRow icon={<BookOpen className="w-3.5 h-3.5" />} label="Device">
                  {book.last_device}
                </MetaRow>
              )}
            </div>
          </div>

          {/* Subjects */}
          {book.epub_subjects && book.epub_subjects.length > 0 && (
            <div>
              <p className="text-xs font-mono text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Tag className="w-3 h-3" /> Subjects
              </p>
              <div className="flex flex-wrap gap-1.5">
                {book.epub_subjects.map((s) => (
                  <Badge key={s} variant="outline" className="text-[10px] font-mono text-muted-foreground border-border/50">
                    {s}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* MD5 */}
          <div className="pt-2 border-t border-border/30">
            <p className="text-[10px] font-mono text-muted-foreground/40 break-all">
              MD5: {book.md5}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg bg-card/40 border border-border/40 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground uppercase tracking-wider mb-1">
        {icon}
        {label}
      </div>
      <div className="text-sm font-medium truncate">{children}</div>
    </div>
  );
}
