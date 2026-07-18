import { useState } from 'react';
import { Link } from 'react-router-dom';
import accountIcon from '../../assets/icon-account.svg';
import { useAuth } from '../../auth/AuthContext';

export default function TopAppBar({ sidebarOpen }) {
  const sidebarWidth = sidebarOpen ? '208px' : '64px';
  const { user, loading, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header
      className="fixed top-0 right-0 h-[64px] z-40 bg-surface-container-low/40 border-b border-outline/20 backdrop-blur-xl flex justify-between items-center px-6 transition-all duration-300"
      style={{ width: `calc(100% - ${sidebarWidth})` }}
    >
      <div className="flex items-center gap-4">
        <div className="w-2 h-2 rounded-full bg-primary glow-accent" />
      </div>

      <div className="flex items-center gap-6">
        <button className="px-4 py-1.5 border border-primary bg-transparent text-primary text-[10px] tracking-[0.05em] font-bold font-mono rounded-sm hover:bg-primary/10 duration-200 cursor-pointer">
          UPGRADE TO PRO
        </button>

        {!loading && !user && (
          <Link
            to="/login"
            className="text-[11px] tracking-[0.05em] font-bold font-mono uppercase text-on-surface-variant hover:text-primary transition-colors"
          >
            Sign in
          </Link>
        )}

        {!loading && user && (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              title={user.name}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-8 h-8 rounded-full border border-outline/20 overflow-hidden bg-surface-container flex items-center justify-center group-hover:border-primary transition-colors">
                <img
                  src={user.pictureUrl || accountIcon}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              </div>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-40 rounded-lg border border-outline/20 bg-surface-container-low shadow-lg py-1">
                <button
                  type="button"
                  onClick={() => {
                    setMenuOpen(false);
                    logout();
                  }}
                  className="w-full text-left px-4 py-2 text-[11px] tracking-[0.05em] font-bold font-mono uppercase text-on-surface-variant hover:text-primary hover:bg-surface-container-high cursor-pointer"
                >
                  Log out
                </button>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="w-8 h-8 rounded-full border border-outline/20 overflow-hidden bg-surface-container flex items-center justify-center">
            <img src={accountIcon} alt="Account" className="w-5 h-5 object-contain opacity-70" />
          </div>
        )}
      </div>
    </header>
  );
}
