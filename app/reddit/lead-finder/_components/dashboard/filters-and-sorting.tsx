"use client"

import React from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Filter, ArrowUpDown, TrendingUp } from "lucide-react"

interface FiltersAndSortingProps {
  filterKeyword: string
  onFilterKeywordChange: (value: string) => void
  filterScore: number
  onFilterScoreChange: (value: number) => void
  sortBy: "relevance" | "upvotes" | "time"
  onSortByChange: (value: "relevance" | "upvotes" | "time") => void
  paginatedLeadsCount: number
  totalFilteredLeadsCount: number
  disabled: boolean // Overall disable state (e.g., no leads)
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
  const scoreOptions = [
    { value: "0", label: "All Scores", color: "bg-gray-100 text-gray-700" },
    {
      value: "80",
      label: "80+ Excellent",
      color: "bg-green-100 text-green-700"
    },
    { value: "70", label: "70+ Great", color: "bg-yellow-100 text-yellow-700" },
    { value: "60", label: "60+ Good", color: "bg-orange-100 text-orange-700" },
    { value: "50", label: "50+ Fair", color: "bg-red-100 text-red-700" }
  ]

  return (
    <div className="bg-card rounded-lg border p-4 shadow-sm dark:border-gray-700">
      <div className="flex flex-col gap-4">
        {/* First row: Keyword filter and Score filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
            <TrendingUp className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <Select
              value={filterScore.toString()}
              onValueChange={value => onFilterScoreChange(Number(value))}
              disabled={disabled}
            >
              <SelectTrigger className="h-9 w-[160px] rounded-md border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-700">
                <SelectValue placeholder="Score Filter">
                  {scoreOptions.find(
                    opt => opt.value === filterScore.toString()
                  )?.label || "All Scores"}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {scoreOptions.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className={`text-xs ${option.color} border-0`}
                      >
                        {option.label}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Second row: Sort and count */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowUpDown className="size-4 shrink-0 text-gray-500 dark:text-gray-400" />
            <Select
              value={sortBy}
              onValueChange={onSortByChange as any}
              disabled={disabled}
            >
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

          <div className="text-sm text-gray-500 dark:text-gray-400">
            Showing {paginatedLeadsCount} of {totalFilteredLeadsCount} leads
          </div>
        </div>
      </div>
    </div>
  )
}
