const FACE = '◕‿◕';

export default function ChatBubble({ position, onPointerDown, onOpen, onDismiss, hasMovedRef }) {
  return (
    <div
      style={{ position: 'fixed', left: position.x, top: position.y, zIndex: 1000 }}
      className="flex flex-col items-center gap-1"
    >
      <div
        onPointerDown={onPointerDown}
        onClick={() => {
          if (!hasMovedRef.current) onOpen();
        }}
        title="Chat with Ada"
        className="w-14 h-14 rounded-full flex items-center justify-center cursor-grab active:cursor-grabbing select-none shadow-[0_0_18px_rgba(52,211,153,0.35)]"
        style={{ background: '#122131', border: '2px solid #5af0b3' }}
      >
        <span style={{ color: '#5af0b3' }} className="text-lg">{FACE}</span>
      </div>
      <button
        type="button"
        onClick={onDismiss}
        title="Remove chatbot"
        className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] text-on-surface-variant hover:text-red-400 hover:bg-surface-container-high cursor-pointer"
      >
        ×
      </button>
    </div>
  );
}
