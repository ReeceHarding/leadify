# Recency Filter Feature - Lead Finder

## Overview
The recency filter allows users to search for Reddit posts within specific time periods, ensuring they find the most relevant and timely leads for engagement.

## Features

### 1. Time Period Options
- **Past Hour**: Find posts from the last hour (hot leads)
- **Past 24 Hours**: Find posts from the last day
- **Past Week**: Find posts from the last 7 days
- **Past Month**: Find posts from the last 30 days
- **Past Year**: Find posts from the last year
- **All Time**: No time restriction (default)

### 2. Implementation Locations

#### Find New Leads Dialog
- Added time period dropdown in the lead search dialog
- Filters Reddit search results before analysis
- Helps focus on recent discussions for timely engagement

#### Manage Keywords (Find More Leads)
- Time filter available when searching for additional leads
- Applies to all selected keywords
- Ensures consistency across keyword searches

### 3. Benefits

#### For Hot Leads
- **Past Hour/Day**: Perfect for time-sensitive opportunities
- Allows quick response to fresh discussions
- Higher chance of engagement before competition

#### For Research
- **Past Week/Month**: Good for understanding trends
- Helps identify recurring topics
- Balances freshness with volume

#### For Comprehensive Analysis
- **Past Year/All Time**: Maximum coverage
- Useful for evergreen topics
- Best for initial campaign setup

## Usage

### In Find New Leads Dialog
1. Click "Find New Leads" button
2. Select keywords or generate new ones
3. Choose time period from dropdown
4. Set posts per keyword
5. Click "Score X Threads"

### In Manage Keywords
1. Click "Manage Keywords" button
2. Select time period at the top
3. Choose keywords and quantities
4. Click "Find X threads"

## Technical Details

### API Integration
- Uses Reddit Search API's time parameter
- Maps to Reddit's time filters: hour, day, week, month, year, all
- Replaces Google Search for better time filtering support

### Performance Considerations
- Shorter time periods = fewer results but more relevant
- Longer time periods = more results but may include outdated discussions
- Balanced approach recommended for most use cases

## Best Practices

1. **For Active Campaigns**: Use "Past Week" for regular lead generation
2. **For Urgent Needs**: Use "Past Hour" or "Past Day" for immediate opportunities
3. **For New Campaigns**: Start with "Past Month" to get a good baseline
4. **For Monitoring**: Use "Past 7 Days" in Monitor tab for recent activity

## Future Enhancements
- Custom date ranges
- Time-based scoring adjustments
- Automatic time filter based on keyword competitiveness
- Historical performance tracking by time period 