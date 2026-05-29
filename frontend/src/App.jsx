import { useState } from 'react';
import './index.css';
import Sidebar from './components/layout/Sidebar';
import TopAppBar from './components/layout/TopAppBar';
import IntelligenceHub from './components/dashboard/IntelligenceHub';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />

      <main
        className="min-h-screen blueprint-grid transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '208px' : '64px' }}
      >
        <TopAppBar sidebarOpen={sidebarOpen} />

        <div className="flex items-center justify-center min-h-screen px-6">
          <IntelligenceHub />
        </div>
      </main>
    </div>
  );
}
