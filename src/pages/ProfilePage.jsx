import { useState } from 'react';
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
      className="relative w-11 h-6 rounded-full transition-colors duration-200 shrink-0 cursor-pointer"
      style={{ background: checked ? 'var(--accent)' : 'var(--bg-tertiary)' }}
    >
      <motion.div
        animate={{ x: checked ? 20 : 3 }}
        transition={{ duration: 0.18 }}
        className="absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white"
        style={{ boxShadow: 'var(--shadow-sm)' }}
      />
    </button>
  );
}

function SettingsCard({ title, description, children, delay = 0, danger }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.32 }}
      className="surface-panel p-7 sm:p-8"
      style={danger ? { borderColor: 'rgba(239,68,68,0.25)' } : undefined}
    >
      <h2
        className="text-h4 mb-1"
        style={{ color: danger ? 'var(--color-danger)' : 'var(--text-primary)' }}
      >
        {title}
      </h2>
      {description && (
        <p className="text-caption mb-8">{description}</p>
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
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    role: 'Member',
    bio: '',
    location: '',
  });

  useEffect(() => {
    if (user) {
      setProfile({
        name: user.name || '',
        email: user.email || '',
        role: user.role || 'Member',
        bio: user.bio || '',
        location: user.location || '',
      });
    }
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
        setTimeout(() => setSaved(false), 2800);
      } else {
        alert(res?.error || 'Failed to save profile');
      }
    } else {
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 2800);
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

  const settingRow = ({ icon: Icon, label, desc, action }) => (
    <div className="flex items-center gap-4 py-1">
      <div
        className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
        style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)', color: 'var(--text-secondary)' }}
      >
        <Icon size={17} strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
        <p className="text-caption mt-0.5">{desc}</p>
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
            className="fixed top-20 right-4 sm:right-8 z-50 flex items-center gap-2.5 px-5 py-3 rounded-[var(--radius-lg)] text-sm font-medium text-white"
            style={{ background: 'var(--color-success)', boxShadow: 'var(--shadow-lg)' }}
          >
            <Check size={16} strokeWidth={2.5} />
            Profile saved
          </motion.div>
        )}
      </AnimatePresence>

      <header className="page-header">
        <p className="page-eyebrow">Account</p>
        <h1 className="text-h1 overflow-safe" style={{ color: 'var(--text-primary)' }}>
          Profile & settings
        </h1>
      </header>

      <div className="space-y-8 min-w-0">
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <div className="surface-panel overflow-hidden">
            <div
              className="h-36 sm:h-40 relative"
              style={{ background: 'var(--gradient-brand)' }}
            >
              <div
                className="absolute inset-0 opacity-[0.08]"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, white 1px, transparent 0)`,
                  backgroundSize: '28px 28px',
                }}
              />
            </div>

            <div className="px-6 sm:px-10 pb-10">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 -mt-14 mb-8">
                <div className="relative">
                  <Avatar name={profile.name} size="2xl" color="var(--accent)" />
                  <button
                    className="absolute -bottom-1 -right-1 w-10 h-10 rounded-full flex items-center justify-center text-white transition-colors cursor-pointer"
                    style={{ background: 'var(--accent)', boxShadow: 'var(--shadow-md)' }}
                  >
                    <Camera size={15} strokeWidth={2} />
                  </button>
                </div>
                <div className="flex gap-3">
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
                      Edit profile
                    </Button>
                  )}
                </div>
              </div>

              <div className="mb-8">
                <h2 className="text-h2" style={{ color: 'var(--text-primary)' }}>
                  {profile.name}
                </h2>
                <p className="text-body-sm mt-1.5 font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {profile.role}
                </p>
                <div className="flex flex-wrap gap-5 mt-5">
                  <span className="flex items-center gap-2 text-body-sm" style={{ color: 'var(--text-tertiary)' }}>
                    <Mail size={15} strokeWidth={1.75} />
                    {profile.email}
                  </span>
                  <span className="flex items-center gap-2 text-body-sm" style={{ color: 'var(--text-tertiary)' }}>
                    <MapPin size={15} strokeWidth={1.75} />
                    {profile.location}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
                <Input
                  label="Full name"
                  value={profile.name}
                  disabled={!editing}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
                <Input
                  label="Email"
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
                      className="absolute right-3 bottom-2.5 text-xs text-[var(--text-brand)] hover:underline font-semibold cursor-pointer"
                    >
                      Auto-detect
                    </button>
                  )}
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="block text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Bio
                  </label>
                  <textarea
                    value={profile.bio}
                    disabled={!editing}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    className="input-base resize-none"
                    style={{ height: 96, opacity: editing ? 1 : 0.7 }}
                  />
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 min-w-0">
          <SettingsCard title="Notifications" description="Choose how you receive updates" delay={0.06}>
            <div className="space-y-6">
              {[
                { key: 'email', icon: Mail, label: 'Email', desc: 'Activity digests & alerts' },
                { key: 'push', icon: Smartphone, label: 'Push', desc: 'Mobile notifications' },
                { key: 'desktop', icon: Monitor, label: 'Desktop', desc: 'Browser alerts' },
                { key: 'digest', icon: Bell, label: 'Weekly digest', desc: 'Summary every Monday' },
              ].map(({ key, icon, label, desc }) =>
                settingRow({
                  icon,
                  label,
                  desc,
                  action: <Toggle checked={notifs[key]} onChange={(v) => setNotifs({ ...notifs, [key]: v })} />,
                })
              )}
            </div>
          </SettingsCard>

          <SettingsCard title="Appearance" description="Customize your Nexus experience" delay={0.1}>
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Theme
                </p>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['light', 'Light'],
                    ['dark', 'Dark'],
                  ].map(([t, label]) => (
                    <button
                      key={t}
                      onClick={() => theme !== t && toggleTheme()}
                      className="py-4 rounded-[var(--radius-md)] border text-sm font-medium transition-all cursor-pointer"
                      style={{
                        borderColor: theme === t ? 'var(--border-focus)' : 'var(--border-color)',
                        background: theme === t ? 'var(--bg-active)' : 'var(--bg-subtle)',
                        color: theme === t ? 'var(--text-brand)' : 'var(--text-secondary)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Language
                </p>
                <select className="input-base cursor-pointer">
                  <option>English (US)</option>
                  <option>English (UK)</option>
                  <option>Hindi</option>
                </select>
              </div>
            </div>
          </SettingsCard>

          <SettingsCard title="Security" description="Keep your account safe" delay={0.14}>
            <div className="space-y-6">
              {settingRow({
                icon: Shield,
                label: 'Two-factor auth',
                desc: 'Add extra protection',
                action: <Badge variant="warning">Not enabled</Badge>,
              })}
              {settingRow({
                icon: Globe,
                label: 'Timezone',
                desc: 'America/New_York (EST)',
                action: (
                  <Button variant="ghost" size="sm" className="cursor-pointer">
                    Change
                  </Button>
                ),
              })}
              {settingRow({
                icon: Briefcase,
                label: 'Password',
                desc: 'Last changed 3 months ago',
                action: (
                  <Button variant="ghost" size="sm" className="cursor-pointer">
                    Update
                  </Button>
                ),
              })}
            </div>
          </SettingsCard>

          <SettingsCard title="Danger zone" description="Irreversible account actions" delay={0.18} danger>
            <div className="space-y-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                    Sign out
                  </p>
                  <p className="text-caption mt-0.5">End your current session</p>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  icon={LogOut}
                  className="cursor-pointer"
                  onClick={async () => {
                    await signOut();
                    navigate('/login');
                  }}
                >
                  Sign out
                </Button>
              </div>
              <div className="pt-6 flex items-center justify-between gap-4" style={{ borderTop: '1px solid var(--border-light)' }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--color-danger)' }}>
                    Delete account
                  </p>
                  <p className="text-caption mt-0.5">Permanently remove all data</p>
                </div>
                <Button variant="danger" size="sm" icon={Trash2} className="cursor-pointer">
                  Delete
                </Button>
              </div>
            </div>
          </SettingsCard>
        </div>
      </div>
    </div>
  );
}
