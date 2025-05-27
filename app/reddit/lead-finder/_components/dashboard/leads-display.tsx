"use client"

import React from "react"
import { LeadResult } from "./types"
import { LeadGenerationProgress } from "@/types"
import LeadCard from "./lead-card"
import ToneCustomizer from "./tone-customizer"
import FiltersAndSorting from "./filters-and-sorting"
import BatchPoster from "./batch-poster"
import PaginationControls from "./pagination-controls"
import {
  EnhancedLeadSkeleton,
  GenerationProgress
} from "@/app/reddit/lead-finder/_components/enhanced-loading-states"
import { EnhancedErrorState, EmptyState } from "@/app/reddit/lead-finder/_components/enhanced-error-states"
import { MessageSquare, Search, Filter } from "lucide-react"

interface LeadsDisplayProps {
  // Add workflowProgress back as we need it to show the progress
  workflowProgress?: LeadGenerationProgress | null
  leads: LeadResult[]
  filteredAndSortedLeads: LeadResult[]
  paginatedLeads: LeadResult[]
  newLeadIds: Set<string>
  activeTab: "all" | "queue"
  campaignId: string | null
  isWorkflowRunning?: boolean // Add this prop to know if workflow is running

  // Props for child components
  selectedLength: "micro" | "medium" | "verbose"
  onEditComment: (leadId: string, newComment: string) => Promise<void>
  onPostComment: (lead: LeadResult) => Promise<void>
  onQueueComment: (lead: LeadResult) => Promise<void>
  onViewComments?: (lead: LeadResult) => void
  onRegenerateWithInstructions?: (
    leadId: string,
    instructions: string
  ) => Promise<void>
  postingLeadId: string | null
  queuingLeadId: string | null

  toneInstruction: string
  onToneInstructionChange: (value: string) => void
  onRegenerateAllTones: () => void
  isRegeneratingAllTones: boolean

  filterKeyword: string
  onFilterKeywordChange: (value: string) => void
  filterScore: number
  onFilterScoreChange: (value: number) => void
  sortBy: "relevance" | "upvotes" | "time"
  onSortByChange: (value: "relevance" | "upvotes" | "time") => void

  approvedLeadsCount: number
  onBatchPostQueue: () => void
  isBatchPosting: boolean

  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void

  onTriggerCreateCampaign: () => void // For empty state action
}

export default function LeadsDisplay({
  workflowProgress,
  leads,
  filteredAndSortedLeads,
  paginatedLeads,
  newLeadIds,
  activeTab,
  campaignId,
  isWorkflowRunning = false, // Add with default value
  selectedLength,
  onEditComment,
  onPostComment,
  onQueueComment,
  onViewComments,
  onRegenerateWithInstructions,
  postingLeadId,
  queuingLeadId,
  toneInstruction,
  onToneInstructionChange,
  onRegenerateAllTones,
  isRegeneratingAllTones,
  filterKeyword,
  onFilterKeywordChange,
  filterScore,
  onFilterScoreChange,
  sortBy,
  onSortByChange,
  approvedLeadsCount,
  onBatchPostQueue,
  isBatchPosting,
  currentPage,
  totalPages,
  onPageChange,
  onTriggerCreateCampaign
}: LeadsDisplayProps) {
  const renderLoadingSkeleton = () => <EnhancedLeadSkeleton />

  // Main conditional rendering logic
  // If there's a campaign selected but no leads, show appropriate state
  if (leads.length === 0 && campaignId) {
    // If workflow is running and we have progress data, show the progress
    if (
      isWorkflowRunning &&
      workflowProgress &&
      workflowProgress.status !== "completed" &&
      workflowProgress.status !== "error"
    ) {
      return <GenerationProgress progress={workflowProgress} className="" />
    }

    // Otherwise show empty state
    return (
      <EmptyState
        title="No leads found for this search yet"
        description="The lead search might still be in progress, or no matching discussions were found with your current keywords."
        icon={<Search className="size-12" />}
      />
    )
  }

  if (leads.length === 0 && !campaignId) {
    // No campaign selected, prompt to create one.
    return (
      <EmptyState
        title="No leads found"
        description="Select or create a lead search to start finding leads."
        icon={<MessageSquare className="size-12" />}
        action={{
          label: "Create New Lead Search",
          onClick: onTriggerCreateCampaign
        }}
      />
    )
  }

  // This error state is if fetching/filtering leads specifically fails,
  // not for the overall workflow error, which is handled by the parent.
  // Consider if a specific error prop for leads data is needed here.
  // For now, relying on leads.length for empty/non-empty display.

  return (
    <>
      {/* Tone Regeneration Box - Show only if leads (any leads, not just filtered) exist */}
      {/* REMOVED - This is already rendered in the parent component */}

      {/* Filters and Sorting - Show only if leads (any leads) exist */}
      {leads.length > 0 && (
        <FiltersAndSorting
          filterKeyword={filterKeyword}
          onFilterKeywordChange={onFilterKeywordChange}
          filterScore={filterScore}
          onFilterScoreChange={onFilterScoreChange}
          sortBy={sortBy}
          onSortByChange={onSortByChange}
          paginatedLeadsCount={paginatedLeads.length}
          totalFilteredLeadsCount={filteredAndSortedLeads.length}
          disabled={false}
        />
      )}

      {/* Batch Posting UI - Removed from here as it's handled in the parent */}

      {/* Results Grid or Empty State */}
      {filteredAndSortedLeads.length > 0 ? (
        <div className="space-y-4">
          {paginatedLeads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              selectedLength={selectedLength}
              onEdit={onEditComment}
              onPost={onPostComment}
              onQueue={onQueueComment}
              onViewComments={onViewComments}
              onRegenerateWithInstructions={onRegenerateWithInstructions}
              isPosting={postingLeadId === lead.id}
              isQueueing={queuingLeadId === lead.id}
            />
          ))}
        </div>
      ) : (
        // Show empty state only if not globally loading, no errors, but still no filtered leads
        // This condition might need refinement based on how parent handles overall loading/error
        <EmptyState
          title="No leads match your filters"
          description="Try adjusting your search query or filters."
          icon={<Filter className="size-12" />}
          action={
            filterKeyword || filterScore > 0
              ? {
                  label: "Clear Filters",
                  onClick: () => {
                    onFilterKeywordChange("")
                    onFilterScoreChange(0)
                  }
                }
              : undefined
          }
        />
      )}

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  )
}
