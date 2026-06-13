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
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div
                className="absolute right-0 mt-2 w-80 glass-card z-50 flex flex-col"
                style={{ top: '100%' }}
              >
                <div className="flex items-center justify-between p-4" style={{ borderBottom: '1px solid var(--glass-border-light)' }}>
                  <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Notifications
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markAllNotificationsAsRead()}
                      className="text-xs font-medium hover:underline cursor-pointer"
                      style={{ color: 'var(--text-brand)' }}
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-[320px] overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <div className="p-3 rounded-full mb-3" style={{ background: 'rgba(255,255,255,0.04)' }}>
                        <BellOff size={18} style={{ color: 'var(--text-tertiary)' }} />
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No notifications</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>We'll notify you here when things change.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 flex gap-3 transition-colors ${!notif.read ? 'bg-[rgba(129,140,248,0.06)]' : ''}`}
                        style={{ borderBottom: '1px solid var(--glass-border-light)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                            {notif.title}
                          </p>
                          <p className="text-xs mt-1 font-normal line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                            {notif.text}
                          </p>
                          <span className="text-[10px] mt-2 block" style={{ color: 'var(--text-tertiary)' }}>
                            {formatTime(notif.created_at)}
                          </span>
                        </div>
                        {!notif.read && (
                          <button
                            onClick={() => markNotificationAsRead(notif.id)}
                            className="p-1.5 rounded-[var(--radius-sm)] cursor-pointer self-start transition-all"
                            style={{ color: 'var(--text-tertiary)', background: 'rgba(255,255,255,0.04)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--accent-muted)';
                              e.currentTarget.style.color = 'var(--text-brand)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                              e.currentTarget.style.color = 'var(--text-tertiary)';
                            }}
                          >
                            <Check size={12} />
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
