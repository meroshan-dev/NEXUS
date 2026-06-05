import { useState } from 'react';
import { Database, Copy, Check, RefreshCw, ExternalLink, AlertTriangle } from 'lucide-react';
import Button from './Button';

const SQL_SCHEMA = `-- Nexus Supabase Database Schema
-- Run this entire script in the Supabase SQL Editor

-- 1. Create Profiles Table (Public Profile Data)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    avatar TEXT,
    status TEXT NOT NULL DEFAULT 'offline',
    role TEXT NOT NULL DEFAULT 'Member',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
    ON public.profiles FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can manage their own profiles" ON public.profiles;
CREATE POLICY "Users can manage their own profiles"
    ON public.profiles FOR ALL
    USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Create Workspaces Table
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL DEFAULT '#6366f1',
    icon TEXT NOT NULL DEFAULT '💼',
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    invite_code TEXT UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    tasks_count INTEGER NOT NULL DEFAULT 0,
    files_count INTEGER NOT NULL DEFAULT 0,
    last_activity TEXT NOT NULL DEFAULT 'Just now',
    unread INTEGER NOT NULL DEFAULT 0
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='workspaces' AND column_name='invite_code')
    THEN ALTER TABLE public.workspaces ADD COLUMN invite_code TEXT UNIQUE;
    END IF;
END $$;

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Authenticated users can select workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can manage workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can update workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Workspace owners can delete workspaces" ON public.workspaces;

CREATE POLICY "Authenticated users can select workspaces"
    ON public.workspaces FOR SELECT TO authenticated USING (true);

CREATE POLICY "Workspace owners can manage workspaces"
    ON public.workspaces FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Workspace owners can update workspaces"
    ON public.workspaces FOR UPDATE TO authenticated
    USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Workspace owners can delete workspaces"
    ON public.workspaces FOR DELETE TO authenticated
    USING (auth.uid() = owner_id);

-- 3. Workspace Members (references auth.users to avoid RLS recursion)
-- Drop and recreate to fix FK constraint if it previously referenced profiles(id)
DROP TABLE IF EXISTS public.workspace_members CASCADE;
CREATE TABLE public.workspace_members (
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'Member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (workspace_id, user_id)
);

ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow select workspace_members" ON public.workspace_members;
DROP POLICY IF EXISTS "Allow insert workspace_members" ON public.workspace_members;
DROP POLICY IF EXISTS "Allow delete workspace_members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace members can view workspace memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can join workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Members can leave or owners can remove" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_select" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_insert" ON public.workspace_members;
DROP POLICY IF EXISTS "workspace_members_delete" ON public.workspace_members;

CREATE POLICY "workspace_members_select"
    ON public.workspace_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "workspace_members_insert"
    ON public.workspace_members FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "workspace_members_delete"
    ON public.workspace_members FOR DELETE TO authenticated
    USING (auth.uid() = user_id);

-- 4. Tasks Table
CREATE TABLE IF NOT EXISTS public.tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    assignee TEXT,
    priority TEXT NOT NULL DEFAULT 'medium',
    due_date TEXT,
    labels TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'todo',
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage tasks in their own workspaces" ON public.tasks;
DROP POLICY IF EXISTS "Workspace members can view and manage tasks" ON public.tasks;
DROP POLICY IF EXISTS "tasks_all" ON public.tasks;

CREATE POLICY "tasks_all"
    ON public.tasks FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = auth.uid()));

-- 5. Files Table
CREATE TABLE IF NOT EXISTS public.files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    size TEXT NOT NULL,
    uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    uploaded_at TEXT NOT NULL DEFAULT 'Just now',
    icon TEXT NOT NULL DEFAULT '📄',
    storage_path TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='files' AND column_name='storage_path')
    THEN ALTER TABLE public.files ADD COLUMN storage_path TEXT;
    END IF;
END $$;

ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage files in their own workspaces" ON public.files;
DROP POLICY IF EXISTS "Workspace members can manage files" ON public.files;
DROP POLICY IF EXISTS "files_all" ON public.files;

CREATE POLICY "files_all"
    ON public.files FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = files.workspace_id AND wm.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = files.workspace_id AND wm.user_id = auth.uid()));

-- 6. Chat Messages Table
CREATE TABLE IF NOT EXISTS public.chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    text TEXT NOT NULL,
    timestamp TEXT NOT NULL,
    reactions JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage chat messages in their own workspaces" ON public.chat_messages;
DROP POLICY IF EXISTS "Workspace members can view and manage chat messages" ON public.chat_messages;
DROP POLICY IF EXISTS "chat_messages_all" ON public.chat_messages;

CREATE POLICY "chat_messages_all"
    ON public.chat_messages FOR ALL TO authenticated
    USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = chat_messages.workspace_id AND wm.user_id = auth.uid()))
    WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = chat_messages.workspace_id AND wm.user_id = auth.uid()));

-- 7. Storage Bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('files', 'files', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Authenticated users can manage storage objects" ON storage.objects;
CREATE POLICY "Authenticated users can manage storage objects"
    ON storage.objects FOR ALL TO authenticated
    USING (bucket_id = 'files') WITH CHECK (bucket_id = 'files');

-- 8. Enable Realtime for Chat Messages
ALTER TABLE public.chat_messages REPLICA IDENTITY FULL;

DO $$
BEGIN
    -- Ensure publication exists
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;
    
    -- Ensure table is in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'chat_messages'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_messages;
    END IF;
END $$;

-- 9. Enable Realtime for Files
ALTER TABLE public.files REPLICA IDENTITY FULL;

DO $$
BEGIN
    -- Ensure table is in publication
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' 
        AND schemaname = 'public' 
        AND tablename = 'files'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.files;
    END IF;
END $$;

-- 10. Platform Upgrade and Task Management Additions

-- Alter tasks table to support updated_at
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Drop tasks_all policy and apply role-based policies
DROP POLICY IF EXISTS "tasks_all" ON public.tasks;

CREATE POLICY "tasks_select" ON public.tasks FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = tasks.workspace_id AND wm.user_id = auth.uid()));

CREATE POLICY "tasks_insert" ON public.tasks FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = tasks.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "tasks_delete" ON public.tasks FOR DELETE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = tasks.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "tasks_update_owner" ON public.tasks FOR UPDATE TO authenticated
    USING (EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = tasks.workspace_id AND w.owner_id = auth.uid()));

CREATE POLICY "tasks_update_assignee" ON public.tasks FOR UPDATE TO authenticated
    USING (assignee = auth.uid()::text);

-- Create Task Comments Table
CREATE TABLE IF NOT EXISTS public.task_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select" ON public.task_comments;
CREATE POLICY "comments_select" ON public.task_comments FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.workspace_members wm JOIN public.tasks t ON t.id = task_comments.task_id WHERE wm.workspace_id = t.workspace_id AND wm.user_id = auth.uid()));

DROP POLICY IF EXISTS "comments_insert" ON public.task_comments;
CREATE POLICY "comments_insert" ON public.task_comments FOR INSERT TO authenticated
    WITH CHECK (EXISTS (SELECT 1 FROM public.workspace_members wm JOIN public.tasks t ON t.id = task_comments.task_id WHERE wm.workspace_id = t.workspace_id AND wm.user_id = auth.uid()));

DROP POLICY IF EXISTS "comments_delete" ON public.task_comments;
CREATE POLICY "comments_delete" ON public.task_comments FOR DELETE TO authenticated
    USING (user_id = auth.uid());

-- Create Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    text TEXT NOT NULL,
    read BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications FOR SELECT TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_update" ON public.notifications;
CREATE POLICY "notifications_update" ON public.notifications FOR UPDATE TO authenticated USING (user_id = auth.uid());

DROP POLICY IF EXISTS "notifications_insert" ON public.notifications;
CREATE POLICY "notifications_insert" ON public.notifications FOR INSERT TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "notifications_delete" ON public.notifications;
CREATE POLICY "notifications_delete" ON public.notifications FOR DELETE TO authenticated USING (user_id = auth.uid());

-- Create Activity Feed Table
CREATE TABLE IF NOT EXISTS public.activity_feed (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "activity_select" ON public.activity_feed;
CREATE POLICY "activity_select" ON public.activity_feed FOR SELECT TO authenticated
    USING (EXISTS (SELECT 1 FROM public.workspace_members wm WHERE wm.workspace_id = activity_feed.workspace_id AND wm.user_id = auth.uid()));

DROP POLICY IF EXISTS "activity_insert" ON public.activity_feed;
CREATE POLICY "activity_insert" ON public.activity_feed FOR INSERT TO authenticated WITH CHECK (true);

-- Create User Presence Table
CREATE TABLE IF NOT EXISTS public.user_presence (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    workspace_id UUID REFERENCES public.workspaces(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'offline',
    last_seen TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "presence_select" ON public.user_presence;
CREATE POLICY "presence_select" ON public.user_presence FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "presence_all" ON public.user_presence;
CREATE POLICY "presence_all" ON public.user_presence FOR ALL TO authenticated USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.workspaces w WHERE w.id = workspace_id AND w.owner_id = auth.uid()));

-- Enable Realtime for new tables
ALTER TABLE public.task_comments REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.activity_feed REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'tasks') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.tasks;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'task_comments') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'notifications') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'activity_feed') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_feed;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'user_presence') THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;
    END IF;
END $$;`;

export default function DbSetupModal() {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(SQL_SCHEMA);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleReload = () => {
    window.location.reload();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md">
      <div 
        className="w-full max-w-2xl overflow-hidden rounded-2xl border"
        style={{ 
          background: 'var(--bg-elevated)', 
          borderColor: 'var(--border-color)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
        }}
      >
        {/* Header */}
        <div className="p-8 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Database size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                Database Setup Required
              </h2>
              <p className="text-sm mt-1" style={{ color: 'var(--text-tertiary)' }}>
                Nexus requires database tables in your Supabase project to function.
              </p>
            </div>
          </div>
          
          <div className="p-4 rounded-xl flex gap-3 text-xs leading-relaxed" style={{ background: 'rgba(245, 158, 11, 0.05)', border: '1px solid rgba(245, 158, 11, 0.15)', color: '#d97706' }}>
            <AlertTriangle size={18} className="shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Why am I seeing this?</span> Real database integration requires setting up tables. Client-side code does not have permissions to execute DDL statements (`CREATE TABLE`) directly due to Supabase security restrictions.
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          <div className="space-y-3">
            <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>
              Instructions:
            </p>
            <ol className="list-decimal pl-5 text-sm space-y-2" style={{ color: 'var(--text-secondary)' }}>
              <li>
                Go to your{' '}
                <a 
                  href="https://supabase.com/dashboard" 
                  target="_blank" 
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-semibold hover:underline text-indigo-400"
                >
                  Supabase Dashboard <ExternalLink size={12} />
                </a>
              </li>
              <li>Navigate to the <strong>SQL Editor</strong> tab on the left sidebar.</li>
              <li>Click <strong>New Query</strong>, paste the SQL schema below, and click <strong>Run</strong>.</li>
            </ol>
          </div>

          <div className="relative">
            <div className="absolute top-3 right-3 z-10">
              <Button 
                variant="secondary" 
                size="sm" 
                icon={copied ? Check : Copy} 
                onClick={handleCopy}
                className="!py-1.5 !px-3 text-xs bg-zinc-900 border-zinc-700 text-zinc-300 hover:text-white"
              >
                {copied ? 'Copied!' : 'Copy SQL'}
              </Button>
            </div>
            
            <pre 
              className="text-xs p-4 rounded-xl overflow-x-auto font-mono max-h-56 leading-relaxed select-all"
              style={{ 
                background: 'var(--bg-tertiary)', 
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-color)'
              }}
            >
              {SQL_SCHEMA}
            </pre>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 flex items-center justify-end gap-4 border-t" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-tertiary)' }}>
          <Button 
            variant="secondary" 
            icon={ExternalLink}
            onClick={() => window.open('https://supabase.com/dashboard', '_blank')}
          >
            Open Supabase
          </Button>
          <Button 
            icon={RefreshCw} 
            onClick={handleReload}
          >
            I've run the SQL
          </Button>
        </div>
      </div>
    </div>
  );
}
