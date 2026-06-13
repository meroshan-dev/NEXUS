import { useState } from 'react';
import { Bell, Search, Menu, Check, BellOff } from 'lucide-react';
import Avatar from '../ui/Avatar';
import { useAuth } from '../../context/AuthContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useNavigate } from 'react-router-dom';

export default function TopBar({ onMobileMenuToggle }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useWorkspace();
  const [showNotifications, setShowNotifications] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

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
      className="h-[var(--topbar-height)] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shrink-0 glass-topbar"
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden w-8.5 h-8.5 rounded-[var(--radius-md)] flex items-center justify-center transition-all cursor-pointer"
          style={{
            color: 'var(--text-secondary)',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid var(--glass-border-light)',
          }}
          aria-label="Open menu"
        >
          <Menu size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="hidden lg:flex flex-1 max-w-sm min-w-0 mx-4 xl:mx-8">
        <div className="relative w-full">
          <Search
            size={14}
            strokeWidth={1.5}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            placeholder="Search"
            className="w-full search-capsule"
          />
          <kbd
            className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden lg:flex items-center px-1.5 py-0.5 rounded-[6px] text-[10px] font-mono"
            style={{
              border: '1px solid var(--glass-border-light)',
              background: 'rgba(255,255,255,0.04)',
              color: 'var(--text-tertiary)',
            }}
          >
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-8.5 h-8.5 rounded-[var(--radius-md)] flex items-center justify-center transition-all cursor-pointer icon-glow"
            style={{
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
                            {notif.text}
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

        <button onClick={() => navigate('/profile')} className="ml-0.5 rounded-full cursor-pointer">
          <Avatar name={user?.name} size="sm" status="online" />
        </button>
      </div>
    </header>
  );
}
