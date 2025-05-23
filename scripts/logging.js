#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

// Path to the log file
const LOG_FILE = path.join(__dirname, '..', 'docs', 'log.txt');

// Ensure docs directory exists
const docsDir = path.dirname(LOG_FILE);
if (!fs.existsSync(docsDir)) {
  fs.mkdirSync(docsDir, { recursive: true });
}

function clearLogFile() {
  console.log('🧹 Clearing log file for fresh start...');
  fs.writeFileSync(LOG_FILE, '');
  logMessage('='.repeat(80));
  logMessage(`NEW SESSION STARTED: ${new Date().toISOString()}`);
  logMessage('='.repeat(80));
  console.log('✅ Log file cleared and ready for new session');
}

function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  try {
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

function runCommandWithLogging(command, args = [], options = {}) {
  logMessage(`COMMAND STARTED: ${command} ${args.join(' ')}`);
  console.log(`🚀 Running: ${command} ${args.join(' ')}`);
  
  const child = spawn(command, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    ...options
  });

  // Log stdout
  child.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    logMessage(`STDOUT: ${output.trim()}`);
  });

  // Log stderr
  child.stderr.on('data', (data) => {
    const output = data.toString();
    process.stderr.write(output);
    logMessage(`STDERR: ${output.trim()}`);
  });

  child.on('close', (code) => {
    const message = `COMMAND FINISHED: ${command} ${args.join(' ')} (exit code: ${code})`;
    logMessage(message);
    console.log(`✅ ${message}`);
    
    if (code !== 0) {
      logMessage(`ERROR: Command failed with exit code ${code}`);
    }
    
    process.exit(code);
  });

  child.on('error', (error) => {
    const message = `COMMAND ERROR: ${error.message}`;
    logMessage(message);
    console.error(`❌ ${message}`);
    process.exit(1);
  });

  // Handle process termination
  process.on('SIGINT', () => {
    logMessage('COMMAND INTERRUPTED: Process received SIGINT');
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    logMessage('COMMAND TERMINATED: Process received SIGTERM');
    child.kill('SIGTERM');
  });
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node logging.js <command> [args...]');
  process.exit(1);
}

// Special handling for dev command - clear log first
if (args[0] === 'dev' || args.includes('dev')) {
  clearLogFile();
}

// Extract command and its arguments
const [command, ...commandArgs] = args;

// Run the command with logging
runCommandWithLogging(command, commandArgs); 