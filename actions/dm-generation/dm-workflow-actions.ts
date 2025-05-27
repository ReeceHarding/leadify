"use server"

import { ActionState } from "@/types"
import {
  createDMProgressAction,
  updateDMProgressAction
} from "@/actions/db/dm-progress-actions"
import {
  getDMAutomationByIdAction,
  updateDMAutomationAction,
  createDMAction,
  updateDMAction,
  createDMHistoryAction,
  getDMTemplateByIdAction,
  checkDMAlreadySentAction
} from "@/actions/db/dm-actions"
import { searchRedditUsersAction } from "@/actions/integrations/reddit/reddit-search-actions"
import { getUserProfileAction, checkCanSendDMAction } from "@/actions/integrations/reddit/dm-actions"
import { generatePersonalizedDMAction } from "@/actions/integrations/openai/dm-generation-actions"
import { sendRedditDMAction } from "@/actions/integrations/reddit/dm-actions"
import { Timestamp } from "firebase/firestore"
import { getOrganizationByIdAction } from "@/actions/db/organizations-actions"
import { getKnowledgeBaseByOrganizationIdAction } from "@/actions/db/personalization-actions"

interface DMWorkflowProgress {
  currentStep: string
  totalSteps: number
  completedSteps: number
  results: {
    step: string
    success: boolean
    message: string
    data?: any
  }[]
  isComplete: boolean
  error?: string
}

export async function runDMAutomationWorkflowAction(
  automationId: string
): Promise<ActionState<DMWorkflowProgress>> {
  console.log("🚀🚀🚀 [DM-WORKFLOW] ========== START DM WORKFLOW ==========")
  console.log("🚀🚀🚀 [DM-WORKFLOW] Automation ID:", automationId)
  
  const progress: DMWorkflowProgress = {
    currentStep: "Starting workflow",
    totalSteps: 6,
    completedSteps: 0,
    results: [],
    isComplete: false
  }

  try {
    // Create progress tracking
    console.log("🚀🚀🚀 [DM-WORKFLOW] Creating progress tracking...")
    
    // Get automation details first to get organization and user IDs
    const automationResult = await getDMAutomationByIdAction(automationId)
    if (!automationResult.isSuccess || !automationResult.data) {
      throw new Error("Failed to get automation details")
    }
    
    const automation = automationResult.data
    
    await createDMProgressAction(automationId, automation.organizationId, automation.userId)
    
    await updateDMProgressAction(automationId, {
      status: "in_progress",
      currentStage: "Initializing",
      stageUpdate: {
        stageName: "Initializing",
        status: "in_progress",
        message: "Starting DM automation workflow"
      },
      totalProgress: 5
    })

    console.log("🚀🚀🚀 [DM-WORKFLOW] Progress tracking created")

    // Step 1: Load automation and template
    progress.currentStep = "Loading automation"
    console.log("🚀🚀🚀 [DM-WORKFLOW] Loading automation details...")

    // Update automation status
    await updateDMAutomationAction(automationId, {
      isActive: true
    })

    // Get template
    const templateResult = await getDMTemplateByIdAction(automation.templateId)
    if (!templateResult.isSuccess || !templateResult.data) {
      throw new Error("Failed to get template")
    }
    
    const template = templateResult.data

    // Get organization for personalization
    const orgResult = await getOrganizationByIdAction(automation.organizationId)
    if (!orgResult.isSuccess || !orgResult.data) {
      throw new Error("Failed to get organization")
    }
    
    const organization = orgResult.data

    // Get knowledge base for personalization
    const knowledgeBaseResult = await getKnowledgeBaseByOrganizationIdAction(automation.organizationId)
    let businessContext = ""
    if (knowledgeBaseResult.isSuccess && knowledgeBaseResult.data) {
      const kb = knowledgeBaseResult.data
      businessContext = kb.customInformation || kb.summary || ""
    }

    progress.results.push({
      step: "Load Automation",
      success: true,
      message: `Automation "${automation.name}" loaded successfully`,
      data: {
        automationName: automation.name,
        templateName: template.name,
        keywords: automation.keywords,
        subreddits: automation.subreddits,
        maxDailyDMs: automation.maxDailyDMs
      }
    })
    progress.completedSteps++

    await updateDMProgressAction(automationId, {
      stageUpdate: {
        stageName: "Initializing",
        status: "completed",
        message: "Automation loaded successfully"
      },
      totalProgress: 10
    })

    // Step 2: Search for users
    await updateDMProgressAction(automationId, {
      currentStage: "Searching Users",
      stageUpdate: {
        stageName: "Searching Users",
        status: "in_progress",
        message: `Searching for users with ${automation.keywords.length} keywords`
      },
      totalProgress: 20
    })

    progress.currentStep = "Searching for users"
    console.log("🔍 [DM-WORKFLOW] Searching for users...")

    const allUsers: Array<{
      username: string
      postId: string
      postTitle: string
      postUrl: string
      subreddit: string
      keyword: string
      created_utc: number
    }> = []

    // Search for users based on keywords and subreddits
    for (const keyword of automation.keywords) {
      for (const subreddit of automation.subreddits) {
        console.log(`🔍 [DM-WORKFLOW] Searching r/${subreddit} for "${keyword}"`)
        
        const searchResult = await searchRedditUsersAction(
          automation.organizationId,
          keyword,
          {
            subreddit,
            sort: "new",
            time: "week",
            limit: 10
          }
        )

        if (searchResult.isSuccess) {
          for (const post of searchResult.data) {
            // Check if we've already sent DM to this user
            const alreadySentResult = await checkDMAlreadySentAction(
              automation.organizationId,
              post.author
            )
            
            if (!alreadySentResult.isSuccess || !alreadySentResult.data) {
              allUsers.push({
                username: post.author,
                postId: post.id,
                postTitle: post.title,
                postUrl: post.url,
                subreddit: post.subreddit,
                keyword,
                created_utc: post.created_utc
              })
            }
          }
        }
      }
    }

    // Remove duplicates
    const uniqueUsers = Array.from(
      new Map(allUsers.map(u => [u.username, u])).values()
    )

    console.log(`🔍 [DM-WORKFLOW] Found ${uniqueUsers.length} unique users`)

    progress.results.push({
      step: "Search Users",
      success: true,
      message: `Found ${uniqueUsers.length} potential users`,
      data: {
        totalUsers: uniqueUsers.length,
        keywords: automation.keywords,
        subreddits: automation.subreddits
      }
    })
    progress.completedSteps++

    await updateDMProgressAction(automationId, {
      stageUpdate: {
        stageName: "Searching Users",
        status: "completed",
        message: `Found ${uniqueUsers.length} users`
      },
      totalProgress: 30,
      results: {
        totalUsersFound: uniqueUsers.length,
        totalUsersAnalyzed: 0,
        totalDMsSent: 0,
        totalDMsFailed: 0
      }
    })

    // Step 3: Analyze user profiles
    await updateDMProgressAction(automationId, {
      currentStage: "Analyzing Profiles",
      stageUpdate: {
        stageName: "Analyzing Profiles",
        status: "in_progress",
        message: "Checking user eligibility"
      },
      totalProgress: 40
    })

    progress.currentStep = "Analyzing user profiles"
    console.log("👤 [DM-WORKFLOW] Analyzing user profiles...")

    const eligibleUsers: typeof uniqueUsers = []
    let analyzedCount = 0

    for (const user of uniqueUsers) {
      // Check if we can send DM to this user
      const canSendResult = await checkCanSendDMAction(
        automation.organizationId,
        user.username
      )

      analyzedCount++

      if (canSendResult.isSuccess && canSendResult.data) {
        eligibleUsers.push(user)
      }

      // Update progress
      const analyzeProgress = 40 + (analyzedCount / uniqueUsers.length) * 20
      await updateDMProgressAction(automationId, {
        stageUpdate: {
          stageName: "Analyzing Profiles",
          status: "in_progress",
          message: `Analyzed ${analyzedCount} of ${uniqueUsers.length} users`,
          progress: (analyzedCount / uniqueUsers.length) * 100
        },
        totalProgress: Math.round(analyzeProgress)
      })

      // Small delay to avoid rate limits
      await new Promise(resolve => setTimeout(resolve, 500))
    }

    console.log(`👤 [DM-WORKFLOW] ${eligibleUsers.length} users are eligible for DMs`)

    progress.results.push({
      step: "Analyze Profiles",
      success: true,
      message: `${eligibleUsers.length} users eligible for DMs`,
      data: {
        totalAnalyzed: analyzedCount,
        eligibleUsers: eligibleUsers.length
      }
    })
    progress.completedSteps++

    await updateDMProgressAction(automationId, {
      stageUpdate: {
        stageName: "Analyzing Profiles",
        status: "completed",
        message: `${eligibleUsers.length} users eligible`
      },
      totalProgress: 60,
      results: {
        totalUsersFound: uniqueUsers.length,
        totalUsersAnalyzed: analyzedCount,
        totalDMsSent: 0,
        totalDMsFailed: 0
      }
    })

    // Step 4 & 5: Generate and send DMs
    await updateDMProgressAction(automationId, {
      currentStage: "Generating Messages",
      stageUpdate: {
        stageName: "Generating Messages",
        status: "in_progress",
        message: "Creating personalized messages"
      },
      totalProgress: 70
    })

    progress.currentStep = "Generating and sending DMs"
    console.log("📨 [DM-WORKFLOW] Generating and sending DMs...")

    let dmsSent = 0
    let dmsFailed = 0
    const maxDMs = Math.min(automation.maxDailyDMs - automation.dmsSentToday, eligibleUsers.length)

    for (let i = 0; i < maxDMs; i++) {
      const user = eligibleUsers[i]
      
      try {
        console.log(`📨 [DM-WORKFLOW] Processing DM ${i + 1}/${maxDMs} for u/${user.username}`)

        // Generate personalized DM
        const dmResult = await generatePersonalizedDMAction({
          template: template.messageTemplate,
          recipientUsername: user.username,
          postTitle: user.postTitle,
          postUrl: user.postUrl,
          subreddit: user.subreddit,
          businessContext,
          organizationName: organization.name
        })

        if (!dmResult.isSuccess) {
          console.error(`❌ [DM-WORKFLOW] Failed to generate DM for ${user.username}`)
          dmsFailed++
          continue
        }

        // Create DM record
        const createDMResult = await createDMAction({
          organizationId: automation.organizationId,
          userId: automation.userId,
          postId: user.postId,
          postTitle: user.postTitle,
          postUrl: user.postUrl,
          postAuthor: user.username,
          postCreatedAt: Timestamp.fromMillis(user.created_utc * 1000),
          subreddit: user.subreddit,
          messageContent: dmResult.data.message,
          followUpContent: dmResult.data.followUp
        })

        if (!createDMResult.isSuccess) {
          console.error(`❌ [DM-WORKFLOW] Failed to create DM record for ${user.username}`)
          dmsFailed++
          continue
        }

        // Update to sending stage when we start sending
        if (dmsSent === 0) {
          await updateDMProgressAction(automationId, {
            currentStage: "Sending DMs",
            stageUpdate: {
              stageName: "Generating Messages",
              status: "completed"
            }
          })

          await updateDMProgressAction(automationId, {
            stageUpdate: {
              stageName: "Sending DMs",
              status: "in_progress",
              message: "Sending personalized messages"
            }
          })
        }

        // Send the DM
        const sendResult = await sendRedditDMAction({
          organizationId: automation.organizationId,
          recipientUsername: user.username,
          subject: dmResult.data.subject,
          message: dmResult.data.message
        })

        if (sendResult.isSuccess) {
          console.log(`✅ [DM-WORKFLOW] DM sent to u/${user.username}`)
          
          // Update DM status
          await updateDMAction(createDMResult.data.id, {
            status: "sent",
            sentAt: Timestamp.now()
          })

          // Record in history
          await createDMHistoryAction({
            organizationId: automation.organizationId,
            userId: automation.userId,
            dmId: createDMResult.data.id,
            postId: user.postId,
            postAuthor: user.username,
            messageContent: dmResult.data.message,
            followUpContent: dmResult.data.followUp,
            sentAt: Timestamp.now(),
            automationId: automation.id,
            templateId: template.id
          })

          dmsSent++
        } else {
          console.error(`❌ [DM-WORKFLOW] Failed to send DM to ${user.username}: ${sendResult.message}`)
          
          // Update DM status to failed
          await updateDMAction(createDMResult.data.id, {
            status: "failed",
            error: sendResult.message
          })

          dmsFailed++
        }

        // Update progress
        const sendProgress = 70 + ((i + 1) / maxDMs) * 25
        await updateDMProgressAction(automationId, {
          stageUpdate: {
            stageName: "Sending DMs",
            status: "in_progress",
            message: `Sent ${dmsSent} DMs, ${dmsFailed} failed`,
            progress: ((i + 1) / maxDMs) * 100
          },
          totalProgress: Math.round(sendProgress),
          results: {
            totalUsersFound: uniqueUsers.length,
            totalUsersAnalyzed: analyzedCount,
            totalDMsSent: dmsSent,
            totalDMsFailed: dmsFailed
          }
        })

        // Delay between DMs to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 2000))
      } catch (error) {
        console.error(`❌ [DM-WORKFLOW] Error processing DM for ${user.username}:`, error)
        dmsFailed++
      }
    }

    // Update automation counters
    await updateDMAutomationAction(automationId, {
      dmsSentToday: automation.dmsSentToday + dmsSent
    })

    progress.results.push({
      step: "Send DMs",
      success: dmsSent > 0,
      message: `Sent ${dmsSent} DMs, ${dmsFailed} failed`,
      data: {
        dmsSent,
        dmsFailed,
        maxDMs
      }
    })
    progress.completedSteps++

    await updateDMProgressAction(automationId, {
      stageUpdate: {
        stageName: "Sending DMs",
        status: "completed",
        message: `Sent ${dmsSent} DMs`
      },
      totalProgress: 95
    })

    // Step 6: Finalize results
    await updateDMProgressAction(automationId, {
      currentStage: "Finalizing Results",
      stageUpdate: {
        stageName: "Finalizing Results",
        status: "in_progress",
        message: "Preparing your results"
      },
      totalProgress: 98
    })

    progress.currentStep = "Workflow complete"
    progress.isComplete = true
    progress.completedSteps++

    progress.results.push({
      step: "Workflow Complete",
      success: true,
      message: "DM automation workflow completed successfully",
      data: {
        totalUsersFound: uniqueUsers.length,
        totalUsersAnalyzed: analyzedCount,
        totalDMsSent: dmsSent,
        totalDMsFailed: dmsFailed
      }
    })

    // Complete progress tracking
    await updateDMProgressAction(automationId, {
      status: "completed",
      stageUpdate: {
        stageName: "Finalizing Results",
        status: "completed",
        message: "DM automation complete!"
      },
      totalProgress: 100,
      results: {
        totalUsersFound: uniqueUsers.length,
        totalUsersAnalyzed: analyzedCount,
        totalDMsSent: dmsSent,
        totalDMsFailed: dmsFailed,
        averageRelevanceScore: eligibleUsers.length > 0 
          ? Math.round((eligibleUsers.length / uniqueUsers.length) * 100)
          : 0
      }
    })

    console.log(`✅ [DM-WORKFLOW] Workflow completed for automation: ${automationId}`)

    return {
      isSuccess: true,
      message: "DM automation workflow completed successfully",
      data: progress
    }
  } catch (error) {
    console.error("❌ [DM-WORKFLOW] Error in DM automation workflow:", error)
    
    await updateDMProgressAction(automationId, {
      status: "error",
      error: error instanceof Error ? error.message : "Unknown error"
    })

    progress.error = error instanceof Error ? error.message : "Unknown error"
    progress.results.push({
      step: progress.currentStep,
      success: false,
      message: progress.error
    })

    return {
      isSuccess: false,
      message: `Workflow failed: ${progress.error}`
    }
  }
}

export async function stopDMAutomationWorkflowAction(
  automationId: string
): Promise<ActionState<void>> {
  try {
    console.log(`🛑 [DM-WORKFLOW] Stopping workflow for automation: ${automationId}`)

    // Update the progress status to "stopped"
    await updateDMProgressAction(automationId, {
      status: "completed",
      stageUpdate: {
        stageName: "Finalizing Results",
        status: "completed",
        message: "Workflow stopped by user"
      },
      error: "Workflow stopped by user"
    })

    // Update automation status
    await updateDMAutomationAction(automationId, {
      isActive: false
    })

    console.log(`✅ [DM-WORKFLOW] Workflow stopped successfully for automation: ${automationId}`)

    return {
      isSuccess: true,
      message: "Workflow stopped successfully",
      data: undefined
    }
  } catch (error) {
    console.error("❌ [DM-WORKFLOW] Error stopping workflow:", error)
    return {
      isSuccess: false,
      message: `Failed to stop workflow: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 