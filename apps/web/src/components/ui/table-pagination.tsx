"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getPaginationRange } from "@/lib/pagination";

type TablePaginationProps = {
  page: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  totalCount: number;
  onPageChange: (page: number) => void;
};

export function TablePagination({
  page,
  totalPages,
  startIndex,
  endIndex,
  totalCount,
  onPageChange,
}: TablePaginationProps) {
  if (totalCount === 0) return null;

  const pageNumbers = getPaginationRange(page, totalPages);

  return (
    <div className="flex flex-col gap-3 border-t border-border px-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-4">
      <p className="text-sm text-muted-foreground">
        Showing {startIndex}–{endIndex} out of {totalCount.toLocaleString()}
      </p>
      {totalPages > 1 && (
        <div className="flex flex-wrap items-center gap-1">
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page <= 1}
            aria-label="Previous page"
            onClick={() => onPageChange(Math.max(1, page - 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          {pageNumbers.map((item, index) =>
            item === "ellipsis" ? (
              <span
                key={`ellipsis-${index}`}
                className="inline-flex h-8 min-w-8 items-center justify-center px-1 text-sm text-muted-foreground"
              >
                …
              </span>
            ) : (
              <Button
                key={item}
                type="button"
                variant={item === page ? "default" : "outline"}
                size="sm"
                className="h-8 min-w-8 px-2"
                onClick={() => onPageChange(item)}
              >
                {item}
              </Button>
            )
          )}

          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-8 w-8"
            disabled={page >= totalPages}
            aria-label="Next page"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
