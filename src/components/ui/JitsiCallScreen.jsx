import { useEffect, useRef, useState } from 'react';
import { Loader2, AlertTriangle, PhoneOff } from 'lucide-react';

export default function JitsiCallScreen({ activeCall, onLeave }) {
  const containerRef = useRef(null);
  const jitsiApiRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const roomUrl = activeCall?.roomUrl;
  const roomName = activeCall?.roomName || roomUrl?.split('/').pop() || 'nexus-huddle';
  const localName = activeCall?.localUserName || 'User';

  useEffect(() => {
    let mounted = true;
    let api = null;

    const initJitsi = () => {
      if (!window.JitsiMeetExternalAPI) {
        setError('Jitsi SDK failed to load. Please check your internet connection.');
        setLoading(false);
        return;
      }

      try {
        console.log('[Jitsi] Initializing huddle room:', roomName, 'as', localName);
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
            startWithVideoMuted: false,
            prejoinPageEnabled: false, // skip Jitsi's prejoin since we manage joining
            disableDeepLinking: true,  // keep it in the web iframe
            toolbarButtons: [
              'microphone', 'camera', 'closedcaptions', 'desktop', 'fullscreen',
              'fodeviceselection', 'hangup', 'profile', 'chat',
              'settings', 'raisehand', 'videoquality', 'filmstrip',
              'tileview', 'videobackgroundblur', 'help', 'mute-everyone'
            ]
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            DEFAULT_BACKGROUND: '#0B0B1E',
            DISABLE_VIDEO_BACKGROUND: true
          }
        };

        api = new window.JitsiMeetExternalAPI('meet.jit.si', options);
        jitsiApiRef.current = api;

        api.addEventListener('videoConferenceJoined', () => {
          console.log('[Jitsi] ✓ Joined conference');
          if (mounted) setLoading(false);
        });

        api.addEventListener('videoConferenceLeft', () => {
          console.log('[Jitsi] Conference left');
          if (mounted) onLeave();
        });

        api.addEventListener('readyToClose', () => {
          console.log('[Jitsi] Ready to close');
          if (mounted) onLeave();
        });
      } catch (err) {
        console.error('[Jitsi] Init error:', err);
        if (mounted) {
          setError(`Could not initialize video call: ${err.message}`);
          setLoading(false);
        }
      }
    };

    if (!window.JitsiMeetExternalAPI) {
      const script = document.createElement('script');
      script.src = 'https://meet.jit.si/external_api.js';
      script.async = true;
      script.onload = () => {
        if (mounted) initJitsi();
      };
      script.onerror = () => {
        if (mounted) {
          setError('Failed to load call libraries. Check your internet connection.');
          setLoading(false);
        }
      };
      document.body.appendChild(script);
    } else {
      initJitsi();
    }

    return () => {
      mounted = false;
      if (jitsiApiRef.current) {
        console.log('[Jitsi] Disposing Jitsi conference');
        jitsiApiRef.current.dispose();
        jitsiApiRef.current = null;
      }
    };
  }, [roomName, localName, onLeave]);

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
            background: '#10B981',
            boxShadow: '0 0 10px #10B981'
          }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.9)' }}>
            Huddle: {activeCall?.workspaceName || 'Nexus Workspace'}
          </span>
        </div>
        <button
          onClick={() => {
            if (jitsiApiRef.current) {
              jitsiApiRef.current.executeCommand('hangup');
            } else {
              onLeave();
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
        {loading && (
          <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0B0B1E',
            gap: '12px',
            zIndex: 5
          }}>
            <Loader2 size={32} className="animate-spin" style={{ color: '#6366F1' }} />
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', fontWeight: 500 }}>
              Entering call room...
            </p>
          </div>
        )}

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
            <div style={{ maxWidth: '340px' }}>
              <p style={{ fontSize: '15px', fontWeight: 700, marginBottom: '6px' }}>Failed to start call</p>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', lineHeight: 1.65 }}>{error}</p>
            </div>
            <button
              onClick={onLeave}
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
      `}</style>
    </div>
  );
}
