const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const brokenPart = `app.get('/api/products', async (req, res) => {
  if (isFirebaseEnabled && firestoreDb) {
    try {
      const productsCol = collection(firestoreDb, 'products');
      const snapshot = await getDocs(productsCol);
      const cloudProducts: any[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data && data.id) cloudProducts.push(data);
      });
      if (cloudProducts.length > 0) {
        mockReplacements = cloudItems;
      }
    } catch (err: any) {
      console.warn('[Firebase] Querying replacements failed, serving local cache:', err.message);
    }
  }
  // Sort by createdAt descending
  const sorted = [...mockReplacements].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
  res.json({ replacements: sorted });
});`;

const properPart = `app.get('/api/products', async (req, res) => {
  if (isFirebaseEnabled && firestoreDb) {
    try {
      const productsCol = collection(firestoreDb, 'products');
      const snapshot = await getDocs(productsCol);
      const cloudProducts: any[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data && data.id) cloudProducts.push(data);
      });
      if (cloudProducts.length > 0) {
        mockProducts = cloudProducts;
      }
    } catch (err) {
      console.error('[Firebase] Failed to fetch products from cloud:', err);
    }
  }
  res.json({ products: mockProducts });
});

app.post('/api/products', async (req, res) => {
  const prod = req.body;
  if (!prod.id) {
    prod.id = \`p-\${Date.now()}\`;
  }
  const existingIdx = mockProducts.findIndex(p => p && String(p.id) === String(prod.id));
  if (existingIdx >= 0) {
    mockProducts[existingIdx] = { ...mockProducts[existingIdx], ...prod };
  } else {
    mockProducts.unshift(prod);
  }

  if (isFirebaseEnabled && firestoreDb) {
    try {
      await setDoc(doc(firestoreDb, 'products', String(prod.id)), sanitizeForFirestore(prod));
      console.log(\`[Firebase] Saved product \${prod.id} (\${prod.name}) to Firestore.\`);
    } catch (err) {
      console.error('[Firebase] Direct write of product failed:', err);
    }
  }

  saveProductsToFile();
  res.json({ success: true, product: prod, products: mockProducts });
});

app.delete('/api/products/:id', async (req, res) => {
  const { id } = req.params;
  mockProducts = mockProducts.filter(p => p && String(p.id) !== String(id));

  if (isFirebaseEnabled && firestoreDb) {
    try {
      await deleteDoc(doc(firestoreDb, 'products', String(id)));
    } catch (err) {
      console.error('[Firebase] Direct delete of product failed:', err);
    }
  }

  saveProductsToFile();
  res.json({ success: true, products: mockProducts });
});

// =============================================================
// REPLACEMENT & EXCHANGE REQUESTS API ROUTES
// =============================================================

function saveBase64Image(base64Data: string, prefix: string = 'rep'): string | null {
  try {
    const matches = base64Data.match(/^data:([A-Za-z-+\\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) return null;
    
    const extension = matches[1].split('/')[1] === 'jpeg' ? 'jpg' : 'png';
    const buffer = Buffer.from(matches[2], 'base64');
    const filename = \`\${prefix}_\${Date.now()}.\${extension}\`;
    
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(uploadsDir, filename), buffer);
    return \`/uploads/\${filename}\`;
  } catch (err) {
    console.error('Error saving base64 image:', err);
    return null;
  }
}

app.get('/api/replacements', async (req, res) => {
  if (isFirebaseEnabled && firestoreDb) {
    try {
      const col = collection(firestoreDb, 'replacements');
      const snapshot = await getDocs(col);
      const cloudItems: any[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        if (data && data.id) cloudItems.push(data);
      });
      if (cloudItems.length > 0) {
        mockReplacements = cloudItems;
      }
    } catch (err: any) {
      console.warn('[Firebase] Querying replacements failed, serving local cache:', err.message);
    }
  }
  // Sort by createdAt descending
  const sorted = [...mockReplacements].sort((a, b) => {
    const timeA = new Date(a.createdAt || 0).getTime();
    const timeB = new Date(b.createdAt || 0).getTime();
    return timeB - timeA;
  });
  res.json({ replacements: sorted });
});`;

const newCode = code.replace(brokenPart, properPart);

if (newCode !== code) {
  fs.writeFileSync('server.ts', newCode);
  console.log('Reconstructed broken part successfully!');
} else {
  console.log('Could not find exact broken part. Let me print it out to check differences.');
}
