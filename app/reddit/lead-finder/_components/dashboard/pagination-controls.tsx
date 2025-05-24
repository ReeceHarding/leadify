"use client";

import React from "react";
import { Button } from "@/components/ui/button";

interface PaginationControlsProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function PaginationControls({
  currentPage,
  totalPages,
  onPageChange
}: PaginationControlsProps) {
  if (totalPages <= 1) {
    return null; // Don't render if only one page or no pages
  }

  // Logic to determine which page numbers to display (e.g., with ellipsis)
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5; // Example: Show up to 5 page numbers including ellipsis
    const halfPagesToShow = Math.floor(maxPagesToShow / 2);

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pageNumbers.push(i);
      }
    } else {
      // Always show first page
      pageNumbers.push(1);
      if (currentPage > halfPagesToShow + 1) {
        pageNumbers.push("..."); // Ellipsis before current page block
      }

      let startPage = Math.max(2, currentPage - halfPagesToShow + (currentPage < totalPages - halfPagesToShow ? 0 : 1));
      let endPage = Math.min(totalPages - 1, currentPage + halfPagesToShow - (currentPage > halfPagesToShow ? 0 : 1));
      
      // Adjust if near the beginning
      if (currentPage <= halfPagesToShow) {
        endPage = Math.min(totalPages -1, maxPagesToShow - 2); // -2 for first and last page
        startPage = 2;
      }
      // Adjust if near the end
      else if (currentPage >= totalPages - halfPagesToShow +1) {
        startPage = Math.max(2, totalPages - maxPagesToShow + 3); // +3 to account for first, last, and one ellipsis
        endPage = totalPages -1;
      }


      for (let i = startPage; i <= endPage; i++) {
        pageNumbers.push(i);
      }

      if (currentPage < totalPages - halfPagesToShow) {
        pageNumbers.push("..."); // Ellipsis after current page block
      }
      // Always show last page
      pageNumbers.push(totalPages);
    }
    return pageNumbers;
  };

  const pageDisplay = getPageNumbers();

  return (
    <div className="mt-8 flex items-center justify-center space-x-2 pb-4">
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
        disabled={currentPage === 1}
        className="h-9 rounded-md border-gray-300 px-3 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
      >
        Previous
      </Button>
      <div className="flex items-center space-x-1">
        {pageDisplay.map((page, index) =>
          typeof page === "number" ? (
            <Button
              key={page}
              variant={page === currentPage ? "default" : "outline"}
              size="sm"
              onClick={() => onPageChange(page)}
              className={`size-9 rounded-md border-gray-300 px-0 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-700 ${
                page === currentPage
                  ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  : "bg-white dark:bg-gray-800"
              }`}
            >
              {page}
            </Button>
          ) : (
            <span
              key={`ellipsis-${index}`}
              className="px-1.5 py-1 text-sm text-gray-400 dark:text-gray-500"
            >
              {page}
            </span>
          )
        )}
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
        disabled={currentPage === totalPages}
        className="h-9 rounded-md border-gray-300 px-3 hover:bg-gray-100 disabled:opacity-50 dark:border-gray-600 dark:hover:bg-gray-700"
      >
        Next
      </Button>
    </div>
  );
} 