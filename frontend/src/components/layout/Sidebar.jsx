import bookImg from '../../assets/book.png';
import settingsImg from '../../assets/settings.png';
import financeImg from '../../assets/finance.svg';
import graphImg from '../../assets/graph.svg';
import calcIcon from '../../assets/icon-calculator.svg';
import calculusIcon from '../../assets/icon-calculus.svg';
import linearIcon from '../../assets/icon-linear.svg';
import statsIcon from '../../assets/icon-stats.svg';
import helpIcon from '../../assets/icon-help.svg';

const LOGO = '/favicon.jpeg';

const NAV_WORKSPACE = [
  { img: calcIcon, label: 'Calculator', active: true },
  { img: calculusIcon, label: 'Calculus' },
  { img: linearIcon, label: 'Linear Algebra' },
  { img: statsIcon, label: 'Statistics' },
  { img: bookImg, label: 'Library' },
  { img: financeImg, label: 'Finance' },
  { img: graphImg, label: 'Graph' },
];

function NavItem({ icon, img, label, active = false, open }) {
  const base =
    'flex items-center gap-3 px-3 py-2 transition-all duration-200 cursor-pointer text-[11px] tracking-[0.05em] font-bold uppercase font-mono';
  const activeClass =
    'text-primary border-r-2 border-primary translate-x-1 bg-[rgba(52,211,153,0.15)]';
  const inactiveClass =
    'text-on-surface-variant hover:bg-surface-container-high hover:text-primary';

  return (
    <a
      href="#"
      title={!open ? label : undefined}
      className={`${base} ${active ? activeClass : inactiveClass} ${!open ? 'justify-center' : ''}`}
    >
      {img
        ? <img src={img} alt={label} className="w-5 h-5 object-contain opacity-80 shrink-0" />
        : <span className="material-symbols-outlined text-[20px] shrink-0">{icon}</span>
      }
      {open && <span>{label}</span>}
    </a>
  );
}

export default function Sidebar({ open, onToggle, onRestoreChatbot }) {
  return (
    <aside
      className="fixed left-0 top-0 h-screen bg-surface-container border-r border-outline/20 backdrop-blur-md flex flex-col py-6 z-50 overflow-hidden transition-all duration-300"
      style={{ width: open ? '208px' : '64px' }}
    >
      {/* Brand + toggle */}
      <div className={`mb-10 flex items-center ${open ? 'gap-3 px-4' : 'justify-center px-2'}`}>
        <img src={LOGO} alt="LovelaceLabs logo" className="w-8 h-8 rounded-md object-cover shrink-0" />
        {open && (
          <h1 className="text-[20px] font-bold text-primary tracking-tighter leading-tight whitespace-nowrap">
            LovelaceLabs
          </h1>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-grow space-y-4 overflow-y-auto overflow-x-hidden">
        <div className="space-y-1">
          {open && (
            <p className="px-4 pb-2 text-[11px] tracking-[0.05em] font-bold font-mono text-on-surface-variant opacity-40 uppercase">
              Workspace
            </p>
          )}
          {NAV_WORKSPACE.map((item) => (
            <NavItem key={item.label} {...item} open={open} />
          ))}
        </div>
      </nav>

      {/* Bottom actions */}
      <div className="mt-auto space-y-1">
        <a
          href="#"
          title={!open ? 'Settings' : undefined}
          className={`flex items-center gap-3 py-2 text-on-surface-variant hover:text-primary transition-colors text-[11px] tracking-[0.05em] font-bold font-mono uppercase ${open ? 'px-4' : 'justify-center px-2'}`}
        >
          <img src={settingsImg} alt="Settings" className="w-5 h-5 object-contain opacity-80 shrink-0" />
          {open && <span>Settings</span>}
        </a>
        <a
          href="#"
          title={!open ? 'Support' : undefined}
          className={`flex items-center gap-3 py-2 text-on-surface-variant hover:text-primary transition-colors text-[11px] tracking-[0.05em] font-bold font-mono uppercase ${open ? 'px-4' : 'justify-center px-2'}`}
        >
          <img src={helpIcon} alt="Support" className="w-5 h-5 object-contain opacity-80 shrink-0" />
          {open && <span>Support</span>}
        </a>
        <button
          onClick={onRestoreChatbot}
          title={!open ? 'Ada' : undefined}
          className={`w-full flex items-center gap-3 py-2 text-primary hover:text-primary-fixed-dim transition-colors text-[11px] tracking-[0.05em] font-bold font-mono uppercase cursor-pointer ${open ? 'px-4' : 'justify-center px-2'}`}
        >
          <span className="w-5 h-5 flex items-center justify-center shrink-0 text-[13px]">◕‿◕</span>
          {open && <span>Ada</span>}
        </button>

        {/* Collapse toggle */}
        <button
          onClick={onToggle}
          title={open ? 'Collapse sidebar' : 'Expand sidebar'}
          className={`w-full flex items-center gap-3 py-2 text-on-surface-variant hover:text-primary transition-colors text-[11px] tracking-[0.05em] font-bold font-mono uppercase cursor-pointer ${open ? 'px-4' : 'justify-center px-2'}`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 shrink-0 transition-transform duration-300"
            style={{ transform: open ? 'rotate(0deg)' : 'rotate(180deg)' }}
          >
            <polyline points="13 5 7 10 13 15" />
          </svg>
          {open && <span>Collapse</span>}
        </button>
      </div>
    </aside>
  );
}
