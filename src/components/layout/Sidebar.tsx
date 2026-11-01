import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Shield, X, LogOut, LogIn } from 'lucide-react';
import { NAVIGATION_ITEMS } from '../../data/navigationItems';
import { cn } from '../../utils/cn';
import { useAuth } from '../../hooks/useAuth';
import { API_BASE_URL } from '../../services/apiClient';

interface SidebarProps {
  onCloseMobile?: () => void;
  isMobileDrawer?: boolean;
}

export function Sidebar({ onCloseMobile, isMobileDrawer = false }: SidebarProps) {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch {
      return;
    }
  };

  return (
    <aside
      className={cn(
        'bg-white flex flex-col h-full border-r border-slate-200 select-none',
        isMobileDrawer ? 'w-72' : 'w-64'
      )}
      aria-label="Application Sidebar"
    >
      {/* Brand Header */}
      <div className="h-16 px-5 border-b border-slate-200 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3" onClick={onCloseMobile}>
          <div className="w-9 h-9 rounded-lg bg-brand-50 border border-brand-200 text-brand-600 flex items-center justify-center shadow-subtle">
            <Shield className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <span className="block text-sm font-bold text-slate-900 tracking-tight leading-none">
              Cloud Security
            </span>
            <span className="block text-xs font-medium text-brand-600 mt-0.5">
              Monitor
            </span>
          </div>
        </Link>

        {isMobileDrawer && onCloseMobile && (
          <button
            onClick={onCloseMobile}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation List */}
      <nav aria-label="Main Navigation" className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Core Operations
        </p>

        {NAVIGATION_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.id}
              to={item.path}
              end={item.path === '/'}
              onClick={onCloseMobile}
              className={({ isActive }) =>
                cn(
                  'group flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold border-l-4 border-brand-600 pl-2.5'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                )
              }
            >
              {({ isActive }) => (
                <>
                  <div className="flex items-center gap-3 truncate">
                    <Icon
                      className={cn(
                        'w-4 h-4 flex-shrink-0 transition-colors',
                        isActive
                          ? 'text-brand-600'
                          : 'text-slate-400 group-hover:text-slate-600'
                      )}
                      aria-hidden="true"
                    />
                    <span className="truncate">{item.label}</span>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={cn(
                        'px-2 py-0.5 text-xs font-semibold rounded-full',
                        isActive
                          ? 'bg-brand-600 text-white'
                          : 'bg-slate-100 text-slate-600 group-hover:bg-slate-200'
                      )}
                    >
                      {item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer Environment & Auth Status */}
      <div className="p-3.5 border-t border-slate-200 bg-slate-50/50 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 relative">
              <span className={`relative inline-flex rounded-full h-2 w-2 ${API_BASE_URL ? 'bg-slate-400' : 'bg-amber-500'}`}></span>
            </span>
            <span className="text-xs font-semibold text-slate-700">Backend API</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {API_BASE_URL ? 'URL configured' : 'Awaiting config'}
          </span>
        </div>

        {isAuthenticated && user ? (
          <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
            <div className="truncate max-w-[140px]">
              <p className="text-[11px] font-semibold text-slate-900 truncate">{user.name}</p>
              <p className="text-[10px] text-slate-500 truncate">{user.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-1 text-slate-400 hover:text-red-600 transition-colors"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            onClick={onCloseMobile}
            className="flex items-center justify-center gap-1.5 w-full py-1.5 text-xs font-semibold text-brand-700 bg-brand-50 border border-brand-200 rounded-md hover:bg-brand-100 transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            <span>Sign In (Entra ID)</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
