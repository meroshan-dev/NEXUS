import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera, Mail, Briefcase, MapPin, Bell,
  Smartphone, Shield, Trash2, Save, Pencil, Check, LogOut, Lock, ChevronDown
} from 'lucide-react';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

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

function SettingsCard({ title, description, children, delay = 0, danger, className }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3 }}
      className={`glass-card ${className || ''}`}
      style={{
        borderRadius: '16px',
        padding: '20px',
        background: 'var(--glass-bg-light)',
        border: danger ? '1px solid rgba(239,68,68,0.25)' : '1px solid var(--glass-border-light)',
        boxSizing: 'border-box',
      }}
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

  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

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

  const [notifs, setNotifs] = useState({ email: true, push: true, digest: true });

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

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (newPassword !== confirmNewPassword) {
      setErrorMsg('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('Password must be at least 6 characters');
      return;
    }

    setIsChangingPassword(true);
    try {
      const isSupabaseConfigured = !!import.meta.env.VITE_SUPABASE_URL && !!import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (isSupabaseConfigured) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword
        });
        if (error) {
          setErrorMsg(error.message);
          alert(error.message);
        } else {
          alert('Password updated successfully');
          setShowPasswordModal(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmNewPassword('');
        }
      } else {
        alert('Password updated successfully (Demo Mode)');
        setShowPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      }
    } catch (err) {
      setErrorMsg(err.message);
      alert(err.message);
    } finally {
      setIsChangingPassword(false);
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
    <div
      key={key || label}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 0',
        borderBottom: '1px solid var(--glass-bg-light)'
      }}
    >
      <div
        style={{
          width: '34px',
          height: '34px',
          minWidth: '34px',
          borderRadius: '10px',
          background: 'var(--bg-hover)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        <Icon style={{ width: '15px', height: '15px', opacity: 0.65, color: 'var(--text-primary)', flexShrink: 0 }} />
      </div>
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
        <p
          style={{
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--text-primary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            margin: 0
          }}
        >
          {label}
        </p>
        <p
          style={{
            fontSize: '11px',
            opacity: 0.45,
            color: 'var(--text-tertiary)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            margin: 0
          }}
        >
          {desc}
        </p>
      </div>
      <div style={{ flexShrink: 0, marginLeft: 'auto' }}>{action}</div>
    </div>
  );

  const labelStyle = {
    fontSize: '11px',
    opacity: 0.5,
    marginBottom: '6px',
    display: 'block',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    color: 'var(--text-primary)',
    fontWeight: 500,
  };

  const inputStyle = {
    width: '100%',
    boxSizing: 'border-box',
    padding: '10px 14px',
    borderRadius: '12px',
    background: 'var(--bg-hover)',
    border: '1px solid var(--glass-border)',
    color: 'var(--text-primary)',
    fontSize: '14px',
    outline: 'none',
  };

  const textareaStyle = {
    ...inputStyle,
    minHeight: '80px',
    resize: 'vertical',
  };

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

      <div className="profile-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '20px', boxSizing: 'border-box', minWidth: 0 }}>
        {/* Profile form card */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
          <div
            className="glass-card"
            style={{
              borderRadius: '16px',
              background: 'var(--glass-bg-light)',
              border: '1px solid var(--glass-border-light)',
              boxSizing: 'border-box',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* Profile Header Row */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '24px',
                borderBottom: '1px solid var(--glass-border-light)',
              }}
            >
              <div className="relative" style={{ flexShrink: 0 }}>
                <Avatar name={profile.name} size="xl" color="var(--accent)" />
                <button
                  className="profile-camera-btn absolute -bottom-1 -right-1 rounded-full flex items-center justify-center text-white cursor-pointer"
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    background: 'rgba(99,102,241,0.9)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    border: '2px solid rgba(15,15,35,1)',
                    padding: 0,
                  }}
                >
                  <Camera size={11} strokeWidth={2} />
                </button>
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)', margin: 0, lineHeight: 1.2 }}>
                  {profile.name}
                </h2>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '4px 12px', fontSize: '13px', opacity: 0.5, color: 'var(--text-secondary)', marginTop: '2px' }}>
                  <span>{profile.role}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1"><Mail size={12} />{profile.email}</span>
                  {profile.location && (
                    <>
                      <span>•</span>
                      <span className="flex items-center gap-1"><MapPin size={12} />{profile.location}</span>
                    </>
                  )}
                </div>
              </div>

              <div style={{ marginLeft: 'auto', flexShrink: 0 }}>
                {editing ? (
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <Button variant="secondary" size="sm" onClick={() => setEditing(false)}>
                      Cancel
                    </Button>
                    <Button size="sm" icon={Save} onClick={save}>
                      Save
                    </Button>
                  </div>
                ) : (
                  <Button variant="secondary" size="sm" icon={Pencil} onClick={() => setEditing(true)}>
                    Edit Profile
                  </Button>
                )}
              </div>
            </div>

            {/* Form grid */}
            <div
              className="profile-form-grid"
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px',
                padding: '24px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>Full name</label>
                <input
                  type="text"
                  value={profile.name}
                  disabled={!editing}
                  style={{ ...inputStyle, opacity: editing ? 1 : 0.7 }}
                  onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>Email address</label>
                <div className="relative">
                  <input
                    type="email"
                    value={profile.email}
                    readOnly
                    style={{
                      ...inputStyle,
                      background: 'var(--bg-secondary)',
                      cursor: 'not-allowed',
                      opacity: 0.6,
                      paddingRight: '36px',
                    }}
                  />
                  <Lock
                    size={14}
                    style={{
                      position: 'absolute',
                      right: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      opacity: 0.4,
                      color: 'var(--text-primary)',
                      width: '14px',
                      height: '14px',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>Role</label>
                <div className="relative">
                  <Briefcase size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, color: 'var(--text-primary)', pointerEvents: 'none', zIndex: 1 }} />
                  <select
                    value={profile.role}
                    disabled={!editing}
                    style={{
                      ...inputStyle,
                      paddingLeft: '38px',
                      paddingRight: '36px',
                      opacity: editing ? 1 : 0.7,
                      appearance: 'none',
                      WebkitAppearance: 'none',
                      MozAppearance: 'none',
                      cursor: editing ? 'pointer' : 'not-allowed',
                    }}
                    onChange={(e) => setProfile({ ...profile, role: e.target.value })}
                  >
                    <option value="Owner" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Owner</option>
                    <option value="Admin" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Admin</option>
                    <option value="Member" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Member</option>
                    <option value="Viewer" style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>Viewer</option>
                  </select>
                  <ChevronDown
                    size={14}
                    style={{
                      position: 'absolute',
                      right: '14px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      opacity: 0.5,
                      color: 'var(--text-primary)',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>Location</label>
                <div className="relative">
                  <MapPin size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', opacity: 0.4, color: 'var(--text-primary)' }} />
                  <input
                    type="text"
                    value={profile.location}
                    disabled={!editing}
                    style={{ ...inputStyle, paddingLeft: '38px', paddingRight: editing ? '60px' : '14px', opacity: editing ? 1 : 0.7 }}
                    onChange={(e) => setProfile({ ...profile, location: e.target.value })}
                  />
                  {editing && (
                    <button
                      type="button"
                      onClick={detectLocation}
                      style={{
                        position: 'absolute',
                        right: '14px',
                        top: '50%',
                        transform: 'translateY(-50%)',
                        fontSize: '10px',
                        color: 'var(--accent)',
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 600,
                      }}
                      className="hover:underline"
                    >
                      Detect
                    </button>
                  )}
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1', display: 'flex', flexDirection: 'column' }}>
                <label style={labelStyle}>Bio</label>
                <textarea
                  value={profile.bio}
                  disabled={!editing}
                  style={{ ...textareaStyle, opacity: editing ? 1 : 0.7 }}
                  onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                />
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bottom 2-column sections */}
        <div className="profile-bottom-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', alignItems: 'start', minWidth: 0 }}>
          {/* Left Column - Notifications */}
          <SettingsCard className="notifications-card" title="Notifications" description="Manage how updates are sent to you" delay={0.06}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {[
                { key: 'email', icon: Mail, label: 'Email notifications', desc: 'Activity updates & weekly digests' },
                { key: 'push', icon: Smartphone, label: 'Push alerts', desc: 'Notify on mobile devices' },
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

          {/* Right Column - Security and Danger Zone */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <SettingsCard className="security-card" title="Security" description="Account verification details" delay={0.1}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {settingRow({
                  icon: Shield,
                  label: 'Two-factor auth',
                  desc: 'Increase account protection',
                  action: <Badge variant="warning">Disabled</Badge>,
                })}
                {settingRow({
                  icon: Lock,
                  label: 'Password changes',
                  desc: 'Update your login password',
                  action: (
                    <Button variant="ghost" size="xs" onClick={() => setShowPasswordModal(true)}>
                      Change
                    </Button>
                  ),
                })}
              </div>
            </SettingsCard>

            <SettingsCard className="danger-zone-card" title="Danger zone" description="Irreversible options" delay={0.14} danger>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="danger-zone-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 0', borderBottom: '1px solid var(--glass-bg-light)' }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        margin: 0
                      }}
                    >
                      Sign out
                    </p>
                    <p
                      style={{
                        fontSize: '11px',
                        opacity: 0.45,
                        color: 'var(--text-tertiary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        margin: 0
                      }}
                    >
                      Logout from current session
                    </p>
                  </div>
                  <button
                    className="sign-out-btn"
                    onClick={async () => {
                      await signOut();
                      navigate('/login');
                    }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      background: 'var(--glass-border-light)',
                      border: '1px solid var(--glass-border)',
                      color: 'var(--text-primary)',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <LogOut size={14} />
                    Sign Out
                  </button>
                </div>
                <div className="danger-zone-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 0' }}>
                  <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: 500,
                        color: 'var(--color-danger)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        margin: 0
                      }}
                    >
                      Delete account
                    </p>
                    <p
                      style={{
                        fontSize: '11px',
                        opacity: 0.45,
                        color: 'var(--text-tertiary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        margin: 0
                      }}
                    >
                      Permanently delete account info
                    </p>
                  </div>
                  <button
                    className="delete-account-btn"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '8px 16px',
                      borderRadius: '10px',
                      background: 'rgba(239,68,68,0.12)',
                      border: '1px solid rgba(239,68,68,0.3)',
                      color: '#ef4444',
                      fontSize: '13px',
                      fontWeight: 500,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    <Trash2 size={14} />
                    Delete Account
                  </button>
                </div>
              </div>
            </SettingsCard>
          </div>
        </div>
      </div>

      {/* Change Password Modal */}
      <Modal isOpen={showPasswordModal} onClose={() => setShowPasswordModal(false)} title="Change password">
        <form onSubmit={handlePasswordChange} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Current password</label>
            <input
              type="password"
              required
              value={currentPassword}
              style={inputStyle}
              onChange={(e) => setCurrentPassword(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>New password</label>
            <input
              type="password"
              required
              value={newPassword}
              style={inputStyle}
              onChange={(e) => setNewPassword(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <label style={labelStyle}>Confirm new password</label>
            <input
              type="password"
              required
              value={confirmNewPassword}
              style={inputStyle}
              onChange={(e) => setConfirmNewPassword(e.target.value)}
            />
          </div>

          {errorMsg && (
            <p style={{ color: 'var(--color-danger)', fontSize: '12px', margin: 0, fontWeight: 500 }}>
              {errorMsg}
            </p>
          )}

          <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
            <Button
              variant="secondary"
              type="button"
              className="flex-1"
              onClick={() => {
                setShowPasswordModal(false);
                setErrorMsg('');
                setCurrentPassword('');
                setNewPassword('');
                setConfirmNewPassword('');
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isChangingPassword}>
              {isChangingPassword ? 'Updating...' : 'Update password'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
