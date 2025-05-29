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
import { MessageSquare, Search, Filter, ShieldAlert, AlertCircle } from "lucide-react"

interface LeadsDisplayProps {
  // Add workflowProgress back as we need it to show the progress
  workflowProgress?: LeadGenerationProgress | null
  leads: LeadResult[]
  filteredAndSortedLeads: LeadResult[]
  paginatedLeads: LeadResult[]
  newLeadIds: Set<string>
  activeTab: "all" | "queue"
  campaignId: string | null
  campaignStatus?: "draft" | "running" | "completed" | "paused" | "error" // Add campaign status
  isWorkflowRunning?: boolean // Add this prop to know if workflow is running
  viewMode?: "comment" | "dm" // Add viewMode prop

  // Props for child components
  selectedLength: "micro" | "medium" | "verbose"
  onEditComment: (leadId: string, newComment: string, isDM?: boolean) => Promise<void>
  onPostComment: (lead: LeadResult) => Promise<void>
  onQueueComment: (lead: LeadResult) => Promise<void>
  onSendDM?: (lead: LeadResult) => Promise<void> // Add DM sending handler
  onViewComments?: (lead: LeadResult) => void
  onRegenerateWithInstructions?: (
    leadId: string,
    instructions: string,
    isDM?: boolean
  ) => Promise<void>
  postingLeadId: string | null
  queuingLeadId: string | null
  sendingDMLeadId?: string | null // Add DM sending state

  toneInstruction: string
  onToneInstructionChange: (value: string) => void
  onRegenerateAllTones: () => void
  isRegeneratingAllTones: boolean

  filterKeyword: string
  onFilterKeywordChange: (value: string) => void
  filterScore: number
  onFilterScoreChange: (value: number) => void
  sortBy: "relevance" | "upvotes" | "time" | "fetched" | "posted"
  onSortByChange: (value: "relevance" | "upvotes" | "time" | "fetched" | "posted") => void

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
  campaignStatus,
  isWorkflowRunning = false, // Add with default value
  viewMode = "comment", // Add with default value
  selectedLength,
  onEditComment,
  onPostComment,
  onQueueComment,
  onSendDM,
  onViewComments,
  onRegenerateWithInstructions,
  postingLeadId,
  queuingLeadId,
  sendingDMLeadId,
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
    // NOTE: We're not showing GenerationProgress here anymore since the progress bar
    // is now shown in the parent component above the leads display
    if (
      isWorkflowRunning &&
      workflowProgress &&
      workflowProgress.status !== "completed" &&
      workflowProgress.status !== "error"
    ) {
      // Return empty state with a message that leads are being generated
      return (
        <EmptyState
          title="Finding leads for you..."
          description="We're searching Reddit for relevant discussions and generating personalized responses. New leads will appear here as they're found."
          icon={<Search className="size-12 animate-pulse" />}
        />
      )
    }

    // Check if there was an error in the workflow or campaign has error status
    if (workflowProgress?.status === "error" || campaignStatus === "error") {
      const errorMessage = workflowProgress?.error || "Lead generation failed"
      
      // Check specifically for Reddit auth error
      if (errorMessage.includes("No valid Reddit access token")) {
        return (
          <EmptyState
            title="Reddit Connection Required"
            description="Connect your Reddit account to start finding leads. This allows us to search Reddit discussions and generate personalized responses."
            icon={<ShieldAlert className="size-12" />}
            action={{
              label: "Connect Reddit Account",
              onClick: () => window.location.href = "/reddit/settings"
            }}
          />
        )
      }
      
      // Generic error state
      return (
        <EmptyState
          title="Lead generation failed"
          description={errorMessage || "An error occurred while generating leads. Please try again."}
          icon={<AlertCircle className="size-12" />}
          action={{
            label: "Try Again",
            onClick: () => window.location.reload()
          }}
        />
      )
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
              viewMode={viewMode}
              onEdit={onEditComment}
              onPost={onPostComment}
              onQueue={onQueueComment}
              onSendDM={onSendDM}
              onViewComments={onViewComments}
              onRegenerateWithInstructions={onRegenerateWithInstructions}
              isPosting={postingLeadId === lead.id}
              isQueueing={queuingLeadId === lead.id}
              isSendingDM={sendingDMLeadId === lead.id}
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
