import { useState } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { X, LayoutDashboard, FolderKanban, CheckSquare, FileText, User, Sparkles } from 'lucide-react';

const SIDEBAR_FULL = 280;
const SIDEBAR_MINI = 76;

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const match = location.pathname.match(/^\/workspace\/([^/]+)/);
  const activeWorkspaceId = match ? match[1] : 'ws_001';

  const mobileNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: `/workspace/${activeWorkspaceId}`, icon: FolderKanban, label: 'Chat' },
    { to: `/workspace/${activeWorkspaceId}/tasks`, icon: CheckSquare, label: 'Tasks' },
    { to: `/workspace/${activeWorkspaceId}/files`, icon: FileText, label: 'Files' },
    { to: '/profile', icon: User, label: 'Profile' },
  ];

  const navLinkClass = (active) =>
    `flex items-center gap-3 h-11 px-3.5 rounded-[var(--radius-md)] text-sm transition-all duration-150 ${
      active
        ? 'font-medium'
        : 'font-normal'
    }`;

  const navLinkStyle = (active) => ({
    background: active ? 'var(--bg-active)' : 'transparent',
    color: active ? 'var(--text-brand)' : 'var(--text-secondary)',
  });

  return (
    <div className="flex h-screen overflow-hidden min-w-0" style={{ background: 'var(--bg-app)' }}>
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((c) => !c)} />

      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-50 lg:hidden"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)' }}
            />
            <motion.div
              initial={{ x: -SIDEBAR_FULL }}
              animate={{ x: 0 }}
              exit={{ x: -SIDEBAR_FULL }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-0 top-0 h-full z-50 lg:hidden flex flex-col"
              style={{
                width: SIDEBAR_FULL,
                background: 'var(--bg-elevated)',
                borderRight: '1px solid var(--border-color)',
              }}
            >
              <div
                className="flex items-center justify-between px-5 h-[var(--topbar-height)] shrink-0"
                style={{ borderBottom: '1px solid var(--border-color)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center"
                    style={{ background: 'var(--gradient-brand)' }}
                  >
                    <Sparkles size={16} className="text-white" />
                  </div>
                  <span className="font-semibold text-[15px] tracking-tight gradient-text">Nexus</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center cursor-pointer"
                  style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}
                >
                  <X size={16} />
                </button>
              </div>
              <nav className="flex-1 px-3 py-5 space-y-1">
                {mobileNavItems.map((item) => {
                  const active =
                    location.pathname === item.to ||
                    (item.to !== '/dashboard' &&
                      item.to !== '/profile' &&
                      location.pathname.startsWith(item.to));
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={() => setMobileOpen(false)}
                      className={navLinkClass(active)}
                      style={navLinkStyle(active)}
                    >
                      <item.icon size={18} strokeWidth={active ? 2 : 1.75} />
                      {item.label}
                    </NavLink>
                  );
                })}
              </nav>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Mobile */}
      <div
        className="flex flex-col flex-1 min-w-0 lg:hidden h-screen overflow-hidden"
        style={{ background: 'var(--bg-app)' }}
      >
        <TopBar onMobileMenuToggle={() => setMobileOpen(true)} />
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden pb-24 min-w-0"
          style={{
            background: 'var(--bg-app)',
            padding: 'var(--page-padding-y) var(--page-padding-x)',
          }}
        >
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <Outlet />
          </motion.div>
        </main>
        <nav
          className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around h-[68px] px-2 glass-strong"
          style={{
            borderTop: '1px solid var(--border-color)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
        >
          {mobileNavItems.map((item) => {
            const active =
              location.pathname === item.to ||
              (item.to !== '/dashboard' &&
                item.to !== '/profile' &&
                location.pathname.startsWith(item.to));
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className="flex flex-col items-center gap-1 px-3 py-2 rounded-[var(--radius-md)] transition-colors cursor-pointer min-w-[56px]"
                style={{ color: active ? 'var(--text-brand)' : 'var(--text-tertiary)' }}
              >
                <item.icon size={20} strokeWidth={active ? 2 : 1.75} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Desktop */}
      <div
        className="hidden lg:flex flex-col flex-1 min-w-0 h-screen overflow-hidden"
        style={{ background: 'var(--bg-app)' }}
      >
        <TopBar onMobileMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0" style={{ background: 'var(--bg-app)' }}>
          <div
            className="content-max w-full min-w-0"
            style={{
              padding: 'var(--page-padding-y) var(--page-padding-x)',
            }}
          >
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.22 }}
            >
              <Outlet />
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}
