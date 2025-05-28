# Comment Generation Style Update

## Overview
Updated the comment generation system to be adaptive and context-aware, teaching the AI how to think rather than what to say. The system now provides maximum context including post timing, existing comments, and full knowledge base while encouraging natural, conversational responses.

## Key Philosophy Changes

### From Templates to Adaptive Thinking
- **Before**: Rigid templates with fixed phrases
- **After**: Framework that adapts to each specific situation
- **Principle**: "Teach the AI how to think, not what to think"

## Major Updates

### 1. Enhanced Context Awareness
**File:** `actions/integrations/openai/openai-actions.ts`

**New Context Elements:**
- **Post Age**: System now calculates and considers when the post was created (e.g., "Posted 2 days ago")
- **Existing Comments**: Fetches up to 10 existing comments from the thread for tone and content awareness
- **Full Knowledge Base**: Entire organization knowledge base is provided for comprehensive context
- **Campaign Keywords**: Understands what search terms led to finding this post

### 2. Adaptive Response Framework
**File:** `prompts/verbose-reddit-comment-prompt.md`

**Key Principles:**
1. **Understand Their Specific Context**
   - What exact problem are they solving?
   - What constraints have they mentioned?
   - What solutions have others suggested?
   - When was this posted?

2. **Acknowledge the Conversation**
   - Reference other commenters by what they said
   - Build on existing suggestions
   - Respectfully offer alternatives

3. **Ask Relevant Questions**
   - Specific to their situation, not generic
   - Based on what they've shared
   - Showing you understand their unique challenge

4. **Present Tailored Options**
   - Structure based on THEIR needs (A/B/C, pros/cons, timeline-based)
   - Reference solutions others mentioned
   - Explain WHY each option fits their situation

### 3. Natural Brand Integration
- Only mention where genuinely relevant
- Reference like any other option
- Be specific about why it helps their situation
- Format: "For your specific needs, you might look at [solution] because..."

## Example Adaptive Response

**Post**: "Hiring software engineers for my SaaS startup"
**Details**: $50k budget, 3-month timeline, non-technical founder
**Existing Comments**: Mentions of Upwork, finding co-founder, budget concerns

**Generated Response**:
```
I would love to chat about this if you want to message me. Building B2B SaaS platforms is exactly what I do! The inventory management space is fascinating - lots of complex workflows to optimize.

I see others have mentioned the freelancer route and finding a technical co-founder. Both are valid paths, but given your specific situation (non-technical founder, 3-month timeline, potential CTO need), let me share some thoughts...

[Continues with specific advice tailored to their constraints]
```

## Technical Implementation

### Function Signature Update
```typescript
export async function scoreThreadAndGeneratePersonalizedCommentsAction(
  threadTitle: string,
  threadContent: string,
  subreddit: string,
  organizationId: string,
  campaignKeywords: string[],
  campaignWebsiteContent?: string,
  existingComments?: string[],
  campaignName?: string,
  postCreatedUtc?: number // NEW: Post creation timestamp
)
```

### Post Age Calculation
```typescript
// Calculate post age for context
if (postCreatedUtc) {
  const now = Date.now() / 1000
  const ageInSeconds = now - postCreatedUtc
  // Convert to human-readable format
  // "Posted 2 days ago", "Posted 3 hours ago", etc.
}
```

## Benefits

1. **More Authentic**: Comments respond to specific situations, not generic problems
2. **Better Context**: AI understands the full conversation and timing
3. **Smarter Responses**: References other comments and builds on the discussion
4. **Natural Flow**: Feels like joining an existing conversation
5. **Appropriate Urgency**: Adjusts tone based on post age

## Testing
- Test with posts of different ages
- Test with threads that have many existing comments
- Test with various budget/timeline constraints
- Verify the AI references other commenters naturally
- Ensure brand mentions feel organic and helpful

## What NOT to Do
❌ Don't use rigid templates or fixed phrases
❌ Don't ignore what others have already suggested
❌ Don't give generic advice that could apply to anyone
❌ Don't force your solution where it doesn't fit
❌ Don't pretend to know things you don't

## Remember
Every Reddit thread is a unique conversation. The goal is to write something so specifically helpful that they think "This person really gets my situation" - not "This feels like a template." 