#!/usr/bin/env node

const { exec } = require('child_process');
const os = require('os');

function killPort3000() {
  const isWindows = os.platform() === 'win32';
  
  if (isWindows) {
    // Windows command to kill process on port 3000
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
                console.log(`✅ Killed process ${pid} on port 3000`);
              }
            });
          });
        } else {
          console.log(`📍 Port 3000 is free`);
        }
      } else {
        console.log(`📍 Port 3000 is free`);
      }
    });
  } else {
    // macOS/Linux command to kill process on port 3000
    exec('lsof -ti:3000', (error, stdout) => {
      if (stdout) {
        const pids = stdout.trim().split('\n').filter(pid => pid);
        if (pids.length > 0) {
          pids.forEach(pid => {
            exec(`kill -9 ${pid}`, (killError) => {
              if (!killError) {
                console.log(`✅ Killed process ${pid} on port 3000`);
              } else {
                console.log(`⚠️ Failed to kill process ${pid}: ${killError.message}`);
              }
            });
          });
        } else {
          console.log(`📍 Port 3000 is free`);
        }
      } else {
        console.log(`📍 Port 3000 is free`);
      }
    });
  }
}

// Add a small delay to ensure cleanup is complete
setTimeout(() => {
  killPort3000();
}, 100);

// Exit after 2 seconds max
setTimeout(() => {
  process.exit(0);
}, 2000); 