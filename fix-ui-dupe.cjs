const fs = require('fs');
let code = fs.readFileSync('src/components/ReplacementRequestsPanel.tsx', 'utf8');

// The duplicate starts at "// Handle File Input selection for Photo Upload Modal" right before "// Handle Delete"
code = code.replace(
  /\/\/ Handle File Input selection for Photo Upload Modal[\s\S]*?reader\.readAsDataURL\(file\);\s*\}\s*\};\s*(?=\/\/ Handle Delete)/,
  ''
);

fs.writeFileSync('src/components/ReplacementRequestsPanel.tsx', code);
console.log('Fixed UI duplication');
