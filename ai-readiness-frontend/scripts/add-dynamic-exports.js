const fs = require('fs');
const path = require('path');

// Add dynamic export to API routes
const apiDir = path.join(__dirname, '..', 'app', 'api');

function addDynamicExport(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  
  if (!content.includes("export const dynamic = 'force-dynamic'")) {
    const newContent = `export const dynamic = 'force-dynamic'\n\n${content}`;
    fs.writeFileSync(filePath, newContent);
    console.log(`✅ Added dynamic export to ${filePath}`);
  } else {
    console.log(`⏭️  Already has dynamic export: ${filePath}`);
  }
}

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file === 'route.ts' || file === 'route.js') {
      addDynamicExport(filePath);
    }
  });
}

console.log('🔧 Adding dynamic exports to API routes...\n');
processDirectory(apiDir);
console.log('\n✅ Done!');