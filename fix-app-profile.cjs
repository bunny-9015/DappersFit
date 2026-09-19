const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes('import ProfileModal')) {
  code = code.replace(
    /import Sidebar from '\.\/components\/Sidebar';/,
    `import Sidebar from './components/Sidebar';\nimport ProfileModal from './components/ProfileModal';`
  );
}

if (!code.includes('const [isProfileModalOpen')) {
  code = code.replace(
    /const \[isMobileSidebarOpen, setIsMobileSidebarOpen\] = useState<boolean>\(false\);/,
    `const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);\n  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);`
  );
}

// Add onOpenProfile to desktop Sidebar
code = code.replace(
  /<Sidebar\s+activeTab=\{activeTab\}\s+setActiveTab=\{setActiveTab\}\s+isSimulated=\{isSimulated\}\s+user=\{user\}\s+onSignOut=\{handleSignOut\}\s*\/>/g,
  `<Sidebar 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          isSimulated={isSimulated} 
          user={user}
          onSignOut={handleSignOut}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />`
);

// Add onOpenProfile to mobile Sidebar
code = code.replace(
  /<Sidebar\s+activeTab=\{activeTab\}\s+setActiveTab=\{\(tab\) => \{\s+setActiveTab\(tab\);\s+setIsMobileSidebarOpen\(false\);\s+\}\}\s+isSimulated=\{isSimulated\}\s+user=\{user\}\s+onSignOut=\{\(\) => \{\s+handleSignOut\(\);\s+setIsMobileSidebarOpen\(false\);\s+\}\}\s*\/>/g,
  `<Sidebar 
              activeTab={activeTab} 
              setActiveTab={(tab) => {
                setActiveTab(tab);
                setIsMobileSidebarOpen(false);
              }} 
              isSimulated={isSimulated} 
              user={user}
              onSignOut={() => {
                handleSignOut();
                setIsMobileSidebarOpen(false);
              }}
              onOpenProfile={() => {
                setIsProfileModalOpen(true);
                setIsMobileSidebarOpen(false);
              }}
            />`
);

// Render ProfileModal
if (!code.includes('<ProfileModal')) {
  code = code.replace(
    /\{isSimulated && \(/,
    `{isProfileModalOpen && user && (
        <ProfileModal 
          user={user} 
          onClose={() => setIsProfileModalOpen(false)} 
        />
      )}

      {isSimulated && (`
  );
}

fs.writeFileSync('src/App.tsx', code);
console.log('Fixed App.tsx profile modal');
