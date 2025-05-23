"use client"

import { useState, useEffect } from "react"
import {
  Plus,
  Search,
  Target,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Eye,
  Copy,
  ExternalLink,
  User,
  Calendar,
  ThumbsUp,
  Sparkles
} from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Progress } from "@/components/ui/progress"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import CreateCampaignDialog from "./create-campaign-dialog"
import CampaignsList from "./campaigns-list"

// Mock data to simulate results
const mockLeads = [
  {
    id: "1",
    author: "john11",
    subreddit: "r/entrepreneur",
    title: "Cold outreach is underrated.",
    content:
      "Sending short, personalized emails (no more than 3 sentences) focused on starting a conversation—not selling—is what actually gets replies. 20 messages a day = 1 new customer most days. It's boring, but it works.",
    score: 85,
    comments: 45,
    timeAgo: "2h",
    generatedComment:
      "This is exactly what we've found too! Short emails work so much better than long pitches. What's your typical response rate?",
    commentLength: "medium" as const,
    url: "https://reddit.com/r/entrepreneur/comments/abc123"
  },
  {
    id: "2",
    author: "john11",
    subreddit: "r/entrepreneur",
    title: "Free mini tools drive real traffic.",
    content:
      "Pull one specific feature from your paid product, turn it into a standalone web app, and don't require sign-up. One simple tool brought in 10,000 users in 24 hours with zero marketing spend.",
    score: 92,
    comments: 67,
    timeAgo: "4h",
    generatedComment:
      "Love this strategy! We've seen similar results with mini tools. What kind of tool did you create that got such great traction?",
    commentLength: "medium" as const,
    url: "https://reddit.com/r/entrepreneur/comments/def456"
  },
  {
    id: "3",
    author: "john11",
    subreddit: "r/entrepreneur",
    title: "Launching on Product Hunt? Here's what moved the needle for me:",
    content:
      "- Pick an outcome-driven name & logo that's self-explanatory\n- Your headline should be about the user, not your product\n- Use a badge linking back to your launch to get more upvotes from site visitors\n\nSimple details, big impact.",
    score: 78,
    comments: 23,
    timeAgo: "6h",
    generatedComment:
      "Great tips! The user-focused headline advice is gold. How much traffic did the badge on your site actually drive back to PH?",
    commentLength: "medium" as const,
    url: "https://reddit.com/r/entrepreneur/comments/ghi789"
  },
  {
    id: "4",
    author: "john11",
    subreddit: "r/entrepreneur",
    title:
      "Affiliate programs aren't worth your time until your product already converts.",
    content:
      "But once it does, reward affiliates generously (30-50%) and make sure you provide easy-to-share assets + a page packed with real earnings proof. Transparency matters most.",
    score: 88,
    comments: 34,
    timeAgo: "8h",
    generatedComment:
      "Absolutely agree on the conversion point. What kind of earnings proof works best in your experience? Screenshots or case studies?",
    commentLength: "medium" as const,
    url: "https://reddit.com/r/entrepreneur/comments/jkl012"
  },
  {
    id: "5",
    author: "john11",
    subreddit: "r/entrepreneur",
    title: "Programmatic SEO isn't magic, but it scales.",
    content:
      "Generate long-tail keyword pages using one template, add unique data, and get real backlinks from launch directories. Expect months, not days, before you see steady traffic. Patience is required.",
    score: 74,
    comments: 18,
    timeAgo: "12h",
    generatedComment:
      "Good point about the timeline. How many pages did you generate before seeing meaningful results? And which directories worked best?",
    commentLength: "medium" as const,
    url: "https://reddit.com/r/entrepreneur/comments/mno345"
  },
  {
    id: "6",
    author: "john11",
    subreddit: "r/entrepreneur",
    title: "Building a personal brand means playing the long game.",
    content:
      "Stick to one main platform, shape your profile around your target outcome: behind-the-scenes, results, or lessons. Copy what works—but add your signature twist. Transparency matters most.",
    score: 81,
    comments: 29,
    timeAgo: "1d",
    generatedComment:
      "Smart approach! What platform has worked best for you, and how long did it take to see real business impact from your personal brand?",
    commentLength: "medium" as const,
    url: "https://reddit.com/r/entrepreneur/comments/pqr678"
  }
]

export default function LeadFinderDashboard() {
  const [selectedLength, setSelectedLength] = useState<
    "micro" | "medium" | "verbose"
  >("medium")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    // You could add a toast notification here
  }

  return (
    <div className="flex h-full">
      {/* Sidebar */}
      <div className="w-80 border-r bg-gray-50 p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-xl font-semibold">Lead Finder</h2>
            <p className="text-sm text-gray-600">
              You're on the free plan. Upgrade to get 100 Generations every
              month.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full border-0 bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700"
            >
              Upgrade
            </Button>
          </div>

          <Separator />

          {/* Create Posts */}
          <div className="space-y-3">
            <h3 className="font-medium">📝 Create Posts</h3>
            <Button
              onClick={() => setCreateDialogOpen(true)}
              variant="outline"
              size="sm"
              className="w-full justify-start"
            >
              <Plus className="mr-2 size-4" />
              Post Library
            </Button>
          </div>

          <Separator />

          {/* Learning Center */}
          <div className="space-y-3">
            <h3 className="font-medium">📚 Learning Center</h3>
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
              >
                Getting Started
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
              >
                Best Practices
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
              >
                Video Tutorials
              </Button>
            </div>
          </div>

          <Separator />

          {/* Content */}
          <div className="space-y-3">
            <h3 className="font-medium">📄 Content</h3>
            <div className="space-y-1">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
              >
                📚 Knowledge Base
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start text-sm"
              >
                🗣️ Voice
              </Button>
            </div>
          </div>

          <Separator />

          {/* User Profile */}
          <div className="flex items-center gap-3">
            <Avatar className="size-8">
              <AvatarImage src="https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=32&h=32&fit=crop&crop=face" />
              <AvatarFallback>RH</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">Reece Harding</p>
              <p className="text-xs text-gray-500">rharding123@gmail.com</p>
            </div>
          </div>

          {/* Feedback */}
          <div className="space-y-2">
            <p className="text-sm text-gray-600">
              Share your thoughts and help us to improve Lead Finder
            </p>
            <Button variant="outline" size="sm" className="w-full">
              📝 Send Feedback
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-6">
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Results</h1>
            <div className="flex items-center gap-4">
              <Select
                value={selectedLength}
                onValueChange={(value: any) => setSelectedLength(value)}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="micro">Micro</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="verbose">Verbose</SelectItem>
                </SelectContent>
              </Select>
              <Button
                onClick={() => setCreateDialogOpen(true)}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                <Plus className="mr-2 size-4" />
                New Campaign
              </Button>
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {mockLeads.map(lead => (
              <Card key={lead.id} className="transition-shadow hover:shadow-md">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-6">
                        <AvatarFallback className="text-xs">
                          {lead.author.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{lead.author}</span>
                      <span className="text-sm text-gray-500">
                        @{lead.author}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="icon">
                        <Copy className="size-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Post Content */}
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">{lead.title}</h3>
                    <p className="line-clamp-3 text-sm text-gray-600">
                      {lead.content}
                    </p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <ThumbsUp className="size-3" />
                        {lead.score}
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare className="size-3" />
                        {lead.comments}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" />
                        {lead.timeAgo}
                      </span>
                    </div>
                  </div>

                  {/* Generated Comment */}
                  <div className="space-y-2 border-t pt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Generated Comment
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-xs">
                          Score: {lead.score}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(lead.generatedComment)}
                        >
                          Add to drafts
                        </Button>
                      </div>
                    </div>
                    <p className="rounded-md bg-gray-50 p-3 text-sm">
                      {lead.generatedComment}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs capitalize text-gray-500">
                        {lead.commentLength} length
                      </span>
                      <Button variant="ghost" size="sm" asChild>
                        <a
                          href={lead.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="size-3" />
                        </a>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Create Campaign Dialog */}
      <CreateCampaignDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false)
        }}
      />
    </div>
  )
}
