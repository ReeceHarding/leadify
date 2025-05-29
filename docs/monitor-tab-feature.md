# Monitor Tab Feature - Lead Finder

## Overview
The Monitor tab is a new feature in the Lead Finder that provides real-time monitoring of recent Reddit posts matching your campaign keywords. It's designed for instant engagement with hot leads that require quick action.

## Features

### 1. Real-Time Monitoring
- Shows posts created in the **last 7 days**
- Automatically filters to display the most recent posts first
- Updates in real-time as new posts are found

### 2. Notification System
- **Sidebar Notification Bell**: Shows count of unprocessed new posts
- **Auto-popup**: When in Monitor mode, automatically shows notification for new unprocessed leads
- **Quick Actions**: Each notification provides instant action buttons

### 3. Quick Action Buttons
When a new lead is found, you can:
- **Ignore**: Mark the lead as viewed
- **Send Comment Only**: Post the generated comment to Reddit
- **Send DM Only**: Send a direct message to the post author
- **Send Both**: Post comment AND send DM simultaneously

### 4. Tab Location
- Located alongside "Comments" and "Direct Messages" tabs
- Positioned immediately after the filter section in Lead Finder

## How It Works

1. **Switch to Monitor Tab**: Click the "Monitor" tab to enter monitoring mode
2. **Automatic Filtering**: Only posts from the last 7 days are shown
3. **Real-Time Updates**: New posts appear automatically as they're found
4. **Notification Popup**: When a new unprocessed post is found, a popup appears
5. **Quick Action**: Choose to ignore, comment, DM, or both
6. **Notification Count**: Sidebar shows count of pending posts

## Use Cases

- **Hot Leads**: Engage with fresh opportunities while they're still active
- **Time-Sensitive Opportunities**: Respond to posts within the critical first week
- **First Responder Advantage**: Be among the first to offer help
- **High-Priority Keywords**: Monitor specific keywords that require immediate attention
- **Weekly Monitoring**: Check throughout the week for new opportunities

## Technical Details

- Filters posts by `postCreatedAt` timestamp
- Shows posts from the last 7 days (168 hours)
- Updates notification count in real-time
- Dispatches custom events to update sidebar notification badge
- Automatically shows popup for first unprocessed lead when in Monitor mode

## Best Practices

1. **Check Regularly**: Monitor tab is most effective when checked multiple times per week
2. **Act Quickly**: Posts within the first 7 days get the most engagement
3. **Quality Over Speed**: While speed matters, ensure your responses are still helpful
4. **Set Priorities**: Focus on high-value keywords in Monitor mode
5. **Weekly Review**: Use the 7-day window to catch any missed opportunities 