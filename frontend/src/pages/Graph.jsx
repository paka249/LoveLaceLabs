import { useState, useRef, useCallback } from 'react';
import AppShell from '../components/layout/AppShell';
import FunctionList, { createFunction } from '../components/graph/FunctionList';
import GraphCanvas from '../components/graph/GraphCanvas';

const MIN_PANEL_HEIGHT = 72;
const MAX_PANEL_HEIGHT = 480;
const DEFAULT_PANEL_HEIGHT = 152;

export default function Graph({
  sidebarOpen,
  onToggleSidebar,
  chatbotDismissed,
  onDismissChatbot,
  onRestoreChatbot,
}) {
  const [functions, setFunctions] = useState(() => [createFunction(0)]);
  const [panelHeight, setPanelHeight] = useState(DEFAULT_PANEL_HEIGHT);
  const dragState = useRef(null);

  const onDividerPointerDown = useCallback((e) => {
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragState.current = { startY: e.clientY, startHeight: panelHeight };
  }, [panelHeight]);

  const onDividerPointerMove = useCallback((e) => {
    if (!dragState.current) return;
    const delta = dragState.current.startY - e.clientY;
    const clamped = Math.max(MIN_PANEL_HEIGHT, Math.min(MAX_PANEL_HEIGHT, dragState.current.startHeight + delta));
    setPanelHeight(clamped);
  }, []);

  const onDividerPointerUp = useCallback(() => {
    dragState.current = null;
  }, []);

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
        <div
          className="h-1.5 cursor-ns-resize shrink-0 bg-outline/10 hover:bg-primary/40 active:bg-primary/60 transition-colors"
          onPointerDown={onDividerPointerDown}
          onPointerMove={onDividerPointerMove}
          onPointerUp={onDividerPointerUp}
          onPointerCancel={onDividerPointerUp}
        />
        <div
          className="border-t border-outline/20 bg-surface-container shrink-0 overflow-hidden"
          style={{ height: panelHeight }}
        >
          <FunctionList functions={functions} onChange={setFunctions} />
        </div>
      </div>
    </AppShell>
  );
}
