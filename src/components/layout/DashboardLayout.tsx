import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { TopNav } from './TopNav';
import { useMobileMenu } from '../../hooks/useMobileMenu';
import { useAuth } from '../../hooks/useAuth';

export function DashboardLayout() {
  const { isOpen, toggle, close } = useMobileMenu();
  const { error: authError } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      {/* Desktop Persistent Sidebar */}
      <div className="hidden lg:flex lg:flex-shrink-0 lg:w-64 h-screen sticky top-0">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop & Drawer */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Mobile Slide-out Drawer */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out lg:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        aria-label="Mobile Navigation"
      >
        <Sidebar onCloseMobile={close} isMobileDrawer={true} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        <TopNav onOpenMobileMenu={toggle} isMobileMenuOpen={isOpen} />
        {authError && (
          <div role="alert" className="px-4 py-2 bg-red-50 border-b border-red-200 text-sm text-red-800">
            {authError}
          </div>
        )}

        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default DashboardLayout;
