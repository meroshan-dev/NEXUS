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

  return (
    <div className="flex h-screen overflow-hidden min-w-0 relative mesh-bg">
      {/* Mesh gradient blobs */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] rounded-full opacity-100" style={{ background: 'radial-gradient(circle, rgba(67,56,202,0.18) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute top-[5%] right-[-8%] w-[400px] h-[400px] rounded-full opacity-100" style={{ background: 'radial-gradient(circle, rgba(124,58,237,0.14) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[-8%] left-[25%] w-[450px] h-[450px] rounded-full opacity-100" style={{ background: 'radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)', filter: 'blur(80px)' }} />
        <div className="absolute bottom-[15%] right-[10%] w-[350px] h-[350px] rounded-full opacity-100" style={{ background: 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 70%)', filter: 'blur(80px)' }} />
      </div>

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
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            />
            <motion.div
              initial={{ x: -SIDEBAR_FULL }}
              animate={{ x: 0 }}
              exit={{ x: -SIDEBAR_FULL }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="fixed left-0 top-0 h-full z-50 lg:hidden flex flex-col glass-sidebar"
              style={{ width: SIDEBAR_FULL }}
            >
              <div
                className="flex items-center justify-between px-5 h-[var(--topbar-height)] shrink-0"
                style={{ borderBottom: '1px solid var(--glass-border-light)' }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center"
                    style={{
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(129,140,248,0.3))',
                      boxShadow: '0 0 20px rgba(99,102,241,0.2)',
                    }}
                  >
                    <Sparkles size={16} className="text-white" strokeWidth={1.5} />
                  </div>
                  <span className="font-medium text-[15px] tracking-tight" style={{ color: 'var(--text-primary)' }}>Nexus</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center cursor-pointer"
                  style={{ background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)' }}
                >
                  <X size={16} strokeWidth={1.5} />
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
                      className={`flex items-center gap-3 h-11 px-3.5 rounded-[var(--radius-pill)] text-sm transition-all duration-200 ${
                        active ? 'font-medium' : 'font-normal'
                      }`}
                      style={{
                        background: active ? 'rgba(129,140,248,0.15)' : 'transparent',
                        color: active ? 'var(--text-brand)' : 'var(--text-secondary)',
                        boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                      }}
                    >
                      <item.icon size={18} strokeWidth={active ? 1.75 : 1.5} />
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
        className="flex flex-col flex-1 min-w-0 lg:hidden h-screen overflow-hidden relative z-10"
      >
        <TopBar onMobileMenuToggle={() => setMobileOpen(true)} />
        <main
          className="flex-1 overflow-y-auto overflow-x-hidden min-w-0"
          style={{
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
            borderTop: '1px solid var(--glass-border-light)',
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
                  background: active ? 'rgba(129,140,248,0.15)' : 'transparent',
                  boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.08)' : 'none',
                }}
                title={item.label}
              >
                <item.icon size={20} strokeWidth={active ? 1.75 : 1.5} />
              </NavLink>
            );
          })}
        </nav>
      </div>

      {/* Desktop */}
      <div
        className="hidden lg:flex flex-col flex-1 min-w-0 h-screen overflow-hidden relative z-10"
      >
        <TopBar onMobileMenuToggle={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto overflow-x-hidden min-w-0">
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
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-sm glass-card p-6 text-center flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: 'rgba(129,140,248,0.15)', color: 'var(--accent)' }}>
                <PhoneCall size={28} className="animate-bounce" strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="text-[10px] font-medium uppercase tracking-wider" style={{ color: 'var(--text-tertiary)' }}>Incoming call</h3>
                <p className="text-lg font-medium mt-1" style={{ color: 'var(--text-primary)' }}>{incomingCall.callerName}</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>is calling in {incomingCall.workspaceName}</p>
              </div>
              <div className="flex gap-3 w-full mt-2">
                <button
                  onClick={declineCall}
                  className="flex-1 py-2.5 rounded-[var(--radius-md)] text-xs font-medium cursor-pointer transition-all"
                  style={{
                    background: 'rgba(239,68,68,0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}
                >
                  Decline
                </button>
                <button
                  onClick={() => joinCall(incomingCall.workspaceId)}
                  className="flex-1 py-2.5 rounded-[var(--radius-md)] text-xs font-medium cursor-pointer transition-all glass-pill-btn-primary"
                  style={{ background: 'rgba(16,185,129,0.5)', borderColor: 'rgba(16,185,129,0.4)' }}
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
        <div className="fixed bottom-6 right-6 z-[90] glass-card p-4 flex items-center gap-4 max-w-md" style={{ borderColor: 'var(--border-focus)' }}>
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(16,185,129,0.15)', color: '#34d399' }}>
            <PhoneCall size={18} className="animate-pulse" strokeWidth={1.5} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-medium leading-tight truncate" style={{ color: 'var(--text-primary)' }}>
              Connected in Huddle
            </p>
            <p className="text-[10px] mt-0.5 truncate" style={{ color: 'var(--text-secondary)' }}>
              {activeCall.workspaceName} ({activeCall.participants?.length || 1} participant{activeCall.participants?.length !== 1 ? 's' : ''})
            </p>
          </div>
          <button
            onClick={() => leaveCall(activeCall.workspaceId)}
            className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center transition-all cursor-pointer shrink-0"
            style={{
              color: '#f87171',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.15)',
            }}
            title="Leave huddle"
          >
            <PhoneOff size={15} strokeWidth={1.5} />
          </button>
        </div>
      )}
    </div>
  );
}
