import Sidebar from './Sidebar';
import TopAppBar from './TopAppBar';
import ChatbotWidget from '../chatbot/ChatbotWidget';

export default function AppShell({
  sidebarOpen,
  onToggleSidebar,
  chatbotDismissed,
  onDismissChatbot,
  onRestoreChatbot,
  children,
}) {
  return (
    <div className="min-h-screen bg-background text-on-surface">
      <Sidebar open={sidebarOpen} onToggle={onToggleSidebar} onRestoreChatbot={onRestoreChatbot} />

      <main
        className="min-h-screen blueprint-grid transition-all duration-300"
        style={{ marginLeft: sidebarOpen ? '208px' : '64px' }}
      >
        <TopAppBar sidebarOpen={sidebarOpen} />
        {children}
      </main>

      <ChatbotWidget dismissed={chatbotDismissed} onDismiss={onDismissChatbot} />
    </div>
  );
}
