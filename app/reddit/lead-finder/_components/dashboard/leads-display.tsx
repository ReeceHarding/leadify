"use client";

import React from "react";
import { LeadResult, WorkflowProgress } from "./types";
import LeadCard from "./lead-card";
import ToneCustomizer from "./tone-customizer";
import FiltersAndSorting from "./filters-and-sorting";
import BatchPoster from "./batch-poster";
import PaginationControls from "./pagination-controls";
import {
  EnhancedLeadSkeleton,
  GenerationProgress
} from "../enhanced-loading-states"; // Adjust path as these are one level up
import {
  EnhancedErrorState,
  EmptyState
} from "../enhanced-error-states"; // Adjust path
import { MessageSquare } from "lucide-react";

interface LeadsDisplayProps {
  workflowProgress: WorkflowProgress;
  leads: LeadResult[];
  filteredAndSortedLeads: LeadResult[];
  paginatedLeads: LeadResult[];
  newLeadIds: Set<string>;
  activeTab: "all" | "queue";
  campaignId: string | null;

  // Props for child components
  selectedLength: "micro" | "medium" | "verbose";
  onEditComment: (leadId: string, newComment: string) => Promise<void>;
  onPostComment: (lead: LeadResult) => Promise<void>;
  onQueueComment: (lead: LeadResult) => Promise<void>;
  onViewComments?: (lead: LeadResult) => void;
  postingLeadId: string | null;
  queuingLeadId: string | null;
  
  toneInstruction: string;
  onToneInstructionChange: (value: string) => void;
  onRegenerateAllTones: () => void;
  isRegeneratingAllTones: boolean;
  
  filterKeyword: string;
  onFilterKeywordChange: (value: string) => void;
  filterScore: number;
  onFilterScoreChange: (value: number) => void;
  sortBy: "relevance" | "upvotes" | "time";
  onSortByChange: (value: "relevance" | "upvotes" | "time") => void;
  
  approvedLeadsCount: number;
  onBatchPostQueue: () => void;
  isBatchPosting: boolean;
  
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;

  onTriggerCreateCampaign: () => void; // For empty state action
}

export default function LeadsDisplay({
  workflowProgress,
  leads,
  filteredAndSortedLeads,
  paginatedLeads,
  newLeadIds,
  activeTab,
  campaignId,
  selectedLength,
  onEditComment,
  onPostComment,
  onQueueComment,
  onViewComments,
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

  const renderLoadingSkeleton = () => <EnhancedLeadSkeleton />;

  const renderWorkflowProgress = () => (
    <div className="space-y-6">
      {workflowProgress.error ? (
        <EnhancedErrorState
          error={workflowProgress.error}
          onRetry={() => window.location.reload()} // Or a more specific retry if possible
        />
      ) : (
        <GenerationProgress
          currentStep={workflowProgress.currentStep}
          completedSteps={workflowProgress.completedSteps}
          totalSteps={workflowProgress.totalSteps}
          foundLeads={leads.length} // Use total leads before filtering for this progress text
        />
      )}
      {/* Show skeleton only if isLoading is true AND no error AND no leads yet from any source */}
      {workflowProgress.isLoading && !workflowProgress.error && leads.length === 0 && renderLoadingSkeleton()}
    </div>
  );

  // Main conditional rendering logic
  if (workflowProgress.isLoading && leads.length === 0 && !workflowProgress.error) {
    return renderWorkflowProgress();
  }
  
  if (workflowProgress.error && leads.length === 0) {
    // Prominent error display if loading finished with an error and no leads were ever loaded
    return (
      <EnhancedErrorState
        error={workflowProgress.error}
        onRetry={() => window.location.reload()} // Or a more specific retry action
      />
    );
  }

  return (
    <>
      {/* Tone Regeneration Box - Show only if leads (any leads, not just filtered) exist */}
      {leads.length > 0 && (
        <ToneCustomizer
          toneInstruction={toneInstruction}
          onToneInstructionChange={onToneInstructionChange}
          onRegenerateAll={onRegenerateAllTones}
          isRegeneratingAll={isRegeneratingAllTones}
          disabled={leads.length === 0} 
        />
      )}

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
          disabled={leads.length === 0}
        />
      )}

      {/* Batch Posting UI - Show only in queue tab and if there are approved leads */}
      {activeTab === "queue" && (
        <BatchPoster
          approvedLeadsCount={approvedLeadsCount}
          onBatchPostQueue={onBatchPostQueue}
          isBatchPosting={isBatchPosting}
        />
      )}

      {/* Results Grid or Empty State */}
      {filteredAndSortedLeads.length > 0 ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 2xl:grid-cols-3">
          {paginatedLeads.map(lead => (
            <LeadCard
              key={lead.id}
              lead={lead}
              selectedLength={selectedLength}
              onEdit={onEditComment}
              onPost={onPostComment}
              onQueue={onQueueComment}
              onViewComments={onViewComments}
              isPosting={postingLeadId === lead.id}
              isQueueing={queuingLeadId === lead.id}
            />
          ))}
        </div>
      ) : (
        // Show empty state only if not globally loading, no errors, but still no filtered leads
        !workflowProgress.isLoading && !workflowProgress.error && (
          <EmptyState
            title="No leads found"
            description={
              campaignId
                ? "No leads match your current filters or the campaign is still processing."
                : "Select or create a campaign to start finding leads."
            }
            icon={<MessageSquare className="size-12" />}
            action={
              !campaignId
                ? {
                    label: "Create New Campaign",
                    onClick: onTriggerCreateCampaign
                  }
                : filterKeyword || filterScore > 0
                ? {
                    label: "Clear Filters",
                    onClick: () => {
                      onFilterKeywordChange("");
                      onFilterScoreChange(0);
                    }
                  }
                : undefined
            }
          />
        )
      )}

      <PaginationControls
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  );
} 