const fs = require('fs');
let code = fs.readFileSync('src/components/ReplacementRequestsPanel.tsx', 'utf8');

const replacement = `  // Helper to compress image
  const compressImage = (file: File, callback: (base64: string) => void) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const max_size = 1000;
        if (width > height && width > max_size) {
          height *= max_size / width;
          width = max_size;
        } else if (height > max_size) {
          width *= max_size / height;
          height = max_size;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          callback(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          callback(event.target?.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Handle File Input selection for main form
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file, (result) => {
        setFormData(prev => ({ ...prev, photoBase64: result, photoUrl: result }));
      });
    }
  };

  // Handle File Input selection for Photo Upload Modal
  const handleModalPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      compressImage(file, (result) => {
        setUploadPhotoBase64(result);
        setUploadPhotoPreview(result);
      });
    }
  };`;

// replace everything from // Handle File Input selection for main form down to }; 
// right before // Handle Delete
code = code.replace(
  /\/\/ Handle File Input selection for main form[\s\S]*?reader\.readAsDataURL\(file\);\s*\}\s*\};\s*/,
  replacement + '\n\n'
);

fs.writeFileSync('src/components/ReplacementRequestsPanel.tsx', code);
console.log('Fixed UI photo upload logic');
