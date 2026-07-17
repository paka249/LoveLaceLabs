import { useState } from 'react';
import './index.css';
import Sidebar from './components/layout/Sidebar';
import TopAppBar from './components/layout/TopAppBar';
import IntelligenceHub from './components/dashboard/IntelligenceHub';
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import { usePersistedState } from './components/chatbot/usePersistedState';

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatbotDismissed, setChatbotDismissed] = usePersistedState('chatbot:dismissed', false);

  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar
        open={sidebarOpen}
        onToggle={() => setSidebarOpen((v) => !v)}
        onRestoreChatbot={() => setChatbotDismissed(false)}
      />

      <main
        className="min-h-screen blueprint-grid transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '208px' : '64px' }}
      >
        <TopAppBar sidebarOpen={sidebarOpen} />

        <div className="flex flex-col items-center justify-center min-h-screen px-6 py-20">
          <IntelligenceHub />
        </div>
      </main>

      <ChatbotWidget dismissed={chatbotDismissed} onDismiss={() => setChatbotDismissed(true)} />
    </div>
  );
}
