"use client"

import { useState, useCallback, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, X, Plus, Sparkles, Search } from "lucide-react"
import { searchSubredditsAction, getRedditUserInfoAction } from "@/actions/integrations/reddit/reddit-warmup-actions"
import { recommendSubredditsAction } from "@/actions/integrations/openai/warmup-content-generation-actions"
import { createWarmupAccountAction, updateWarmupAccountAction } from "@/actions/db/warmup-actions"
import { getProfileByUserIdAction } from "@/actions/db/profiles-actions"
import { SerializedWarmupAccountDocument } from "@/db/firestore/warmup-collections"
import { debounce } from "lodash"

interface SubredditSelectorProps {
  userId: string
  warmupAccount: SerializedWarmupAccountDocument | null
  onUpdate: () => void
}

interface SubredditSuggestion {
  name: string
  subscribers?: number
  description?: string
}

export default function SubredditSelector({ userId, warmupAccount, onUpdate }: SubredditSelectorProps) {
  const [selectedSubreddits, setSelectedSubreddits] = useState<string[]>(
    warmupAccount?.targetSubreddits || []
  )
  const [searchQuery, setSearchQuery] = useState("")
  const [suggestions, setSuggestions] = useState<SubredditSuggestion[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const { toast } = useToast()

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (query.length < 2) {
        setSuggestions([])
        return
      }

      setIsSearching(true)
      try {
        console.log("🔍 [SUBREDDIT-SELECTOR] Searching for:", query)
        const result = await searchSubredditsAction(query)
        
        if (result.isSuccess && result.data) {
          setSuggestions(
            result.data.map(sub => ({
              name: sub.display_name,
              subscribers: sub.subscribers,
              description: sub.public_description
            }))
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
    try {
      setIsGenerating(true)
      console.log("🤖 [SUBREDDIT-SELECTOR] Generating recommendations")
      
      // Get user profile for keywords
      const profileResult = await getProfileByUserIdAction(userId)
      if (!profileResult.isSuccess || !profileResult.data) {
        toast({
          title: "Error",
          description: "Please complete your profile first",
          variant: "destructive"
        })
        return
      }

      const keywords = profileResult.data.keywords || []
      const website = profileResult.data.website || ""
      
      const result = await recommendSubredditsAction(keywords, website)
      
      if (result.isSuccess && result.data) {
        // Show recommendations in a dialog or add them directly
        const newSubreddits = result.data
          .filter(rec => !selectedSubreddits.includes(rec.subreddit))
          .map(rec => rec.subreddit)
          .slice(0, 5) // Add top 5
        
        setSelectedSubreddits([...selectedSubreddits, ...newSubreddits])
        
        toast({
          title: "Recommendations Added",
          description: `Added ${newSubreddits.length} recommended subreddits`
        })
      }
    } catch (error) {
      console.error("❌ [SUBREDDIT-SELECTOR] Error generating recommendations:", error)
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
    try {
      setIsSaving(true)
      console.log("💾 [SUBREDDIT-SELECTOR] Saving subreddits")
      
      if (warmupAccount) {
        // Update existing account
        const result = await updateWarmupAccountAction(warmupAccount.id, {
          targetSubreddits: selectedSubreddits
        })
        
        if (result.isSuccess) {
          toast({
            title: "Success",
            description: "Subreddits updated successfully"
          })
          onUpdate()
        }
      } else {
        // Create new account
        const userResult = await getRedditUserInfoAction()
        if (!userResult.isSuccess || !userResult.data) {
          toast({
            title: "Error",
            description: "Please connect your Reddit account first",
            variant: "destructive"
          })
          return
        }

        const result = await createWarmupAccountAction({
          userId,
          redditUsername: userResult.data.name,
          targetSubreddits: selectedSubreddits
        })
        
        if (result.isSuccess) {
          toast({
            title: "Success",
            description: "Warm-up account created successfully"
          })
          onUpdate()
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Target Subreddits</CardTitle>
        <CardDescription>
          Select subreddits where you want to build karma and authority
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                role="combobox"
                aria-expanded={isOpen}
                className="flex-1 justify-start"
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
                      {suggestions.map((sub) => (
                        <CommandItem
                          key={sub.name}
                          onSelect={() => handleAddSubreddit(sub.name)}
                        >
                          <div className="flex-1">
                            <div className="font-medium">r/{sub.name}</div>
                            {sub.subscribers && (
                              <div className="text-muted-foreground text-sm">
                                {sub.subscribers.toLocaleString()} members
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
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Sparkles className="size-4" />
            )}
            <span className="ml-2 hidden sm:inline">AI Suggest</span>
          </Button>
        </div>

        {/* Selected Subreddits */}
        <div className="space-y-2">
          <p className="text-sm font-medium">Selected Subreddits ({selectedSubreddits.length})</p>
          <div className="flex flex-wrap gap-2">
            {selectedSubreddits.length === 0 ? (
              <p className="text-muted-foreground text-sm">No subreddits selected</p>
            ) : (
              selectedSubreddits.map((subreddit) => (
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

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving || selectedSubreddits.length === 0}
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