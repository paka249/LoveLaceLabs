const NAV_WORKSPACE = [
  { icon: 'terminal', label: 'Workspace', active: true },
  { icon: 'function', label: 'Calculus' },
  { icon: 'grid_view', label: 'Linear Algebra' },
  { icon: 'bar_chart', label: 'Statistics' },
  { icon: 'menu_book', label: 'Library' },
];

const NAV_ENGINES = [
  { icon: 'monitoring', label: 'Calculus Lab' },
  { icon: 'layers', label: 'Matrix Engine' },
  { icon: 'account_balance', label: 'Financial Analysis' },
];

function NavItem({ icon, label, active = false }) {
  const base =
    'flex items-center gap-3 px-3 py-2 transition-all duration-200 cursor-pointer text-[11px] tracking-[0.05em] font-bold uppercase font-mono';
  const activeClass =
    'text-primary border-r-2 border-primary translate-x-1 bg-[rgba(52,211,153,0.15)]';
  const inactiveClass =
    'text-on-surface-variant hover:bg-surface-container-high hover:text-primary';

  return (
    <a href="#" className={`${base} ${active ? activeClass : inactiveClass}`}>
      <span className="material-symbols-outlined text-[20px]">{icon}</span>
      <span>{label}</span>
    </a>
  );
}

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-[208px] bg-surface-container border-r border-[rgba(133,148,139,0.2)] backdrop-blur-md flex flex-col py-6 px-4 z-50">
      {/* Brand */}
      <div className="mb-10">
        <h1 className="text-[20px] font-bold text-primary tracking-tighter leading-tight">
          LovelaceLabs
        </h1>
        <p className="text-[9px] tracking-[0.05em] font-bold font-mono text-on-surface-variant opacity-60 uppercase mt-0.5">
          Computational Engine v4.2
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-grow space-y-4">
        <div className="space-y-1">
          <p className="px-2 pb-2 text-[11px] tracking-[0.05em] font-bold font-mono text-on-surface-variant opacity-40 uppercase">
            Workspace
          </p>
          {NAV_WORKSPACE.map((item) => (
            <NavItem key={item.label} {...item} />
          ))}
        </div>

        <div className="pt-6 space-y-1 border-t border-[rgba(133,148,139,0.2)]">
          <p className="px-2 pb-2 text-[11px] tracking-[0.05em] font-bold font-mono text-on-surface-variant opacity-40 uppercase">
            Engines
          </p>
          {NAV_ENGINES.map((item) => (
            <NavItem key={item.label} {...item} />
          ))}
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="mt-auto space-y-1">
        <button className="w-full mb-4 py-2 bg-primary-container text-on-primary text-[11px] tracking-[0.05em] font-bold font-mono rounded-sm hover:brightness-110 transition-all cursor-pointer">
          NEW NOTEBOOK
        </button>
        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-primary transition-colors text-[11px] tracking-[0.05em] font-bold font-mono uppercase"
        >
          <span className="material-symbols-outlined text-[20px]">settings</span>
          <span>Settings</span>
        </a>
        <a
          href="#"
          className="flex items-center gap-3 px-3 py-2 text-on-surface-variant hover:text-primary transition-colors text-[11px] tracking-[0.05em] font-bold font-mono uppercase"
        >
          <span className="material-symbols-outlined text-[20px]">help_center</span>
          <span>Support</span>
        </a>
      </div>
    </aside>
  );
}
