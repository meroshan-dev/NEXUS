import { useState } from 'react';
import { Bell, Search, Menu, Check, BellOff } from 'lucide-react';
import ThemeToggle from '../ui/ThemeToggle';
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
      className="h-[var(--topbar-height)] flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 shrink-0"
      style={{ borderBottom: '1px solid var(--border-color)', background: 'var(--bg-primary)' }}
    >
      <div className="flex items-center gap-2">
        <button
          onClick={onMobileMenuToggle}
          className="lg:hidden w-8.5 h-8.5 rounded-[var(--radius-md)] flex items-center justify-center transition-colors cursor-pointer"
          style={{ color: 'var(--text-secondary)', background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
          aria-label="Open menu"
        >
          <Menu size={16} strokeWidth={1.75} />
        </button>
      </div>

      <div className="hidden lg:flex flex-1 max-w-sm min-w-0 mx-4 xl:mx-8">
        <div className="relative w-full">
          <Search
            size={14}
            strokeWidth={2}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            placeholder="Search"
            className="w-full search-capsule"
          />
          <kbd
            className="absolute right-3.5 top-1/2 -translate-y-1/2 hidden lg:flex items-center px-1.5 py-0.5 rounded-[5px] text-[10px] font-mono border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-tertiary)]"
          >
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <ThemeToggle />

        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="relative w-8.5 h-8.5 rounded-[var(--radius-md)] flex items-center justify-center transition-colors cursor-pointer"
            style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
            aria-label="Notifications"
          >
            <Bell size={15} strokeWidth={1.75} />
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
                className="absolute right-0 mt-2 w-80 rounded-[var(--radius-lg)] border z-50 flex flex-col"
                style={{
                  background: 'var(--bg-primary)',
                  borderColor: 'var(--border-color)',
                  boxShadow: 'var(--shadow-lg)',
                  top: '100%',
                }}
              >
                <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                  <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
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

                <div className="max-h-[320px] overflow-y-auto divide-y" style={{ divideColor: 'var(--border-color)' }}>
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                      <div className="p-3 rounded-full mb-3" style={{ background: 'var(--bg-subtle)' }}>
                        <BellOff size={18} className="text-zinc-500" />
                      </div>
                      <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>No notifications</p>
                      <p className="text-xs mt-1" style={{ color: 'var(--text-tertiary)' }}>We'll notify you here when things change.</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <div
                        key={notif.id}
                        className={`p-4 flex gap-3 transition-colors ${!notif.read ? 'bg-indigo-500/5' : ''}`}
                        style={{ borderBottom: '1px solid var(--border-color)' }}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {notif.title}
                          </p>
                          <p className="text-xs mt-1 font-normal" style={{ color: 'var(--text-secondary)' }}>
                            {notif.text}
                          </p>
                          <span className="text-[10px] mt-2 block" style={{ color: 'var(--text-tertiary)' }}>
                            {formatTime(notif.created_at)}
                          </span>
                        </div>
                        {!notif.read && (
                          <button
                            onClick={() => markNotificationAsRead(notif.id)}
                            className="p-1.5 rounded-[var(--radius-sm)] cursor-pointer self-start transition-colors"
                            style={{ color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)' }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'var(--bg-active)';
                              e.currentTarget.style.color = 'var(--text-brand)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'var(--bg-tertiary)';
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
