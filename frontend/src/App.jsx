import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import Sidebar from './components/layout/Sidebar';
import TopAppBar from './components/layout/TopAppBar';
import IntelligenceHub from './components/dashboard/IntelligenceHub';
import ChatbotWidget from './components/chatbot/ChatbotWidget';
import Login from './pages/Login';
import { AuthProvider } from './auth/AuthContext';
import { usePersistedState } from './components/chatbot/usePersistedState';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Home({ sidebarOpen, onToggleSidebar, chatbotDismissed, onDismissChatbot, onRestoreChatbot }) {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar open={sidebarOpen} onToggle={onToggleSidebar} onRestoreChatbot={onRestoreChatbot} />

      <main
        className="min-h-screen blueprint-grid transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '208px' : '64px' }}
      >
        <TopAppBar sidebarOpen={sidebarOpen} />

        <div className="flex flex-col items-center justify-center min-h-screen px-6 py-20">
          <IntelligenceHub />
        </div>
      </main>

      <ChatbotWidget dismissed={chatbotDismissed} onDismiss={onDismissChatbot} />
    </div>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatbotDismissed, setChatbotDismissed] = usePersistedState('chatbot:dismissed', false);

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="*"
              element={
                <Home
                  sidebarOpen={sidebarOpen}
                  onToggleSidebar={() => setSidebarOpen((v) => !v)}
                  chatbotDismissed={chatbotDismissed}
                  onDismissChatbot={() => setChatbotDismissed(true)}
                  onRestoreChatbot={() => setChatbotDismissed(false)}
                />
              }
            />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
