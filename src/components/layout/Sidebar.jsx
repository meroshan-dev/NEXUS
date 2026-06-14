import { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, CheckSquare, FileText, User, LogOut, Sparkles,
  ChevronLeft, ChevronRight, ChevronDown, Home, Plus,
  FolderKanban, File, MessageSquare, Video, Users, Settings
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import Avatar from '../ui/Avatar';

// Nav item style function — frosted glass active state
const navItemStyle = (collapsed, isActive) => ({
  display: 'flex',
  alignItems: 'center',
  gap: collapsed ? '0' : '10px',
  padding: collapsed ? '8px' : '8px 10px',
  borderRadius: '10px',
  overflow: 'hidden',
  width: collapsed ? '38px' : '100%',
  justifyContent: collapsed ? 'center' : 'flex-start',
  minWidth: 0,
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.2s',
  textDecoration: 'none',
  boxSizing: 'border-box',
  background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
  backdropFilter: isActive ? 'blur(12px)' : 'none',
  WebkitBackdropFilter: isActive ? 'blur(12px)' : 'none',
  border: isActive ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
  fontWeight: isActive ? 500 : 400,
});

const navIconStyle = (isActive) => ({
  width: '16px',
  height: '16px',
  flexShrink: 0,
  opacity: isActive ? 1 : 0.7,
});

const navLabelStyle = {
  fontSize: '14px',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
  opacity: 0.85,
};

export default function Sidebar({ collapsed, onToggle }) {
  const { user, signOut } = useAuth();
  const { workspaces, activeCalls = {} } = useWorkspace();
  const navigate = useNavigate();
  const location = useLocation();

  const [showSwitcher, setShowSwitcher] = useState(false);
  const switcherRef = useRef(null);

  const match = location.pathname.match(/^\/workspace\/([^/]+)/);
  const activeWorkspaceId = match ? match[1] : null;
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId);

  const isTabActive = (tabName) => {
    if (!activeWorkspaceId) return false;
    const searchParams = new URLSearchParams(location.search);
    const tab = searchParams.get('tab') || 'overview';
    return location.pathname === `/workspace/${activeWorkspaceId}` && tab === tabName;
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (switcherRef.current && !switcherRef.current.contains(event.target)) {
        setShowSwitcher(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const W = collapsed ? 72 : 220;

  return (
    <motion.aside
      animate={{ width: W, minWidth: W, maxWidth: W }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="hidden lg:flex flex-col h-screen sticky top-0 shrink-0 overflow-hidden glass-sidebar"
      style={{ zIndex: 40, padding: '0' }}
    >
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 16px 16px 16px', flexShrink: 0, minWidth: 0,
          borderBottom: '1px solid var(--glass-border-light)',
          height: 'var(--topbar-height)', boxSizing: 'border-box',
        }}
      >
        {activeWorkspace ? (
          <div className="relative flex-1 min-w-0 overflow-hidden" ref={switcherRef}>
            <button
              onClick={() => !collapsed && setShowSwitcher(!showSwitcher)}
              className={`flex items-center gap-2.5 w-full text-left py-1.5 rounded-[var(--radius-md)] transition-all cursor-pointer select-none ${
                collapsed ? 'justify-center' : 'px-2 hover:bg-[rgba(255,255,255,0.06)]'
              }`}
            >
              <div
                className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center text-lg shrink-0"
                style={{ background: activeWorkspace.color + '18' }}
              >
                {activeWorkspace.icon}
              </div>
              {!collapsed && (
                <>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {activeWorkspace.name}
                    </p>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      Workspace
                    </p>
                  </div>
                  <ChevronDown size={14} strokeWidth={1.5} className="shrink-0" style={{ color: 'var(--text-tertiary)' }} />
                </>
              )}
            </button>

            <AnimatePresence>
              {showSwitcher && !collapsed && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 6 }}
                  transition={{ duration: 0.15 }}
                  className="absolute top-full left-0 right-0 mt-2 py-2 z-50 max-h-72 overflow-y-auto glass-card"
                >
                  <p className="text-label px-4 py-2">Switch workspace</p>
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        navigate(`/workspace/${ws.id}`);
                        setShowSwitcher(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-all hover:bg-[rgba(255,255,255,0.06)] cursor-pointer"
                      style={{
                        color: ws.id === activeWorkspaceId ? 'var(--text-brand)' : 'var(--text-primary)',
                      }}
                    >
                      <span className="text-base shrink-0">{ws.icon}</span>
                      <span className="font-medium truncate flex-1">{ws.name}</span>
                    </button>
                  ))}
                  <div className="mx-3 my-2 h-px" style={{ background: 'var(--glass-border-light)' }} />
                  <button
                    onClick={() => {
                      navigate('/dashboard');
                      setShowSwitcher(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-all hover:bg-[rgba(255,255,255,0.06)] cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Home size={15} strokeWidth={1.5} className="shrink-0" />
                    <span className="font-medium">Dashboard</span>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <>
            <div
              className="w-9 h-9 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
              style={{
                background: 'linear-gradient(135deg, rgba(99,102,241,0.4), rgba(129,140,248,0.3))',
                boxShadow: '0 0 20px rgba(99,102,241,0.2)',
              }}
            >
              <Sparkles size={16} className="text-white" strokeWidth={1.5} />
            </div>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700, letterSpacing: '-0.01em', marginLeft: '4px' }}
              >
                Nexus
              </motion.span>
            )}
          </>
        )}

        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center transition-all shrink-0 cursor-pointer icon-glow"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
            e.currentTarget.style.color = 'var(--text-primary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={15} strokeWidth={1.5} /> : <ChevronLeft size={15} strokeWidth={1.5} />}
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: collapsed ? '12px 6px' : '12px 10px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
          {!collapsed && (
            <p style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.4, color: 'var(--text-tertiary)', padding: '8px 4px 4px', margin: 0 }}>
              {activeWorkspace ? 'In workspace' : 'Menu'}
            </p>
          )}

          {activeWorkspace ? (
            <>
              {[
                { tab: 'overview', icon: FolderKanban, label: 'Overview' },
                { tab: 'tasks', icon: CheckSquare, label: 'Tasks' },
                { tab: 'files', icon: FileText, label: 'Files' },
                { tab: 'notes', icon: File, label: 'Notes' },
                { tab: 'chat', icon: MessageSquare, label: 'Chat' },
                { tab: 'meetings', icon: Video, label: 'Meetings' },
                { tab: 'members', icon: Users, label: 'Members' },
                { tab: 'settings', icon: Settings, label: 'Settings' }
              ].map(item => {
                const isActive = isTabActive(item.tab);
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.tab}
                    to={`/workspace/${activeWorkspaceId}?tab=${item.tab}`}
                    style={navItemStyle(collapsed, isActive)}
                    onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <Icon size={18} strokeWidth={1.5} style={navIconStyle(isActive)} />
                    {!collapsed && <span style={navLabelStyle}>{item.label}</span>}
                  </NavLink>
                );
              })}
              <div style={{ paddingTop: '12px', marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <NavLink
                  to="/dashboard"
                  style={({ isActive }) => navItemStyle(collapsed, isActive)}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <Home size={18} strokeWidth={1.5} style={navIconStyle(false)} />
                  {!collapsed && <span style={navLabelStyle}>All workspaces</span>}
                </NavLink>
              </div>
            </>
          ) : (
            <>
              <NavLink
                to="/dashboard"
                style={({ isActive }) => navItemStyle(collapsed, isActive)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <LayoutDashboard size={18} strokeWidth={1.5} style={navIconStyle(false)} />
                {!collapsed && <span style={navLabelStyle}>Dashboard</span>}
              </NavLink>
              <NavLink
                to="/profile"
                style={({ isActive }) => navItemStyle(collapsed, isActive)}
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <User size={18} strokeWidth={1.5} style={navIconStyle(false)} />
                {!collapsed && <span style={navLabelStyle}>Profile</span>}
              </NavLink>
            </>
          )}
        </nav>

        {!collapsed && workspaces.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 4px 6px' }}>
              <p style={{ fontSize: '10px', fontWeight: 500, letterSpacing: '0.1em', textTransform: 'uppercase', opacity: 0.4, color: 'var(--text-tertiary)', margin: 0 }}>Workspaces</p>
              <button
                onClick={() => navigate('/dashboard')}
                style={{ width: '22px', height: '22px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--text-tertiary)', transition: 'all 0.2s' }}
                title="Create workspace"
                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
              >
                <Plus size={13} strokeWidth={2} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              {workspaces.map((ws) => {
                const active = ws.id === activeWorkspaceId;
                const hasActiveCall = !!activeCalls[ws.id];
                return (
                  <NavLink
                    key={ws.id}
                    to={`/workspace/${ws.id}?tab=overview`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 10px',
                      borderRadius: '10px',
                      overflow: 'hidden',
                      minWidth: 0,
                      fontSize: '13px',
                      transition: 'all 0.2s',
                      textDecoration: 'none',
                      background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                      border: active ? '1px solid rgba(255,255,255,0.12)' : '1px solid transparent',
                      color: active ? 'var(--text-primary)' : 'var(--text-secondary)',
                      fontWeight: active ? 500 : 400,
                    }}
                    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  >
                    <span style={{ flexShrink: 0, width: '20px', textAlign: 'center', fontSize: '14px' }}>{ws.icon}</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', minWidth: 0, flex: 1 }}>{ws.name}</span>
                    {hasActiveCall && (
                      <span className="flex h-2 w-2 relative shrink-0">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                      </span>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, marginTop: 'auto', padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        {collapsed ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '4px 0' }}>
            <button onClick={() => navigate('/profile')} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
              <Avatar name={user?.name} size="sm" status="online" />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', overflow: 'hidden' }}>
            <button onClick={() => navigate('/profile')} style={{ cursor: 'pointer', flexShrink: 0, background: 'none', border: 'none', padding: 0 }}>
              <Avatar name={user?.name} size="sm" status="online" />
            </button>
            <button
              onClick={() => navigate('/profile')}
              style={{ flex: 1, minWidth: 0, overflow: 'hidden', textAlign: 'left', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
            >
              <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', margin: 0 }}>
                {user?.name}
              </p>
              <p style={{ fontSize: '11px', opacity: 0.4, color: 'var(--text-tertiary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '2px' }}>
                {user?.email}
              </p>
            </button>
            <button
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
              style={{ width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, cursor: 'pointer', transition: 'all 0.2s', color: 'var(--text-tertiary)', background: 'transparent', border: 'none' }}
              title="Sign out"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = '#f87171';
                e.currentTarget.style.background = 'rgba(239,68,68,0.1)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-tertiary)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <LogOut size={14} strokeWidth={1.5} />
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
