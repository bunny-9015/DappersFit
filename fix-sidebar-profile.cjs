const fs = require('fs');
let code = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

code = code.replace(
  /onSignOut: \(\) => void;/,
  `onSignOut: () => void;\n  onOpenProfile?: () => void;`
);

code = code.replace(
  /export default function Sidebar\(\{ activeTab, setActiveTab, isSimulated, user, onSignOut \}: SidebarProps\) \{/,
  `export default function Sidebar({ activeTab, setActiveTab, isSimulated, user, onSignOut, onOpenProfile }: SidebarProps) {`
);

code = code.replace(
  /<button \n\s+onClick=\{\(\) => setActiveTab\(isAdmin \? 'settings' : 'dashboard'\)\}/,
  `<button 
            onClick={onOpenProfile ? onOpenProfile : () => setActiveTab(isAdmin ? 'settings' : 'dashboard')}`
);

fs.writeFileSync('src/components/Sidebar.tsx', code);
console.log('Fixed Sidebar profile modal');
