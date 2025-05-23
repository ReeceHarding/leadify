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

function logMessage(message) {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${message}\n`;
  
  try {
    fs.appendFileSync(LOG_FILE, logEntry);
  } catch (error) {
    console.error('Failed to write to log file:', error);
  }
}

function runCommandWithLogging(command, args = []) {
  const fullCommand = `${command} ${args.join(' ')}`;
  
  logMessage('='.repeat(50));
  logMessage(`COMMAND STARTED: ${fullCommand}`);
  logMessage('='.repeat(50));
  console.log(`🚀 Running with logging: ${fullCommand}`);
  
  const child = spawn(command, args, {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
  });

  // Log stdout
  child.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    
    // Split by lines and log each line separately to avoid massive single log entries
    output.split('\n').forEach(line => {
      if (line.trim()) {
        logMessage(`STDOUT: ${line.trim()}`);
      }
    });
  });

  // Log stderr
  child.stderr.on('data', (data) => {
    const output = data.toString();
    process.stderr.write(output);
    
    // Split by lines and log each line separately
    output.split('\n').forEach(line => {
      if (line.trim()) {
        logMessage(`STDERR: ${line.trim()}`);
      }
    });
  });

  child.on('close', (code) => {
    const message = `COMMAND FINISHED: ${fullCommand} (exit code: ${code})`;
    logMessage('='.repeat(50));
    logMessage(message);
    logMessage('='.repeat(50));
    
    if (code === 0) {
      console.log(`✅ ${message}`);
    } else {
      console.error(`❌ ${message}`);
      logMessage(`ERROR: Command failed with exit code ${code}`);
    }
    
    process.exit(code);
  });

  child.on('error', (error) => {
    const message = `COMMAND ERROR: ${error.message}`;
    logMessage(`ERROR: ${message}`);
    console.error(`❌ ${message}`);
    process.exit(1);
  });

  // Handle process termination gracefully
  process.on('SIGINT', () => {
    logMessage(`COMMAND INTERRUPTED: ${fullCommand} - Process received SIGINT`);
    console.log(`\n🛑 Command interrupted: ${fullCommand}`);
    child.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    logMessage(`COMMAND TERMINATED: ${fullCommand} - Process received SIGTERM`);
    console.log(`\n🛑 Command terminated: ${fullCommand}`);
    child.kill('SIGTERM');
  });
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('❌ Usage: node run-with-logging.js <command> [args...]');
  console.error('   Example: node run-with-logging.js npm run build');
  process.exit(1);
}

// Extract command and its arguments
const [command, ...commandArgs] = args;

// Run the command with logging
runCommandWithLogging(command, commandArgs); 