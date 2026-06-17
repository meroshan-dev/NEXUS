import { useState, useEffect } from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { X, LayoutDashboard, FolderKanban, User, Sparkles, PhoneCall } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import JitsiCallScreen from '../ui/JitsiCallScreen';

const SIDEBAR_FULL = 220;

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
  const { incomingCall, joinCall, declineCall, activeCall, leaveCall, workspaces = [], activeWorkspaceId: lastActiveWorkspaceId } = useWorkspace();

  const match = location.pathname.match(/^\/workspace\/([^/]+)/);
  const activeWorkspaceId = match ? match[1] : null;
  const targetWorkspaceId = activeWorkspaceId || lastActiveWorkspaceId || (workspaces[0] ? workspaces[0].id : null);

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
              className="fixed left-0 top-0 h-full z-50 lg:hidden flex flex-col"
              style={{
                width: SIDEBAR_FULL,
                background: 'rgba(255,255,255,0.05)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRight: '1px solid rgba(255,255,255,0.08)',
              }}
            >
              {/* Header */}
              <div
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 'var(--topbar-height)', flexShrink: 0, borderBottom: '1px solid rgba(255,255,255,0.08)' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(129,140,248,0.3))',
                      boxShadow: '0 0 20px rgba(99,102,241,0.2)',
                    }}
                  >
                    <Sparkles size={16} style={{ color: 'white' }} strokeWidth={1.5} />
                  </div>
                  <span style={{ fontWeight: 500, fontSize: '15px', letterSpacing: '-0.01em', color: 'var(--text-primary)' }}>Nexus</span>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  style={{ width: '36px', height: '36px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'rgba(255,255,255,0.06)', color: 'var(--text-secondary)', border: 'none' }}
                >
                  <X size={16} strokeWidth={1.5} />
                </button>
              </div>

              {/* Nav — matches desktop sidebar */}
              <nav style={{ flex: 1, padding: '12px 10px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {/* Dashboard */}
                <NavLink
                  to="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', overflow: 'hidden',
                    textDecoration: 'none', fontSize: '14px', transition: 'all 0.2s',
                    background: location.pathname === '/dashboard' ? 'rgba(255,255,255,0.1)' : 'transparent',
                    backdropFilter: location.pathname === '/dashboard' ? 'blur(12px)' : 'none',
                    border: location.pathname === '/dashboard' ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                    color: location.pathname === '/dashboard' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: location.pathname === '/dashboard' ? 500 : 400,
                  }}
                >
                  <LayoutDashboard size={18} strokeWidth={1.5} style={{ flexShrink: 0, opacity: location.pathname === '/dashboard' ? 1 : 0.7 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Dashboard</span>
                </NavLink>

                {/* Profile */}
                <NavLink
                  to="/profile"
                  onClick={() => setMobileOpen(false)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px', overflow: 'hidden',
                    textDecoration: 'none', fontSize: '14px', transition: 'all 0.2s',
                    background: location.pathname === '/profile' ? 'rgba(255,255,255,0.1)' : 'transparent',
                    border: location.pathname === '/profile' ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                    color: location.pathname === '/profile' ? 'var(--text-primary)' : 'var(--text-secondary)',
                    fontWeight: location.pathname === '/profile' ? 500 : 400,
                  }}
                >
                  <User size={18} strokeWidth={1.5} style={{ flexShrink: 0, opacity: location.pathname === '/profile' ? 1 : 0.7 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Profile</span>
                </NavLink>

                {/* Workspaces section */}
                {workspaces.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <p style={{ fontSize: '11px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.06em', opacity: 0.5, color: 'var(--text-tertiary)', padding: '0 14px 8px' }}>
                      Workspaces
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                      {workspaces.map((ws) => {
                        const isActive = location.pathname === `/workspace/${ws.id}`;
                        return (
                          <NavLink
                            key={ws.id}
                            to={`/workspace/${ws.id}?tab=overview`}
                            onClick={() => setMobileOpen(false)}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 10px', borderRadius: '10px',
                              overflow: 'hidden', textDecoration: 'none', fontSize: '13px', transition: 'all 0.2s',
                              background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                              border: isActive ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                              color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                              fontWeight: isActive ? 500 : 400,
                            }}
                          >
                            <span style={{ flexShrink: 0, width: '20px', textAlign: 'center', fontSize: '14px' }}>{ws.icon}</span>
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{ws.name}</span>
                          </NavLink>
                        );
                      })}
                    </div>
                  </div>
                )}
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
              : 'var(--page-padding-y) var(--page-padding-x) 72px var(--page-padding-x)',
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
        {/* Bottom Nav — glass pill bar */}
        <nav
          style={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            height: '60px',
            display: isKeyboardVisible ? 'none' : 'flex',
            alignItems: 'center', justifyContent: 'space-around',
            background: 'rgba(10,10,30,0.85)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            zIndex: 100,
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
          }}
          className="lg:hidden"
        >
          <NavLink
            to="/dashboard"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
              padding: '6px 16px', borderRadius: '12px', textDecoration: 'none',
              color: location.pathname === '/dashboard' ? 'white' : 'var(--text-tertiary)',
              background: location.pathname === '/dashboard' ? 'rgba(255,255,255,0.1)' : 'transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <LayoutDashboard size={20} strokeWidth={1.5} />
            <span style={{ fontSize: '9px', fontWeight: 500 }}>Home</span>
          </NavLink>
          <NavLink
            to={targetWorkspaceId ? `/workspace/${targetWorkspaceId}?tab=overview` : '/dashboard'}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
              padding: '6px 16px', borderRadius: '12px', textDecoration: 'none',
              color: location.pathname.startsWith('/workspace/') ? 'white' : 'var(--text-tertiary)',
              background: location.pathname.startsWith('/workspace/') ? 'rgba(255,255,255,0.1)' : 'transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <FolderKanban size={20} strokeWidth={1.5} />
            <span style={{ fontSize: '9px', fontWeight: 500 }}>Workspace</span>
          </NavLink>
          <NavLink
            to="/profile"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
              padding: '6px 16px', borderRadius: '12px', textDecoration: 'none',
              color: location.pathname === '/profile' ? 'white' : 'var(--text-tertiary)',
              background: location.pathname === '/profile' ? 'rgba(255,255,255,0.1)' : 'transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <User size={20} strokeWidth={1.5} />
            <span style={{ fontSize: '9px', fontWeight: 500 }}>Profile</span>
          </NavLink>
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

      {/* Global Active Call — Jitsi Meet full-screen call */}
      {activeCall && (
        <JitsiCallScreen
          activeCall={activeCall}
          onLeave={() => leaveCall(activeCall.workspaceId)}
        />
      )}
    </div>
  );
}
