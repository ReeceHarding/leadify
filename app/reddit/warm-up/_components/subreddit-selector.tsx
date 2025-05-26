"use client"

import { useState, useCallback, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, X, Plus, Sparkles, Search } from "lucide-react"
import {
  searchSubredditsAction,
  getRedditUserInfoAction
} from "@/actions/integrations/reddit/reddit-warmup-actions"
import { searchSubredditsAction as searchSubredditsCSVAction } from "@/actions/integrations/reddit/subreddit-search-actions"
import { recommendSubredditsAction } from "@/actions/integrations/openai/warmup-content-generation-actions"
import { getKnowledgeBaseByOrganizationIdAction } from "@/actions/db/personalization-actions"
import {
  createWarmupAccountAction,
  updateWarmupAccountAction
} from "@/actions/db/warmup-actions"
import { SerializedWarmupAccountDocument } from "@/db/firestore/warmup-collections"
import { useOrganization } from "@/components/utilities/organization-provider"
import { debounce } from "lodash"
import type { SubredditData } from "@/actions/integrations/reddit/subreddit-search-actions"

interface SubredditSelectorProps {
  userId: string
  warmupAccount: SerializedWarmupAccountDocument | null
  onUpdate: () => void
  organizationId: string
}

export default function SubredditSelector({
  userId,
  warmupAccount,
  onUpdate,
  organizationId
}: SubredditSelectorProps) {
  const { activeOrganization } = useOrganization()
  const { toast } = useToast()

  const currentOrganizationId =
    organizationId || warmupAccount?.organizationId || activeOrganization?.id

  const [selectedSubreddits, setSelectedSubreddits] = useState<string[]>(
    warmupAccount?.targetSubreddits || []
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<SubredditData[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasLoadedInitialSuggestions, setHasLoadedInitialSuggestions] =
    useState(false)

  useEffect(() => {
    if (
      currentOrganizationId &&
      activeOrganization &&
      !hasLoadedInitialSuggestions &&
      selectedSubreddits.length === 0
    ) {
      loadInitialSuggestions()
    }
  }, [
    currentOrganizationId,
    activeOrganization,
    hasLoadedInitialSuggestions,
    selectedSubreddits.length
  ])

  const loadInitialSuggestions = async () => {
    if (!currentOrganizationId || !activeOrganization) return

    try {
      console.log(
        "🤖 [SUBREDDIT-SELECTOR] Loading initial AI suggestions based on knowledge base"
      )

      const kbResult = await getKnowledgeBaseByOrganizationIdAction(
        currentOrganizationId
      )

      let productDesc = activeOrganization.name || ""
      if (activeOrganization.businessDescription) {
        productDesc += ` - ${activeOrganization.businessDescription}`
      }
      if (kbResult.isSuccess && kbResult.data) {
        if (kbResult.data.summary) {
          productDesc += ` ${kbResult.data.summary}`
        }
        if (kbResult.data.customInformation) {
          productDesc += ` ${kbResult.data.customInformation}`
        }
      }
      if (activeOrganization.website) {
        productDesc += ` (Website: ${activeOrganization.website})`
      }

      const keywordsForRecommendation =
        (activeOrganization as any).keywordsForAi || []

      const result = await recommendSubredditsAction(
        keywordsForRecommendation,
        productDesc
      )

      if (result.isSuccess && result.data) {
        const recommendedSubreddits = result.data
          .slice(0, 3)
          .map(rec => rec.subreddit)

        setSelectedSubreddits(recommendedSubreddits)
        setHasLoadedInitialSuggestions(true)

        toast({
          title: "AI Suggestions Applied",
          description: `Automatically selected ${recommendedSubreddits.length} relevant subreddits based on your organization's profile`
        })
      }
    } catch (error) {
      console.error(
        "❌ [SUBREDDIT-SELECTOR] Error loading initial suggestions:",
        error
      )
    }
  }

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestions([])
        return
      }

      setIsSearching(true)
      try {
        console.log(`🔍 [SUBREDDIT-SELECTOR] Searching for: "${query}"`)
        const result = await searchSubredditsCSVAction(query, 20)

        if (result.isSuccess && result.data) {
          setSuggestions(result.data)
          console.log(
            "🔍 [SUBREDDIT-SELECTOR] Found subreddits:",
            result.data.length
          )
        }
      } catch (error) {
        console.error("❌ [SUBREDDIT-SELECTOR] Search error:", error)
      } finally {
        setIsSearching(false)
      }
    }, 300),
    []
  )

  useEffect(() => {
    debouncedSearch(searchQuery)
  }, [searchQuery, debouncedSearch])

  const handleAddSubreddit = (subreddit: string) => {
    if (!selectedSubreddits.includes(subreddit)) {
      setSelectedSubreddits([...selectedSubreddits, subreddit])
    }
    setSearchQuery("")
    setIsOpen(false)
  }

  const handleRemoveSubreddit = (subreddit: string) => {
    setSelectedSubreddits(selectedSubreddits.filter(s => s !== subreddit))
  }

  const handleGenerateRecommendations = async () => {
    if (!currentOrganizationId || !activeOrganization) {
      toast({
        title: "Error",
        description: "Organization not available for recommendations.",
        variant: "destructive"
      })
      return
    }
    try {
      setIsGenerating(true)
      console.log(
        "🤖 [SUBREDDIT-SELECTOR] Generating recommendations for org:",
        currentOrganizationId
      )

      let productDesc = activeOrganization.name || ""
      if (activeOrganization.businessDescription) {
        productDesc += ` - ${activeOrganization.businessDescription}`
      }
      if (activeOrganization.website) {
        productDesc += ` (Website: ${activeOrganization.website})`
      }
      if (productDesc.trim() === "") {
        productDesc = "General business providing services/products."
      }

      const keywordsForRecommendation =
        (activeOrganization as any).keywordsForAi || []

      const result = await recommendSubredditsAction(
        keywordsForRecommendation,
        productDesc
      )

      if (result.isSuccess && result.data) {
        const newSubreddits = result.data
          .filter(rec => !selectedSubreddits.includes(rec.subreddit))
          .map(rec => rec.subreddit)
          .slice(0, 5)

        setSelectedSubreddits(prev => [...new Set([...prev, ...newSubreddits])])
        toast({
          title: "Recommendations Added",
          description: `Added ${newSubreddits.length} recommended subreddits`
        })
      } else {
        toast({
          title: "AI Suggestion Error",
          description: result.message || "Could not generate suggestions.",
          variant: "destructive"
        })
      }
    } catch (error) {
      console.error(
        "❌ [SUBREDDIT-SELECTOR] Error generating recommendations:",
        error
      )
      toast({
        title: "Error",
        description: "Failed to generate recommendations",
        variant: "destructive"
      })
    } finally {
      setIsGenerating(false)
    }
  }

  const handleSave = async () => {
    if (!currentOrganizationId) {
      toast({
        title: "Error",
        description: "Organization not identified for saving.",
        variant: "destructive"
      })
      return
    }
    try {
      setIsSaving(true)
      console.log(
        "💾 [SUBREDDIT-SELECTOR] Saving subreddits for org:",
        currentOrganizationId
      )

      if (
        warmupAccount &&
        warmupAccount.organizationId === currentOrganizationId
      ) {
        const result = await updateWarmupAccountAction(warmupAccount.id, {
          targetSubreddits: selectedSubreddits
        })
        if (result.isSuccess) {
          toast({
            title: "Success",
            description: "Subreddits updated successfully"
          })
          onUpdate()
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
          })
        }
      } else {
        const userResult = await getRedditUserInfoAction(currentOrganizationId)
        if (!userResult.isSuccess || !userResult.data) {
          toast({
            title: "Error",
            description:
              userResult.message ||
              "Please connect your organization\'s Reddit account first",
            variant: "destructive"
          })
          setIsSaving(false)
          return
        }

        const result = await createWarmupAccountAction({
          userId,
          organizationId: currentOrganizationId,
          redditUsername: userResult.data.name,
          targetSubreddits: selectedSubreddits
        })
        if (result.isSuccess) {
          toast({
            title: "Success",
            description: "Warm-up account created successfully"
          })
          onUpdate()
        } else {
          toast({
            title: "Error",
            description: result.message,
            variant: "destructive"
          })
        }
      }
    } catch (error) {
      console.error("❌ [SUBREDDIT-SELECTOR] Error saving:", error)
      toast({
        title: "Error",
        description: "Failed to save subreddits",
        variant: "destructive"
      })
    } finally {
      setIsSaving(false)
    }
  }

  const formatSubscribers = (count: string) => {
    const num = parseInt(count)
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}M`
    }
    if (num >= 1000) {
      return `${(num / 1000).toFixed(1)}K`
    }
    return count
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Target Subreddits</CardTitle>
        <CardDescription>
          Select subreddits where your organization{" "}
          <span className="font-semibold">
            {activeOrganization?.name || "selected organization"}
          </span>{" "}
          wants to build karma and authority.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={isOpen}
                className="flex-1 justify-start"
                disabled={!currentOrganizationId}
              >
                <Search className="mr-2 size-4" />
                Search for subreddits...
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-full p-0" align="start">
              <Command>
                <CommandInput
                  placeholder="Search subreddits..."
                  value={searchQuery}
                  onValueChange={setSearchQuery}
                  disabled={!currentOrganizationId}
                />
                <CommandList>
                  {isSearching ? (
                    <CommandEmpty>
                      <Loader2 className="mx-auto size-4 animate-spin" />
                    </CommandEmpty>
                  ) : suggestions.length === 0 ? (
                    <CommandEmpty>No subreddits found.</CommandEmpty>
                  ) : (
                    <CommandGroup>
                      {suggestions.map(sub => (
                        <CommandItem
                          key={sub.base10_id}
                          onSelect={() =>
                            handleAddSubreddit(sub.subreddit_name)
                          }
                        >
                          <div className="flex-1">
                            <div className="font-medium">
                              r/{sub.subreddit_name}
                            </div>
                            {sub.subscribers_count &&
                              sub.subscribers_count !== "None" && (
                                <div className="text-muted-foreground text-sm">
                                  {formatSubscribers(sub.subscribers_count)}{" "}
                                  members
                                </div>
                              )}
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  )}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>

          <Button
            variant="outline"
            onClick={handleGenerateRecommendations}
            disabled={isGenerating || !currentOrganizationId}
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            <span className="ml-2 hidden sm:inline">AI Suggest</span>
          </Button>
        </div>

        <div className="space-y-2">
          <p className="text-sm font-medium">
            Selected Subreddits ({selectedSubreddits.length})
          </p>
          <div className="flex flex-wrap gap-2">
            {selectedSubreddits.length === 0 ? (
              <p className="text-muted-foreground text-sm">
                No subreddits selected. Search or use AI to suggest.
              </p>
            ) : (
              selectedSubreddits.map(subreddit => (
                <Badge key={subreddit} variant="secondary" className="pr-1">
                  r/{subreddit}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="ml-2 size-4 p-0"
                    onClick={() => handleRemoveSubreddit(subreddit)}
                  >
                    <X className="size-3" />
                  </Button>
                </Badge>
              ))
            )}
          </div>
        </div>

        <Button
          onClick={handleSave}
          disabled={
            isSaving ||
            selectedSubreddits.length === 0 ||
            !currentOrganizationId
          }
          className="w-full"
        >
          {isSaving ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Plus className="mr-2 size-4" />
              {warmupAccount ? "Update Subreddits" : "Create Warm-up Account"}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
