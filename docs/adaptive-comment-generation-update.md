# Adaptive Comment Generation Update

## Overview

We've completely redesigned the comment generation system to be adaptive and context-aware. Instead of using rigid templates, the system now teaches the AI how to think about each unique situation.

## Key Philosophy: "Teach How to Think, Not What to Say"

The old system was too prescriptive, telling the AI exactly what to write. The new system provides a thinking framework that adapts to each situation.

## CRITICAL WRITING RULE - NEVER USE HYPHENS

**All prompts now explicitly instruct the AI to NEVER use hyphens:**
- Write "co founder" not "co-founder"
- Write "self serve" not "self-serve"
- Write "long term" not "long-term"
- Write "third party" not "third-party"
- Write "real time" not "real-time"
- Write "full stack" not "full-stack"
- Write "non technical" not "non-technical"

This rule is enforced across ALL comment generation functions and is repeated multiple times in each prompt to ensure compliance.

## Major Changes

### 1. From Templates to Thinking Process

**Before:**
- Rigid structure: "Start with X, then mention Y, close with Z"
- Fixed phrases and patterns
- Hardcoded product mentions

**After:**
- Thinking framework: "Understand their world, consider your experience, think about what would help"
- Adaptive responses based on context
- Natural integration of solutions

### 2. Natural Solution Integration

**Before:**
- Product mentioned twice in verbose comments
- Forced mentions that felt salesy
- Single solution focus

**After:**
- Product presented as ONE option among 3-4 genuine alternatives
- Natural mentions in context of their needs
- Focus on helping them think through options

### 3. Context-Aware Responses

The system now considers:
- **Their specific situation**: Budget, timeline, expertise, industry
- **The conversation**: What others have suggested
- **Indirect signals**: Reading between the lines for pain points
- **Timing**: How old is the post? What's the urgency?

### 4. Authentic Voice

**Before:**
- Marketing language
- Perfect grammar
- Salesy tone

**After:**
- Conversational tone
- Natural speech patterns
- Genuine desire to help
- Okay to be uncertain or share failures
- **No hyphens anywhere**

## Implementation Details

### System Prompt Changes

The system prompt now:
- Emphasizes helping over selling
- Provides context without being prescriptive
- Encourages genuine conversation
- **Explicitly forbids hyphen usage with examples**

### User Prompt Changes

The user prompt now includes:
- A thinking process framework
- Emphasis on understanding their world
- Instructions to present multiple genuine options
- Reminders to be conversational, not promotional
- **Multiple reminders to never use hyphens**

### Comment Structure

**Micro (5-15 words):**
- Quick, authentic reactions
- Natural expressions of interest
- No templates
- **No hyphens**

**Medium (30-80 words):**
- Think about their core need
- Present 2-3 relevant options
- Include your solution as ONE option
- Be honest about trade offs
- **No hyphens**

**Verbose (300-800 words):**
- Adaptive structure based on their needs
- Present 3-4 genuine options with pros/cons
- Reference what others have said
- Close with genuine offer to help
- **No hyphens anywhere**

## Examples

### Good Natural Mention:
"For your budget and timeline, you might consider: freelancers on Upwork (cheapest but needs management), development shops like CCO Vibe or Toptal (balanced cost/quality), or premium agencies like Accenture if budget allows."

### Bad Forced Mention:
"You should definitely check out [your company] because we specialize in this. Also, [your company] has great reviews. Contact [your company] today!"

### Hyphen Examples:
✅ **Correct**: "full stack developer", "long term solution", "real time updates"
❌ **Wrong**: "full-stack developer", "long-term solution", "real-time updates"

## Testing the New System

When reviewing generated comments, check:
1. Does it sound like a real person trying to help?
2. Are multiple genuine options presented?
3. Is the product/service mentioned naturally as one option?
4. Does it address their specific situation?
5. Would you find this helpful if you were the OP?
6. **Are there any hyphens anywhere in the comment?**

## Key Principles

1. **Help First, Sell Never**: Focus on being genuinely helpful
2. **Multiple Options**: Always present 3-4 genuine alternatives
3. **Context Matters**: Adapt to their specific situation
4. **Natural Mentions**: Your solution is one option among many
5. **Conversational**: Write like you're helping a friend
6. **No Hyphens**: Never use hyphens anywhere in comments

## What This Achieves

- **Higher engagement**: People respond to genuine help
- **Better conversion**: Trust built through authentic interaction
- **Sustainable approach**: Not seen as spam or sales
- **Real value**: Actually helps people solve problems
- **Consistent formatting**: No hyphens ensures consistent, natural writing style

## Remember

The goal is for someone to think: "This person really understands my situation and is genuinely trying to help" rather than "This is a sales pitch" or "This is generic advice."

Every interaction should add real value to the conversation, whether or not they ever become a customer.

**And remember: NEVER use hyphens anywhere in any generated content.** 