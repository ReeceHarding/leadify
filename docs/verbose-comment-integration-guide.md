# Verbose Comment Integration Guide

## Overview

This guide explains how the verbose Reddit comment generation system works and how to integrate it with your lead generation campaigns.

## Comment Tiers

The system generates three tiers of comments for each qualified thread:

### 1. Micro Comments (5-15 words)
- Ultra-brief, casual mentions
- Quick value drops
- Example: "tried cursor myself, agencies work better tbh"

### 2. Medium Comments (30-80 words)
- Balanced responses with specific details
- Mentions 3 solutions with honest pros/cons
- Starts casual ("hey man", "tbh")
- Includes one real downside of your solution

### 3. Verbose Comments (800-1200 words)
- Comprehensive, story-driven responses
- Follows exact structure with personal experience
- Multiple sections with 2-3 line breaks between
- Includes 7+ years of experience narrative
- References other comments in thread
- Provides detailed scenarios and advice

## Key Features

### Writing Style
- **All lowercase** - no capital letters anywhere
- **Casual abbreviations**: bc, w/, lmk, tbh, ngl
- **Intentional misspellings**: 1-2 per section (experince, proabbly, definately, thier)
- **No hyphens** - write "tucked away" not "tucked-away"
- **Personal pronouns**: heavy use of i, my, you
- **Multiple line breaks** between sections for easy skimming

### Content Structure
1. **Opening**: Acknowledge time since post, express intent to help
2. **Background**: Personal story with failures and successes
3. **Main Lesson**: Time vs money tradeoff framework
4. **Path Explanations**: Detailed examples with specific numbers
5. **Scenarios**: Advice for different user types
6. **Conclusion**: TL;DR with clear recommendations

### Required Elements
- Reference when the post was made
- Mention what others in thread are saying
- Share 3-5 specific personal examples
- Present 3 solutions (free, yours, premium) with honest pros/cons
- Include specific tools/resources
- End with offer to help ("dm me")

## Integration Points

### 1. Lead Generation Campaigns
When creating a campaign, the system will:
- Score threads based on relevance (0-100)
- Generate all three comment tiers if score ≥ 40
- Store comments in the database for review

### 2. Voice Settings
The verbose comment structure integrates with your voice settings:
- Maintains your chosen writing style
- Incorporates your persona preferences
- Adapts examples to your industry/experience

### 3. Thread Context
Comments automatically adapt to:
- The specific problem in the thread
- Other comments already posted
- The subreddit's typical discourse style
- OP's apparent experience level

## Usage Examples

### For Software/Tech Businesses
- Examples about building apps with Cursor
- References to specific tools (McKay Wrigley's tutorials)
- Technical challenges (deployment, security)

### For Service Businesses
- Examples about failed service attempts
- Client acquisition stories
- Outsourcing vs DIY decisions

### For E-commerce
- Examples about dropshipping failures
- Marketing campaign stories
- Supplier relationship lessons

## Best Practices

1. **Review Generated Comments**: Always review verbose comments before posting
2. **Customize Examples**: Adapt the generated examples to your actual experience
3. **Match Thread Energy**: If thread is more formal, adjust tone slightly
4. **Time Your Posts**: Space out verbose comments to avoid pattern detection
5. **Track Performance**: Monitor which comment lengths perform best

## API Integration

The system exposes these key functions:

```typescript
// Generate all three tiers for a thread
scoreThreadAndGenerateThreeTierCommentsAction(
  threadTitle,
  threadContent,
  subreddit,
  websiteContent
)

// Regenerate with custom tone
regenerateCommentsWithToneAction(
  threadTitle,
  threadContent,
  subreddit,
  websiteContent,
  toneInstruction,
  organizationId
)

// Generate with personalization
scoreThreadAndGeneratePersonalizedCommentsAction(
  threadTitle,
  threadContent,
  subreddit,
  organizationId,
  campaignKeywords
)
```

## Monitoring & Analytics

Track these metrics:
- **Engagement Rate**: Replies and upvotes per comment tier
- **Conversion Rate**: DMs or profile visits from comments
- **Authenticity Score**: How well comments blend in
- **Time to First Engagement**: How quickly people respond

## Troubleshooting

### Comments Too Generic
- Add more specific details to your knowledge base
- Include actual numbers and timeframes
- Reference specific tools/platforms you've used

### Comments Not Matching Style
- Update voice settings with more examples
- Use the Reddit style copier feature
- Adjust tone instructions

### Low Engagement
- Ensure comments address OP's specific problem
- Add more vulnerability/failures to stories
- Make offers more specific and actionable

## Future Enhancements

- A/B testing different comment structures
- Automatic thread monitoring for replies
- Smart follow-up generation
- Performance-based length selection 