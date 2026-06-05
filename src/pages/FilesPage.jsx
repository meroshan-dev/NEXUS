import { useState, useRef, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Search, Download, Grid, List, File,
  FileText, Image, Table, Archive, Palette,
  CloudUpload, Trash2, Eye, X, FolderOpen,
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import { useWorkspace } from '../context/WorkspaceContext';

const typeConfig = {
  pdf: { icon: FileText, color: '#ef4444', bg: 'rgba(239,68,68,0.1)', label: 'PDF' },
  document: { icon: FileText, color: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Doc' },
  image: { icon: Image, color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)', label: 'Image' },
  spreadsheet: { icon: Table, color: '#22c55e', bg: 'rgba(34,197,94,0.1)', label: 'Sheet' },
  archive: { icon: Archive, color: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Archive' },
  design: { icon: Palette, color: '#ec4899', bg: 'rgba(236,72,153,0.1)', label: 'Design' },
  data: { icon: File, color: '#06b6d4', bg: 'rgba(6,182,212,0.1)', label: 'Data' },
};

export default function FilesPage() {
  const { id } = useParams();
  const workspaceId = id;
  const { files: allFiles, uploadFile, downloadFile, fetchWorkspaceDetails, workspaceMembers, deleteFile } =
    useWorkspace();
  const [query, setQuery] = useState('');
  const [view, setView] = useState('list');
  const [drag, setDrag] = useState(false);
  const [selected, setSelected] = useState([]);
  const inputRef = useRef(null);

  const handleBulkDelete = () => {
    selected.forEach(fileId => {
      deleteFile(workspaceId, fileId);
    });
    setSelected([]);
  };

  useEffect(() => {
    if (workspaceId) fetchWorkspaceDetails(workspaceId);
  }, [workspaceId]);

  const files = allFiles[workspaceId] || [];
  const members = workspaceMembers[workspaceId] || [];
  const filtered = files.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));

  const onDrag = (e) => {
    e.preventDefault();
    if (e.type === 'dragenter' || e.type === 'dragover') setDrag(true);
    else setDrag(false);
  };
  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    droppedFiles.forEach((f) => {
      uploadFile(
        workspaceId,
        {
          name: f.name,
          type: f.type.startsWith('image/') ? 'image' : f.name.endsWith('.pdf') ? 'pdf' : 'document',
          size: `${(f.size / 1024).toFixed(0)} KB`,
          icon: f.type.startsWith('image/') ? '🖼️' : '📄',
        },
        f
      );
    });
  };
  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach((f) => {
      uploadFile(
        workspaceId,
        {
          name: f.name,
          type: f.type.startsWith('image/') ? 'image' : f.name.endsWith('.pdf') ? 'pdf' : 'document',
          size: `${(f.size / 1024).toFixed(0)} KB`,
          icon: f.type.startsWith('image/') ? '🖼️' : '📄',
        },
        f
      );
    });
  };
  const toggle = (fileId) =>
    setSelected((p) => (p.includes(fileId) ? p.filter((x) => x !== fileId) : [...p, fileId]));

  return (
    <div className="page-stack pb-8 min-w-0">
      <header className="page-header flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="page-eyebrow">Files</p>
          <h1 className="text-h1" style={{ color: 'var(--text-primary)' }}>
            File manager
          </h1>
          <p className="text-body-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
            {files.length} file{files.length !== 1 ? 's' : ''} in this workspace
          </p>
        </div>
        <Button icon={Upload} onClick={() => inputRef.current?.click()}>
          Upload
        </Button>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
      </header>

      <motion.div
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="rounded-[var(--radius-lg)] p-10 sm:p-12 text-center transition-colors duration-200 cursor-pointer"
        style={{
          border: `1px dashed ${drag ? 'var(--border-focus)' : 'var(--border-color)'}`,
          background: drag ? 'var(--bg-active)' : 'var(--bg-subtle)',
        }}
      >
        <div
          className="w-14 h-14 rounded-[var(--radius-md)] flex items-center justify-center mx-auto mb-5"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-color)',
            color: drag ? 'var(--text-brand)' : 'var(--text-tertiary)',
            boxShadow: 'var(--shadow-xs)',
          }}
        >
          <CloudUpload size={26} strokeWidth={1.5} />
        </div>
        <p className="text-body font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
          {drag ? 'Drop to upload' : 'Drag and drop files here'}
        </p>
        <p className="text-caption">
          or <span style={{ color: 'var(--text-brand)' }}>browse</span> from your device
        </p>
      </motion.div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 min-w-0 max-w-md">
          <Search
            size={15}
            strokeWidth={1.75}
            className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            placeholder="Search files…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-base pl-10 pr-10"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer"
              style={{ color: 'var(--text-tertiary)' }}
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div
          className="flex items-center rounded-[var(--radius-md)] p-1 gap-0.5 shrink-0"
          style={{ background: 'var(--bg-tertiary)' }}
        >
          {[['list', List], ['grid', Grid]].map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center transition-all cursor-pointer"
              style={{
                background: view === v ? 'var(--bg-elevated)' : 'transparent',
                color: view === v ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: view === v ? 'var(--shadow-xs)' : 'none',
              }}
            >
              <Icon size={15} strokeWidth={1.75} />
            </button>
          ))}
        </div>

        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2"
          >
            <Badge variant="brand">{selected.length} selected</Badge>
            <Button variant="ghost" size="sm" icon={Download} onClick={() => selected.forEach(id => downloadFile(files.find(f => f.id === id)))}>
              Download
            </Button>
            <Button variant="ghost" size="sm" icon={Trash2} className="!text-danger" onClick={handleBulkDelete}>
              Delete
            </Button>
          </motion.div>
        )}
      </div>

      {files.length === 0 && !query ? (
        <EmptyState
          icon={FolderOpen}
          title="No files uploaded"
          description="Upload documents, images, and assets for your team. Drag and drop above or use the upload button."
          actionLabel="Upload file"
          actionIcon={Upload}
          onAction={() => inputRef.current?.click()}
        />
      ) : (
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No matches"
              description="Try a different search term or clear the filter."
              compact
            />
          ) : view === 'list' ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card padding={false} className="overflow-hidden min-w-0">
                <div className="flex flex-col">
                  {filtered.map((file, i) => {
                    const cfg = typeConfig[file.type] || typeConfig.document;
                    const Icon = cfg.icon;
                    const uploader = members.find((m) => m.id === file.uploadedBy) || {
                      name: 'Unknown User',
                      initials: 'U',
                      color: '#71717a',
                    };
                    const isSelected = selected.includes(file.id);

                    return (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-5 sm:px-6 transition-colors group min-w-0"
                        style={{
                          borderBottom: i < filtered.length - 1 ? '1px solid var(--border-light)' : 'none',
                          background: isSelected ? 'var(--bg-active)' : 'transparent',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'var(--bg-hover)';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.background = 'transparent';
                        }}
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggle(file.id)}
                            className="w-4 h-4 rounded shrink-0"
                          />
                          <div
                            className="w-10 h-10 rounded-[var(--radius-md)] flex items-center justify-center shrink-0"
                            style={{ background: cfg.bg }}
                          >
                            <Icon size={18} strokeWidth={1.75} style={{ color: cfg.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium overflow-safe" style={{ color: 'var(--text-primary)' }}>
                              {file.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-2 sm:hidden">
                              <Badge>{cfg.label}</Badge>
                              <span className="text-caption">{file.size}</span>
                            </div>
                          </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-6 shrink-0 pl-7 sm:pl-0">
                          <Badge>{cfg.label}</Badge>
                          <span className="text-sm w-16 text-right" style={{ color: 'var(--text-tertiary)' }}>
                            {file.size}
                          </span>
                          <div className="hidden md:flex items-center gap-2 w-28 min-w-0">
                            <Avatar name={uploader?.name} initials={uploader?.initials} color={uploader?.color} size="xs" />
                            <span className="text-sm text-ellipsis" style={{ color: 'var(--text-secondary)' }}>
                              {uploader?.name?.split(' ')[0]}
                            </span>
                          </div>
                          <span className="hidden lg:block text-xs w-20 text-right" style={{ color: 'var(--text-tertiary)' }}>
                            {file.uploadedAt}
                          </span>
                          <button
                            onClick={() => downloadFile(file)}
                            className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center cursor-pointer shrink-0"
                            style={{ color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)' }}
                          >
                            <Download size={15} strokeWidth={1.75} />
                          </button>
                          <button
                            onClick={() => deleteFile(workspaceId, file.id)}
                            className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center cursor-pointer shrink-0"
                            style={{ color: 'var(--color-danger)', background: 'var(--bg-tertiary)' }}
                            title="Delete file"
                          >
                            <Trash2 size={15} strokeWidth={1.75} />
                          </button>
                        </div>

                        <div className="flex gap-2 sm:hidden self-end">
                          <button
                            onClick={() => downloadFile(file)}
                            className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center cursor-pointer"
                            style={{ color: 'var(--text-tertiary)', background: 'var(--bg-tertiary)' }}
                          >
                            <Download size={15} strokeWidth={1.75} />
                          </button>
                          <button
                            onClick={() => deleteFile(workspaceId, file.id)}
                            className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center cursor-pointer"
                            style={{ color: 'var(--color-danger)', background: 'var(--bg-tertiary)' }}
                          >
                            <Trash2 size={15} strokeWidth={1.75} />
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </Card>
            </motion.div>
          ) : (
            <motion.div
              key="grid"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {filtered.map((file, i) => {
                const cfg = typeConfig[file.type] || typeConfig.document;
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card hover className="group text-center !p-6">
                      <div
                        className="w-14 h-14 rounded-[var(--radius-md)] flex items-center justify-center mx-auto mb-4"
                        style={{ background: cfg.bg }}
                      >
                        <Icon size={26} strokeWidth={1.5} style={{ color: cfg.color }} />
                      </div>
                      <p className="text-sm font-medium overflow-safe mb-1 px-1" style={{ color: 'var(--text-primary)' }}>
                        {file.name}
                      </p>
                      <p className="text-caption">{file.size}</p>
                      <div
                        className="mt-5 pt-4 flex items-center justify-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity"
                        style={{ borderTop: '1px solid var(--border-light)' }}
                      >
                        {[Eye, Download, Trash2].map((Ico, j) => (
                          <button
                            key={j}
                            onClick={() => {
                              if (Ico === Download) downloadFile(file);
                              else if (Ico === Trash2) deleteFile(workspaceId, file.id);
                            }}
                            className="w-9 h-9 rounded-[var(--radius-sm)] flex items-center justify-center transition-colors cursor-pointer"
                            style={{
                              color: j === 2 ? 'var(--color-danger)' : 'var(--text-tertiary)',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-hover)')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                            title={Ico === Download ? 'Download' : Ico === Trash2 ? 'Delete' : 'View'}
                          >
                            <Ico size={14} strokeWidth={1.75} />
                          </button>
                        ))}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}
