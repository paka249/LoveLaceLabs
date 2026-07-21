import { useState } from 'react';
import AppShell from '../components/layout/AppShell';
import FunctionList, { createFunction } from '../components/graph/FunctionList';
import GraphCanvas from '../components/graph/GraphCanvas';

export default function Graph({
  sidebarOpen,
  onToggleSidebar,
  chatbotDismissed,
  onDismissChatbot,
  onRestoreChatbot,
}) {
  const [functions, setFunctions] = useState(() => [createFunction(0)]);

  return (
    <AppShell
      sidebarOpen={sidebarOpen}
      onToggleSidebar={onToggleSidebar}
      chatbotDismissed={chatbotDismissed}
      onDismissChatbot={onDismissChatbot}
      onRestoreChatbot={onRestoreChatbot}
    >
      <div className="flex flex-col h-screen pt-16">
        <GraphCanvas functions={functions} />
        <div className="h-64 border-t border-outline/20 bg-surface-container">
          <FunctionList functions={functions} onChange={setFunctions} />
        </div>
      </div>
    </AppShell>
  );
}
