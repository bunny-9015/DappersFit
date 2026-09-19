const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const helper = `
// Helper: Generate a minimal PDF buffer natively in Node.js
function generateMinimalPDF(title: string, lines: string[]): Buffer {
  let content = "%PDF-1.4\\n1 0 obj\\n<< /Type /Catalog /Pages 2 0 R >>\\nendobj\\n2 0 obj\\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\\nendobj\\n3 0 obj\\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\\nendobj\\n5 0 obj\\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\\nendobj\\n";
  let stream = "BT\\n/F1 12 Tf\\n20 750 Td\\n(" + title.replace(/[()\\\\]/g, "") + ") Tj\\n";
  for(let i=0; i < lines.length; i++) {
     stream += "0 -15 Td\\n(" + lines[i].replace(/[()\\\\]/g, "") + ") Tj\\n";
  }
  stream += "ET";
  const streamLen = stream.length;
  content += "4 0 obj\\n<< /Length " + streamLen + " >>\\nstream\\n" + stream + "\\nendstream\\nendobj\\ntrailer\\n<< /Root 1 0 R >>\\n%%EOF";
  return Buffer.from(content, 'utf-8');
}
`;

const insertIndex = code.indexOf("app.get('/api/shiprocket/download-label-pdf'");
if (insertIndex !== -1) {
  code = code.slice(0, insertIndex) + helper + "\n" + code.slice(insertIndex);
  fs.writeFileSync('server.ts', code);
  console.log('Inserted helper.');
} else {
  console.log('Could not find endpoint.');
}
