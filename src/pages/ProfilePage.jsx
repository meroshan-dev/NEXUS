import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Mail, Briefcase, MapPin, Bell, Monitor,
  Smartphone, Shield, Globe, Trash2, Save, Pencil, Check, LogOut,
} from 'lucide-react';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';

function Toggle({ checked, onChange }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      type="button"
      className="relative w-10 h-5.5 rounded-full transition-colors duration-150 shrink-0 cursor-pointer border border-[var(--border-color)]"
      style={{ background: checked ? 'var(--accent)' : 'var(--bg-secondary)' }}
    >
      <motion.div
        animate={{ x: checked ? 18 : 2 }}
        transition={{ duration: 0.15 }}
        className="absolute top-[2px] w-4.5 h-4.5 rounded-full bg-white shadow-sm"
      />
    </button>
  );
}

function SettingsCard({ title, description, children, delay = 0, danger }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className="glass-card"
      style={{ padding: '20px 24px', boxSizing: 'border-box', borderColor: danger ? 'rgba(239,68,68,0.2)' : undefined }}
    >
      <h2
        className="section-label"
        style={{ color: danger ? 'var(--color-danger)' : undefined, marginBottom: '4px', opacity: danger ? 1 : undefined }}
      >
        {title}
      </h2>
      {description && (
        <p style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginBottom: '16px' }}>{description}</p>
      )}
      {children}
    </motion.div>
  );
}

export default function ProfilePage() {
  const { user, signOut, updateProfile } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [profile, setProfile] = useState(() => ({
    name: user?.name || '',
    email: user?.email || '',
    role: user?.role || 'Member',
    bio: user?.bio || '',
    location: user?.location || '',
  }));

  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      setProfile(prev => {
        if (
          prev.name === (user.name || '') &&
          prev.email === (user.email || '') &&
          prev.role === (user.role || 'Member') &&
          prev.bio === (user.bio || '') &&
          prev.location === (user.location || '')
        ) {
          return prev;
        }
        return {
          name: user.name || '',
          email: user.email || '',
          role: user.role || 'Member',
          bio: user.bio || '',
          location: user.location || '',
        };
      });
    }, 0);
    return () => clearTimeout(timer);
  }, [user]);

  const [notifs, setNotifs] = useState({ email: true, push: true, desktop: false, digest: true });

  const save = async () => {
    if (updateProfile) {
      const res = await updateProfile({
        name: profile.name,
        role: profile.role,
        bio: profile.bio,
        location: profile.location
      });
      if (res?.success) {
        setEditing(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        alert(res?.error || 'Failed to save profile');
      }
    } else {
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser.");
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lon } = position.coords;
        try {
          const res = await fetch(`https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`);
          const data = await res.json();
          const city = data.city || data.locality || '';
          const country = data.countryName || '';
          const locStr = city && country ? `${city}, ${country}` : city || country || 'Unknown';
          
          setProfile(p => ({
            ...p,
            location: locStr
          }));
        } catch (err) {
          console.error("Geocoding failed:", err);
          alert("Could not determine city-level location from coordinates.");
        }
      },
      (err) => {
        console.warn("Location permission denied or unavailable:", err);
        alert("Location access denied or unavailable.");
      }
    );
  };

  const settingRow = ({ key, icon: Icon, label, desc, action }) => (
    <div key={key} className="flex items-center gap-3 py-1">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]"
      >
        <Icon size={14} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-[var(--text-primary)]">{label}</p>
        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{desc}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  );

  return (
    <div className="page-stack pb-8 min-w-0">
      <AnimatePresence>
        {saved && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-20 right-4 sm:right-8 z-50 flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-medium text-white shadow-lg"
            style={{ background: 'var(--color-success)' }}
          >
            <Check size={14} strokeWidth={2.5} />
            <span>Profile settings updated</span>
          </motion.div>
        )}
      </AnimatePresence>

      <header className="page-header">
        <p className="page-eyebrow">Settings</p>
        <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
          Profile & accounts
        </h1>
      </header>

      <div className="space-y-6 min-w-0">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div className="surface-panel overflow-hidden bg-[var(--bg-primary)] border-[var(--border-color)] shadow-sm">
            {/* Simple colored flat header instead of massive glowing gradients */}
            <div
              className="h-28 sm:h-32 relative border-b border-[var(--border-color)]"
              style={{ background: 'var(--bg-secondary)' }}
            />

            <div className="px-6 sm:px-8 pb-8">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 -mt-10 mb-6">
                <div className="relative">
                  <Avatar name={profile.name} size="xl" color="var(--accent)" className="border-4 border-[var(--bg-primary)]" />
                  <button
                    className="absolute -bottom-1 -right-1 w-7.5 h-7.5 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer"
                    style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-sm)' }}
                  >
                    <Camera size={12} strokeWidth={2} />
                  </button>
                </div>
                <div className="flex gap-2">
                  {editing ? (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" icon={Save} onClick={save}>
                        Save
                      </Button>
                    </>
                  ) : (
                    <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                      Edit Profile
                    </Button>
                  )}
                </div>
              </div>

              <div className="mb-6">
                <h2 className="text-lg font-bold text-[var(--text-primary)] leading-tight">
                  {profile.name}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-1 font-medium">
                  {profile.role}
                </p>
                <div className="flex flex-wrap gap-4 mt-3">
                  <span className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                    <Mail size={12} />
                    {profile.email}
                  </span>
                  <span className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)]">
                    <MapPin size={12} />
                    {profile.location || 'No location set'}
                  </span>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Input
                  label="Full name"
                  value={profile.name}
                  disabled={!editing}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
                <Input
                  label="Email address"
                  type="email"
                  value={profile.email}
                  disabled={!editing}
                  onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                />
                <Input
                  label="Role"
                  value={profile.role}
                  disabled={!editing}
                  icon={Briefcase}
                  onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                />
                <div className="relative">
                  <Input
                    label="Location"
                    value={profile.location}
                    disabled={!editing}
                    icon={MapPin}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  />
                  {editing && (
                    <button
                      type="button"
                      onClick={detectLocation}
                      className="absolute right-3.5 bottom-2.5 text-[10px] text-[var(--accent)] hover:underline font-semibold cursor-pointer"
                    >
                      Detect
                    </button>
                  )}
                </div>
                <div className="md:col-span-2" style={{ gridColumn: '1 / -1' }}>
                  <label className="block" style={{ fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    disabled={!editing}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="input-base"
                    style={{ height: 80, opacity: editing ? 1 : 0.8, width: '100%', boxSizing: 'border-box', resize: 'vertical' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start', minWidth: 0 }}>
          <SettingsCard title="Notifications" description="Manage how updates are sent to you" delay={0.06}>
            <div className="space-y-4">
              {[
                { key: 'email', icon: Mail, label: 'Email notifications', desc: 'Activity updates & weekly digests' },
                { key: 'push', icon: Smartphone, label: 'Push alerts', desc: 'Notify on mobile devices' },
                { key: 'desktop', icon: Monitor, label: 'Desktop alerts', desc: 'Browser notifications' },
                { key: 'digest', icon: Bell, label: 'Weekly email digest', desc: 'Summary of task highlights' },
              ].map(({ key, icon, label, desc }) =>
                settingRow({
                  key,
                  icon,
                  label,
                  desc,
                  action: <Toggle checked={notifs[key]} onChange={(v) => setNotifs({ ...notifs, [key]: v })} />,
                })
              )}
            </div>
          </SettingsCard>

          <SettingsCard title="Appearance" description="Select application layout theme" delay={0.1}>
            <div className="space-y-4">
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2.5">
                  Theme mode
                </p>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    ['light', 'Light'],
                    ['dark', 'Dark'],
                  ].map(([t, label]) => (
                    <button
                      key={t}
                      onClick={() => theme !== t && toggleTheme()}
                      className="py-3 rounded-lg border text-xs font-semibold transition-all cursor-pointer"
                      style={{
                        borderColor: theme === t ? 'var(--border-focus)' : 'var(--border-color)',
                        background: theme === t ? 'var(--bg-secondary)' : 'var(--bg-primary)',
                        color: theme === t ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-[var(--text-secondary)] mb-2">
                  System language
                </p>
                <select className="input-base cursor-pointer">
                  <option>English (US)</option>
                  <option>English (UK)</option>
                  <option>Hindi</option>
                </select>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Security" description="Account verification details" delay={0.14}>
            <div className="space-y-4">
              {settingRow({
                icon: Shield,
                label: 'Two-factor auth',
                desc: 'Increase account protection',
                action: <Badge variant="warning">Disabled</Badge>,
              })}
              {settingRow({
                icon: Globe,
                label: 'Timezone configuration',
                desc: 'EST (GMT -05:00)',
                action: (
                  <Button variant="ghost" size="xs">
                    Configure
                  </Button>
                ),
              })}
              {settingRow({
                icon: Briefcase,
                label: 'Password changes',
                desc: 'Last changed 3 months ago',
                action: (
                  <Button variant="ghost" size="xs">
                    Change
                  </Button>
                ),
              })}
            </div>
          </SettingsCard>

          <SettingsCard title="Danger zone" description="Irreversible options" delay={0.18} danger>
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold text-[var(--text-primary)]">
                    Sign out
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Logout from current session</p>
                </div>
                <Button
                  variant="secondary"
                  size="xs"
                  icon={LogOut}
                  className="cursor-pointer"
                  onClick={async () => {
                    await signOut();
                    navigate('/login');
                  }}
                >
                  Sign Out
                </Button>
              </div>
              <div className="pt-4 flex items-center justify-between gap-4 border-t border-[var(--border-light)]">
                <div>
                  <p className="text-xs font-bold text-[var(--color-danger)]">
                    Delete account
                  </p>
                  <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">Permanently delete account info</p>
                </div>
                <Button variant="danger" size="xs" icon={Trash2} className="cursor-pointer">
                  Delete Account
                </Button>
              </div>
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
