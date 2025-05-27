import { NextResponse } from "next/server"
import { headers } from "next/headers"
import {
  getDMAutomationsByOrganizationAction,
  updateDMAutomationAction,
  createDMAction,
  checkDMAlreadySentAction,
  createDMHistoryAction,
  getDMTemplatesByOrganizationAction,
  updateDMAction
} from "@/actions/db/dm-actions"
import { searchRedditAction } from "@/actions/integrations/reddit/reddit-search-actions"
import { generateDMFromTemplateAction } from "@/actions/integrations/openai/dm-generation-actions"
import {
  sendRedditDMAction,
  checkCanSendDMAction
} from "@/actions/integrations/reddit/dm-actions"
import { getOrganizationsByUserIdWithoutAuthAction } from "@/actions/db/organizations-actions"
import { Timestamp } from "firebase/firestore"
import { db } from "@/db/db"
import { collection, getDocs } from "firebase/firestore"
import { ORGANIZATION_COLLECTIONS } from "@/db/schema"

export async function POST(request: Request) {
  console.log(
    "🤖 [PROCESS-DM-AUTOMATIONS] Starting DM automation processing..."
  )

  try {
    // Verify the request is from our cron job
    const headersList = await headers()
    const authHeader = headersList.get("authorization")

    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      console.error("🤖 [PROCESS-DM-AUTOMATIONS] Unauthorized request")
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get all organizations directly from Firestore
    const orgsSnapshot = await getDocs(
      collection(db, ORGANIZATION_COLLECTIONS.ORGANIZATIONS)
    )
    const organizations = orgsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }))

    console.log(
      "🤖 [PROCESS-DM-AUTOMATIONS] Processing",
      organizations.length,
      "organizations"
    )

    let totalDMsSent = 0

    // Process each organization
    for (const org of organizations) {
      console.log(
        "🤖 [PROCESS-DM-AUTOMATIONS] Processing organization:",
        org.id
      )

      // Get active automations for this organization
      const automationsResult = await getDMAutomationsByOrganizationAction(
        org.id
      )
      if (!automationsResult.isSuccess) {
        console.error(
          "🤖 [PROCESS-DM-AUTOMATIONS] Failed to get automations for org:",
          org.id
        )
        continue
      }

      const activeAutomations = automationsResult.data.filter(a => a.isActive)
      console.log(
        "🤖 [PROCESS-DM-AUTOMATIONS] Found",
        activeAutomations.length,
        "active automations"
      )

      // Get templates for this organization
      const templatesResult = await getDMTemplatesByOrganizationAction(org.id)
      if (!templatesResult.isSuccess) {
        console.error(
          "🤖 [PROCESS-DM-AUTOMATIONS] Failed to get templates for org:",
          org.id
        )
        continue
      }

      const templatesMap = new Map(templatesResult.data.map(t => [t.id, t]))

      // Process each automation
      for (const automation of activeAutomations) {
        console.log(
          "🤖 [PROCESS-DM-AUTOMATIONS] Processing automation:",
          automation.name
        )

        // Check if daily limit reached
        if (automation.dmsSentToday >= automation.maxDailyDMs) {
          console.log(
            "🤖 [PROCESS-DM-AUTOMATIONS] Daily limit reached for automation:",
            automation.name
          )
          continue
        }

        // Check if we need to reset daily counter
        const now = new Date()
        const lastReset = automation.lastResetAt.toDate()
        if (
          now.getDate() !== lastReset.getDate() ||
          now.getMonth() !== lastReset.getMonth()
        ) {
          console.log(
            "🤖 [PROCESS-DM-AUTOMATIONS] Resetting daily counter for automation:",
            automation.name
          )
          await updateDMAutomationAction(automation.id, {
            dmsSentToday: 0,
            lastResetAt: Timestamp.now()
          })
          automation.dmsSentToday = 0
        }

        // Get the template
        const template = templatesMap.get(automation.templateId)
        if (!template) {
          console.error(
            "🤖 [PROCESS-DM-AUTOMATIONS] Template not found:",
            automation.templateId
          )
          continue
        }

        // Search for posts matching keywords
        for (const keyword of automation.keywords) {
          console.log(
            "🤖 [PROCESS-DM-AUTOMATIONS] Searching for keyword:",
            keyword
          )

          // Search in each specified subreddit
          for (const subreddit of automation.subreddits) {
            const searchResult = await searchRedditAction(org.id, keyword, {
              subreddit,
              sort: "new",
              time: "day",
              limit: 10
            })

            if (!searchResult.isSuccess) {
              console.error(
                "🤖 [PROCESS-DM-AUTOMATIONS] Search failed:",
                searchResult.message
              )
              continue
            }

            // Process each post
            for (const post of searchResult.data) {
              // Check if we've reached daily limit
              if (automation.dmsSentToday >= automation.maxDailyDMs) {
                console.log(
                  "🤖 [PROCESS-DM-AUTOMATIONS] Daily limit reached, stopping"
                )
                break
              }

              // Check if we've already sent DM to this user
              const alreadySentResult = await checkDMAlreadySentAction(
                org.id,
                post.author
              )
              if (alreadySentResult.isSuccess && alreadySentResult.data) {
                console.log(
                  "🤖 [PROCESS-DM-AUTOMATIONS] Already sent DM to:",
                  post.author
                )
                continue
              }

              // Check if user can receive DMs
              const canSendResult = await checkCanSendDMAction(
                org.id,
                post.author
              )
              if (!canSendResult.isSuccess || !canSendResult.data) {
                console.log(
                  "🤖 [PROCESS-DM-AUTOMATIONS] Cannot send DM to:",
                  post.author
                )
                continue
              }

              // Generate DM from template
              const timeAgo = getTimeAgo(post.created_utc)
              const dmResult = await generateDMFromTemplateAction(
                template.messageTemplate,
                {
                  author: post.author,
                  title: post.title,
                  subreddit: post.subreddit,
                  timeAgo
                }
              )

              if (!dmResult.isSuccess) {
                console.error(
                  "🤖 [PROCESS-DM-AUTOMATIONS] Failed to generate DM"
                )
                continue
              }

              const followUpResult = template.followUpTemplate
                ? await generateDMFromTemplateAction(
                    template.followUpTemplate,
                    {
                      author: post.author,
                      title: post.title,
                      subreddit: post.subreddit,
                      timeAgo
                    }
                  )
                : null

              // Create DM record
              const createDMResult = await createDMAction({
                organizationId: org.id,
                userId: automation.userId,
                postId: post.id,
                postTitle: post.title,
                postUrl: post.url,
                postAuthor: post.author,
                postCreatedAt: Timestamp.fromMillis(post.created_utc * 1000),
                subreddit: post.subreddit,
                messageContent: dmResult.data,
                followUpContent: followUpResult?.data
              })

              if (!createDMResult.isSuccess) {
                console.error(
                  "🤖 [PROCESS-DM-AUTOMATIONS] Failed to create DM record"
                )
                continue
              }

              // Send the DM
              const sendResult = await sendRedditDMAction({
                organizationId: org.id,
                recipientUsername: post.author,
                subject: `Re: ${post.title.substring(0, 50)}...`,
                message: dmResult.data
              })

              if (sendResult.isSuccess) {
                console.log(
                  "🤖 [PROCESS-DM-AUTOMATIONS] ✅ DM sent to:",
                  post.author
                )

                // Update DM status
                await updateDMAction(createDMResult.data.id, {
                  status: "sent",
                  sentAt: Timestamp.now()
                })

                // Record in history
                await createDMHistoryAction({
                  organizationId: org.id,
                  userId: automation.userId,
                  dmId: createDMResult.data.id,
                  postId: post.id,
                  postAuthor: post.author,
                  messageContent: dmResult.data,
                  followUpContent: followUpResult?.data,
                  sentAt: Timestamp.now(),
                  automationId: automation.id,
                  templateId: template.id
                })

                // Update automation counter
                automation.dmsSentToday++
                await updateDMAutomationAction(automation.id, {
                  dmsSentToday: automation.dmsSentToday
                })

                totalDMsSent++
              } else {
                console.error(
                  "🤖 [PROCESS-DM-AUTOMATIONS] Failed to send DM:",
                  sendResult.message
                )

                // Update DM status to failed
                await updateDMAction(createDMResult.data.id, {
                  status: "failed",
                  error: sendResult.message
                })
              }
            }
          }
        }
      }
    }

    console.log(
      "🤖 [PROCESS-DM-AUTOMATIONS] ✅ Processing complete. Total DMs sent:",
      totalDMsSent
    )

    return NextResponse.json({
      success: true,
      message: `Processed DM automations. Sent ${totalDMsSent} DMs.`
    })
  } catch (error) {
    console.error("🤖 [PROCESS-DM-AUTOMATIONS] ❌ Error:", error)
    return NextResponse.json(
      { error: "Failed to process DM automations" },
      { status: 500 }
    )
  }
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now() / 1000
  const diff = now - timestamp

  if (diff < 3600) return `${Math.floor(diff / 60)} minutes ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)} hours ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)} days ago`
  return `${Math.floor(diff / 604800)} weeks ago`
}
