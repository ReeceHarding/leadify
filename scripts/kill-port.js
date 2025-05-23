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
        
        pids.forEach(pid => {
          exec(`taskkill /PID ${pid} /F`, (killError) => {
            if (!killError) {
              console.log(`✅ Killed process ${pid} on port 3000`);
            }
          });
        });
      }
    });
  } else {
    // macOS/Linux command to kill process on port 3000
    exec('lsof -ti:3000', (error, stdout) => {
      if (stdout) {
        const pids = stdout.trim().split('\n');
        pids.forEach(pid => {
          if (pid) {
            exec(`kill -9 ${pid}`, (killError) => {
              if (!killError) {
                console.log(`✅ Killed process ${pid} on port 3000`);
              }
            });
          }
        });
      }
    });
  }
}

killPort3000(); 