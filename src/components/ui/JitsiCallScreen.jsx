import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2, AlertTriangle, PhoneOff, RefreshCw, Mic } from 'lucide-react';

// ── Jitsi server config ──
// meet.jit.si is the official global Jitsi server operated by 8x8.
// No API key or token required — rooms are created on-the-fly.
const JITSI_SERVER = 'meet.jit.si';

export default function JitsiCallScreen({ activeCall, onLeave }) {
  const containerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusMsg, setStatusMsg] = useState('Loading call libraries…');

  // ── Store onLeave in a ref so it never triggers useEffect re-runs ──
  const onLeaveRef = useRef(onLeave);
  useEffect(() => {
    onLeaveRef.current = onLeave;
  });

  const roomUrl = activeCall?.roomUrl;
  const roomName = activeCall?.roomName || roomUrl?.split('/').pop() || 'nexus-huddle';
  const localName = activeCall?.localUserName || 'User';

  // ── Retry handler: reset state and let the useEffect re-run ──
  const [retryKey, setRetryKey] = useState(0);
  const handleRetry = useCallback(() => {
    setError(null);
    setLoading(true);
    setStatusMsg('Retrying connection…');
    setRetryKey(k => k + 1);
  }, []);

  useEffect(() => {
    let mounted = true;
    let api = null;
    let timeoutId = null;

    console.log('────────────────────────────────────');
    console.log('[Jitsi] Starting call initialization');
    console.log('[Jitsi] Server:', JITSI_SERVER);
    console.log('[Jitsi] Room:', roomName);
    console.log('[Jitsi] User:', localName);
    console.log('[Jitsi] Room URL:', roomUrl);
    console.log('────────────────────────────────────');

    const initJitsi = () => {
      if (!window.JitsiMeetExternalAPI) {
        const msg = 'JitsiMeetExternalAPI not found on window after script load';
        console.error('[Jitsi] ✗', msg);
        if (mounted) {
          setError(msg);
          setLoading(false);
        }
        return;
      }

      console.log('[Jitsi] ✓ JitsiMeetExternalAPI found, creating instance…');
      if (mounted) setStatusMsg('Connecting to call server…');

      try {
        const options = {
          roomName: roomName,
          width: '100%',
          height: '100%',
          parentNode: containerRef.current,
          userInfo: {
            displayName: localName
          },
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: true,
            prejoinPageEnabled: false,
            disableDeepLinking: true,
            enableClosePage: false,
            toolbarButtons: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'profile', 'chat',
              'settings', 'raisehand', 'videoquality', 'filmstrip',
              'tileview', 'help', 'mute-everyone'
            ]
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            DEFAULT_BACKGROUND: '#0B0B1E',
            DISABLE_VIDEO_BACKGROUND: true,
            MOBILE_APP_PROMO: false,
            HIDE_DEEP_LINKING_LOGO: true,
          }
        };

        console.log('[Jitsi] Creating JitsiMeetExternalAPI with server:', JITSI_SERVER);
        api = new window.JitsiMeetExternalAPI(JITSI_SERVER, options);
        jitsiApiRef.current = api;

        // ── Connection timeout — 25s to allow for slow networks ──
        timeoutId = setTimeout(() => {
          if (mounted && loading) {
            const msg = `Connection timed out after 25 seconds.\n\nServer: ${JITSI_SERVER}\nRoom: ${roomName}\n\nPossible causes:\n• The call server may be temporarily unavailable\n• A firewall or VPN may be blocking WebRTC traffic\n• Try on a different network (e.g. mobile hotspot)`;
            console.error('[Jitsi] ✗ Timeout — videoConferenceJoined never fired');
            console.error('[Jitsi] Check the iframe in DevTools → Elements tab for errors');
            setError(msg);
            setLoading(false);
          }
        }, 25000);

        // ── Core lifecycle events ──
        api.addEventListener('videoConferenceJoined', (e) => {
          console.log('[Jitsi] ✓ videoConferenceJoined:', e);
          if (mounted) {
            clearTimeout(timeoutId);
            setLoading(false);
            setError(null);
          }
        });

        api.addEventListener('videoConferenceLeft', (e) => {
          console.log('[Jitsi] videoConferenceLeft:', e);
          if (mounted) onLeaveRef.current();
        });

        api.addEventListener('readyToClose', () => {
          console.log('[Jitsi] readyToClose');
          if (mounted) onLeaveRef.current();
        });

        // ── Debugging events — log everything ──
        api.addEventListener('connectionEstablished', () => {
          console.log('[Jitsi] ✓ connectionEstablished — server is reachable');
          if (mounted) setStatusMsg('Server connected, joining room…');
        });

        api.addEventListener('connectionFailed', (e) => {
          const msg = `Connection to ${JITSI_SERVER} failed: ${JSON.stringify(e)}`;
          console.error('[Jitsi] ✗ connectionFailed:', e);
          if (mounted) {
            clearTimeout(timeoutId);
            setError(msg);
            setLoading(false);
          }
        });

        api.addEventListener('audioMuteStatusChanged', (e) => {
          console.log('[Jitsi] audioMuteStatusChanged:', e);
        });

        api.addEventListener('participantJoined', (e) => {
          console.log('[Jitsi] participantJoined:', e);
        });

        api.addEventListener('errorOccurred', (e) => {
          console.error('[Jitsi] ✗ errorOccurred:', e);
          if (mounted && loading) {
            clearTimeout(timeoutId);
            setError(`Jitsi error: ${e?.error?.type || e?.error?.message || JSON.stringify(e)}`);
            setLoading(false);
          }
        });

        // Check iframe loaded after short delay
        setTimeout(() => {
          if (api && mounted) {
            try {
              const iframe = api.getIFrame();
              console.log('[Jitsi] iframe element:', iframe ? '✓ exists' : '✗ missing');
              if (iframe) {
                console.log('[Jitsi] iframe src:', iframe.src);
                console.log('[Jitsi] iframe dimensions:', iframe.offsetWidth, 'x', iframe.offsetHeight);
              }
            } catch (e) {
              console.warn('[Jitsi] Could not inspect iframe:', e);
            }
          }
        }, 3000);

      } catch (err) {
        const msg = `JitsiMeetExternalAPI constructor threw: ${err.message}\n\nStack: ${err.stack}`;
        console.error('[Jitsi] ✗ Init error:', err);
        if (mounted) {
          setError(msg);
          setLoading(false);
        }
      }
    };

    // ── Load Jitsi external API script ──
    const scriptUrl = `https://${JITSI_SERVER}/external_api.js`;

    if (!window.JitsiMeetExternalAPI) {
      console.log('[Jitsi] Loading external_api.js from:', scriptUrl);
      if (mounted) setStatusMsg('Loading call libraries…');

      const script = document.createElement('script');
      script.src = scriptUrl;
      script.async = true;
      script.onload = () => {
        console.log('[Jitsi] ✓ external_api.js loaded successfully');
        console.log('[Jitsi] window.JitsiMeetExternalAPI:', typeof window.JitsiMeetExternalAPI);
        if (mounted) initJitsi();
      };
      script.onerror = (e) => {
        const msg = `Failed to load ${scriptUrl}\n\nThe call server (${JITSI_SERVER}) may be down or blocked by your network.\n\nTry:\n• Refreshing the page\n• Disabling VPN/firewall\n• Using a different network`;
        console.error('[Jitsi] ✗ Script load error:', e);
        console.error('[Jitsi] ✗ URL was:', scriptUrl);
        if (mounted) {
          setError(msg);
          setLoading(false);
        }
      };
      document.body.appendChild(script);
    } else {
      console.log('[Jitsi] JitsiMeetExternalAPI already loaded, reusing');
      initJitsi();
    }

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      if (jitsiApiRef.current) {
        console.log('[Jitsi] Disposing Jitsi conference (cleanup)');
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomName, localName, retryKey]);

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      zIndex: 99999,
      background: '#0B0B1E',
      display: 'flex',
      flexDirection: 'column',
      color: 'white',
      fontFamily: 'Inter, system-ui, sans-serif'
    }}>
      {/* Header */}
      <div style={{
        padding: '14px 24px',
        background: 'rgba(11, 11, 30, 0.88)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
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
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            Huddle: {activeCall?.workspaceName || 'Nexus Workspace'}
            {loading && (
              <Loader2 size={13} className="animate-spin" style={{ color: '#f59e0b' }} />
            )}
          </span>
        </div>
        <button
          onClick={() => {
            if (jitsiApiRef.current) {
              jitsiApiRef.current.executeCommand('hangup');
            } else {
              onLeaveRef.current();
            }
          }}
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
          <PhoneOff size={13} /> Hang Up
        </button>
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
            {/* Animated mic icon */}
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
              <p style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px', color: 'rgba(255,255,255,0.95)' }}>
                Connecting to huddle…
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.65 }}>
                {statusMsg}
              </p>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.2)', marginTop: '8px', fontFamily: 'monospace' }}>
                Server: {JITSI_SERVER} · Room: {roomName}
              </p>
            </div>
            {/* Animated dots */}
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
              <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Failed to connect</p>
              <p style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.45)',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
                textAlign: 'left',
                background: 'rgba(255,255,255,0.03)',
                borderRadius: '8px',
                padding: '12px 14px',
                border: '1px solid rgba(255,255,255,0.06)',
                maxHeight: '200px',
                overflowY: 'auto',
                fontFamily: 'monospace',
                fontSize: '11px'
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
                onClick={() => onLeaveRef.current()}
                style={{
                  padding: '8px 18px',
                  borderRadius: '8px',
                  background: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                  color: 'white',
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

        <div ref={containerRef} style={{ width: '100%', height: '100%' }} />
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
