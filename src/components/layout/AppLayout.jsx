import { useState, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import { X, LayoutDashboard, FolderKanban, User, Sparkles, PhoneCall, ChevronRight } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import DailyCallScreen from '../ui/DailyCallScreen';

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
  const [showWorkspaceSheet, setShowWorkspaceSheet] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const isKeyboardVisible = useKeyboardVisible();
  const { incomingCall, joinCall, declineCall, activeCall, leaveCall, workspaces = [], activeWorkspaceId: lastActiveWorkspaceId } = useWorkspace();

  // Memoize onLeave so JitsiCallScreen's useEffect doesn't re-trigger on every render
  const handleLeaveCall = useCallback(() => {
    if (activeCall?.workspaceId) leaveCall(activeCall.workspaceId);
  }, [activeCall?.workspaceId, leaveCall]);

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
                background: 'var(--glass-bg-light)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                borderRight: '1px solid var(--glass-border-light)',
              }}
            >
              <Sidebar mobile={true} onClose={() => setMobileOpen(false)} />
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
          className="main-content flex-1 overflow-y-auto overflow-x-hidden min-w-0"
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
            borderTop: '1px solid var(--glass-border-light)',
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
              background: location.pathname === '/dashboard' ? 'var(--glass-border)' : 'transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <LayoutDashboard size={20} strokeWidth={1.5} />
            <span style={{ fontSize: '9px', fontWeight: 500 }}>Home</span>
          </NavLink>
          <button
            onClick={() => setShowWorkspaceSheet(true)}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
              padding: '6px 16px', borderRadius: '12px', textDecoration: 'none',
              color: location.pathname.startsWith('/workspace/') || showWorkspaceSheet ? 'white' : 'var(--text-tertiary)',
              background: location.pathname.startsWith('/workspace/') || showWorkspaceSheet ? 'var(--glass-border)' : 'transparent',
              transition: 'all 0.15s ease',
              border: 'none', cursor: 'pointer', outline: 'none',
            }}
          >
            <FolderKanban size={20} strokeWidth={1.5} />
            <span style={{ fontSize: '9px', fontWeight: 500 }}>Workspace</span>
          </button>
          <NavLink
            to="/profile"
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '2px',
              padding: '6px 16px', borderRadius: '12px', textDecoration: 'none',
              color: location.pathname === '/profile' ? 'white' : 'var(--text-tertiary)',
              background: location.pathname === '/profile' ? 'var(--glass-border)' : 'transparent',
              transition: 'all 0.15s ease'
            }}
          >
            <User size={20} strokeWidth={1.5} />
            <span style={{ fontSize: '9px', fontWeight: 500 }}>Profile</span>
          </NavLink>
        </nav>

        {/* Workspace Bottom Sheet */}
        <AnimatePresence>
          {showWorkspaceSheet && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                onClick={() => setShowWorkspaceSheet(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 200,
                  background: 'rgba(0,0,0,0.5)',
                  backdropFilter: 'blur(6px)',
                  WebkitBackdropFilter: 'blur(6px)',
                }}
              />
              <motion.div
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 28, stiffness: 320 }}
                style={{
                  position: 'fixed',
                  bottom: 0, left: 0, right: 0,
                  zIndex: 201,
                  maxHeight: '70vh',
                  borderRadius: '20px 20px 0 0',
                  background: 'rgba(18, 18, 40, 0.97)',
                  backdropFilter: 'blur(24px)',
                  WebkitBackdropFilter: 'blur(24px)',
                  border: '1px solid var(--glass-border-light)',
                  borderBottom: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                }}
              >
                {/* Drag handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 4px' }}>
                  <div style={{
                    width: '36px', height: '4px', borderRadius: '2px',
                    background: 'var(--glass-border)',
                  }} />
                </div>

                {/* Header */}
                <div style={{
                  padding: '12px 20px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  borderBottom: '1px solid var(--bg-hover)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <FolderKanban size={18} strokeWidth={1.5} style={{ color: 'var(--accent, #818cf8)' }} />
                    <h3 style={{
                      fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)',
                      margin: 0, letterSpacing: '-0.01em',
                    }}>All Workspaces</h3>
                  </div>
                  <span style={{
                    fontSize: '11px', fontWeight: 500,
                    color: 'var(--text-tertiary, var(--text-tertiary))',
                    background: 'var(--bg-hover)',
                    padding: '3px 10px', borderRadius: '999px',
                  }}>{workspaces.length}</span>
                </div>

                {/* Workspace List */}
                <div style={{
                  overflowY: 'auto', flex: 1,
                  padding: '8px 12px 20px',
                  paddingBottom: 'calc(20px + env(safe-area-inset-bottom, 0px))',
                }}>
                  {workspaces.length === 0 ? (
                    <div style={{
                      padding: '40px 20px', textAlign: 'center',
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px',
                    }}>
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: 'rgba(99,102,241,0.1)',
                      }}>
                        <FolderKanban size={22} strokeWidth={1.5} style={{ color: '#818cf8', opacity: 0.6 }} />
                      </div>
                      <p style={{ fontSize: '13px', color: 'var(--text-tertiary)', margin: 0 }}>
                        No workspaces yet
                      </p>
                    </div>
                  ) : (
                    workspaces.map((ws, index) => (
                      <motion.button
                        key={ws.id}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.04, duration: 0.2 }}
                        onClick={() => {
                          setShowWorkspaceSheet(false);
                          navigate(`/workspace/${ws.id}?tab=overview`);
                        }}
                        style={{
                          width: '100%',
                          display: 'flex', alignItems: 'center', gap: '12px',
                          padding: '14px 12px',
                          borderRadius: '14px',
                          border: 'none', outline: 'none',
                          cursor: 'pointer',
                          background: location.pathname === `/workspace/${ws.id}`
                            ? 'rgba(99,102,241,0.12)'
                            : 'transparent',
                          transition: 'background 0.15s ease',
                          textAlign: 'left',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--bg-hover)'; }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = location.pathname === `/workspace/${ws.id}`
                            ? 'rgba(99,102,241,0.12)' : 'transparent';
                        }}
                      >
                        {/* Workspace Icon */}
                        <div style={{
                          width: '40px', height: '40px', borderRadius: '12px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          flexShrink: 0, fontSize: '18px',
                          background: (ws.color || '#6366f1') + '18',
                          border: `1px solid ${(ws.color || '#6366f1')}25`,
                        }}>
                          {ws.icon || '⚡'}
                        </div>

                        {/* Workspace Info */}
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <p style={{
                            fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)',
                            margin: 0,
                            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                          }}>{ws.name}</p>
                          {ws.description && (
                            <p style={{
                              fontSize: '11px', color: 'var(--text-tertiary)',
                              margin: '3px 0 0', lineHeight: 1.3,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}>{ws.description}</p>
                          )}
                        </div>

                        {/* Arrow */}
                        <ChevronRight size={16} strokeWidth={1.5} style={{
                          color: 'var(--glass-border)', flexShrink: 0,
                        }} />
                      </motion.button>
                    ))
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>

      {/* Desktop */}
      <div
        className="hidden lg:flex flex-col flex-1 min-w-0 h-screen overflow-hidden relative z-10"
      >
        <TopBar onMobileMenuToggle={() => setMobileOpen(true)} />
        <main className="main-content flex-1 overflow-y-auto overflow-x-hidden min-w-0">
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
              className="glass-card"
              style={{
                width: '90%',
                maxWidth: '360px',
                boxSizing: 'border-box',
                padding: '24px',
                borderRadius: '20px',
                textAlign: 'center',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center'
              }}
            >
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 12px',
                  background: 'rgba(129,140,248,0.15)',
                  color: 'var(--accent)',
                  flexShrink: 0
                }}
              >
                <PhoneCall size={24} className="animate-bounce" strokeWidth={1.5} />
              </div>
              <div style={{ width: '100%' }}>
                <h3
                  style={{
                    fontSize: '11px',
                    opacity: 0.5,
                    letterSpacing: '0.08em',
                    marginBottom: '4px',
                    textTransform: 'uppercase',
                    color: 'var(--text-tertiary)',
                    margin: '0 0 4px 0'
                  }}
                >
                  Incoming call
                </h3>
                <p
                  style={{
                    fontSize: '18px',
                    fontWeight: 700,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-primary)',
                    width: '100%',
                    margin: '0 0 2px 0'
                  }}
                >
                  {incomingCall.callerName}
                </p>
                <p
                  style={{
                    fontSize: '13px',
                    opacity: 0.6,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    color: 'var(--text-secondary)',
                    width: '100%',
                    margin: '0 0 16px 0'
                  }}
                >
                  is calling in {incomingCall.workspaceName}
                </p>
              </div>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  width: '100%'
                }}
              >
                <button
                  onClick={declineCall}
                  style={{
                    flex: 1,
                    boxSizing: 'border-box',
                    padding: '10px 16px',
                    whiteSpace: 'nowrap',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    height: 'auto',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: 'rgba(239,68,68,0.15)',
                    color: '#f87171',
                    border: '1px solid rgba(239,68,68,0.2)',
                  }}
                >
                  Decline
                </button>
                <button
                  onClick={() => joinCall(incomingCall.workspaceId)}
                  style={{
                    flex: 1,
                    boxSizing: 'border-box',
                    padding: '10px 16px',
                    whiteSpace: 'nowrap',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontWeight: 600,
                    height: 'auto',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: 'rgba(16,185,129,0.5)',
                    color: 'var(--text-primary)',
                    border: '1px solid rgba(16,185,129,0.4)'
                  }}
                >
                  Join Call
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Active Call — Daily.co Prebuilt full-screen call */}
      {activeCall && (
        <DailyCallScreen
          activeCall={activeCall}
          onLeave={handleLeaveCall}
        />
      )}
    </div>
  );
}
