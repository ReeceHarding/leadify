# Monitor Tab Feature - Lead Finder

## Overview
The Monitor tab is a new feature in the Lead Finder that provides real-time monitoring of new Reddit posts matching your campaign keywords. It's designed for instant engagement with fresh content.

## Features

### 1. Real-Time Monitoring
- Shows only posts created **today**
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
- Accessible below the filter section in Lead Finder

## How It Works

1. **Switch to Monitor Tab**: Click the "Monitor" tab to enter monitoring mode
2. **Automatic Filtering**: Only today's posts are shown
3. **Real-Time Updates**: New posts appear automatically as they're found
4. **Notification Popup**: When a new unprocessed post is found, a popup appears
5. **Quick Action**: Choose to ignore, comment, DM, or both
6. **Notification Count**: Sidebar shows count of pending posts

## Use Cases

- **Time-Sensitive Opportunities**: Respond to posts immediately after they're created
- **First Responder Advantage**: Be among the first to offer help
- **High-Priority Keywords**: Monitor specific keywords that require immediate attention
- **Daily Monitoring**: Check in throughout the day for new opportunities

## Technical Details

- Filters posts by `postCreatedAt` timestamp
- Only shows posts from the current day (00:00 to 23:59)
- Updates notification count in real-time
- Dispatches custom events to update sidebar notification badge
- Automatically shows popup for first unprocessed lead when in Monitor mode

## Best Practices

1. **Check Regularly**: Monitor tab is most effective when checked multiple times per day
2. **Act Quickly**: Fresh posts get more visibility for early responders
3. **Quality Over Speed**: While speed matters, ensure your responses are still helpful
4. **Set Priorities**: Focus on high-value keywords in Monitor mode 