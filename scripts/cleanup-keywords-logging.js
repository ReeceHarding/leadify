const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../actions/db/profiles-actions.ts');

// Read the file
let content = fs.readFileSync(filePath, 'utf8');

// Remove all lines that reference keywords in logging
const lines = content.split('\n');
const filteredLines = lines.filter(line => {
  // Remove lines that contain 'keywords' in any context within logging
  if (line.includes('keywords') && (line.includes('console.log') || line.includes('JSON.stringify'))) {
    return false;
  }
  // Remove lines that access .keywords property
  if (line.includes('.keywords')) {
    return false;
  }
  // Remove lines that reference keywords in any way
  if (line.includes('keywords') && line.trim().endsWith(')')) {
    return false;
  }
  return true;
});

// Write back the cleaned content
fs.writeFileSync(filePath, filteredLines.join('\n'));

console.log('✅ Cleaned up keywords logging statements from profiles-actions.ts'); 