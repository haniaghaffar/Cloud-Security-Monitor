import { FormEvent, useState } from 'react';
import { Menu, Bell, Search, ShieldCheck, LogOut, LogIn } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { BACKEND_HEALTH_LABELS, useBackendHealth } from '../../hooks/useBackendHealth';
import { Link, useNavigate } from 'react-router-dom';

interface TopNavProps {
  onOpenMobileMenu: () => void;
  isMobileMenuOpen: boolean;
}

export function TopNav({ onOpenMobileMenu, isMobileMenuOpen }: TopNavProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const backendHealth = useBackendHealth();
  const backendHealthIconColor =
    backendHealth === 'connected'
      ? 'text-emerald-600'
      : backendHealth === 'unreachable'
        ? 'text-red-600'
        : backendHealth === 'sign-in-required'
          ? 'text-amber-600'
          : 'text-slate-400';
  const navigate = useNavigate();
  const [search, setSearch] = useState('');

  const handleSearch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const query = search.trim();
    navigate(query ? `/findings?search=${encodeURIComponent(query)}` : '/findings');
  };

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      return;
    }
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-lg">
        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label="Toggle navigation menu"
          aria-expanded={isMobileMenuOpen}
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Global Search Bar */}
        <form onSubmit={handleSearch} className="relative w-full max-w-sm hidden sm:block">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search className="h-4 w-4" aria-hidden="true" />
          </div>
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search findings, IP addresses, rules..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
            aria-label="Search findings"
          />
          <button type="submit" className="sr-only">Search findings</button>
        </form>
      </div>

      {/* Right: Status Pill, Notifications & User Info */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Live Status Pill */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-full text-xs font-medium text-slate-700">
          <ShieldCheck className={`w-3.5 h-3.5 ${backendHealthIconColor}`} aria-hidden="true" />
          <span>Backend {BACKEND_HEALTH_LABELS[backendHealth]}</span>
        </div>

        {/* Notifications Icon Button */}
        <Link
          to="/alerts"
          className="relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500"
          aria-label="View security notification alerts"
          title="Alert Trigger Settings"
        >
          <Bell className="w-5 h-5" />
        </Link>

        <div className="h-6 w-px bg-slate-200 hidden sm:block" />

        {/* User Identity Chip */}
        {isAuthenticated && user ? (
          <div className="flex items-center gap-2.5 pl-1">
            <div className="w-8 h-8 rounded-full bg-brand-100 border border-brand-200 text-brand-700 flex items-center justify-center font-semibold text-xs shadow-subtle">
              {user.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-xs font-semibold text-slate-900 leading-none truncate max-w-[130px]">
                {user.name}
              </p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-none truncate max-w-[130px]">
                {user.role}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors ml-1"
              title="Sign Out"
              aria-label="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 border border-brand-200 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </Link>
        )}
      </div>
    </header>
  );
}
