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
  Eye
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
import CreateCampaignDialog from "./create-campaign-dialog"
import CampaignsList from "./campaigns-list"
import CampaignResults from "./campaign-results"

export default function LeadFinderDashboard() {
  const [activeTab, setActiveTab] = useState("overview")
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [selectedCampaign, setSelectedCampaign] = useState<string | null>(null)
  const [stats, setStats] = useState({
    totalCampaigns: 0,
    activeCampaigns: 0,
    totalLeads: 0,
    qualityLeads: 0,
    averageScore: 0,
    commentsGenerated: 0
  })

  return (
    <div className="flex flex-col space-y-6 pt-6">
      {/* Header Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-blue-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">
              Total Campaigns
            </CardTitle>
            <Target className="size-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-900">
              {stats.totalCampaigns}
            </div>
            <p className="text-xs text-blue-700">Lead generation campaigns</p>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-gradient-to-r from-green-50 to-green-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-green-900">
              Quality Leads
            </CardTitle>
            <TrendingUp className="size-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-900">
              {stats.qualityLeads}
            </div>
            <p className="text-xs text-green-700">Score 70+ opportunities</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-purple-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">
              Comments Generated
            </CardTitle>
            <MessageSquare className="size-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-900">
              {stats.commentsGenerated}
            </div>
            <p className="text-xs text-purple-700">AI-powered responses</p>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-gradient-to-r from-orange-50 to-orange-100">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">
              Average Score
            </CardTitle>
            <CheckCircle2 className="size-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-900">
              {stats.averageScore.toFixed(1)}
            </div>
            <p className="text-xs text-orange-700">Lead quality rating</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <TabsList className="grid w-fit grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <Button
            onClick={() => setCreateDialogOpen(true)}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
          >
            <Plus className="mr-2 size-4" />
            New Campaign
          </Button>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Quick Start */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="size-5 text-blue-600" />
                  Quick Start
                </CardTitle>
                <CardDescription>
                  Get started with Reddit lead generation in minutes
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-blue-100 text-sm font-medium text-blue-600">
                      1
                    </div>
                    <div>
                      <p className="font-medium">Create Campaign</p>
                      <p className="text-muted-foreground text-sm">
                        Set up your website and keywords
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-green-100 text-sm font-medium text-green-600">
                      2
                    </div>
                    <div>
                      <p className="font-medium">AI Analysis</p>
                      <p className="text-muted-foreground text-sm">
                        Find and score Reddit opportunities
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <div className="flex size-8 items-center justify-center rounded-full bg-purple-100 text-sm font-medium text-purple-600">
                      3
                    </div>
                    <div>
                      <p className="font-medium">Generate Comments</p>
                      <p className="text-muted-foreground text-sm">
                        Get 3 length options for engagement
                      </p>
                    </div>
                  </div>
                </div>
                <Button
                  onClick={() => setCreateDialogOpen(true)}
                  className="w-full"
                  variant="outline"
                >
                  Start Your First Campaign
                </Button>
              </CardContent>
            </Card>

            {/* AI Features */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="size-5 text-purple-600" />
                  AI-Powered Features
                </CardTitle>
                <CardDescription>
                  Advanced capabilities for lead generation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start space-x-3">
                    <Badge variant="secondary" className="mt-1">
                      o3-mini
                    </Badge>
                    <div>
                      <p className="font-medium">Critical Scoring</p>
                      <p className="text-muted-foreground text-sm">
                        Only high-quality opportunities (70+ score)
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Badge variant="secondary" className="mt-1">
                      3-Tier
                    </Badge>
                    <div>
                      <p className="font-medium">Length Options</p>
                      <p className="text-muted-foreground text-sm">
                        Micro, Medium, Verbose comments
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Badge variant="secondary" className="mt-1">
                      Auto
                    </Badge>
                    <div>
                      <p className="font-medium">Reddit Integration</p>
                      <p className="text-muted-foreground text-sm">
                        OAuth-based thread fetching
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="size-5 text-gray-600" />
                Recent Activity
              </CardTitle>
              <CardDescription>
                Latest campaign updates and results
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                  <div className="flex items-center space-x-3">
                    <div className="size-2 rounded-full bg-green-500"></div>
                    <p className="text-sm">
                      No campaigns yet - create your first one to get started!
                    </p>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Eye className="size-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="campaigns">
          <CampaignsList
            onSelectCampaign={setSelectedCampaign}
            onCreateNew={() => setCreateDialogOpen(true)}
          />
        </TabsContent>

        <TabsContent value="results">
          <CampaignResults selectedCampaign={selectedCampaign} />
        </TabsContent>
      </Tabs>

      {/* Create Campaign Dialog */}
      <CreateCampaignDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSuccess={() => {
          setCreateDialogOpen(false)
          setActiveTab("campaigns")
        }}
      />
    </div>
  )
}
