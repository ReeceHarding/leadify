# Terminal Command Logging System

This document describes the comprehensive logging system implemented for the Leadify project that captures all terminal command outputs to `docs/log.txt`.

## Overview

The logging system addresses the limitation of terminal history being truncated at ~1000 lines by capturing all command outputs, including those that can be hundreds of thousands of lines long. This provides a complete source of truth that can be fed to AI models for debugging and analysis.

## Features

- **Comprehensive Logging**: Captures all stdout, stderr, and command metadata
- **Timestamped Entries**: Every log entry includes ISO timestamps for precise tracking
- **Fresh Sessions**: Log file is automatically cleared when starting `npm run dev`
- **Error Handling**: Captures exit codes, error messages, and process interruptions
- **Non-Disruptive**: Commands display normally in terminal while logging in background
- **Organized Output**: Logs are structured with clear separators and prefixes

## File Structure

```
docs/
├── log.txt              # Main log file (cleared on dev start)
└── logging-system.md    # This documentation

scripts/
├── dev-with-logging.js     # Special dev script with port killing and log clearing
├── run-with-logging.js     # Generic command wrapper with logging
├── logging.js              # Original logging utility (alternative approach)
└── kill-port.js           # Original port killing script (kept for reference)
```

## How It Works

### 1. Development Server (`npm run dev`)
- Uses `scripts/dev-with-logging.js`
- **Clears** `docs/log.txt` for fresh session
- Kills any processes on port 3000
- Starts Next.js dev server with full logging
- Captures all Next.js output, webpack builds, hot reloads, etc.

### 2. Other Commands (`npm run build`, `npm run lint`, etc.)
- Use `scripts/run-with-logging.js` wrapper
- **Appends** to existing `docs/log.txt` (doesn't clear)
- Captures all command output with timestamps
- Maintains command history throughout session

### 3. Fallback Commands
- `npm run dev:no-log` - Run dev without logging
- `npm run build:no-log` - Run build without logging
- `npm run start:no-log` - Run start without logging

## Log Format

Each log entry follows this format:

```
==================================================
[2025-05-23T18:53:49.605Z] COMMAND STARTED: npm run build
==================================================
[2025-05-23T18:53:49.610Z] STDOUT: > leadify@0.1.0 build
[2025-05-23T18:53:49.615Z] STDOUT: > next build
[2025-05-23T18:53:50.120Z] STDOUT: ▲ Next.js 15.0.3
[2025-05-23T18:53:50.125Z] STDOUT: - Environments: .env.local
...
[2025-05-23T18:54:15.890Z] COMMAND FINISHED: npm run build (exit code: 0)
==================================================
```

### Log Entry Types

- `COMMAND STARTED`: Beginning of command execution
- `COMMAND FINISHED`: End of command with exit code
- `STDOUT`: Standard output from the command
- `STDERR`: Error output from the command
- `NEXTJS_STDOUT`/`NEXTJS_STDERR`: Specific to Next.js dev server
- `COMMAND INTERRUPTED`: Process killed by Ctrl+C
- `COMMAND TERMINATED`: Process terminated by system
- `ERROR`: Command execution errors

## Usage Examples

### Start Development with Logging
```bash
npm run dev
# Clears log.txt and starts fresh logging session
```

### Build with Logging
```bash
npm run build
# Appends build output to existing log.txt
```

### Run Any Command with Logging
```bash
node scripts/run-with-logging.js <command> [args...]
# Example: node scripts/run-with-logging.js git status
```

### Run Without Logging (Emergency)
```bash
npm run dev:no-log     # Original dev command
npm run build:no-log   # Original build command
```

## Benefits for AI Analysis

1. **Complete Context**: No truncated logs, full build/error context
2. **Precise Timing**: Timestamps help identify when issues occurred
3. **Error Correlation**: See exactly what happened before/after errors
4. **Performance Analysis**: Track build times and process performance
5. **Debug History**: Complete session history for troubleshooting

## File Management

- **Log Size**: Can grow large during long sessions (hundreds of thousands of lines)
- **Clearing**: Automatically cleared on `npm run dev` start
- **Manual Clear**: Delete `docs/log.txt` or run `echo "" > docs/log.txt`
- **Backup**: Consider backing up important debugging sessions before starting new dev session

## Troubleshooting

### If Logging Stops Working
1. Check if `docs/` directory exists
2. Verify script permissions: `chmod +x scripts/*.js`
3. Check Node.js version compatibility
4. Try fallback commands (`npm run dev:no-log`)

### If Log File Gets Too Large
1. Stop current process (Ctrl+C)
2. Archive current log: `mv docs/log.txt docs/log-backup-$(date +%Y%m%d).txt`
3. Start fresh session with `npm run dev`

### Performance Impact
- Minimal impact on command execution
- File I/O is asynchronous and non-blocking
- Large logs may slow file viewing but not command execution

## Integration with AI Tools

The `docs/log.txt` file is designed to be easily consumed by AI models:

```bash
# Feed entire log to AI for analysis
cat docs/log.txt | ai-tool analyze

# Search for specific errors
grep "ERROR\|STDERR" docs/log.txt | ai-tool debug

# Get last 1000 lines for recent context
tail -n 1000 docs/log.txt | ai-tool diagnose
```

This system ensures you never lose critical debugging information and provides complete context for AI-assisted development and troubleshooting. 