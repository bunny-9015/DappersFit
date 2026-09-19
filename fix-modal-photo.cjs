const fs = require('fs');
let code = fs.readFileSync('src/components/ReplacementRequestsPanel.tsx', 'utf8');

const replacement = `  // Handle File Input selection for Photo Upload Modal
  const handleModalPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file, (result) => {
        setUploadPhotoBase64(result);
        setUploadPhotoPreview(result);
      });
    }
  };

  // Handle Delete`;

code = code.replace(
  /\/\/ Handle Delete/,
  replacement
);

fs.writeFileSync('src/components/ReplacementRequestsPanel.tsx', code);
console.log('Fixed handleModalPhotoChange');
