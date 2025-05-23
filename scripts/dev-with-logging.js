#!/usr/bin/env node

const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

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

function clearLogFile() {
  console.log('🧹 Clearing log file for fresh dev session...');
  fs.writeFileSync(LOG_FILE, '');
  logMessage('='.repeat(80));
  logMessage(`NEW DEV SESSION STARTED: ${new Date().toISOString()}`);
  logMessage('='.repeat(80));
  console.log('✅ Log file cleared and ready for new dev session');
}

function killPort3000() {
  return new Promise((resolve) => {
    logMessage('STEP: Killing processes on port 3000');
    const isWindows = os.platform() === 'win32';
    
    if (isWindows) {
      exec('netstat -ano | findstr :3000', (error, stdout) => {
        if (stdout) {
          const lines = stdout.split('\n');
          const pids = lines
            .filter(line => line.includes('LISTENING'))
            .map(line => line.trim().split(/\s+/).pop())
            .filter(pid => pid && pid !== '0');
          
          if (pids.length > 0) {
            pids.forEach(pid => {
              exec(`taskkill /PID ${pid} /F`, (killError) => {
                if (!killError) {
                  const message = `✅ Killed process ${pid} on port 3000`;
                  console.log(message);
                  logMessage(message);
                } else {
                  const message = `⚠️ Failed to kill process ${pid}: ${killError.message}`;
                  console.log(message);
                  logMessage(message);
                }
              });
            });
          } else {
            const message = '📍 Port 3000 is free';
            console.log(message);
            logMessage(message);
          }
        } else {
          const message = '📍 Port 3000 is free';
          console.log(message);
          logMessage(message);
        }
        resolve();
      });
    } else {
      exec('lsof -ti:3000', (error, stdout) => {
        if (stdout) {
          const pids = stdout.trim().split('\n').filter(pid => pid);
          if (pids.length > 0) {
            pids.forEach(pid => {
              exec(`kill -9 ${pid}`, (killError) => {
                if (!killError) {
                  const message = `✅ Killed process ${pid} on port 3000`;
                  console.log(message);
                  logMessage(message);
                } else {
                  const message = `⚠️ Failed to kill process ${pid}: ${killError.message}`;
                  console.log(message);
                  logMessage(message);
                }
              });
            });
          } else {
            const message = '📍 Port 3000 is free';
            console.log(message);
            logMessage(message);
          }
        } else {
          const message = '📍 Port 3000 is free';
          console.log(message);
          logMessage(message);
        }
        resolve();
      });
    }
  });
}

function runNextDev() {
  logMessage('STEP: Starting Next.js development server');
  console.log('🚀 Starting Next.js development server with logging...');
  
  const nextDev = spawn('npx', ['next', 'dev'], {
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true
  });

  // Log stdout
  nextDev.stdout.on('data', (data) => {
    const output = data.toString();
    process.stdout.write(output);
    // Split by lines and log each line separately to avoid massive single log entries
    output.split('\n').forEach(line => {
      if (line.trim()) {
        logMessage(`NEXTJS_STDOUT: ${line.trim()}`);
      }
    });
  });

  // Log stderr
  nextDev.stderr.on('data', (data) => {
    const output = data.toString();
    process.stderr.write(output);
    // Split by lines and log each line separately
    output.split('\n').forEach(line => {
      if (line.trim()) {
        logMessage(`NEXTJS_STDERR: ${line.trim()}`);
      }
    });
  });

  nextDev.on('close', (code) => {
    const message = `Next.js dev server stopped with exit code: ${code}`;
    logMessage(`NEXTJS_CLOSE: ${message}`);
    console.log(`🛑 ${message}`);
    process.exit(code);
  });

  nextDev.on('error', (error) => {
    const message = `Next.js dev server error: ${error.message}`;
    logMessage(`NEXTJS_ERROR: ${message}`);
    console.error(`❌ ${message}`);
    process.exit(1);
  });

  // Handle process termination gracefully
  process.on('SIGINT', () => {
    logMessage('DEV_INTERRUPT: Development server interrupted by user (Ctrl+C)');
    console.log('\n🛑 Development server interrupted by user');
    nextDev.kill('SIGINT');
  });

  process.on('SIGTERM', () => {
    logMessage('DEV_TERMINATE: Development server terminated');
    console.log('\n🛑 Development server terminated');
    nextDev.kill('SIGTERM');
  });
}

async function startDevWithLogging() {
  try {
    // Step 1: Clear log file
    clearLogFile();
    
    // Step 2: Kill any processes on port 3000
    await killPort3000();
    
    // Step 3: Wait a moment for cleanup
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Step 4: Start Next.js dev server
    runNextDev();
    
  } catch (error) {
    const message = `Failed to start dev server: ${error.message}`;
    console.error(`❌ ${message}`);
    logMessage(`DEV_START_ERROR: ${message}`);
    process.exit(1);
  }
}

// Start the development server
startDevWithLogging(); 