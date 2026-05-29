import accountIcon from '../../assets/icon-account.svg';

export default function TopAppBar({ sidebarOpen }) {
  return (
    <header
      className="fixed top-0 right-0 h-[64px] z-40 bg-[rgba(13,28,45,0.4)] border-b border-[rgba(133,148,139,0.2)] backdrop-blur-xl flex justify-between items-center px-6 transition-all duration-300"
      style={{ width: `calc(100% - ${sidebarOpen ? '208' : '64'}px)` }}
    >
      {/* Left: node indicator */}
      <div className="flex items-center gap-4">
        <div className="w-2 h-2 rounded-full bg-primary glow-accent" />
      
      </div>

      {/* Right: actions */}
      <div className="flex items-center gap-6">
        <button className="px-4 py-1.5 border border-primary/30 text-primary text-[10px] tracking-[0.05em] font-bold font-mono rounded-sm hover:bg-primary/10 duration-200 cursor-pointer">
          UPGRADE TO PRO
        </button>

        <div className="flex items-center gap-3 cursor-pointer group">
          <div className="flex flex-col items-end">
          
          </div>
          <div className="w-8 h-8 rounded-full border border-[rgba(133,148,139,0.2)] overflow-hidden bg-surface-container flex items-center justify-center group-hover:border-primary transition-colors">
            <img
              src={accountIcon}
              alt="Account"
              className="w-5 h-5 object-contain opacity-70 group-hover:opacity-100 transition-all"
            />
          </div>
        </div>
      </div>
    </header>
  );
}
