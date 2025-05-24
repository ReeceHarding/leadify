"use client";

import React from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Filter, ArrowUpDown } from "lucide-react";

interface FiltersAndSortingProps {
  filterKeyword: string;
  onFilterKeywordChange: (value: string) => void;
  filterScore: number;
  onFilterScoreChange: (value: number) => void;
  sortBy: "relevance" | "upvotes" | "time";
  onSortByChange: (value: "relevance" | "upvotes" | "time") => void;
  paginatedLeadsCount: number;
  totalFilteredLeadsCount: number;
  disabled: boolean; // Overall disable state (e.g., no leads)
}

export default function FiltersAndSorting({
  filterKeyword,
  onFilterKeywordChange,
  filterScore,
  onFilterScoreChange,
  sortBy,
  onSortByChange,
  paginatedLeadsCount,
  totalFilteredLeadsCount,
  disabled
}: FiltersAndSortingProps) {
  return (
    <div className="bg-card rounded-lg border p-3 shadow-sm dark:border-gray-700">
      <div className="flex flex-col flex-wrap items-stretch gap-3 sm:flex-row sm:items-center">
        <div className="flex grow items-center gap-2">
          <Filter className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
          <Input
            placeholder="Filter by keyword..."
            value={filterKeyword}
            onChange={e => onFilterKeywordChange(e.target.value)}
            className="h-9 grow rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            disabled={disabled}
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-nowrap text-sm text-gray-600 dark:text-gray-400">
            Min. Score:
          </span>
          <Input
            type="number"
            min="0"
            max="100"
            value={filterScore}
            onChange={e => onFilterScoreChange(Number(e.target.value))}
            className="h-9 w-20 rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700"
            disabled={disabled}
          />
        </div>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
          <Select value={sortBy} onValueChange={onSortByChange as any} disabled={disabled}>
            <SelectTrigger className="h-9 w-[130px] rounded-md border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Relevance</SelectItem>
              <SelectItem value="upvotes">Upvotes</SelectItem>
              <SelectItem value="time">Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="mt-2 text-right text-sm text-gray-500 sm:ml-auto sm:mt-0 dark:text-gray-400">
          {paginatedLeadsCount} of {totalFilteredLeadsCount}
        </div>
      </div>
    </div>
  );
} 