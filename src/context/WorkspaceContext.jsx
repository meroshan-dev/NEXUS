/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useContext, useEffect, useRef } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { createDailyRoom } from '../lib/daily';

const WorkspaceContext = createContext();

const generateCallId = () => Math.random().toString(36).substring(2, 9);

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [workspaces, setWorkspaces] = useState([]);
  const [tasks, setTasks] = useState({});
  const [chatMessages, setChatMessages] = useState({});
  const [files, setFiles] = useState({});
  const [workspaceMembers, setWorkspaceMembers] = useState({});
  const activeWorkspaceChannelRef = useRef(null);
  
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(false);
  const [prevUserId, setPrevUserId] = useState(user?.id || null);

  const currentUserId = user?.id || null;
  if (currentUserId !== prevUserId) {
    setPrevUserId(currentUserId);
    setLoading(true);
  }

  // Upgraded states
  const [activeWorkspaceId, setActiveWorkspaceId] = useState(null);
  const [taskComments, setTaskComments] = useState({});
  const [notifications, setNotifications] = useState([]);
  const [activityFeed, setActivityFeed] = useState({});
  const [userPresence, setUserPresence] = useState({});
  const [typingUsers, setTypingUsers] = useState({});
  const activePresenceChannelRef = useRef(null);
  const userNotificationsChannelRef = useRef(null);

  // Real-time Workspace Calling (Huddles) States
  const [activeCall, setActiveCall] = useState(null);
  const [incomingCall, setIncomingCall] = useState(null);
  const [activeCalls, setActiveCalls] = useState({});
  const [missedCalls, setMissedCalls] = useState(() => {
    try {
      const stored = localStorage.getItem(`nexus_missed_calls_${user?.id || 'guest'}`);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const huddleChannelsRef = useRef({});

  // Sync missed calls to localStorage
  useEffect(() => {
    if (user?.id) {
      localStorage.setItem(`nexus_missed_calls_${user.id}`, JSON.stringify(missedCalls));
    }
  }, [missedCalls, user?.id]);

  // Global channel subscriptions for Huddles (Calls)
  useEffect(() => {
    if (!user?.id || workspaces.length === 0) return;

    if (isSupabaseConfigured) {
      // Clear existing channels
      Object.values(huddleChannelsRef.current).forEach(ch => {
        try { supabase.removeChannel(ch); } catch (e) { console.error(e); }
      });
      huddleChannelsRef.current = {};

      // Subscribe to each workspace's huddle channel
      workspaces.forEach(ws => {
        const channelName = `workspace_huddle:${ws.id}`;
        const ch = supabase.channel(channelName, {
          config: { broadcast: { self: false } }
        });

        ch.on('broadcast', { event: 'call-start' }, ({ payload }) => {
          console.log(`[Huddle] Received call-start in ${ws.name}:`, payload);
          // Only show incoming call if we are not already in any call
          if (!activeCall) {
            setIncomingCall({
              workspaceId: ws.id,
              workspaceName: ws.name,
              callerId: payload.callerId,
              callerName: payload.callerName,
              callId: payload.callId,
              roomUrl: payload.roomUrl
            });
          }
          setActiveCalls(prev => ({
            ...prev,
            [ws.id]: {
              callerId: payload.callerId,
              callerName: payload.callerName,
              participants: payload.participants || [],
              roomUrl: payload.roomUrl
            }
          }));
        })
        .on('broadcast', { event: 'call-join' }, ({ payload }) => {
          console.log('[Huddle] Received call-join:', payload);
          setActiveCalls(prev => {
            const call = prev[ws.id];
            if (!call) return prev;
            if (call.participants.some(p => p.id === payload.userId)) return prev;
            return {
              ...prev,
              [ws.id]: {
                ...call,
                participants: [...call.participants, { id: payload.userId, name: payload.userName, avatar: payload.userAvatar }]
              }
            };
          });
          setActiveCall(prev => {
            if (prev && prev.workspaceId === ws.id) {
              if (prev.participants.some(p => p.id === payload.userId)) return prev;
              return {
                ...prev,
                participants: [...prev.participants, { id: payload.userId, name: payload.userName, avatar: payload.userAvatar }]
              };
            }
            return prev;
          });
        })
        .on('broadcast', { event: 'call-leave' }, ({ payload }) => {
          console.log('[Huddle] Received call-leave:', payload);
          setActiveCalls(prev => {
            const call = prev[ws.id];
            if (!call) return prev;
            const updated = call.participants.filter(p => p.id !== payload.userId);
            if (updated.length === 0 && call.callerId === payload.userId) {
              const copy = { ...prev };
              delete copy[ws.id];
              return copy;
            }
            return {
              ...prev,
              [ws.id]: {
                ...call,
                participants: updated
              }
            };
          });
          setActiveCall(prev => {
            if (prev && prev.workspaceId === ws.id) {
              const updated = prev.participants.filter(p => p.id !== payload.userId);
              if (updated.length === 0) return null;
              return { ...prev, participants: updated };
            }
            return prev;
          });
        })
        .on('broadcast', { event: 'call-end' }, () => {
          console.log('[Huddle] Received call-end');
          setActiveCalls(prev => {
            const copy = { ...prev };
            delete copy[ws.id];
            return copy;
          });
          setIncomingCall(prev => (prev && prev.workspaceId === ws.id ? null : prev));
          setActiveCall(prev => (prev && prev.workspaceId === ws.id ? null : prev));
        })
        .on('broadcast', { event: 'call-ping' }, ({ payload }) => {
          setActiveCalls(prev => ({
            ...prev,
            [ws.id]: {
              callerId: payload.callerId,
              callerName: payload.callerName,
              participants: payload.participants || []
            }
          }));
        })
        .subscribe();

        huddleChannelsRef.current[ws.id] = ch;
      });
    }

    return () => {
      if (isSupabaseConfigured) {
        Object.values(huddleChannelsRef.current).forEach(ch => {
          try { supabase.removeChannel(ch); } catch (e) { console.error(e); }
        });
        huddleChannelsRef.current = {};
      }
    };
  }, [user?.id, workspaces, activeCall]);

  // Fallback storage sync listener for offline/multi-tab calls
  useEffect(() => {
    if (isSupabaseConfigured) return;

    const handleStorage = (e) => {
      if (e.key === 'nexus_local_huddle_event') {
        try {
          const { event, wsId, payload } = JSON.parse(e.newValue);
          const ws = workspaces.find(w => w.id === wsId);
          if (!ws) return;

          if (event === 'call-start') {
            if (payload.callerId !== user?.id && !activeCall) {
              setIncomingCall({
                workspaceId: wsId,
                workspaceName: ws.name,
                callerId: payload.callerId,
                callerName: payload.callerName,
                callId: payload.callId,
                roomUrl: payload.roomUrl
              });
            }
            setActiveCalls(prev => ({
              ...prev,
              [wsId]: {
                callerId: payload.callerId,
                callerName: payload.callerName,
                participants: payload.participants || [],
                roomUrl: payload.roomUrl
              }
            }));
          } else if (event === 'call-join') {
            setActiveCalls(prev => {
              const call = prev[wsId];
              if (!call) return prev;
              if (call.participants.some(p => p.id === payload.userId)) return prev;
              return {
                ...prev,
                [wsId]: {
                  ...call,
                  participants: [...call.participants, { id: payload.userId, name: payload.userName, avatar: payload.userAvatar }]
                }
              };
            });
            setActiveCall(prev => {
              if (prev && prev.workspaceId === wsId) {
                if (prev.participants.some(p => p.id === payload.userId)) return prev;
                return {
                  ...prev,
                  participants: [...prev.participants, { id: payload.userId, name: payload.userName, avatar: payload.userAvatar }]
                };
              }
              return prev;
            });
          } else if (event === 'call-leave') {
            setActiveCalls(prev => {
              const call = prev[wsId];
              if (!call) return prev;
              const updated = call.participants.filter(p => p.id !== payload.userId);
              if (updated.length === 0 && call.callerId === payload.userId) {
                const copy = { ...prev };
                delete copy[wsId];
                return copy;
              }
              return { ...prev, [wsId]: { ...call, participants: updated } };
            });
            setActiveCall(prev => {
              if (prev && prev.workspaceId === wsId) {
                const updated = prev.participants.filter(p => p.id !== payload.userId);
                if (updated.length === 0) return null;
                return { ...prev, participants: updated };
              }
              return prev;
            });
          } else if (event === 'call-end') {
            setActiveCalls(prev => {
              const copy = { ...prev };
              delete copy[wsId];
              return copy;
            });
            setIncomingCall(prev => (prev && prev.workspaceId === wsId ? null : prev));
            setActiveCall(prev => (prev && prev.workspaceId === wsId ? null : prev));
          }
        } catch (err) {
          console.error('[Huddle Local Storage Sync Error]:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [user?.id, workspaces, activeCall]);

  // Periodic call pinger to notify newly joined members about existing calls
  useEffect(() => {
    if (!activeCall || activeCall.callerId !== user?.id) return;

    const interval = setInterval(() => {
      if (isSupabaseConfigured) {
        const ch = huddleChannelsRef.current[activeCall.workspaceId];
        if (ch) {
          ch.send({
            type: 'broadcast',
            event: 'call-ping',
            payload: {
              callerId: activeCall.callerId,
              callerName: activeCall.callerName,
              participants: activeCall.participants
            }
          });
        }
      }
    }, 5000);

    return () => clearInterval(interval);
  }, [activeCall, user?.id]);

  const startCall = async (workspaceId) => {
    if (!user) return;
    const ws = workspaces.find(w => w.id === workspaceId);
    if (!ws) return;

    const callerDetails = {
      id: user.id,
      name: user.name || user.email?.split('@')[0] || 'User',
      avatar: user.avatar || null
    };

    // ── Create a real Daily.co room ──
    let roomUrl = null;
    let roomName = null;
    try {
      const room = await createDailyRoom(workspaceId);
      roomUrl = room.roomUrl;
      roomName = room.roomName;
      console.log('[Huddle] Daily room created:', roomUrl);
    } catch (err) {
      console.error('[Huddle] Failed to create Daily room:', err);
    }

    const callId = generateCallId();

    const newCall = {
      workspaceId,
      workspaceName: ws.name,
      callerId: user.id,
      callerName: callerDetails.name,
      localUserName: callerDetails.name,
      callId,
      participants: [callerDetails],
      roomUrl,
      roomName
    };

    setActiveCall(newCall);
    setActiveCalls(prev => ({
      ...prev,
      [workspaceId]: {
        callerId: user.id,
        callerName: callerDetails.name,
        participants: [callerDetails],
        roomUrl
      }
    }));

    if (isSupabaseConfigured) {
      const ch = huddleChannelsRef.current[workspaceId];
      if (ch) {
        ch.send({
          type: 'broadcast',
          event: 'call-start',
          payload: {
            callerId: user.id,
            callerName: callerDetails.name,
            workspaceName: ws.name,
            callId,
            participants: [callerDetails],
            roomUrl
          }
        });
      }
    } else {
      localStorage.setItem('nexus_local_huddle_event', JSON.stringify({
        event: 'call-start',
        wsId: workspaceId,
        payload: {
          callerId: user.id,
          callerName: callerDetails.name,
          workspaceName: ws.name,
          callId,
          participants: [callerDetails],
          roomUrl
        }
      }));
    }
    logActivity(workspaceId, 'started_call', `started a huddle call`);
  };

  const joinCall = (workspaceId) => {
    if (!user) return;
    const callInfo = activeCalls[workspaceId];
    if (!callInfo) return;

    const participantDetails = {
      id: user.id,
      name: user.name || user.email?.split('@')[0] || 'User',
      avatar: user.avatar || null
    };

    const updatedParticipants = callInfo.participants.some(p => p.id === user.id)
      ? callInfo.participants
      : [...callInfo.participants, participantDetails];

    setActiveCall({
      workspaceId,
      workspaceName: workspaces.find(w => w.id === workspaceId)?.name || 'Workspace',
      callerId: callInfo.callerId,
      callerName: callInfo.callerName,
      localUserName: participantDetails.name,
      participants: updatedParticipants,
      roomUrl: callInfo.roomUrl  // ← carry the Daily room URL
    });

    setIncomingCall(null);

    setActiveCalls(prev => ({
      ...prev,
      [workspaceId]: {
        ...callInfo,
        participants: updatedParticipants
      }
    }));

    if (isSupabaseConfigured) {
      const ch = huddleChannelsRef.current[workspaceId];
      if (ch) {
        ch.send({
          type: 'broadcast',
          event: 'call-join',
          payload: {
            userId: user.id,
            userName: participantDetails.name,
            userAvatar: participantDetails.avatar
          }
        });
      }
    } else {
      localStorage.setItem('nexus_local_huddle_event', JSON.stringify({
        event: 'call-join',
        wsId: workspaceId,
        payload: {
          userId: user.id,
          userName: participantDetails.name,
          userAvatar: participantDetails.avatar
        }
      }));
    }
  };

  const declineCall = () => {
    if (incomingCall) {
      setMissedCalls(prev => {
        const copy = [
          {
            id: `missed_${Date.now()}`,
            workspaceId: incomingCall.workspaceId,
            workspaceName: incomingCall.workspaceName,
            callerName: incomingCall.callerName,
            timestamp: new Date().toISOString()
          },
          ...prev
        ];
        return copy;
      });
    }
    setIncomingCall(null);
  };

  const leaveCall = (workspaceId) => {
    if (!user) return;

    setActiveCall(null);

    if (isSupabaseConfigured) {
      const ch = huddleChannelsRef.current[workspaceId];
      if (ch) {
        ch.send({
          type: 'broadcast',
          event: 'call-leave',
          payload: {
            userId: user.id
          }
        });

        // If user is caller and no one else is left, end call
        const currentCall = activeCalls[workspaceId];
        if (currentCall && currentCall.callerId === user.id) {
          ch.send({
            type: 'broadcast',
            event: 'call-end',
            payload: { workspaceId }
          });
        }
      }
    } else {
      localStorage.setItem('nexus_local_huddle_event', JSON.stringify({
        event: 'call-leave',
        wsId: workspaceId,
        payload: {
          userId: user.id
        }
      }));

      const currentCall = activeCalls[workspaceId];
      if (currentCall && currentCall.callerId === user.id) {
        localStorage.setItem('nexus_local_huddle_event', JSON.stringify({
          event: 'call-end',
          wsId: workspaceId,
          payload: {}
        }));
      }
    }

    setActiveCalls(prev => {
      const copy = { ...prev };
      delete copy[workspaceId];
      return copy;
    });
  };

  const clearMissedCalls = () => {
    setMissedCalls([]);
  };


  const refetchTasks = async (wsId) => {
    if (!isSupabaseConfigured) return;
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('workspace_id', wsId);
      if (!error && data) {
        const cols = { todo: [], inProgress: [], done: [] };
        data.forEach(t => {
          const statusKey = t.status === 'in_progress' ? 'inProgress' : t.status;
          if (cols[statusKey]) {
            cols[statusKey].push({
              id: t.id,
              title: t.title,
              description: t.description,
              assignee: t.assignee,
              priority: t.priority,
              dueDate: t.due_date,
              labels: t.labels || []
            });
          }
        });
        setTasks(prev => ({ ...prev, [wsId]: cols }));
      }
    } catch (err) {
      console.error('Error refetching tasks:', err);
    }
  };

  const refetchComments = async (wsId) => {
    if (!isSupabaseConfigured) return;
    try {
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('id')
        .eq('workspace_id', wsId);
      
      if (tasksData && tasksData.length > 0) {
        const taskIds = tasksData.map(t => t.id);
        const { data: commentData, error } = await supabase
          .from('task_comments')
          .select('*')
          .in('task_id', taskIds)
          .order('created_at', { ascending: true });
        
        if (!error && commentData) {
          const commentsMap = {};
          taskIds.forEach(id => { commentsMap[id] = []; });
          commentData.forEach(c => {
            if (!commentsMap[c.task_id]) commentsMap[c.task_id] = [];
            commentsMap[c.task_id].push({
              id: c.id,
              taskId: c.task_id,
              userId: c.user_id,
              text: c.text,
              createdAt: c.created_at
            });
          });
          setTaskComments(prev => ({ ...prev, ...commentsMap }));
        }
      } else {
        setTaskComments(prev => ({ ...prev }));
      }
    } catch (err) {
      console.error('Error refetching comments:', err);
    }
  };

  const loadNotifications = async () => {
    if (!user?.id) return;
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('notifications')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (!error && data) {
          setNotifications(data);
        }
      } catch (err) {
        console.error('Error loading notifications:', err);
      }
    } else {
      const stored = localStorage.getItem(`nexus_notifications_${user.id}`);
      setNotifications(stored ? JSON.parse(stored) : []);
    }
  };

  const loadActivitiesForAllWorkspaces = async (wsIds) => {
    if (!wsIds || wsIds.length === 0) return;
    try {
      const { data, error } = await supabase
        .from('activity_feed')
        .select('*, profiles(name, avatar)')
        .in('workspace_id', wsIds)
        .order('created_at', { ascending: false });
      
      if (!error && data) {
        const grouped = {};
        wsIds.forEach(id => { grouped[id] = []; });
        data.forEach(act => {
          if (!grouped[act.workspace_id]) grouped[act.workspace_id] = [];
          grouped[act.workspace_id].push(act);
        });
        setActivityFeed(grouped);
      }
    } catch (err) {
      console.error('Error loading activities:', err);
    }
  };

  const loadWorkspaces = async () => {
    if (!user?.id) {
      setWorkspaces([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setDbError(false);

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('workspace_members')
          .select('role, workspace:workspaces(*)')
          .eq('user_id', user.id);

        if (error) {
          const isSchemaError = error.code === '42P01' || error.code === 'PGRST205' || error.code === '42P17' || error.code === 'PGRST204' || error.code?.startsWith('42') || error.code?.startsWith('PGRST');
          if (isSchemaError) {
            setDbError(true);
          } else {
            console.error('Error fetching workspaces:', error);
          }
          setWorkspaces([]);
        } else {
          const mappedWorkspaces = data
            .map(item => item.workspace)
            .filter(Boolean)
            .map(ws => ({
              id: ws.id,
              name: ws.name,
              description: ws.description,
              color: ws.color,
              icon: ws.icon,
              tasksCount: ws.tasks_count || 0,
              filesCount: ws.files_count || 0,
              lastActivity: ws.last_activity || 'Just now',
              unread: ws.unread || 0,
              ownerId: ws.owner_id,
              inviteCode: ws.invite_code
            }));
          setWorkspaces(mappedWorkspaces);
          
          const wsIds = mappedWorkspaces.map(w => w.id);
          if (wsIds.length > 0) {
            loadActivitiesForAllWorkspaces(wsIds);
            
            // Pre-fetch members for all workspaces to allow analytics and fast loading
            try {
              const { data: allMembersData, error: membersErr } = await supabase
                .from('workspace_members')
                .select('workspace_id, user_id, role')
                .in('workspace_id', wsIds);
              
              if (!membersErr && allMembersData) {
                const uniqueUserIds = [...new Set(allMembersData.map(m => m.user_id))];
                const { data: profilesData } = await supabase
                  .from('profiles')
                  .select('id, name, email, avatar, status, role, location')
                  .in('id', uniqueUserIds);
                
                const profileMap = {};
                if (profilesData) {
                  profilesData.forEach(p => { profileMap[p.id] = p; });
                }

                const groupedMembers = {};
                wsIds.forEach(id => { groupedMembers[id] = []; });

                allMembersData.forEach(m => {
                  const p = profileMap[m.user_id];
                  if (groupedMembers[m.workspace_id]) {
                    groupedMembers[m.workspace_id].push({
                      id: m.user_id,
                      name: p?.name || 'Unknown',
                      email: p?.email || '',
                      avatar: p?.avatar || null,
                      initials: (p?.name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U',
                      role: m.role || 'Member',
                      status: p?.status || 'offline',
                      location: p?.location || null,
                      color: '#6366f1'
                    });
                  }
                });
                setWorkspaceMembers(prev => ({ ...prev, ...groupedMembers }));
              }
            } catch (membersErr) {
              console.error('Error pre-fetching workspace members:', membersErr);
            }
          }
        }
      } catch (err) {
        console.error('Failed to load workspaces:', err);
      } finally {
        setLoading(false);
      }
    } else {
      const stored = localStorage.getItem(`nexus_workspaces_${user.id}`);
      if (stored) {
        setWorkspaces(JSON.parse(stored));
      } else {
        setWorkspaces([]);
      }
      setLoading(false);
    }
  };

  // Load workspaces when authenticated user changes
  useEffect(() => {
    console.log('[Realtime Sync] loadWorkspaces useEffect triggered with user.id:', user?.id);
    
    const timer = setTimeout(() => {
      if (!user?.id) {
        setNotifications([]);
        setActiveWorkspaceId(null);
        return;
      }
      loadWorkspaces();
      loadNotifications();
      const storedLastWs = localStorage.getItem(`nexus_last_workspace_${user.id}`);
      if (storedLastWs) {
        setActiveWorkspaceId(storedLastWs);
      }
    }, 0);
    
    // Clean up channels on logout or user change
    if (!user?.id) {
      if (activeWorkspaceChannelRef.current) {
        supabase.removeChannel(activeWorkspaceChannelRef.current);
        activeWorkspaceChannelRef.current = null;
      }
      if (activePresenceChannelRef.current) {
        supabase.removeChannel(activePresenceChannelRef.current);
        activePresenceChannelRef.current = null;
      }
      if (userNotificationsChannelRef.current) {
        supabase.removeChannel(userNotificationsChannelRef.current);
        userNotificationsChannelRef.current = null;
      }
    }

    if (isSupabaseConfigured && user?.id) {
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('[Realtime Sync] Incoming Notification Event:', payload);
            setNotifications(prev => {
              if (prev.some(n => n.id === payload.new.id)) return prev;
              return [payload.new, ...prev];
            });
          }
        )
        .subscribe();

      userNotificationsChannelRef.current = channel;
    }

    return () => {
      clearTimeout(timer);
      if (userNotificationsChannelRef.current) {
        supabase.removeChannel(userNotificationsChannelRef.current);
        userNotificationsChannelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Clean up all subscription channels on unmount
  useEffect(() => {
    return () => {
      if (activeWorkspaceChannelRef.current) {
        supabase.removeChannel(activeWorkspaceChannelRef.current);
      }
      if (activePresenceChannelRef.current) {
        supabase.removeChannel(activePresenceChannelRef.current);
      }
      if (userNotificationsChannelRef.current) {
        supabase.removeChannel(userNotificationsChannelRef.current);
      }
    };
  }, []);

  // Handle presence focus and blur status tracking
  useEffect(() => {
    if (!user?.id || !activeWorkspaceId || !isSupabaseConfigured) return;

    const handleFocus = async () => {
      const nowStr = new Date().toISOString();
      if (activePresenceChannelRef.current) {
        await activePresenceChannelRef.current.track({
          status: 'online',
          last_seen: nowStr
        });
      }
      await supabase.from('user_presence').upsert({
        user_id: user.id,
        workspace_id: activeWorkspaceId,
        status: 'online',
        last_seen: nowStr
      });
    };

    const handleBlur = async () => {
      const nowStr = new Date().toISOString();
      if (activePresenceChannelRef.current) {
        await activePresenceChannelRef.current.track({
          status: 'away',
          last_seen: nowStr
        });
      }
      await supabase.from('user_presence').upsert({
        user_id: user.id,
        workspace_id: activeWorkspaceId,
        status: 'away',
        last_seen: nowStr
      });
    };

    window.addEventListener('focus', handleFocus);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('blur', handleBlur);
    };
  }, [user?.id, activeWorkspaceId]);

  // Helper to log activities
  const logActivity = async (workspaceId, action, details) => {
    if (!workspaceId || !user?.id) return;
    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('activity_feed')
          .insert({
            workspace_id: workspaceId,
            user_id: user.id,
            action,
            details
          });
        if (error) throw error;
      } catch (err) {
        console.error('Error logging activity:', err);
      }
    } else {
      const newAct = {
        id: `act_${Date.now()}`,
        workspace_id: workspaceId,
        user_id: user.id,
        action,
        details,
        created_at: new Date().toISOString()
      };
      setActivityFeed(prev => {
        const current = prev[workspaceId] || [];
        const updated = [newAct, ...current];
        localStorage.setItem(`nexus_activity_${workspaceId}`, JSON.stringify(updated));
        return { ...prev, [workspaceId]: updated };
      });
    }
  };

  // Helper to create notifications
  const createNotification = async (targetUserId, title, text, wsId, type = 'general') => {
    if (!targetUserId) return;
    if (targetUserId === user?.id) return; // don't notify oneself

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('notifications')
          .insert({
            user_id: targetUserId,
            type,
            title,
            body: text,
            read: false
          });
        if (error) throw error;
      } catch (err) {
        console.error('Error creating notification:', err);
      }
    } else {
      const newNotif = {
        id: `notif_${Date.now()}`,
        user_id: targetUserId,
        type,
        title,
        body: text,
        read: false,
        created_at: new Date().toISOString()
      };
      // Send to target user storage mock
      const stored = localStorage.getItem(`nexus_notifications_${targetUserId}`);
      const updated = [newNotif, ...(stored ? JSON.parse(stored) : [])];
      localStorage.setItem(`nexus_notifications_${targetUserId}`, JSON.stringify(updated));
      if (targetUserId === user.id) {
        setNotifications(updated);
      }
    }
  };

  const markNotificationAsRead = async (id) => {
    if (isSupabaseConfigured) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', id);
    } else {
      setNotifications(prev => {
        const updated = prev.map(n => n.id === id ? { ...n, read: true } : n);
        localStorage.setItem(`nexus_notifications_${user.id}`, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const markAllNotificationsAsRead = async () => {
    if (!user?.id) return;
    if (isSupabaseConfigured) {
      await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id);
    } else {
      setNotifications(prev => {
        const updated = prev.map(n => ({ ...n, read: true }));
        localStorage.setItem(`nexus_notifications_${user.id}`, JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Load details (tasks, chat, files, members, activities, comments, presence) for a specific workspace on demand
  const fetchWorkspaceDetails = async (workspaceId) => {
    if (!workspaceId || !user?.id) return;

    // Save previous active workspace ID for offline database marking
    const prevWsId = activeWorkspaceId;
    setActiveWorkspaceId(workspaceId);
    if (user?.id) {
      localStorage.setItem(`nexus_last_workspace_${user.id}`, workspaceId);
    }

    if (isSupabaseConfigured) {
      // Mark offline for previous workspace in database
      if (prevWsId && prevWsId !== workspaceId) {
        supabase
          .from('user_presence')
          .upsert({
            user_id: user.id,
            workspace_id: prevWsId,
            status: 'offline',
            last_seen: new Date().toISOString()
          })
          .then(() => {});
      }

      // Clean up any existing realtime subscription channel first
      try {
        const syncChannelName = `workspace_sync:${workspaceId}`;
        const presChannelName = `workspace_presence:${workspaceId}`;

        const existingSync = supabase.channel(syncChannelName);
        if (existingSync) {
          await supabase.removeChannel(existingSync);
        }
        if (activeWorkspaceChannelRef.current) {
          await supabase.removeChannel(activeWorkspaceChannelRef.current);
          activeWorkspaceChannelRef.current = null;
        }

        const existingPres = supabase.channel(presChannelName);
        if (existingPres) {
          await supabase.removeChannel(existingPres);
        }
        if (activePresenceChannelRef.current) {
          await supabase.removeChannel(activePresenceChannelRef.current);
          activePresenceChannelRef.current = null;
        }
      } catch (cleanErr) {
        console.warn('[Realtime Sync] Warning during channel cleanup:', cleanErr);
      }

      try {
        // 1. Fetch Tasks
        await refetchTasks(workspaceId);

        // 2. Fetch Chat Messages
        const { data: chatData, error: chatErr } = await supabase
          .from('chat_messages')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: true });

        if (!chatErr && chatData) {
          const msgs = chatData.map(m => ({
            id: m.id,
            userId: m.user_id,
            text: m.text,
            timestamp: m.timestamp,
            reactions: m.reactions || [],
            createdAt: m.created_at
          }));
          setChatMessages(prev => ({ ...prev, [workspaceId]: msgs }));
        }

        // 3. Fetch Files
        const { data: fileData, error: fileErr } = await supabase
          .from('files')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { descending: true });

        if (!fileErr && fileData) {
          const fls = fileData.map(f => ({
            id: f.id,
            name: f.name,
            type: f.type,
            size: f.size,
            uploadedBy: f.uploaded_by,
            uploadedAt: f.uploaded_at,
            icon: f.icon,
            storagePath: f.storage_path,
            workspaceId: f.workspace_id
          }));
          setFiles(prev => ({ ...prev, [workspaceId]: fls }));
        }

        // 4. Fetch Task Comments
        await refetchComments(workspaceId);

        // 5. Fetch Activity Feed
        const { data: activityData, error: actErr } = await supabase
          .from('activity_feed')
          .select('*')
          .eq('workspace_id', workspaceId)
          .order('created_at', { ascending: false });

        if (!actErr && activityData) {
          setActivityFeed(prev => ({ ...prev, [workspaceId]: activityData }));
        }

        // 6. Fetch User Presence baseline
        const { data: presenceData, error: presErr } = await supabase
          .from('user_presence')
          .select('*')
          .eq('workspace_id', workspaceId);

        const dbPresMap = {};
        if (!presErr && presenceData) {
          presenceData.forEach(p => {
            dbPresMap[p.user_id] = {
              status: p.status,
              lastSeen: p.last_seen
            };
          });
          setUserPresence(prev => ({ ...prev, ...dbPresMap }));
        }

        // Set up realtime channel for this workspace's updates
        console.log(`[Realtime Sync] Creating subscription channel for workspace ${workspaceId}`);
        const channel = supabase
          .channel(`workspace_sync:${workspaceId}`)
          .on(
            'broadcast',
            { event: 'typing' },
            (payload) => {
              console.log('[Realtime Sync] Typing broadcast payload:', payload);
              const data = payload.payload;
              if (data && data.userId !== user?.id) {
                setTypingUsers(prev => {
                  const updated = { ...prev };
                  if (data.isTyping) {
                    updated[data.userId] = { name: data.userName, timestamp: Date.now() };
                  } else {
                    delete updated[data.userId];
                  }
                  return updated;
                });
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'chat_messages',
              filter: `workspace_id=eq.${workspaceId}`
            },
            (payload) => {
              console.log('[Realtime Sync] Incoming Chat Message Event:', payload.eventType, payload);
              if (payload.eventType === 'INSERT') {
                const newMsg = payload.new;
                const formattedMsg = {
                  id: newMsg.id,
                  userId: newMsg.user_id,
                  text: newMsg.text,
                  timestamp: newMsg.timestamp,
                  reactions: newMsg.reactions || [],
                  createdAt: newMsg.created_at
                };
                setChatMessages(prev => {
                  const currentMsgs = prev[workspaceId] || [];
                  if (currentMsgs.some(m => m.id === formattedMsg.id)) return prev;
                  return {
                    ...prev,
                    [workspaceId]: [...currentMsgs, formattedMsg]
                  };
                });
              } else if (payload.eventType === 'UPDATE') {
                const updatedMsg = payload.new;
                const formattedMsg = {
                  id: updatedMsg.id,
                  userId: updatedMsg.user_id,
                  text: updatedMsg.text,
                  timestamp: updatedMsg.timestamp,
                  reactions: updatedMsg.reactions || [],
                  createdAt: updatedMsg.created_at
                };
                setChatMessages(prev => {
                  const currentMsgs = prev[workspaceId] || [];
                  return {
                    ...prev,
                    [workspaceId]: currentMsgs.map(m => m.id === formattedMsg.id ? formattedMsg : m)
                  };
                });
              } else if (payload.eventType === 'DELETE') {
                const deletedId = payload.old.id;
                setChatMessages(prev => {
                  const currentMsgs = prev[workspaceId] || [];
                  return {
                    ...prev,
                    [workspaceId]: currentMsgs.filter(m => m.id !== deletedId)
                  };
                });
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'files',
              filter: `workspace_id=eq.${workspaceId}`
            },
            (payload) => {
              console.log('[Realtime Sync] Incoming Files Event:', payload.eventType, payload);
              if (payload.eventType === 'INSERT') {
                const newFile = payload.new;
                const formattedFile = {
                  id: newFile.id,
                  name: newFile.name,
                  type: newFile.type,
                  size: newFile.size,
                  uploadedBy: newFile.uploaded_by,
                  uploadedAt: newFile.uploaded_at,
                  icon: newFile.icon,
                  storagePath: newFile.storage_path,
                  workspaceId: newFile.workspace_id
                };
                setFiles(prev => {
                  const currentFiles = prev[workspaceId] || [];
                  if (currentFiles.some(f => f.id === formattedFile.id)) return prev;
                  return {
                    ...prev,
                    [workspaceId]: [formattedFile, ...currentFiles]
                  };
                });
              } else if (payload.eventType === 'UPDATE') {
                const updatedFile = payload.new;
                const formattedFile = {
                  id: updatedFile.id,
                  name: updatedFile.name,
                  type: updatedFile.type,
                  size: updatedFile.size,
                  uploadedBy: updatedFile.uploaded_by,
                  uploadedAt: updatedFile.uploaded_at,
                  icon: updatedFile.icon,
                  storagePath: updatedFile.storage_path,
                  workspaceId: updatedFile.workspace_id
                };
                setFiles(prev => {
                  const currentFiles = prev[workspaceId] || [];
                  return {
                    ...prev,
                    [workspaceId]: currentFiles.map(f => f.id === formattedFile.id ? formattedFile : f)
                  };
                });
              } else if (payload.eventType === 'DELETE') {
                const deletedId = payload.old.id;
                setFiles(prev => {
                  const currentFiles = prev[workspaceId] || [];
                  return {
                    ...prev,
                    [workspaceId]: currentFiles.filter(f => f.id !== deletedId)
                  };
                });
              }
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'tasks',
              filter: `workspace_id=eq.${workspaceId}`
            },
            (payload) => {
              console.log('[Realtime Sync] Incoming Tasks Event:', payload.eventType, payload);
              refetchTasks(workspaceId);
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'task_comments'
            },
            (payload) => {
              console.log('[Realtime Sync] Incoming Comments Event:', payload.eventType, payload);
              refetchComments(workspaceId);
            }
          )
          .on(
            'postgres_changes',
            {
              event: 'INSERT',
              schema: 'public',
              table: 'activity_feed',
              filter: `workspace_id=eq.${workspaceId}`
            },
            (payload) => {
              console.log('[Realtime Sync] Incoming Activity Event:', payload);
              setActivityFeed(prev => {
                const current = prev[workspaceId] || [];
                if (current.some(a => a.id === payload.new.id)) return prev;
                return {
                  ...prev,
                  [workspaceId]: [payload.new, ...current]
                };
              });
            }
          )
          .on(
            'postgres_changes',
            {
              event: '*',
              schema: 'public',
              table: 'user_presence',
              filter: `workspace_id=eq.${workspaceId}`
            },
            (payload) => {
              console.log('[Realtime Sync] Incoming Database Presence Event:', payload.eventType, payload);
              if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
                const presenceRow = payload.new;
                setUserPresence(prev => {
                  const current = prev[presenceRow.user_id] || {};
                  return {
                    ...prev,
                    [presenceRow.user_id]: {
                      status: current.status === 'online' && presenceRow.status !== 'offline' ? 'online' : presenceRow.status,
                      lastSeen: presenceRow.last_seen
                    }
                  };
                });
              }
            }
          )
          .subscribe((status, err) => {
            console.log(`[Realtime Sync] Channel status changed for ${workspaceId}: ${status}`);
            if (err) {
              console.error(`[Realtime Sync] Subscription error for ${workspaceId}:`, err);
            }
          });

        activeWorkspaceChannelRef.current = channel;

        // Set up Presence channel
        console.log(`[Realtime Sync] Creating presence channel for workspace ${workspaceId}`);
        const presenceChannel = supabase.channel(`workspace_presence:${workspaceId}`, {
          config: {
            presence: {
              key: user.id
            }
          }
        });

        presenceChannel
          .on('presence', { event: 'sync' }, () => {
            const state = presenceChannel.presenceState();
            const onlineMap = {};
            Object.keys(state).forEach(userId => {
              const userPresences = state[userId];
              if (userPresences && userPresences.length > 0) {
                onlineMap[userId] = {
                  status: userPresences[0].status || 'online',
                  lastSeen: userPresences[0].last_seen || new Date().toISOString()
                };
              }
            });

            setUserPresence(prev => {
              const merged = { ...prev };
              Object.keys(merged).forEach(uid => {
                if (onlineMap[uid]) {
                  merged[uid] = onlineMap[uid];
                } else {
                  merged[uid] = {
                    ...merged[uid],
                    status: 'offline'
                  };
                }
              });
              Object.keys(onlineMap).forEach(uid => {
                merged[uid] = onlineMap[uid];
              });
              return merged;
            });
          })
          .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
              const nowStr = new Date().toISOString();
              await presenceChannel.track({
                status: 'online',
                last_seen: nowStr
              });
              await supabase.from('user_presence').upsert({
                user_id: user.id,
                workspace_id: workspaceId,
                status: 'online',
                last_seen: nowStr
              });
            }
          });

        activePresenceChannelRef.current = presenceChannel;

        // 9. Fetch Workspace Members (two-step: members then profiles)
        const { data: memberData, error: memberErr } = await supabase
          .from('workspace_members')
          .select('user_id, role')
          .eq('workspace_id', workspaceId);

        if (!memberErr && memberData && memberData.length > 0) {
          const userIds = memberData.map(m => m.user_id);
          const { data: profileData, error: profileErr } = await supabase
            .from('profiles')
            .select('id, name, email, avatar, status, role')
            .in('id', userIds);

          const profileMap = {};
          if (!profileErr && profileData) {
            profileData.forEach(p => { profileMap[p.id] = p; });
          }

          const mappedMembers = memberData.map(m => {
            const p = profileMap[m.user_id];
            return {
              id: m.user_id,
              name: p?.name || 'Unknown',
              email: p?.email || '',
              avatar: p?.avatar || null,
              initials: (p?.name || '').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'U',
              role: m.role || 'Member',
              status: p?.status || 'offline',
              color: '#6366f1'
            };
          }).filter(m => m.id);
          setWorkspaceMembers(prev => ({ ...prev, [workspaceId]: mappedMembers }));
        }
      } catch (err) {
        console.error('Error fetching workspace details:', err);
      }
    } else {
      // Local fallback
      const localTasks = localStorage.getItem(`nexus_tasks_${workspaceId}`);
      const localChats = localStorage.getItem(`nexus_chats_${workspaceId}`);
      const localFiles = localStorage.getItem(`nexus_files_${workspaceId}`);
      const localMembers = localStorage.getItem(`nexus_members_${workspaceId}`);
      const localComments = localStorage.getItem(`nexus_comments_all_${workspaceId}`);
      const localActivity = localStorage.getItem(`nexus_activity_${workspaceId}`);

      setTasks(prev => ({
        ...prev,
        [workspaceId]: localTasks ? JSON.parse(localTasks) : { todo: [], inProgress: [], done: [] }
      }));
      setChatMessages(prev => ({
        ...prev,
        [workspaceId]: localChats ? JSON.parse(localChats) : [
          {
            id: `msg_welcome_${workspaceId}`,
            userId: 'usr_002',
            text: `Welcome to the workspace! Start collaborating here.`,
            timestamp: 'Just now',
            reactions: []
          }
        ]
      }));
      setFiles(prev => ({
        ...prev,
        [workspaceId]: localFiles ? JSON.parse(localFiles) : []
      }));
      setTaskComments(prev => ({
        ...prev,
        ...(localComments ? JSON.parse(localComments) : {})
      }));
      setActivityFeed(prev => ({
        ...prev,
        [workspaceId]: localActivity ? JSON.parse(localActivity) : []
      }));

      if (localMembers) {
        setWorkspaceMembers(prev => ({ ...prev, [workspaceId]: JSON.parse(localMembers) }));
      } else {
        const defaultMembers = [
          {
            id: user.id,
            name: user.name,
            email: user.email,
            avatar: null,
            initials: user.initials || 'U',
            role: 'Owner',
            status: 'online',
            color: '#6366f1'
          }
        ];
        localStorage.setItem(`nexus_members_${workspaceId}`, JSON.stringify(defaultMembers));
        setWorkspaceMembers(prev => ({ ...prev, [workspaceId]: defaultMembers }));
      }
    }
  };

  // Action: Create a Workspace
  const createWorkspace = async (name, description, color, icon = '💼') => {
    if (!user?.id) return null;
    const inviteCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('workspaces')
          .insert({
            name,
            description,
            color,
            icon,
            owner_id: user.id,
            invite_code: inviteCode,
            tasks_count: 0,
            files_count: 0,
            last_activity: 'Just now',
            unread: 0
          })
          .select()
          .single();

        if (error) throw error;

        await supabase
          .from('workspace_members')
          .insert({
            workspace_id: data.id,
            user_id: user.id,
            role: 'Owner'
          });

        const newWs = {
          id: data.id,
          name: data.name,
          description: data.description,
          color: data.color,
          icon: data.icon,
          tasksCount: 0,
          filesCount: 0,
          lastActivity: 'Just now',
          unread: 0,
          ownerId: data.owner_id,
          inviteCode: data.invite_code
        };

        const creatorMember = {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: user.avatar || null,
          initials: user.initials || 'U',
          role: 'Owner',
          status: 'online',
          color: '#6366f1'
        };

        setWorkspaces(prev => [...prev, newWs]);
        setTasks(prev => ({ ...prev, [data.id]: { todo: [], inProgress: [], done: [] } }));
        setChatMessages(prev => ({
          ...prev,
          [data.id]: [
            {
              id: `msg_welcome_${data.id}`,
              userId: 'usr_002',
              text: `Welcome to the #${name} workspace! The workspace has been set up successfully.`,
              timestamp: 'Just now',
              reactions: []
            }
          ]
        }));
        setFiles(prev => ({ ...prev, [data.id]: [] }));
        setWorkspaceMembers(prev => ({ ...prev, [data.id]: [creatorMember] }));

        await logActivity(data.id, 'created_workspace', `created workspace "${name}"`);

        return newWs;
      } catch (err) {
        console.error('Error creating workspace:', err);
        const isSchemaError = err.code === '42P01' || err.code === 'PGRST205' || err.code === '42P17' || err.code === 'PGRST204' || err.code?.startsWith('42') || err.code?.startsWith('PGRST');
        if (isSchemaError) {
          setDbError(true);
        }
        return null;
      }
    } else {
      const newId = `ws_${Date.now()}`;
      const newWs = {
        id: newId,
        name,
        description,
        color,
        icon,
        tasksCount: 0,
        filesCount: 0,
        lastActivity: 'Just now',
        unread: 0,
        ownerId: user.id,
        inviteCode
      };

      const updatedWorkspaces = [...workspaces, newWs];
      setWorkspaces(updatedWorkspaces);
      localStorage.setItem(`nexus_workspaces_${user.id}`, JSON.stringify(updatedWorkspaces));

      const globalMockStored = localStorage.getItem(`nexus_all_workspaces_mock`);
      const globalMock = globalMockStored ? JSON.parse(globalMockStored) : [];
      localStorage.setItem(`nexus_all_workspaces_mock`, JSON.stringify([...globalMock, newWs]));

      setTasks(prev => {
        const updated = { ...prev, [newId]: { todo: [], inProgress: [], done: [] } };
        localStorage.setItem(`nexus_tasks_${newId}`, JSON.stringify(updated[newId]));
        return updated;
      });

      const welcomeChats = [
        {
          id: `msg_welcome_${newId}`,
          userId: 'usr_002',
          text: `Welcome to the #${name} workspace! The workspace has been set up successfully.`,
          timestamp: 'Just now',
          reactions: []
        }
      ];
      setChatMessages(prev => {
        const updated = { ...prev, [newId]: welcomeChats };
        localStorage.setItem(`nexus_chats_${newId}`, JSON.stringify(welcomeChats));
        return updated;
      });

      setFiles(prev => {
        const updated = { ...prev, [newId]: [] };
        localStorage.setItem(`nexus_files_${newId}`, JSON.stringify([]));
        return updated;
      });

      const defaultMembers = [{
        id: user.id,
        name: user.name,
        email: user.email,
        avatar: null,
        initials: user.initials || 'U',
        role: 'Owner',
        status: 'online',
        color: '#6366f1'
      }];
      setWorkspaceMembers(prev => ({ ...prev, [newId]: defaultMembers }));
      localStorage.setItem(`nexus_members_${newId}`, JSON.stringify(defaultMembers));

      await logActivity(newId, 'created_workspace', `created workspace "${name}"`);

      return newWs;
    }
  };

  // Action: Join Workspace by Invite Code
  const joinWorkspaceByCode = async (inviteCode) => {
    if (!inviteCode || !user?.id) return { success: false, error: 'Authentication required' };

    const cleanCode = inviteCode.trim().toUpperCase();

    if (isSupabaseConfigured) {
      try {
        const { data: ws, error: wsErr } = await supabase
          .from('workspaces')
          .select('*')
          .eq('invite_code', cleanCode)
          .maybeSingle();

        if (wsErr) throw wsErr;
        if (!ws) {
          return { success: false, error: 'Invalid invite code. Workspace not found.' };
        }

        const { data: existingMember, error: memErr } = await supabase
          .from('workspace_members')
          .select('*')
          .eq('workspace_id', ws.id)
          .eq('user_id', user.id)
          .maybeSingle();

        if (memErr) throw memErr;
        if (existingMember) {
          return { success: false, error: 'You are already a member of this workspace.', workspaceId: ws.id };
        }

        const { error: joinErr } = await supabase
          .from('workspace_members')
          .insert({
            workspace_id: ws.id,
            user_id: user.id,
            role: 'Member'
          });

        if (joinErr) throw joinErr;

        await logActivity(ws.id, 'joined_workspace', `joined the workspace`);

        await loadWorkspaces();

        return { success: true, workspaceId: ws.id };
      } catch (err) {
        console.error('Error joining workspace:', err);
        return { success: false, error: err.message || 'Failed to join workspace' };
      }
    } else {
      const stored = localStorage.getItem(`nexus_all_workspaces_mock`);
      const allMockWorkspaces = stored ? JSON.parse(stored) : [...workspaces];

      const ws = allMockWorkspaces.find(w => w.inviteCode === cleanCode);
      if (!ws) {
        return { success: false, error: 'Invalid invite code. Workspace not found.' };
      }

      if (workspaces.some(w => w.id === ws.id)) {
        return { success: false, error: 'You are already a member of this workspace.', workspaceId: ws.id };
      }

      const updatedWorkspaces = [...workspaces, ws];
      setWorkspaces(updatedWorkspaces);
      localStorage.setItem(`nexus_workspaces_${user.id}`, JSON.stringify(updatedWorkspaces));

      const defaultMembers = [
        {
          id: user.id,
          name: user.name,
          email: user.email,
          avatar: null,
          initials: user.initials || 'U',
          role: 'Member',
          status: 'online',
          color: '#6366f1'
        }
      ];
      localStorage.setItem(`nexus_members_${ws.id}`, JSON.stringify(defaultMembers));

      await logActivity(ws.id, 'joined_workspace', `joined the workspace`);

      return { success: true, workspaceId: ws.id };
    }
  };

  // Action: Delete Workspace
  const deleteWorkspace = async (workspaceId) => {
    if (!user?.id || !workspaceId) return { success: false, error: 'Authentication required' };

    if (isSupabaseConfigured) {
      try {
        const { data: ws, error: wsErr } = await supabase
          .from('workspaces')
          .select('owner_id, name')
          .eq('id', workspaceId)
          .single();

        if (wsErr || !ws) {
          return { success: false, error: 'Workspace not found' };
        }

        if (ws.owner_id !== user.id) {
          return { success: false, error: 'Only the workspace owner can delete it.' };
        }

        // Clean up Supabase Storage files
        const { data: wsFiles, error: filesErr } = await supabase
          .from('files')
          .select('storage_path')
          .eq('workspace_id', workspaceId);

        if (!filesErr && wsFiles && wsFiles.length > 0) {
          const paths = wsFiles.map(f => f.storage_path).filter(Boolean);
          if (paths.length > 0) {
            await supabase.storage.from('files').remove(paths);
          }
        }

        // Delete workspace from workspaces table (DB cascades handle delete from other tables)
        const { error: deleteErr } = await supabase
          .from('workspaces')
          .delete()
          .eq('id', workspaceId);

        if (deleteErr) throw deleteErr;

        setWorkspaces(prev => prev.filter(w => w.id !== workspaceId));
        return { success: true };
      } catch (err) {
        console.error('Error deleting workspace:', err);
        return { success: false, error: err.message || 'Failed to delete workspace' };
      }
    } else {
      const stored = localStorage.getItem(`nexus_workspaces_${user.id}`);
      let localWsList = stored ? JSON.parse(stored) : [];
      
      const ws = localWsList.find(w => w.id === workspaceId);
      if (!ws) return { success: false, error: 'Workspace not found' };
      if (ws.ownerId !== user.id) return { success: false, error: 'Only the workspace owner can delete it.' };

      const updated = localWsList.filter(w => w.id !== workspaceId);
      setWorkspaces(updated);
      localStorage.setItem(`nexus_workspaces_${user.id}`, JSON.stringify(updated));

      // Clean up mock tables from localstorage
      localStorage.removeItem(`nexus_tasks_${workspaceId}`);
      localStorage.removeItem(`nexus_chats_${workspaceId}`);
      localStorage.removeItem(`nexus_files_${workspaceId}`);
      localStorage.removeItem(`nexus_members_${workspaceId}`);
      localStorage.removeItem(`nexus_comments_all_${workspaceId}`);

      return { success: true };
    }
  };

  // Action: Invite/Add Member to Workspace
  const inviteMemberToWorkspace = async (workspaceId, email) => {
    if (!workspaceId || !user?.id) return { success: false, error: 'Authentication required' };

    if (isSupabaseConfigured) {
      try {
        const { data: profile, error: profErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        if (profErr || !profile) {
          return { success: false, error: 'User email not registered. Invite them to register in Nexus first!' };
        }

        const { error: insertErr } = await supabase
          .from('workspace_members')
          .insert({
            workspace_id: workspaceId,
            user_id: profile.id,
            role: 'Member'
          });

        if (insertErr) {
          if (insertErr.code === '23505') {
            return { success: false, error: 'User is already a member of this workspace.' };
          }
          throw insertErr;
        }

        await logActivity(workspaceId, 'invited_member', `added member ${profile.name} (${email}) to the workspace`);
        await createNotification(
          profile.id,
          'Workspace Invitation',
          `${user.name} added you to their workspace`,
          workspaceId
        );

        await fetchWorkspaceDetails(workspaceId);
        return { success: true };
      } catch (err) {
        console.error('Error inviting member:', err);
        return { success: false, error: err.message || 'Invitation failed' };
      }
    } else {
      const mockName = email.split('@')[0];
      const newMember = {
        id: `usr_${Date.now()}`,
        name: mockName.charAt(0).toUpperCase() + mockName.slice(1),
        email,
        avatar: null,
        initials: mockName.slice(0, 2).toUpperCase(),
        role: 'Member',
        status: 'online',
        color: '#3b82f6'
      };

      const currentList = workspaceMembers[workspaceId] || [];
      if (currentList.some(m => m.email === email)) {
        return { success: false, error: 'User is already a member.' };
      }

      const updatedList = [...currentList, newMember];
      setWorkspaceMembers(prev => ({ ...prev, [workspaceId]: updatedList }));
      localStorage.setItem(`nexus_members_${workspaceId}`, JSON.stringify(updatedList));

      await logActivity(workspaceId, 'invited_member', `added member ${newMember.name} to the workspace`);

      return { success: true };
    }
  };

  // Action: Add a task
  const addTask = async (workspaceId, task) => {
    if (!user?.id || !workspaceId) return;

    const newTaskObj = {
      title: task.title,
      description: task.description,
      assignee: task.assignee || null,
      priority: task.priority || 'medium',
      dueDate: task.dueDate || '',
      labels: task.labels || ['feature']
    };

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('tasks')
          .insert({
            workspace_id: workspaceId,
            owner_id: user.id,
            title: newTaskObj.title,
            description: newTaskObj.description,
            assignee: newTaskObj.assignee,
            priority: newTaskObj.priority,
            due_date: newTaskObj.dueDate || null,
            labels: newTaskObj.labels,
            status: 'todo'
          })
          .select()
          .single();

        if (error) throw error;

        const formattedTask = {
          id: data.id,
          title: data.title,
          description: data.description,
          assignee: data.assignee,
          priority: data.priority,
          dueDate: data.due_date,
          labels: data.labels || []
        };

        setTasks(prev => {
          const wsTasks = prev[workspaceId] || { todo: [], inProgress: [], done: [] };
          return {
            ...prev,
            [workspaceId]: {
              ...wsTasks,
              todo: [formattedTask, ...wsTasks.todo]
            }
          };
        });

        // Log task activity
        await logActivity(workspaceId, 'created_task', `created task "${data.title}"`);

        if (data.assignee) {
          const assigneeProfile = workspaceMembers[workspaceId]?.find(m => m.id === data.assignee);
          await logActivity(workspaceId, 'assigned', `assigned task "${data.title}" to ${assigneeProfile?.name || 'a member'}`);
          await createNotification(
            data.assignee,
            'Task Assigned',
            `${user.name} assigned task "${data.title}" to you`,
            workspaceId,
            'task_assigned'
          );
          // Invoke Edge Function
          supabase.functions.invoke('notify-task-assigned', {
            body: {
              assignedUserId: data.assignee,
              taskName: data.title,
              workspaceName: workspaces.find(w => w.id === workspaceId)?.name || 'Workspace'
            }
          }).catch(err => console.warn('Edge function error:', err));
        }

        setWorkspaces(prev =>
          prev.map(ws => (ws.id === workspaceId ? { ...ws, tasksCount: (ws.tasksCount || 0) + 1 } : ws))
        );

        const { count, error: countErr } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId);
        
        if (!countErr && count !== null) {
          await supabase
            .from('workspaces')
            .update({ tasks_count: count })
            .eq('id', workspaceId);
        }
      } catch (err) {
        console.error('Error adding task:', err);
      }
    } else {
      const newId = `task_${Date.now()}`;
      const localTask = { id: newId, ...newTaskObj };

      setTasks(prev => {
        const wsTasks = prev[workspaceId] || { todo: [], inProgress: [], done: [] };
        const updated = {
          ...prev,
          [workspaceId]: {
            ...wsTasks,
            todo: [localTask, ...wsTasks.todo]
          }
        };
        localStorage.setItem(`nexus_tasks_${workspaceId}`, JSON.stringify(updated[workspaceId]));
        return updated;
      });

      await logActivity(workspaceId, 'created_task', `created task "${localTask.title}"`);

      setWorkspaces(prev => {
        const updated = prev.map(ws => (ws.id === workspaceId ? { ...ws, tasksCount: (ws.tasksCount || 0) + 1 } : ws));
        localStorage.setItem(`nexus_workspaces_${user.id}`, JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Action: Update tasks board (drag & drop movement)
  const updateTasks = async (workspaceId, newTasksData) => {
    if (!workspaceId || !user?.id) return;

    const previousWorkspaceTasks = tasks[workspaceId] || { todo: [], inProgress: [], done: [] };

    setTasks(prev => ({
      ...prev,
      [workspaceId]: newTasksData
    }));

    // Find which task moved status to log correctly
    let movedTask = null;
    let newStatus = '';
    
    newTasksData.todo?.forEach(t => {
      const wasInTodo = previousWorkspaceTasks.todo?.some(pt => pt.id === t.id);
      if (!wasInTodo && (previousWorkspaceTasks.inProgress?.some(pt => pt.id === t.id) || previousWorkspaceTasks.done?.some(pt => pt.id === t.id))) {
        movedTask = t;
        newStatus = 'todo';
      }
    });
    newTasksData.inProgress?.forEach(t => {
      const wasInInProgress = previousWorkspaceTasks.inProgress?.some(pt => pt.id === t.id);
      if (!wasInInProgress && (previousWorkspaceTasks.todo?.some(pt => pt.id === t.id) || previousWorkspaceTasks.done?.some(pt => pt.id === t.id))) {
        movedTask = t;
        newStatus = 'inProgress';
      }
    });
    newTasksData.done?.forEach(t => {
      const wasInDone = previousWorkspaceTasks.done?.some(pt => pt.id === t.id);
      if (!wasInDone && (previousWorkspaceTasks.todo?.some(pt => pt.id === t.id) || previousWorkspaceTasks.inProgress?.some(pt => pt.id === t.id))) {
        movedTask = t;
        newStatus = 'done';
      }
    });

    if (movedTask) {
      if (newStatus === 'done') {
        await logActivity(workspaceId, 'completed_task', `completed task "${movedTask.title}"`);
      } else if (newStatus === 'inProgress') {
        await logActivity(workspaceId, 'started_task', `started task "${movedTask.title}"`);
      } else {
        await logActivity(workspaceId, 'moved_task', `moved task "${movedTask.title}" to To Do`);
      }
    }

    if (isSupabaseConfigured) {
      try {
        const promises = [];
        const updateListStatus = (taskList, dbStatus) => {
          taskList.forEach(t => {
            promises.push(
              supabase
                .from('tasks')
                .update({ status: dbStatus })
                .eq('id', t.id)
                .eq('workspace_id', workspaceId)
            );
          });
        };

        updateListStatus(newTasksData.todo || [], 'todo');
        updateListStatus(newTasksData.inProgress || [], 'in_progress');
        updateListStatus(newTasksData.done || [], 'done');

        await Promise.all(promises);
      } catch (err) {
        console.error('Error updating tasks on server:', err);
      }
    } else {
      localStorage.setItem(`nexus_tasks_${workspaceId}`, JSON.stringify(newTasksData));
    }
  };

  // Action: Add Chat Message
  const addChatMessage = async (workspaceId, text) => {
    if (!workspaceId || !user?.id) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase
          .from('chat_messages')
          .insert({
            workspace_id: workspaceId,
            owner_id: user.id,
            user_id: user.id,
            text,
            timestamp
          })
          .select()
          .single();

        if (error) throw error;

        const formattedMsg = {
          id: data.id,
          userId: data.user_id,
          text: data.text,
          timestamp: data.timestamp,
          reactions: data.reactions || [],
          createdAt: data.created_at
        };

        setChatMessages(prev => ({
          ...prev,
          [workspaceId]: [...(prev[workspaceId] || []), formattedMsg]
        }));

        // Create notifications for all workspace members except the sender
        const members = workspaceMembers[workspaceId] || [];
        const workspaceName = workspaces.find(w => w.id === workspaceId)?.name || 'workspace';
        const notificationPromises = members
          .filter(m => m.id !== user.id)
          .map(member => {
            const nameTag = `@${member.name}`;
            const firstNameTag = `@${member.name.split(' ')[0]}`;
            const emailTag = `@${member.email.split('@')[0]}`;
            
            const containsMention = 
              text.toLowerCase().includes(nameTag.toLowerCase()) ||
              text.toLowerCase().includes(firstNameTag.toLowerCase()) ||
              text.toLowerCase().includes(emailTag.toLowerCase());

            const title = containsMention ? 'Chat Mention' : `New Message in #${workspaceName}`;
            return createNotification(
              member.id,
              title,
              text,
              workspaceId,
              'chat_message'
            );
          });
        await Promise.all(notificationPromises);

        setWorkspaces(prev =>
          prev.map(ws => (ws.id === workspaceId ? { ...ws, lastActivity: '1 min ago' } : ws))
        );

        await logActivity(workspaceId, 'message_sent', 'sent a message in #general');

        await supabase
          .from('workspaces')
          .update({ last_activity: '1 min ago' })
          .eq('id', workspaceId);

      } catch (err) {
        console.error('Error adding chat message:', err);
      }
    } else {
      const newMsg = {
        id: `msg_${Date.now()}`,
        userId: user.id,
        text,
        timestamp,
        reactions: [],
        createdAt: new Date().toISOString()
      };

      setChatMessages(prev => {
        const updated = {
          ...prev,
          [workspaceId]: [...(prev[workspaceId] || []), newMsg]
        };
        localStorage.setItem(`nexus_chats_${workspaceId}`, JSON.stringify(updated[workspaceId]));
        return updated;
      });

      // Local mock @mention parser
      const members = workspaceMembers[workspaceId] || [];
      members.forEach(member => {
        if (member.id !== user.id) {
          const nameTag = `@${member.name}`;
          const containsMention = text.toLowerCase().includes(nameTag.toLowerCase());
          if (containsMention) {
            createNotification(
              member.id,
              'Chat Mention',
              `${user.name} mentioned you in workspace`,
              workspaceId
            );
          }
        }
      });

      await logActivity(workspaceId, 'message_sent', 'sent a message');

      setWorkspaces(prev => {
        const updated = prev.map(ws => (ws.id === workspaceId ? { ...ws, lastActivity: '1 min ago' } : ws));
        localStorage.setItem(`nexus_workspaces_${user.id}`, JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Action: Add File (Supabase Storage & Metadata)
  const uploadFile = async (workspaceId, fileMeta, file, onProgress) => {
    if (!user?.id || !workspaceId) return;

    if (isSupabaseConfigured && file) {
      try {
        const cleanFileName = file.name.replace(/[^\x20-\x7E]/g, '');
        const storagePath = `${workspaceId}/${Date.now()}_${cleanFileName}`;

        const { error: uploadErr } = await supabase.storage
          .from('files')
          .upload(storagePath, file, {
            cacheControl: '3600',
            upsert: false,
            onUploadProgress: (progress) => {
              if (onProgress) {
                const percent = Math.round((progress.loaded / progress.total) * 100);
                onProgress(percent);
              }
            }
          });

        if (uploadErr) throw uploadErr;

        const { data, error } = await supabase
          .from('files')
          .insert({
            workspace_id: workspaceId,
            owner_id: user.id,
            name: file.name,
            type: fileMeta.type || 'document',
            size: fileMeta.size || `${(file.size / 1024).toFixed(0)} KB`,
            uploaded_by: user.id,
            uploaded_at: 'Just now',
            icon: fileMeta.icon || '📄',
            storage_path: storagePath
          })
          .select()
          .single();

        if (error) throw error;

        const formattedFile = {
          id: data.id,
          name: data.name,
          type: data.type,
          size: data.size,
          uploadedBy: data.uploaded_by,
          uploadedAt: data.uploaded_at,
          icon: data.icon,
          storagePath: data.storage_path,
          workspaceId: data.workspace_id
        };

        setFiles(prev => ({
          ...prev,
          [workspaceId]: [formattedFile, ...(prev[workspaceId] || [])]
        }));

        await logActivity(workspaceId, 'uploaded_file', `uploaded file "${data.name}"`);

        setWorkspaces(prev =>
          prev.map(ws => (ws.id === workspaceId ? { ...ws, filesCount: (ws.filesCount || 0) + 1 } : ws))
        );

        const { count, error: countErr } = await supabase
          .from('files')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId);

        if (!countErr && count !== null) {
          await supabase
            .from('workspaces')
            .update({ files_count: count })
            .eq('id', workspaceId);
        }
      } catch (err) {
        console.error('Error uploading file to storage:', err);
      }
    } else {
      if (onProgress) {
        onProgress(30);
        setTimeout(() => onProgress(70), 150);
        setTimeout(() => onProgress(100), 300);
      }

      const newId = `file_${Date.now()}`;
      const localFile = {
        id: newId,
        name: fileMeta.name || file?.name || 'document.pdf',
        type: fileMeta.type || 'document',
        size: fileMeta.size || (file ? `${(file.size / 1024).toFixed(0)} KB` : '124 KB'),
        uploadedBy: user.id,
        uploadedAt: 'Just now',
        icon: fileMeta.icon || '📄',
        storagePath: `mock/${newId}`,
        workspaceId: workspaceId
      };

      setFiles(prev => {
        const updated = {
          ...prev,
          [workspaceId]: [localFile, ...(prev[workspaceId] || [])]
        };
        localStorage.setItem(`nexus_files_${workspaceId}`, JSON.stringify(updated[workspaceId]));
        return updated;
      });

      await logActivity(workspaceId, 'uploaded_file', `uploaded file "${localFile.name}"`);

      setWorkspaces(prev => {
        const updated = prev.map(ws => (ws.id === workspaceId ? { ...ws, filesCount: (ws.filesCount || 0) + 1 } : ws));
        localStorage.setItem(`nexus_workspaces_${user.id}`, JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Action: Add Task Comment
  const addTaskComment = async (taskId, text) => {
    if (!taskId || !text.trim() || !user?.id) return;

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('task_comments')
          .insert({
            task_id: taskId,
            user_id: user.id,
            text: text.trim()
          })
          .select()
          .single();

        if (error) throw error;
        
        const { data: taskData } = await supabase
          .from('tasks')
          .select('title, assignee, owner_id, workspace_id')
          .eq('id', taskId)
          .single();

        if (taskData) {
          await logActivity(taskData.workspace_id, 'commented', `commented on task "${taskData.title}"`);
          
          if (taskData.assignee && taskData.assignee !== user.id) {
            await createNotification(
              taskData.assignee,
              'New Task Comment',
              `${user.name} commented on task "${taskData.title}"`,
              taskData.workspace_id
            );
          }
          if (taskData.owner_id && taskData.owner_id !== user.id && taskData.owner_id !== taskData.assignee) {
            await createNotification(
              taskData.owner_id,
              'New Task Comment',
              `${user.name} commented on task "${taskData.title}"`,
              taskData.workspace_id
            );
          }
        }

        await refetchComments(taskData?.workspace_id || activeWorkspaceId);
      } catch (err) {
        console.error('Error adding comment:', err);
      }
    } else {
      const newComment = {
        id: `comment_${Date.now()}`,
        taskId,
        userId: user.id,
        text: text.trim(),
        createdAt: new Date().toISOString()
      };
      setTaskComments(prev => {
        const current = prev[taskId] || [];
        const updated = [...current, newComment];
        if (activeWorkspaceId) {
          localStorage.setItem(`nexus_comments_all_${activeWorkspaceId}`, JSON.stringify({ ...prev, [taskId]: updated }));
        }
        return { ...prev, [taskId]: updated };
      });
      if (activeWorkspaceId) {
        await logActivity(activeWorkspaceId, 'commented', `commented on a task`);
      }
    }
  };

  // Action: Delete Task
  const deleteTask = async (workspaceId, taskId) => {
    if (!workspaceId || !taskId) return;
    if (isSupabaseConfigured) {
      try {
        const { data: taskData } = await supabase
          .from('tasks')
          .select('title')
          .eq('id', taskId)
          .single();
        const taskTitle = taskData?.title || 'Unknown Task';

        const { error } = await supabase
          .from('tasks')
          .delete()
          .eq('id', taskId)
          .eq('workspace_id', workspaceId);

        if (error) throw error;

        await logActivity(workspaceId, 'deleted_task', `deleted task "${taskTitle}"`);

        const { count, error: countErr } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId);
        
        if (!countErr && count !== null) {
          await supabase
            .from('workspaces')
            .update({ tasks_count: count })
            .eq('id', workspaceId);
          
          setWorkspaces(prev =>
            prev.map(ws => (ws.id === workspaceId ? { ...ws, tasksCount: count } : ws))
          );
        }
      } catch (err) {
        console.error('Error deleting task:', err);
      }
    } else {
      setTasks(prev => {
        const wsTasks = prev[workspaceId] || { todo: [], inProgress: [], done: [] };
        const updated = {
          ...prev,
          [workspaceId]: {
            todo: wsTasks.todo.filter(t => t.id !== taskId),
            inProgress: wsTasks.inProgress.filter(t => t.id !== taskId),
            done: wsTasks.done.filter(t => t.id !== taskId)
          }
        };
        localStorage.setItem(`nexus_tasks_${workspaceId}`, JSON.stringify(updated[workspaceId]));
        return updated;
      });
      setWorkspaces(prev => {
        const updated = prev.map(ws => (ws.id === workspaceId ? { ...ws, tasksCount: Math.max(0, (ws.tasksCount || 0) - 1) } : ws));
        localStorage.setItem(`nexus_workspaces_${user.id}`, JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Action: Update Task Details
  const updateTaskDetails = async (workspaceId, taskId, updatedFields) => {
    if (!workspaceId || !taskId) return;
    
    const dbFields = {};
    if (updatedFields.title !== undefined) dbFields.title = updatedFields.title;
    if (updatedFields.description !== undefined) dbFields.description = updatedFields.description;
    if (updatedFields.assignee !== undefined) dbFields.assignee = updatedFields.assignee || null;
    if (updatedFields.priority !== undefined) dbFields.priority = updatedFields.priority;
    if (updatedFields.dueDate !== undefined) dbFields.due_date = updatedFields.dueDate || null;
    if (updatedFields.labels !== undefined) dbFields.labels = updatedFields.labels;
    if (updatedFields.status !== undefined) dbFields.status = updatedFields.status;

    if (isSupabaseConfigured) {
      try {
        const { error } = await supabase
          .from('tasks')
          .update(dbFields)
          .eq('id', taskId)
          .eq('workspace_id', workspaceId);

        if (error) throw error;

        if (updatedFields.title !== undefined) {
          await logActivity(workspaceId, 'edited_task', `updated task "${updatedFields.title}"`);
        }
        if (updatedFields.assignee) {
          let taskTitle = updatedFields.title;
          if (!taskTitle && tasks[workspaceId]) {
            const allTasks = [
              ...(tasks[workspaceId].todo || []),
              ...(tasks[workspaceId].inProgress || []),
              ...(tasks[workspaceId].done || [])
            ];
            const foundTask = allTasks.find(t => t.id === taskId);
            if (foundTask) taskTitle = foundTask.title;
          }
          const finalTaskTitle = taskTitle || 'task';

          const assigneeProfile = workspaceMembers[workspaceId]?.find(m => m.id === updatedFields.assignee);
          await logActivity(workspaceId, 'assigned', `assigned task "${finalTaskTitle}" to ${assigneeProfile?.name || 'a member'}`);
          await createNotification(
            updatedFields.assignee,
            'Task Assigned',
            `${user.name} assigned task "${finalTaskTitle}" to you`,
            workspaceId,
            'task_assigned'
          );
          // Invoke Edge Function
          supabase.functions.invoke('notify-task-assigned', {
            body: {
              assignedUserId: updatedFields.assignee,
              taskName: finalTaskTitle,
              workspaceName: workspaces.find(w => w.id === workspaceId)?.name || 'Workspace'
            }
          }).catch(err => console.warn('Edge function error:', err));
        }
      } catch (err) {
        console.error('Error updating task details:', err);
      }
    } else {
      setTasks(prev => {
        const wsTasks = prev[workspaceId] || { todo: [], inProgress: [], done: [] };
        const mapList = list => list.map(t => t.id === taskId ? { ...t, ...updatedFields } : t);
        const updated = {
          ...prev,
          [workspaceId]: {
            todo: mapList(wsTasks.todo),
            inProgress: mapList(wsTasks.inProgress),
            done: mapList(wsTasks.done)
          }
        };
        localStorage.setItem(`nexus_tasks_${workspaceId}`, JSON.stringify(updated[workspaceId]));
        return updated;
      });
    }
  };

  // Action: Delete File
  const deleteFile = async (workspaceId, fileId) => {
    if (!workspaceId || !fileId) return;
    const currentFiles = files[workspaceId] || [];
    const targetFile = currentFiles.find(f => f.id === fileId);
    if (!targetFile) return;

    if (isSupabaseConfigured) {
      try {
        if (targetFile.storagePath) {
          const { error: storageErr } = await supabase.storage
            .from('files')
            .remove([targetFile.storagePath]);
          if (storageErr) console.warn('Could not delete file from storage:', storageErr);
        }

        const { error: dbErr } = await supabase
          .from('files')
          .delete()
          .eq('id', fileId)
          .eq('workspace_id', workspaceId);

        if (dbErr) throw dbErr;

        await logActivity(workspaceId, 'deleted_file', `deleted file "${targetFile.name}"`);

        const { count, error: countErr } = await supabase
          .from('files')
          .select('*', { count: 'exact', head: true })
          .eq('workspace_id', workspaceId);

        if (!countErr && count !== null) {
          await supabase
            .from('workspaces')
            .update({ files_count: count })
            .eq('id', workspaceId);

          setWorkspaces(prev =>
            prev.map(ws => (ws.id === workspaceId ? { ...ws, filesCount: count } : ws))
          );
        }
      } catch (err) {
        console.error('Error deleting file:', err);
      }
    } else {
      setFiles(prev => {
        const current = prev[workspaceId] || [];
        const updated = {
          ...prev,
          [workspaceId]: current.filter(f => f.id !== fileId)
        };
        localStorage.setItem(`nexus_files_${workspaceId}`, JSON.stringify(updated[workspaceId]));
        return updated;
      });
      setWorkspaces(prev => {
        const updated = prev.map(ws => (ws.id === workspaceId ? { ...ws, filesCount: Math.max(0, (ws.filesCount || 0) - 1) } : ws));
        localStorage.setItem(`nexus_workspaces_${user.id}`, JSON.stringify(updated));
        return updated;
      });
    }
  };

  // Action: Download File from Storage
  const downloadFile = async (fileObj) => {
    if (!fileObj) return;

    if (isSupabaseConfigured && fileObj.storagePath) {
      try {
        const { data, error } = await supabase.storage
          .from('files')
          .download(fileObj.storagePath);

        if (error) throw error;

        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileObj.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (fileObj.workspaceId) {
          await logActivity(fileObj.workspaceId, 'downloaded_file', `downloaded file "${fileObj.name}"`);
        }
      } catch (err) {
        console.error('Error downloading file:', err);
        alert('Could not download file. Make sure it exists in storage.');
      }
    } else {
      const blob = new Blob([`Nexus Demo File Content for ${fileObj.name}`], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileObj.name.endsWith('.txt') || fileObj.name.includes('.') ? fileObj.name : `${fileObj.name}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      if (fileObj.workspaceId) {
        await logActivity(fileObj.workspaceId, 'downloaded_file', `downloaded file "${fileObj.name}"`);
      }
    }
  };

  const sendTypingIndicator = (workspaceId, isTyping) => {
    const channel = activeWorkspaceChannelRef.current;
    if (channel && user?.id) {
      channel.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          userId: user.id,
          userName: user.name || 'Someone',
          isTyping
        }
      });
    }
  };

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspaceId,
        setActiveWorkspaceId,
        tasks,
        chatMessages,
        files,
        workspaceMembers,
        loading,
        dbError,
        fetchWorkspaceDetails,
        createWorkspace,
        inviteMemberToWorkspace,
        joinWorkspaceByCode,
        addTask,
        updateTasks,
        addChatMessage,
        uploadFile,
        downloadFile,

        // Upgraded features
        taskComments,
        notifications,
        activityFeed,
        userPresence,
        typingUsers,
        addTaskComment,
        deleteFile,
        deleteTask,
        updateTaskDetails,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        sendTypingIndicator,
        deleteWorkspace,

        // Calling Huddles
        activeCall,
        incomingCall,
        activeCalls,
        missedCalls,
        startCall,
        joinCall,
        declineCall,
        leaveCall,
        clearMissedCalls,

        // Task fetching for dashboard
        refetchTasks
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
}
