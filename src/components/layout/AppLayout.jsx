import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { X, LayoutDashboard, FolderKanban, User, Sparkles, PhoneCall, PhoneOff } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

const SIDEBAR_FULL = 280;

function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const handleFocusIn = (e) => {
      const tagName = e.target.tagName;
      const isInput = tagName === 'INPUT' || tagName === 'TEXTAREA' || e.target.isContentEditable;
      if (isInput) {
        setVisible(true);
      }
    };

    const handleFocusOut = () => {
      setVisible(false);
    };

    const handleResize = () => {
      if (window.visualViewport) {
        const isKeyboard = window.innerHeight - window.visualViewport.height > 150;
        setVisible(isKeyboard);
      }
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleResize);
    }

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener('resize', handleResize);
      }
    };
  }, []);

  return visible;
}

export default function AppLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const isKeyboardVisible = useKeyboardVisible();
  const { incomingCall, joinCall, declineCall, activeCall, leaveCall } = useWorkspace();

  const match = location.pathname.match(/^\/workspace\/([^/]+)/);
  const activeWorkspaceId = match ? match[1] : 'ws_001';

  const mobileNavItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Home' },
    { to: `/workspace/${activeWorkspaceId}`, icon: FolderKanban, label: 'Workspace' },
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
    <div className="flex h-screen overflow-hidden min-w-0 relative" style={{ background: 'var(--bg-app)' }}>
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
          className="flex-1 overflow-y-auto overflow-x-hidden min-w-0"
          style={{
            background: 'var(--bg-app)',
            padding: isKeyboardVisible
              ? 'var(--page-padding-y) var(--page-padding-x) 12px var(--page-padding-x)'
              : 'var(--page-padding-y) var(--page-padding-x) 76px var(--page-padding-x)',
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
          className="fixed bottom-0 left-0 right-0 z-30 flex items-center justify-around px-4 glass-strong transition-all duration-200"
          style={{
            height: '52px',
            borderTop: '1px solid var(--border-color)',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            display: isKeyboardVisible ? 'none' : 'flex',
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
                className="flex items-center justify-center rounded-[var(--radius-md)] transition-all cursor-pointer"
                style={{
                  width: '44px',
                  height: '44px',
                  color: active ? 'var(--text-brand)' : 'var(--text-tertiary)',
                  background: active ? 'var(--bg-active)' : 'transparent',
                }}
                title={item.label}
              >
                <item.icon size={20} strokeWidth={active ? 2.2 : 1.75} />
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

      {/* Global Real-time Incoming Call Modal Overlay */}
      <AnimatePresence>
        {incomingCall && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm rounded-2xl p-6 border shadow-2xl text-center flex flex-col items-center gap-4 bg-[var(--bg-elevated)] border-[var(--border-color)]"
            >
              <div className="w-16 h-16 rounded-full bg-[var(--accent)]/10 flex items-center justify-center text-[var(--accent)]">
                <PhoneCall size={28} className="animate-bounce" />
              </div>
              <div>
                <h3 className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-wider">Incoming call</h3>
                <p className="text-lg font-bold text-[var(--text-primary)] mt-1">{incomingCall.callerName}</p>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5">is calling in {incomingCall.workspaceName}</p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={declineCall}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold border cursor-pointer transition-colors bg-red-500/10 hover:bg-red-500/20 text-red-500 border-red-500/20"
                >
                  Decline
                </button>
                <button
                  onClick={() => joinCall(incomingCall.workspaceId)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-colors bg-emerald-500 hover:bg-emerald-600 text-white"
                >
                  Join Call
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Active Call Widget */}
      {activeCall && (
        <div className="fixed bottom-6 right-6 z-[90] glass-strong rounded-2xl border p-4 shadow-xl flex items-center gap-4 max-w-md border-[var(--border-focus)]">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 flex items-center justify-center text-emerald-500 shrink-0">
            <PhoneCall size={18} className="animate-pulse" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-[var(--text-primary)] leading-tight truncate">
              Connected in Huddle
            </p>
            <p className="text-[10px] text-[var(--text-secondary)] mt-0.5 truncate">
              {activeCall.workspaceName} ({activeCall.participants?.length || 1} participant{activeCall.participants?.length !== 1 ? 's' : ''})
            </p>
          </div>
          <button
            onClick={() => leaveCall(activeCall.workspaceId)}
            className="w-9 h-9 rounded-xl flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-colors border border-red-500/10 cursor-pointer shrink-0"
            title="Leave huddle"
          >
            <PhoneOff size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
