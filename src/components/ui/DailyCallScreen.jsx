import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, AlertTriangle, PhoneOff, RefreshCw, Mic, ExternalLink } from 'lucide-react';

/**
 * CallScreen — Embeds a Jitsi Meet call as a direct iframe.
 *
 * This is the simplest, most reliable approach:
 *   • No external SDK/script to load (unlike JitsiMeetExternalAPI)
 *   • No API keys, no billing, no accounts
 *   • meet.jit.si handles everything: mic permissions, participant grid, chat, etc.
 *   • Rooms are created on-the-fly when anyone opens the URL
 *
 * Jitsi config is passed via URL hash fragments (#config.xxx=yyy).
 */
export default function DailyCallScreen({ activeCall, onLeave }) {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState('Preparing call room…');

  // ── Store onLeave in a ref so it never triggers useEffect re-runs ──
  const onLeaveRef = useRef(onLeave);
  useEffect(() => {
    onLeaveRef.current = onLeave;
  });

  const roomUrl = activeCall?.roomUrl;
  const localName = activeCall?.localUserName || 'User';

  // ── Retry handler ──
  const [retryKey, setRetryKey] = useState(0);
  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setStatusMsg('Retrying connection…');
    setRetryKey(k => k + 1);
  }, []);

  // ── Open in new tab as fallback ──
  const handleOpenInTab = useCallback(() => {
    if (roomUrl) {
      window.open(roomUrl, '_blank', 'noopener');
    }
  }, [roomUrl]);

  useEffect(() => {
    if (!roomUrl) {
      setError('No call room URL available.');
      setLoading(false);
      return;
    }

    let mounted = true;
    let timeoutId = null;

    console.log('────────────────────────────────────');
    console.log('[Call] Starting Jitsi huddle');
    console.log('[Call] Room URL:', roomUrl);
    console.log('[Call] User:', localName);
    console.log('[Call] Approach: direct iframe embed (no SDK)');
    console.log('────────────────────────────────────');

    if (mounted) setStatusMsg('Loading Jitsi Meet room…');

    // ── Detect iframe load ──
    const iframe = iframeRef.current;
    let iframeLoaded = false;

    const handleIframeLoad = () => {
      console.log('[Call] ✓ iframe loaded successfully');
      iframeLoaded = true;
      if (mounted) {
        setStatusMsg('Room loaded — joining call…');
        // Give Jitsi a moment to initialize, then hide overlay
        setTimeout(() => {
          if (mounted) {
            console.log('[Call] ✓ Hiding loading overlay');
            setLoading(false);
          }
        }, 3000);
      }
    };

    const handleIframeError = () => {
      console.error('[Call] ✗ iframe failed to load');
      if (mounted) {
        clearTimeout(timeoutId);
        setError('Failed to load call room. Check your internet connection.');
        setLoading(false);
      }
    };

    if (iframe) {
      iframe.addEventListener('load', handleIframeLoad);
      iframe.addEventListener('error', handleIframeError);
    }

    // ── Timeout: if iframe hasn't loaded in 15s, hide overlay anyway ──
    // Jitsi renders its own UI inside the iframe, including a prejoin page.
    // We should let the user see and interact with it rather than blocking.
    timeoutId = setTimeout(() => {
      if (mounted && loading) {
        if (iframeLoaded) {
          console.log('[Call] Timeout reached but iframe loaded — hiding overlay');
          setLoading(false);
        } else {
          console.warn('[Call] 15s timeout — iframe may still be loading');
          // Don't show error — just reveal the iframe. It might be loading slowly.
          setLoading(false);
        }
      }
    }, 15000);

    return () => {
      mounted = false;
      clearTimeout(timeoutId);
      if (iframe) {
        iframe.removeEventListener('load', handleIframeLoad);
        iframe.removeEventListener('error', handleIframeError);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl, retryKey]);

  // ── Build Jitsi iframe URL with config via hash fragments ──
  const jitsiUrl = roomUrl
    ? `${roomUrl}#config.prejoinPageEnabled=false&config.startWithVideoMuted=true&config.startWithAudioMuted=false&config.disableDeepLinking=true&config.hideConferenceSubject=true&userInfo.displayName=${encodeURIComponent(localName)}`
    : null;

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: '#0B0B1E',
      display: 'flex',
      flexDirection: 'column',
      color: 'var(--text-primary)',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 24px',
        background: 'rgba(11, 11, 30, 0.88)',
        borderBottom: '1px solid var(--glass-border-light)',
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: loading ? '#f59e0b' : error ? '#ef4444' : '#10B981',
            boxShadow: `0 0 10px ${loading ? '#f59e0b' : error ? '#ef4444' : '#10B981'}`,
            transition: 'all 0.3s ease'
          }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Huddle: {activeCall?.workspaceName || 'Nexus Workspace'}
            {loading && (
              <Loader2 size={13} className="animate-spin" style={{ color: '#f59e0b' }} />
            )}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={handleOpenInTab}
            title="Open call in new tab"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '7px 12px',
              borderRadius: '10px',
              background: 'var(--bg-hover)',
              border: '1px solid var(--glass-border)',
              color: 'var(--text-secondary)',
              fontSize: '11px',
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <ExternalLink size={12} /> Open in Tab
          </button>
          <button
            onClick={() => onLeaveRef.current()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '7px 16px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.18)',
              border: '1px solid rgba(239, 68, 68, 0.35)',
              color: '#F87171',
              fontSize: '12px',
              fontWeight: 650,
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <PhoneOff size={13} /> Leave Call
          </button>
        </div>
      </div>

      {/* Frame Container */}
      <div style={{ flex: 1, position: 'relative', background: '#070714' }}>

        {/* ── Loading overlay ── */}
        {loading && !error && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0B0B1E',
            gap: '20px',
            padding: '24px',
            textAlign: 'center',
            zIndex: 6
          }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'rgba(99, 102, 241, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}>
              <div style={{
                position: 'absolute',
                inset: '-6px',
                borderRadius: '50%',
                border: '2px solid rgba(99, 102, 241, 0.25)',
                animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
              }} />
              <Mic size={28} style={{ color: '#818cf8' }} />
            </div>
            <div style={{ maxWidth: '360px' }}>
              <p style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: 'var(--text-primary)' }}>
                Connecting to huddle…
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', lineHeight: 1.65 }}>
                {statusMsg}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{
                  width: '6px',
                  height: '6px',
                  borderRadius: '50%',
                  background: '#818cf8',
                  animation: `dot-bounce 1.4s ease-in-out ${i * 0.16}s infinite both`
                }} />
              ))}
            </div>
          </div>
        )}

        {/* ── Error overlay ── */}
        {error && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0B0B1E',
            gap: '16px',
            padding: '24px',
            textAlign: 'center',
            zIndex: 6
          }}>
            <div style={{
              width: '56px',
              height: '56px',
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.12)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={24} style={{ color: '#F87171' }} />
            </div>
            <div style={{ maxWidth: '420px' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Connection issue</p>
              <p style={{
                fontSize: '11px',
                color: 'var(--text-tertiary)',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                textAlign: 'left',
                background: 'var(--bg-secondary)',
                borderRadius: '8px',
                padding: '12px 14px',
                border: '1px solid var(--bg-hover)',
                fontFamily: 'monospace'
              }}>
                {error}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={handleRetry}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: 'rgba(99,102,241,0.2)',
                  border: '1px solid rgba(99,102,241,0.35)',
                  color: '#a5b4fc',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
              >
                <RefreshCw size={13} /> Retry
              </button>
              <button
                onClick={handleOpenInTab}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: 'var(--glass-border-light)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-primary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                <ExternalLink size={13} /> Open in New Tab
              </button>
              <button
                onClick={() => onLeaveRef.current()}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: 'var(--glass-bg-light)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-secondary)',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {/* ── Jitsi Meet iframe (direct embed — no SDK needed) ── */}
        {jitsiUrl && (
          <iframe
            ref={iframeRef}
            key={retryKey}
            src={jitsiUrl}
            allow="camera; microphone; fullscreen; display-capture; autoplay"
            style={{
              width: '100%',
              height: '100%',
              border: 'none',
              position: 'relative',
              zIndex: 1,
            }}
            title="Voice Huddle Call"
          />
        )}
      </div>

      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.15); opacity: 0.4; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes dot-bounce {
          0%, 80%, 100% { transform: scale(0.4); opacity: 0.3; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
