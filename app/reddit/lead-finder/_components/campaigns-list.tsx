"use client"

import { useState, useEffect } from "react"
import { format } from "date-fns"
import {
  Eye,
  Play,
  Pause,
  Trash2,
  MoreHorizontal,
  ExternalLink
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"

interface Campaign {
  id: string
  name: string
  website: string
  keywords: string[]
  status: "draft" | "running" | "completed" | "paused" | "error"
  totalSearchResults: number
  totalThreadsAnalyzed: number
  totalCommentsGenerated: number
  createdAt: any // Firestore Timestamp
  updatedAt: any // Firestore Timestamp
}

interface CampaignsListProps {
  onSelectCampaign: (campaignId: string) => void
  onCreateNew: () => void
}

export default function CampaignsList({
  onSelectCampaign,
  onCreateNew
}: CampaignsListProps) {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadCampaigns()
  }, [])

  const loadCampaigns = async () => {
    setIsLoading(true)
    try {
      // TODO: Implement getCampaignsByUserIdAction
      // For now, show empty state
      setCampaigns([])
    } catch (error) {
      console.error("Error loading campaigns:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: Campaign["status"]) => {
    const statusConfig = {
      draft: {
        label: "Draft",
        variant: "secondary" as const,
        color: "bg-gray-100 text-gray-800"
      },
      running: {
        label: "Running",
        variant: "default" as const,
        color: "bg-blue-100 text-blue-800"
      },
      completed: {
        label: "Completed",
        variant: "default" as const,
        color: "bg-green-100 text-green-800"
      },
      paused: {
        label: "Paused",
        variant: "secondary" as const,
        color: "bg-yellow-100 text-yellow-800"
      },
      error: {
        label: "Error",
        variant: "destructive" as const,
        color: "bg-red-100 text-red-800"
      }
    }

    const config = statusConfig[status]
    return (
      <Badge variant={config.variant} className={config.color}>
        {config.label}
      </Badge>
    )
  }

  const getProgressPercentage = (campaign: Campaign) => {
    if (campaign.status === "completed") return 100
    if (campaign.status === "running") return 50
    if (campaign.status === "draft") return 0
    return 0
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>
            Loading your lead generation campaigns...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="size-12 rounded-lg" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[200px]" />
                  <Skeleton className="h-4 w-[150px]" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (campaigns.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Campaigns</CardTitle>
          <CardDescription>
            Manage your lead generation campaigns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="mb-4 rounded-full bg-blue-100 p-3">
              <Play className="size-6 text-blue-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold">No campaigns yet</h3>
            <p className="text-muted-foreground mb-6 max-w-sm">
              Create your first campaign to start finding quality leads on
              Reddit using AI-powered analysis.
            </p>
            <Button
              onClick={onCreateNew}
              className="bg-gradient-to-r from-blue-600 to-blue-700"
            >
              <Play className="mr-2 size-4" />
              Create Your First Campaign
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Campaigns</CardTitle>
            <CardDescription>
              Manage your lead generation campaigns ({campaigns.length} total)
            </CardDescription>
          </div>
          <Button
            onClick={onCreateNew}
            className="bg-gradient-to-r from-blue-600 to-blue-700"
          >
            <Play className="mr-2 size-4" />
            New Campaign
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Campaign</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Progress</TableHead>
              <TableHead>Results</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {campaigns.map(campaign => (
              <TableRow
                key={campaign.id}
                className="hover:bg-muted/50 cursor-pointer"
              >
                <TableCell>
                  <div className="space-y-1">
                    <div className="font-medium">{campaign.name}</div>
                    <div className="text-muted-foreground flex items-center gap-2 text-sm">
                      <ExternalLink className="size-3" />
                      {campaign.website}
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {campaign.keywords.slice(0, 3).map(keyword => (
                        <Badge
                          key={keyword}
                          variant="outline"
                          className="text-xs"
                        >
                          {keyword}
                        </Badge>
                      ))}
                      {campaign.keywords.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{campaign.keywords.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(campaign.status)}</TableCell>
                <TableCell>
                  <div className="min-w-[120px] space-y-2">
                    <Progress
                      value={getProgressPercentage(campaign)}
                      className="h-2"
                    />
                    <div className="text-muted-foreground text-xs">
                      {getProgressPercentage(campaign)}% complete
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="space-y-1 text-sm">
                    <div>{campaign.totalCommentsGenerated} comments</div>
                    <div className="text-muted-foreground">
                      {campaign.totalThreadsAnalyzed} threads analyzed
                    </div>
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">
                  {campaign.createdAt &&
                    format(campaign.createdAt.toDate(), "MMM dd, yyyy")}
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="size-8 p-0">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem
                        onClick={() => onSelectCampaign(campaign.id)}
                      >
                        <Eye className="mr-2 size-4" />
                        View Results
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Play className="mr-2 size-4" />
                        Run Again
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Pause className="mr-2 size-4" />
                        Pause
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="text-red-600">
                        <Trash2 className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}
