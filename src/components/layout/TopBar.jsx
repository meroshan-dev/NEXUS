import { useState, useEffect, useRef } from 'react';
import { Bell, Search, Menu, Check, BellOff, User, LogOut } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useNavigate } from 'react-router-dom';

export default function TopBar({ onMobileMenuToggle }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useWorkspace();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const searchInputRef = useRef(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Global Ctrl+K / Cmd+K listener — focuses the inline search bar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const formatTime = (isoString) => {
    if (!isoString) return 'Just now';
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <header
      className="h-[var(--topbar-height)] sticky top-0 z-30 shrink-0 glass-topbar"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '0 24px',
        boxSizing: 'border-box',
        width: '100%',
        overflow: 'visible',
        position: 'relative',
      }}
    >
      {/* Left: Mobile menu button */}
      <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden w-8.5 h-8.5 rounded-[var(--radius-md)] flex items-center justify-center transition-all cursor-pointer"
          style={{
            color: 'var(--text-secondary)',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--glass-border-light)',
            flexShrink: 0,
          }}
          aria-label="Open menu"
        >
          <Menu size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Center: Compact search bar */}
      <div
        className="hidden lg:flex"
        style={{
          flex: 1,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <div
          style={{
            width: '100%',
            maxWidth: '300px',
            boxSizing: 'border-box',
            padding: '8px 14px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'border-color 0.2s, background 0.2s',
          }}
        >
          <Search
            size={14}
            strokeWidth={1.5}
            style={{
              width: '14px',
              height: '14px',
              opacity: 0.5,
              flexShrink: 0,
              color: 'var(--text-primary)',
            }}
          />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search"
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: 400,
              opacity: 1,
              minWidth: 0,
            }}
          />
          <kbd
            style={{
              fontSize: '11px',
              fontFamily: 'monospace',
              opacity: 0.35,
              padding: '2px 6px',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.06)',
              color: 'var(--text-primary)',
              flexShrink: 0,
              lineHeight: 1.3,
              border: 'none',
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Right: Notifications + Avatar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          flexShrink: 0,
        }}
      >
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative transition-all cursor-pointer icon-glow"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              overflow: 'visible',
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid var(--glass-border-light)',
              color: 'var(--text-secondary)',
            }}
            aria-label="Notifications"
          >
            <Bell size={15} strokeWidth={1.5} />
            {unreadCount > 0 && (
              <span
                className="absolute -top-1 -right-1 min-w-[16px] h-[16px] px-1 rounded-full flex items-center justify-center text-[9px] font-bold text-white"
                style={{ background: 'var(--color-danger)' }}
              >
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 9998, background: 'rgba(0,0,0,0.3)' }}
                onClick={() => setShowNotifications(false)}
              />
              <div
                style={{
                  position: 'absolute', top: '48px', right: 0,
                  width: '340px', boxSizing: 'border-box', overflow: 'hidden',
                  background: 'rgba(10, 10, 30, 0.92)',
                  backdropFilter: 'blur(40px) saturate(200%)',
                  WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                  border: '1px solid rgba(255,255,255,0.18)',
                  borderRadius: '16px',
                  padding: '16px 18px',
                  boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                  zIndex: 9999,
                  display: 'flex', flexDirection: 'column',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'white' }}>
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllNotificationsAsRead()}
                      style={{ fontSize: '11px', fontWeight: 500, color: 'var(--text-brand)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div style={{ maxHeight: '340px', overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {notifications.length === 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '32px 12px', textAlign: 'center' }}>
                      <div style={{ padding: '12px', borderRadius: '50%', marginBottom: '12px', background: 'rgba(255,255,255,0.06)' }}>
                        <BellOff size={18} style={{ color: 'rgba(255,255,255,0.4)' }} />
                      </div>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: 'white' }}>No notifications</p>
                      <p style={{ fontSize: '11px', marginTop: '4px', color: 'rgba(255,255,255,0.45)' }}>We'll notify you here when things change.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        style={{
                          background: !notif.read ? 'rgba(129,140,248,0.1)' : 'rgba(255,255,255,0.06)',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          overflow: 'hidden',
                          display: 'flex', gap: '10px', alignItems: 'flex-start',
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0, overflow: 'hidden' }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {notif.title}
                          </p>
                          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '3px' }}>
                            {notif.body || notif.text}
                          </p>
                          <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', display: 'block', marginTop: '5px' }}>
                            {formatTime(notif.created_at)}
                          </span>
                        </div>
                        {!notif.read && (
                          <button
                            onClick={() => markNotificationAsRead(notif.id)}
                            style={{
                              padding: '5px', borderRadius: '6px', cursor: 'pointer', flexShrink: 0,
                              color: 'rgba(255,255,255,0.5)', background: 'rgba(255,255,255,0.06)',
                              border: 'none', transition: 'all 0.15s', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
                              e.currentTarget.style.color = '#818cf8';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                              e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                            }}
                          >
                            <Check size={11} />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="relative">
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className="cursor-pointer"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              border: 'none',
              background: 'transparent',
              overflow: 'visible',
            }}
          >
            <Avatar name={user?.name} size="md" status="online" />
          </button>

          {showProfileDropdown && (
            <>
              <div
                style={{ position: 'fixed', inset: 0, zIndex: 9998 }}
                onClick={() => setShowProfileDropdown(false)}
              />
              <div
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  marginTop: '8px',
                  background: 'rgba(15,15,35,0.92)',
                  backdropFilter: 'blur(30px)',
                  WebkitBackdropFilter: 'blur(30px)',
                  border: '1px solid rgba(255,255,255,0.12)',
                  borderRadius: '14px',
                  padding: '12px',
                  minWidth: '200px',
                  boxSizing: 'border-box',
                  zIndex: 9999,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px'
                }}
              >
                <div style={{ padding: '4px 8px', borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '8px', marginBottom: '4px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.name}
                  </p>
                  <p style={{ fontSize: '11px', opacity: 0.5, color: 'var(--text-secondary)', margin: 0, marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {user?.email}
                  </p>
                </div>
                
                <button
                  onClick={() => {
                    setShowProfileDropdown(false);
                    navigate('/profile');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'transparent',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    fontWeight: 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                >
                  <User size={14} strokeWidth={1.5} style={{ opacity: 0.7 }} />
                  Profile
                </button>

                <button
                  onClick={async () => {
                    setShowProfileDropdown(false);
                    await signOut();
                    navigate('/login');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '8px',
                    borderRadius: '8px',
                    border: 'none',
                    background: 'rgba(239,68,68,0.1)',
                    color: '#f87171',
                    fontSize: '13px',
                    fontWeight: 500,
                    textAlign: 'left',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(239,68,68,0.1)'; }}
                >
                  <LogOut size={14} strokeWidth={1.5} style={{ opacity: 0.9 }} />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
