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

const navItemClass = (collapsed, isActive) => `
  relative flex items-center gap-3 h-9.5 rounded-[var(--radius-md)] text-[13px]
  transition-all duration-150
  ${collapsed ? 'justify-center px-0 w-9.5 mx-auto' : 'px-3 w-full min-w-0'}
  ${isActive
    ? 'bg-[var(--bg-active)] text-[var(--text-primary)] font-medium'
    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'}
`;

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

  const W = collapsed ? 72 : 260;

  return (
    <motion.aside
      animate={{ width: W, minWidth: W, maxWidth: W }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      className="hidden lg:flex flex-col h-screen sticky top-0 shrink-0 overflow-hidden"
      style={{
        background: 'var(--bg-primary)',
        borderRight: '1px solid var(--border-color)',
        zIndex: 40,
      }}
    >
      <div
        className="flex items-center gap-2 h-[var(--topbar-height)] px-4 shrink-0 min-w-0"
        style={{ borderBottom: '1px solid var(--border-color)' }}
      >
        {activeWorkspace ? (
          <div className="relative flex-1 min-w-0 overflow-hidden" ref={switcherRef}>
            <button
              onClick={() => !collapsed && setShowSwitcher(!showSwitcher)}
              className={`flex items-center gap-2.5 w-full text-left py-1.5 rounded-[var(--radius-md)] transition-colors cursor-pointer select-none ${
                collapsed ? 'justify-center' : 'px-2 hover:bg-[var(--bg-hover)]'
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
                    <p className="text-sm font-semibold truncate leading-tight" style={{ color: 'var(--text-primary)' }}>
                      {activeWorkspace.name}
                    </p>
                    <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                      Workspace
                    </p>
                  </div>
                  <ChevronDown size={14} className="shrink-0 opacity-50" style={{ color: 'var(--text-tertiary)' }} />
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
                  className="absolute top-full left-0 right-0 mt-2 py-2 z-50 max-h-72 overflow-y-auto"
                  style={{
                    background: 'var(--bg-elevated)',
                    border: '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-lg)',
                    boxShadow: 'var(--shadow-lg)',
                  }}
                >
                  <p className="text-label px-4 py-2">Switch workspace</p>
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        navigate(`/workspace/${ws.id}`);
                        setShowSwitcher(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
                      style={{
                        color: ws.id === activeWorkspaceId ? 'var(--text-brand)' : 'var(--text-primary)',
                      }}
                    >
                      <span className="text-base shrink-0">{ws.icon}</span>
                      <span className="font-medium truncate flex-1">{ws.name}</span>
                    </button>
                  ))}
                  <div className="mx-3 my-2 h-px" style={{ background: 'var(--border-light)' }} />
                  <button
                    onClick={() => {
                      navigate('/dashboard');
                      setShowSwitcher(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-left transition-colors hover:bg-[var(--bg-hover)] cursor-pointer"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    <Home size={15} className="shrink-0" />
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
              style={{ background: 'var(--gradient-brand)' }}
            >
              <Sparkles size={16} className="text-white" strokeWidth={2} />
            </div>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                className="ml-3 text-[15px] font-semibold tracking-tight gradient-text"
              >
                Nexus
              </motion.span>
            )}
          </>
        )}

        <button
          onClick={onToggle}
          className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center transition-colors shrink-0 cursor-pointer"
          style={{ color: 'var(--text-tertiary)' }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'var(--bg-hover)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
            e.currentTarget.style.color = 'var(--text-tertiary)';
          }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden py-6 px-3 space-y-10">
        <nav className="space-y-1.5">
          {!collapsed && (
            <p className="text-label px-3 mb-3">
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
                    className={navItemClass(collapsed, isActive)}
                  >
                    <Icon size={17} strokeWidth={1.75} className="shrink-0" />
                    {!collapsed && item.label}
                  </NavLink>
                );
              })}
              <div className="pt-4 mt-4" style={{ borderTop: '1px solid var(--border-light)' }}>
                <NavLink to="/dashboard" className={({ isActive }) => navItemClass(collapsed, isActive)}>
                  <Home size={17} strokeWidth={1.75} className="shrink-0" />
                  {!collapsed && 'All workspaces'}
                </NavLink>
              </div>
            </>
          ) : (
            <>
              <NavLink to="/dashboard" className={({ isActive }) => navItemClass(collapsed, isActive)}>
                <LayoutDashboard size={17} strokeWidth={1.75} className="shrink-0" />
                {!collapsed && 'Dashboard'}
              </NavLink>
              <NavLink to="/profile" className={({ isActive }) => navItemClass(collapsed, isActive)}>
                <User size={17} strokeWidth={1.75} className="shrink-0" />
                {!collapsed && 'Profile'}
              </NavLink>
            </>
          )}
        </nav>

        {!collapsed && workspaces.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between px-3">
              <p className="text-label">Workspaces</p>
              <button
                onClick={() => navigate('/dashboard')}
                className="w-6 h-6 rounded-[var(--radius-sm)] flex items-center justify-center transition-colors cursor-pointer hover:bg-[var(--bg-hover)]"
                style={{ color: 'var(--text-tertiary)' }}
                title="Create workspace"
              >
                <Plus size={13} strokeWidth={2.5} />
              </button>
            </div>
            <div className="space-y-0.5">
              {workspaces.map((ws) => {
                const active = ws.id === activeWorkspaceId;
                const hasActiveCall = !!activeCalls[ws.id];
                return (
                  <NavLink
                    key={ws.id}
                    to={`/workspace/${ws.id}?tab=overview`}
                    className={`relative flex items-center gap-2.5 h-9 px-3 rounded-[var(--radius-md)] text-[13px] transition-all duration-150 min-w-0 ${
                      active
                        ? 'bg-[var(--bg-active)] text-[var(--text-primary)] font-medium'
                        : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    <span className="text-base shrink-0">{ws.icon}</span>
                    <span className="text-ellipsis flex-1 truncate">{ws.name}</span>
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

      <div className="shrink-0 p-3" style={{ borderTop: '1px solid var(--border-color)' }}>
        {collapsed ? (
          <div className="flex justify-center py-2">
            <button onClick={() => navigate('/profile')} className="cursor-pointer">
              <Avatar name={user?.name} size="sm" status="online" />
            </button>
          </div>
        ) : (
          <div
            className="flex items-center gap-3 px-2 py-2.5 rounded-[var(--radius-md)] transition-colors hover:bg-[var(--bg-hover)]"
          >
            <button onClick={() => navigate('/profile')} className="cursor-pointer shrink-0">
              <Avatar name={user?.name} size="sm" status="online" />
            </button>
            <button
              onClick={() => navigate('/profile')}
              className="flex-1 min-w-0 text-left cursor-pointer"
            >
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                {user?.name}
              </p>
              <p className="text-[11px] truncate mt-0.5" style={{ color: 'var(--text-tertiary)' }}>
                {user?.email}
              </p>
            </button>
            <button
              onClick={async () => {
                await signOut();
                navigate('/login');
              }}
              className="w-8 h-8 rounded-[var(--radius-sm)] flex items-center justify-center shrink-0 transition-colors cursor-pointer"
              style={{ color: 'var(--text-tertiary)' }}
              title="Sign out"
              onMouseEnter={(e) => {
                e.currentTarget.style.color = 'var(--color-danger)';
                e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = 'var(--text-tertiary)';
                e.currentTarget.style.background = 'transparent';
              }}
            >
              <LogOut size={14} strokeWidth={1.75} />
            </button>
          </div>
        )}
      </div>
    </motion.aside>
  );
}
