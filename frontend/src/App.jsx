import { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import './index.css';
import AppShell from './components/layout/AppShell';
import IntelligenceHub from './components/dashboard/IntelligenceHub';
import Login from './pages/Login';
import { AuthProvider } from './auth/AuthContext';
import { usePersistedState } from './components/chatbot/usePersistedState';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function Home({ sidebarOpen, onToggleSidebar, chatbotDismissed, onDismissChatbot, onRestoreChatbot }) {
  return (
    <AppShell
      sidebarOpen={sidebarOpen}
      onToggleSidebar={onToggleSidebar}
      chatbotDismissed={chatbotDismissed}
      onDismissChatbot={onDismissChatbot}
      onRestoreChatbot={onRestoreChatbot}
    >
      <div className="flex flex-col items-center justify-center min-h-screen px-6 py-20">
        <IntelligenceHub />
      </div>
    </AppShell>
  );
}

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatbotDismissed, setChatbotDismissed] = usePersistedState('chatbot:dismissed', false);

  const sharedShellProps = {
    sidebarOpen,
    onToggleSidebar: () => setSidebarOpen((v) => !v),
    chatbotDismissed,
    onDismissChatbot: () => setChatbotDismissed(true),
    onRestoreChatbot: () => setChatbotDismissed(false),
  };

  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="*" element={<Home {...sharedShellProps} />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </GoogleOAuthProvider>
  );
}
