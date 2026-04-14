import React from "react";
import { BookCard as BookCardType } from "@workspace/api-client-react";
import { Card, CardContent } from "./ui/card";
import { Badge } from "./ui/badge";
import { BookOpen, Calendar, Clock, HardDrive, FileText, User } from "lucide-react";
import { format, formatDistanceToNow, parseISO } from "date-fns";

interface BookCardProps {
  book: BookCardType;
  className?: string;
}

export function BookCard({ book, className = "" }: BookCardProps) {
  const isCompleted = book.last_progress >= 99.5;
  const isNotStarted = book.last_progress === 0 || !book.last_progress;

  // Format date if available
  let dateStr = "";
  try {
    if (book.last_read_iso) {
      dateStr = formatDistanceToNow(parseISO(book.last_read_iso), { addSuffix: true });
    }
  } catch (e) {
    // ignore parse error
  }

  // Progress bar coloring logic
  let progressColorClass = "bg-primary";
  if (isCompleted) {
    progressColorClass = "bg-teal-500";
  } else if (book.last_progress < 25) {
    progressColorClass = "bg-amber-500";
  } else {
    progressColorClass = "bg-gradient-to-r from-blue-500 to-teal-400";
  }

  return (
    <Card className={`overflow-hidden border-border bg-card/50 backdrop-blur-sm shadow-md transition-all hover:border-primary/50 group ${className}`}>
      <div className="flex h-48">
        {/* Cover Image */}
        <div className="relative w-32 shrink-0 bg-muted/30 border-r border-border flex flex-col items-center justify-center">
          {book.has_cover ? (
            <img 
              src={`/api/koreader/cover/${book.md5}`} 
              alt={book.display_title || book.name}
              className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement?.classList.add('bg-muted');
              }}
            />
          ) : (
            <div className="flex flex-col items-center text-muted-foreground p-4 text-center z-10">
              <BookOpen className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-[10px] uppercase font-mono tracking-wider break-all line-clamp-3">
                {book.ext || 'UNKNOWN'}
              </span>
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col min-w-0 p-4">
          <div className="mb-1 flex justify-between items-start gap-2">
            <h3 className="font-bold text-base truncate" title={book.display_title || book.name}>
              {book.display_title || book.name}
            </h3>
            {book.ext && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 rounded-sm font-mono shrink-0 bg-background/50 uppercase">
                {book.ext.replace('.', '')}
              </Badge>
            )}
          </div>
          
          <div className="text-sm text-muted-foreground mb-3 truncate flex items-center gap-1.5" title={book.display_author || 'Unknown Author'}>
            <User className="w-3.5 h-3.5 opacity-70" />
            {book.display_author || 'Unknown Author'}
          </div>

          {book.epub_description && (
            <p className="text-xs text-muted-foreground/80 line-clamp-2 mb-auto leading-relaxed">
              {book.epub_description.replace(/(<([^>]+)>)/gi, "")}
            </p>
          )}

          <div className="mt-auto flex flex-wrap gap-2 text-xs font-mono text-muted-foreground/70 items-center">
            {book.size_human && (
              <span className="flex items-center gap-1 bg-background/40 px-1.5 py-0.5 rounded">
                <HardDrive className="w-3 h-3" /> {book.size_human}
              </span>
            )}
            {book.epub_series && (
              <span className="flex items-center gap-1 bg-background/40 px-1.5 py-0.5 rounded truncate max-w-[120px]" title={book.epub_series}>
                <FileText className="w-3 h-3" /> {book.epub_series} {book.epub_series_index ? `#${book.epub_series_index}` : ''}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="h-1.5 w-full bg-muted overflow-hidden relative">
        <div 
          className={`h-full absolute left-0 top-0 transition-all duration-500 ease-out ${progressColorClass}`}
          style={{ width: `${Math.max(0, Math.min(100, book.last_progress || 0))}%` }}
        />
      </div>
      
      {/* Footer Meta */}
      <div className="px-4 py-2 bg-muted/10 border-t border-border flex justify-between items-center text-[10px] font-mono text-muted-foreground uppercase tracking-wider">
        <span className="flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          {dateStr ? dateStr : 'Never read'}
        </span>
        <span className={`font-bold ${isCompleted ? 'text-teal-400' : isNotStarted ? 'text-muted-foreground' : 'text-primary'}`}>
          {isCompleted ? 'COMPLETED' : `${Math.round(book.last_progress || 0)}%`}
        </span>
      </div>
    </Card>
  );
}
