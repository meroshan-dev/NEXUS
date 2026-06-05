// Nexus — Realistic Mock Data

export const currentUser = {
  id: 'usr_001',
  name: 'Alex Morgan',
  email: 'alex.morgan@nexus.io',
  avatar: null,
  initials: 'AM',
  role: 'Product Lead',
  bio: 'Passionate about building products that make a difference. Leading product development at Nexus.',
  timezone: 'America/New_York',
  status: 'online',
  joinedAt: '2024-08-15',
};

export const teamMembers = [
  { id: 'usr_001', name: 'Alex Morgan', email: 'alex.morgan@nexus.io', initials: 'AM', role: 'Product Lead', status: 'online', color: '#6366f1' },
  { id: 'usr_002', name: 'Sarah Chen', email: 'sarah.chen@nexus.io', initials: 'SC', role: 'Engineering Lead', status: 'online', color: '#8b5cf6' },
  { id: 'usr_003', name: 'Marcus Johnson', email: 'marcus.j@nexus.io', initials: 'MJ', role: 'Senior Developer', status: 'away', color: '#ec4899' },
  { id: 'usr_004', name: 'Emily Rodriguez', email: 'emily.r@nexus.io', initials: 'ER', role: 'UX Designer', status: 'online', color: '#f59e0b' },
  { id: 'usr_005', name: 'David Kim', email: 'david.kim@nexus.io', initials: 'DK', role: 'Frontend Developer', status: 'offline', color: '#10b981' },
  { id: 'usr_006', name: 'Priya Patel', email: 'priya.p@nexus.io', initials: 'PP', role: 'Backend Developer', status: 'online', color: '#3b82f6' },
  { id: 'usr_007', name: 'James Wilson', email: 'james.w@nexus.io', initials: 'JW', role: 'DevOps Engineer', status: 'away', color: '#ef4444' },
  { id: 'usr_008', name: 'Lisa Thompson', email: 'lisa.t@nexus.io', initials: 'LT', role: 'QA Engineer', status: 'offline', color: '#14b8a6' },
];

export const workspaces = [
  {
    id: 'ws_001',
    name: 'Product Development',
    description: 'Main product development workspace for the Nexus platform',
    color: '#6366f1',
    icon: '🚀',
    members: ['usr_001', 'usr_002', 'usr_003', 'usr_005', 'usr_006'],
    tasksCount: 24,
    filesCount: 18,
    lastActivity: '2 min ago',
    unread: 5,
  },
  {
    id: 'ws_002',
    name: 'Marketing Campaign',
    description: 'Q3 marketing strategy and campaign planning',
    color: '#ec4899',
    icon: '📣',
    members: ['usr_001', 'usr_004', 'usr_008'],
    tasksCount: 12,
    filesCount: 8,
    lastActivity: '15 min ago',
    unread: 2,
  },
  {
    id: 'ws_003',
    name: 'Design System',
    description: 'Component library and design token management',
    color: '#f59e0b',
    icon: '🎨',
    members: ['usr_004', 'usr_005', 'usr_001'],
    tasksCount: 18,
    filesCount: 32,
    lastActivity: '1 hr ago',
    unread: 0,
  },
  {
    id: 'ws_004',
    name: 'Infrastructure',
    description: 'Cloud infrastructure, CI/CD pipelines, and monitoring',
    color: '#10b981',
    icon: '⚙️',
    members: ['usr_002', 'usr_006', 'usr_007'],
    tasksCount: 9,
    filesCount: 5,
    lastActivity: '3 hrs ago',
    unread: 0,
  },
  {
    id: 'ws_005',
    name: 'Q3 Planning',
    description: 'Quarterly OKRs and strategic planning',
    color: '#3b82f6',
    icon: '📋',
    members: ['usr_001', 'usr_002', 'usr_004', 'usr_007'],
    tasksCount: 7,
    filesCount: 12,
    lastActivity: '5 hrs ago',
    unread: 1,
  },
  {
    id: 'ws_006',
    name: 'Customer Success',
    description: 'Customer feedback, support tickets, and onboarding',
    color: '#8b5cf6',
    icon: '💜',
    members: ['usr_001', 'usr_003', 'usr_008'],
    tasksCount: 15,
    filesCount: 6,
    lastActivity: 'Yesterday',
    unread: 0,
  },
];

export const tasks = {
  todo: [],
  inProgress: [],
  done: []
};

export const chatMessages = [
  { id: 'msg_001', userId: 'usr_002', text: 'Hey team! The new auth flow is live in staging. Could someone give it a quick test?', timestamp: '9:15 AM', reactions: [{ emoji: '🎉', users: ['usr_001', 'usr_005'] }, { emoji: '👍', users: ['usr_003'] }] },
  { id: 'msg_002', userId: 'usr_001', text: 'Amazing work Sarah! I just tested it — the Google OAuth flow is super smooth. Love the loading transitions.', timestamp: '9:22 AM', reactions: [{ emoji: '❤️', users: ['usr_002'] }] },
  { id: 'msg_003', userId: 'usr_004', text: 'The login page looks great with the new gradient. One small thing — can we add a subtle shadow to the input fields?', timestamp: '9:28 AM', reactions: [] },
  { id: 'msg_004', userId: 'usr_003', text: 'I\'m working on the notification system. Should be ready for review by EOD. Here\'s a quick preview of the WebSocket architecture:', timestamp: '9:35 AM', reactions: [{ emoji: '🔥', users: ['usr_001', 'usr_006'] }] },
  { id: 'msg_005', userId: 'usr_006', text: 'The database migration is almost done. Multi-tenancy schema is looking clean. Will share the ERD in the files section.', timestamp: '9:42 AM', reactions: [{ emoji: '💪', users: ['usr_002'] }] },
  { id: 'msg_006', userId: 'usr_005', text: 'Dashboard widgets are coming along nicely! Just finished the area chart component. Working on the bar chart next.', timestamp: '9:55 AM', reactions: [{ emoji: '📊', users: ['usr_001'] }] },
  { id: 'msg_007', userId: 'usr_001', text: 'Great progress everyone! Quick reminder — sprint review is tomorrow at 2 PM. Please update your task statuses before then.', timestamp: '10:05 AM', reactions: [{ emoji: '✅', users: ['usr_002', 'usr_003', 'usr_004'] }] },
  { id: 'msg_008', userId: 'usr_007', text: 'Heads up — I\'ll be doing maintenance on the staging server tonight at 11 PM EST. Should be back up within 30 minutes.', timestamp: '10:18 AM', reactions: [{ emoji: '👀', users: ['usr_001'] }] },
  { id: 'msg_009', userId: 'usr_004', text: 'Just pushed the Storybook updates for Button, Input, and Card components. Check them out! 🎨', timestamp: '10:32 AM', reactions: [{ emoji: '🎨', users: ['usr_005'] }] },
  { id: 'msg_010', userId: 'usr_002', text: 'Who\'s up for a quick pairing session on the API rate limiting? Could use another pair of eyes on the middleware logic.', timestamp: '10:45 AM', reactions: [] },
  { id: 'msg_011', userId: 'usr_006', text: 'I can join! Give me 10 minutes to finish this PR review.', timestamp: '10:47 AM', reactions: [{ emoji: '🤝', users: ['usr_002'] }] },
  { id: 'msg_012', userId: 'usr_001', text: 'Has anyone looked into the new Vercel edge runtime for our API routes? Could be a nice perf boost.', timestamp: '11:02 AM', reactions: [{ emoji: '💡', users: ['usr_007', 'usr_003'] }] },
];

export const files = [
  { id: 'file_001', name: 'Q3-Product-Roadmap.pdf', type: 'pdf', size: '2.4 MB', uploadedBy: 'usr_001', uploadedAt: '2 days ago', icon: '📄' },
  { id: 'file_002', name: 'Brand-Guidelines-v3.pdf', type: 'pdf', size: '8.1 MB', uploadedBy: 'usr_004', uploadedAt: '3 days ago', icon: '📄' },
  { id: 'file_003', name: 'database-schema.png', type: 'image', size: '1.2 MB', uploadedBy: 'usr_006', uploadedAt: '1 day ago', icon: '🖼️' },
  { id: 'file_004', name: 'Sprint-Metrics.xlsx', type: 'spreadsheet', size: '456 KB', uploadedBy: 'usr_002', uploadedAt: '5 hrs ago', icon: '📊' },
  { id: 'file_005', name: 'API-Documentation.md', type: 'document', size: '128 KB', uploadedBy: 'usr_003', uploadedAt: '1 day ago', icon: '📝' },
  { id: 'file_006', name: 'onboarding-flow-v2.fig', type: 'design', size: '15.3 MB', uploadedBy: 'usr_004', uploadedAt: '4 days ago', icon: '🎨' },
  { id: 'file_007', name: 'deployment-guide.md', type: 'document', size: '64 KB', uploadedBy: 'usr_007', uploadedAt: '1 week ago', icon: '📝' },
  { id: 'file_008', name: 'user-research-report.pdf', type: 'pdf', size: '4.7 MB', uploadedBy: 'usr_008', uploadedAt: '2 weeks ago', icon: '📄' },
  { id: 'file_009', name: 'component-library.zip', type: 'archive', size: '22.1 MB', uploadedBy: 'usr_005', uploadedAt: '3 days ago', icon: '📦' },
  { id: 'file_010', name: 'meeting-notes-june.docx', type: 'document', size: '89 KB', uploadedBy: 'usr_001', uploadedAt: '6 hrs ago', icon: '📝' },
  { id: 'file_011', name: 'logo-variants.svg', type: 'image', size: '340 KB', uploadedBy: 'usr_004', uploadedAt: '1 week ago', icon: '🖼️' },
  { id: 'file_012', name: 'performance-benchmark.json', type: 'data', size: '18 KB', uploadedBy: 'usr_007', uploadedAt: '2 days ago', icon: '📊' },
];

export const recentActivity = [
  { id: 'act_001', userId: 'usr_002', action: 'completed task', target: 'User authentication flow', workspace: 'Product Development', time: '2 min ago', icon: '✅' },
  { id: 'act_002', userId: 'usr_004', action: 'uploaded file', target: 'onboarding-flow-v2.fig', workspace: 'Design System', time: '15 min ago', icon: '📎' },
  { id: 'act_003', userId: 'usr_006', action: 'created task', target: 'Database migration script', workspace: 'Product Development', time: '1 hr ago', icon: '📋' },
  { id: 'act_004', userId: 'usr_001', action: 'commented on', target: 'Q3 Planning doc', workspace: 'Q3 Planning', time: '2 hrs ago', icon: '💬' },
  { id: 'act_005', userId: 'usr_003', action: 'moved task to In Progress', target: 'Real-time notifications', workspace: 'Product Development', time: '3 hrs ago', icon: '🔄' },
  { id: 'act_006', userId: 'usr_007', action: 'deployed update', target: 'CI/CD Pipeline v2.1', workspace: 'Infrastructure', time: '4 hrs ago', icon: '🚀' },
  { id: 'act_007', userId: 'usr_005', action: 'pushed code', target: 'Dashboard widgets PR #142', workspace: 'Product Development', time: '5 hrs ago', icon: '💻' },
  { id: 'act_008', userId: 'usr_008', action: 'completed review', target: 'Search functionality', workspace: 'Product Development', time: '6 hrs ago', icon: '🔍' },
];

export const quickStats = {
  tasksDueToday: 3,
  unreadMessages: 12,
  filesShared: 4,
  activeMembers: 5,
};

export const getMemberById = (id) => teamMembers.find((m) => m.id === id);

export const getWorkspaceMemberObjects = (workspace) =>
  workspace.members.map((id) => getMemberById(id)).filter(Boolean);
