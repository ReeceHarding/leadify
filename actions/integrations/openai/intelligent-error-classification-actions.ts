"use server"

import { ActionState } from "@/types"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY
const OPENAI_BASE_URL = "https://api.openai.com/v1"

interface ErrorClassification {
  errorType: "authentication" | "authorization" | "network" | "validation" | "rate_limit" | "server_error" | "user_error" | "configuration" | "unknown"
  severity: "critical" | "high" | "medium" | "low"
  userFriendlyMessage: string
  technicalDetails: string
  suggestedActions: string[]
  quickFix?: string
  preventionTips: string[]
  relatedDocumentation?: string[]
  estimatedResolutionTime: "immediate" | "minutes" | "hours" | "contact_support"
  confidence: number
}

interface ErrorContext {
  component?: string
  userAction?: string
  systemState?: string
  previousErrors?: string[]
  userRole?: string
}

export async function classifyErrorAction(
  errorMessage: string,
  context?: ErrorContext
): Promise<ActionState<ErrorClassification>> {
  console.log("🚨 [ERROR-CLASSIFICATION] Starting intelligent error classification")
  console.log("🚨 [ERROR-CLASSIFICATION] Error message:", errorMessage)
  console.log("🚨 [ERROR-CLASSIFICATION] Context:", context)

  try {
    if (!OPENAI_API_KEY) {
      console.error("🚨 [ERROR-CLASSIFICATION] OpenAI API key not found")
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    const classificationPrompt = `Analyze this error message and provide intelligent classification and user-friendly guidance.

ERROR MESSAGE: "${errorMessage}"

CONTEXT:
${context?.component ? `- Component: ${context.component}` : ""}
${context?.userAction ? `- User Action: ${context.userAction}` : ""}
${context?.systemState ? `- System State: ${context.systemState}` : ""}
${context?.previousErrors ? `- Previous Errors: ${context.previousErrors.join(", ")}` : ""}
${context?.userRole ? `- User Role: ${context.userRole}` : ""}

Classify this error and provide helpful guidance:

1. ERROR TYPE: Categorize the error
   - "authentication": Login, token, or credential issues
   - "authorization": Permission or access issues
   - "network": Connection, timeout, or API issues
   - "validation": Input validation or data format issues
   - "rate_limit": API rate limiting or quota issues
   - "server_error": Internal server or system errors
   - "user_error": User mistake or incorrect usage
   - "configuration": Setup or configuration issues
   - "unknown": Cannot determine the error type

2. SEVERITY: How critical is this error?
   - "critical": System unusable, blocks core functionality
   - "high": Major feature broken, significant impact
   - "medium": Feature partially broken, workaround exists
   - "low": Minor issue, minimal impact

3. USER-FRIENDLY MESSAGE: Explain the error in simple, non-technical terms

4. TECHNICAL DETAILS: Technical explanation for developers/support

5. SUGGESTED ACTIONS: Step-by-step actions the user can take (prioritized)

6. QUICK FIX: If there's a simple immediate solution

7. PREVENTION TIPS: How to avoid this error in the future

8. RELATED DOCUMENTATION: Relevant help articles or documentation

9. ESTIMATED RESOLUTION TIME:
   - "immediate": Can be fixed right now
   - "minutes": Should be resolved within minutes
   - "hours": May take hours to resolve
   - "contact_support": Requires support assistance

10. CONFIDENCE: How confident you are in this classification (0-100)

Return JSON format:
{
  "errorType": "authentication",
  "severity": "high",
  "userFriendlyMessage": "simple explanation for users",
  "technicalDetails": "technical explanation",
  "suggestedActions": ["action 1", "action 2", "action 3"],
  "quickFix": "immediate solution if available",
  "preventionTips": ["tip 1", "tip 2"],
  "relatedDocumentation": ["doc 1", "doc 2"],
  "estimatedResolutionTime": "minutes",
  "confidence": 95
}`

    console.log("🚨 [ERROR-CLASSIFICATION] Sending classification request to OpenAI")

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert technical support specialist and error analyst. You excel at understanding error messages, classifying them accurately, and providing clear, actionable guidance to users. You translate technical jargon into user-friendly language while maintaining accuracy."
          },
          {
            role: "user",
            content: classificationPrompt
          }
        ],
        temperature: 0.1,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("🚨 [ERROR-CLASSIFICATION] OpenAI API error:", errorText)
      return {
        isSuccess: false,
        message: `OpenAI API error: ${response.status} - ${errorText}`
      }
    }

    const data = await response.json()
    const classificationContent = data.choices[0]?.message?.content

    if (!classificationContent) {
      console.error("🚨 [ERROR-CLASSIFICATION] No classification content received")
      return {
        isSuccess: false,
        message: "No classification content received from OpenAI"
      }
    }

    let result: ErrorClassification
    try {
      const parsedResult = JSON.parse(classificationContent)
      
      // Validate and normalize the result
      result = {
        errorType: ["authentication", "authorization", "network", "validation", "rate_limit", "server_error", "user_error", "configuration", "unknown"].includes(parsedResult.errorType) 
          ? parsedResult.errorType 
          : "unknown",
        severity: ["critical", "high", "medium", "low"].includes(parsedResult.severity) 
          ? parsedResult.severity 
          : "medium",
        userFriendlyMessage: parsedResult.userFriendlyMessage || "An error occurred. Please try again.",
        technicalDetails: parsedResult.technicalDetails || errorMessage,
        suggestedActions: Array.isArray(parsedResult.suggestedActions) ? parsedResult.suggestedActions : ["Refresh the page and try again"],
        quickFix: parsedResult.quickFix || undefined,
        preventionTips: Array.isArray(parsedResult.preventionTips) ? parsedResult.preventionTips : [],
        relatedDocumentation: Array.isArray(parsedResult.relatedDocumentation) ? parsedResult.relatedDocumentation : undefined,
        estimatedResolutionTime: ["immediate", "minutes", "hours", "contact_support"].includes(parsedResult.estimatedResolutionTime) 
          ? parsedResult.estimatedResolutionTime 
          : "minutes",
        confidence: Math.max(0, Math.min(100, parsedResult.confidence || 50))
      }
    } catch (parseError) {
      console.error("🚨 [ERROR-CLASSIFICATION] Failed to parse classification:", parseError)
      console.error("🚨 [ERROR-CLASSIFICATION] Raw content:", classificationContent)
      
      // Fallback classification based on simple pattern matching
      let errorType: ErrorClassification["errorType"] = "unknown"
      let severity: ErrorClassification["severity"] = "medium"
      
      const lowerError = errorMessage.toLowerCase()
      
      if (lowerError.includes("auth") || lowerError.includes("login") || lowerError.includes("token")) {
        errorType = "authentication"
        severity = "high"
      } else if (lowerError.includes("permission") || lowerError.includes("forbidden") || lowerError.includes("unauthorized")) {
        errorType = "authorization"
        severity = "high"
      } else if (lowerError.includes("network") || lowerError.includes("connection") || lowerError.includes("timeout")) {
        errorType = "network"
        severity = "medium"
      } else if (lowerError.includes("validation") || lowerError.includes("invalid") || lowerError.includes("required")) {
        errorType = "validation"
        severity = "low"
      } else if (lowerError.includes("rate") || lowerError.includes("limit") || lowerError.includes("quota")) {
        errorType = "rate_limit"
        severity = "medium"
      } else if (lowerError.includes("server") || lowerError.includes("internal") || lowerError.includes("500")) {
        errorType = "server_error"
        severity = "high"
      }
      
      result = {
        errorType,
        severity,
        userFriendlyMessage: "Something went wrong. Please try again or contact support if the problem persists.",
        technicalDetails: errorMessage,
        suggestedActions: ["Refresh the page and try again", "Check your internet connection", "Contact support if the issue continues"],
        preventionTips: ["Ensure stable internet connection", "Keep your browser updated"],
        estimatedResolutionTime: "minutes",
        confidence: 30
      }
    }

    console.log("🚨 [ERROR-CLASSIFICATION] Classification completed successfully")
    console.log("🚨 [ERROR-CLASSIFICATION] Error type:", result.errorType)
    console.log("🚨 [ERROR-CLASSIFICATION] Severity:", result.severity)
    console.log("🚨 [ERROR-CLASSIFICATION] Confidence:", result.confidence)

    return {
      isSuccess: true,
      message: "Error classification completed successfully",
      data: result
    }
  } catch (error) {
    console.error("🚨 [ERROR-CLASSIFICATION] Error in error classification:", error)
    return {
      isSuccess: false,
      message: `Failed to classify error: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
}

export async function generateErrorSolutionAction(
  errorClassification: ErrorClassification,
  userContext?: {
    technicalLevel?: "beginner" | "intermediate" | "advanced"
    preferredSolutionType?: "quick_fix" | "detailed_guide" | "technical_details"
    timeAvailable?: "immediate" | "few_minutes" | "extended"
  }
): Promise<ActionState<{
  primarySolution: string
  alternativeSolutions: string[]
  stepByStepGuide: string[]
  troubleshootingChecklist: string[]
  escalationPath?: string
}>> {
  console.log("🚨 [ERROR-SOLUTION] Generating personalized error solution")
  console.log("🚨 [ERROR-SOLUTION] Error type:", errorClassification.errorType)
  console.log("🚨 [ERROR-SOLUTION] User context:", userContext)

  try {
    if (!OPENAI_API_KEY) {
      return {
        isSuccess: false,
        message: "OpenAI API key not configured"
      }
    }

    const solutionPrompt = `Generate a personalized solution for this error based on the user's context and preferences.

ERROR CLASSIFICATION:
- Type: ${errorClassification.errorType}
- Severity: ${errorClassification.severity}
- User-Friendly Message: ${errorClassification.userFriendlyMessage}
- Technical Details: ${errorClassification.technicalDetails}
- Suggested Actions: ${errorClassification.suggestedActions.join(", ")}
- Quick Fix: ${errorClassification.quickFix || "None"}
- Estimated Resolution Time: ${errorClassification.estimatedResolutionTime}

USER CONTEXT:
- Technical Level: ${userContext?.technicalLevel || "intermediate"}
- Preferred Solution Type: ${userContext?.preferredSolutionType || "detailed_guide"}
- Time Available: ${userContext?.timeAvailable || "few_minutes"}

Generate a comprehensive solution tailored to this user:

1. PRIMARY SOLUTION: The best solution for this user's context and preferences
2. ALTERNATIVE SOLUTIONS: 2-3 alternative approaches if the primary doesn't work
3. STEP-BY-STEP GUIDE: Detailed steps appropriate for their technical level
4. TROUBLESHOOTING CHECKLIST: Quick checks to verify the solution worked
5. ESCALATION PATH: When and how to get additional help if needed

Adapt the language and detail level to the user's technical expertise:
- Beginner: Simple language, detailed explanations, avoid jargon
- Intermediate: Balanced technical detail, some technical terms with explanations
- Advanced: Technical language, concise instructions, assume technical knowledge

Return JSON format:
{
  "primarySolution": "main solution description",
  "alternativeSolutions": ["alternative 1", "alternative 2", "alternative 3"],
  "stepByStepGuide": ["step 1", "step 2", "step 3"],
  "troubleshootingChecklist": ["check 1", "check 2", "check 3"],
  "escalationPath": "when and how to escalate"
}`

    const response = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert technical support specialist who excels at creating personalized, step-by-step solutions for users of different technical levels. You adapt your communication style and solution complexity to match the user's expertise and preferences."
          },
          {
            role: "user",
            content: solutionPrompt
          }
        ],
        temperature: 0.2,
        max_tokens: 1200
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("🚨 [ERROR-SOLUTION] OpenAI API error:", errorText)
      return {
        isSuccess: false,
        message: `OpenAI API error: ${response.status} - ${errorText}`
      }
    }

    const data = await response.json()
    const solutionContent = data.choices[0]?.message?.content

    if (!solutionContent) {
      return {
        isSuccess: false,
        message: "No solution content received from OpenAI"
      }
    }

    let result
    try {
      const parsedResult = JSON.parse(solutionContent)
      result = {
        primarySolution: parsedResult.primarySolution || "Try refreshing the page and attempting the action again.",
        alternativeSolutions: Array.isArray(parsedResult.alternativeSolutions) ? parsedResult.alternativeSolutions : [],
        stepByStepGuide: Array.isArray(parsedResult.stepByStepGuide) ? parsedResult.stepByStepGuide : [],
        troubleshootingChecklist: Array.isArray(parsedResult.troubleshootingChecklist) ? parsedResult.troubleshootingChecklist : [],
        escalationPath: parsedResult.escalationPath || undefined
      }
    } catch (parseError) {
      console.error("🚨 [ERROR-SOLUTION] Failed to parse solution:", parseError)
      
      // Fallback solution
      result = {
        primarySolution: errorClassification.quickFix || "Try refreshing the page and attempting the action again.",
        alternativeSolutions: errorClassification.suggestedActions.slice(1, 4),
        stepByStepGuide: [
          "Refresh your browser page",
          "Clear your browser cache and cookies",
          "Try the action again",
          "Contact support if the issue persists"
        ],
        troubleshootingChecklist: [
          "Page loads correctly",
          "No error messages appear",
          "Action completes successfully"
        ],
        escalationPath: "If the problem continues after trying these solutions, please contact our support team with the error details."
      }
    }

    console.log("🚨 [ERROR-SOLUTION] Solution generation completed")
    
    return {
      isSuccess: true,
      message: "Error solution generated successfully",
      data: result
    }
  } catch (error) {
    console.error("🚨 [ERROR-SOLUTION] Error generating solution:", error)
    return {
      isSuccess: false,
      message: `Failed to generate error solution: ${error instanceof Error ? error.message : "Unknown error"}`
    }
  }
} 