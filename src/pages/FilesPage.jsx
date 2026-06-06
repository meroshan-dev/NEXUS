import { useState, useRef, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Upload, Search, Download, Grid, List, File,
  FileText, Image, Table, Archive, Palette,
  CloudUpload, Trash2, Eye, X, FolderOpen, Loader2, Check
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Avatar from '../components/ui/Avatar';
import Badge from '../components/ui/Badge';
import EmptyState from '../components/ui/EmptyState';
import LoadingState from '../components/ui/LoadingState';
import Modal from '../components/ui/Modal';
import { useWorkspace } from '../context/WorkspaceContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const typeConfig = {
  pdf: { icon: FileText, color: '#ef4444', bg: 'rgba(239,68,68,0.06)', label: 'PDF' },
  document: { icon: FileText, color: '#3b82f6', bg: 'rgba(59,130,246,0.06)', label: 'Doc' },
  image: { icon: Image, color: '#8b5cf6', bg: 'rgba(139,92,246,0.06)', label: 'Image' },
  spreadsheet: { icon: Table, color: '#22c55e', bg: 'rgba(34,197,94,0.06)', label: 'Sheet' },
  archive: { icon: Archive, color: '#f59e0b', bg: 'rgba(245,158,11,0.06)', label: 'Archive' },
  design: { icon: Palette, color: '#ec4899', bg: 'rgba(236,72,153,0.06)', label: 'Design' },
  data: { icon: File, color: '#06b6d4', bg: 'rgba(6,182,212,0.06)', label: 'Data' },
};

export default function FilesPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const workspaceId = id;
  const { 
    files: allFiles, 
    uploadFile, 
    downloadFile, 
    fetchWorkspaceDetails, 
    workspaceMembers, 
    deleteFile,
    workspaces,
    loading
  } = useWorkspace();
  const [query, setQuery] = useState('');
  const [view, setView] = useState('list');
  const [drag, setDrag] = useState(false);
  const [selected, setSelected] = useState([]);
  const inputRef = useRef(null);

  const [uploads, setUploads] = useState({});

  const [previewFile, setPreviewFile] = useState(null);
  const [previewContent, setPreviewContent] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const objectUrlRef = useRef(null);

  const handleOpenPreview = (file) => {
    setPreviewContent(null);
    setPreviewLoading(true);
    setPreviewFile(file);
  };

  const handleClosePreview = () => {
    setPreviewFile(null);
    setPreviewContent(null);
  };

  const handleBulkDelete = () => {
    selected.forEach(fileId => {
      deleteFile(workspaceId, fileId);
    });
    setSelected([]);
  };

  useEffect(() => {
    if (workspaceId) fetchWorkspaceDetails(workspaceId);
  }, [workspaceId, fetchWorkspaceDetails]);

  useEffect(() => {
    if (!previewFile) {
      return;
    }

    let active = true;
    const loadPreview = async () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }

      try {
        if (isSupabaseConfigured && previewFile.storagePath) {
          const { data, error } = await supabase.storage
            .from('files')
            .download(previewFile.storagePath);
          
          if (error) throw error;
          if (!active) return;

          if (previewFile.type === 'image') {
            const url = URL.createObjectURL(data);
            objectUrlRef.current = url;
            setPreviewContent({ url });
          } else if (previewFile.type === 'pdf') {
            const url = URL.createObjectURL(data);
            objectUrlRef.current = url;
            setPreviewContent({ url });
          } else {
            const text = await data.text();
            setPreviewContent({ text });
          }
        } else {
          // Local storage mock previews
          if (previewFile.type === 'image') {
            setPreviewContent({ url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=800&auto=format&fit=crop&q=80' });
          } else if (previewFile.type === 'pdf') {
            setPreviewContent({ url: 'https://pdfobject.com/pdf/sample.pdf' });
          } else {
            setPreviewContent({ text: `Mock preview content for file: ${previewFile.name}\nSize: ${previewFile.size}\nUploaded: ${previewFile.uploadedAt}` });
          }
        }
      } catch (err) {
        console.error('Failed to load preview:', err);
        if (active) {
          setPreviewContent({ error: 'Failed to load preview. Please download the file to view it.' });
        }
      } finally {
        if (active) setPreviewLoading(false);
      }
    };

    loadPreview();

    return () => {
      active = false;
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, [previewFile]);

  const workspace = workspaces.find((w) => w.id === workspaceId);

  if (loading) return <LoadingState label="Loading files…" />;

  if (!workspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <EmptyState
          icon={FolderOpen}
          title="Workspace not found"
          description="The workspace you are trying to access does not exist or you don't have access to it."
          actionLabel="Go to Dashboard"
          onAction={() => navigate('/dashboard')}
        />
      </div>
    );
  }

  const files = allFiles[workspaceId] || [];
  const members = workspaceMembers[workspaceId] || [];
  const filtered = files.filter((f) => f.name.toLowerCase().includes(query.toLowerCase()));

  const handleUpload = (f) => {
    if (!f) return;
    const uploadId = `${f.name}-${Date.now()}`;
    setUploads(prev => ({
      ...prev,
      [uploadId]: { name: f.name, progress: 0, status: 'uploading' }
    }));

    uploadFile(
      workspaceId,
      {
        name: f.name,
        type: f.type.startsWith('image/') ? 'image' : f.name.endsWith('.pdf') ? 'pdf' : 'document',
        size: `${(f.size / 1024).toFixed(0)} KB`,
        icon: f.type.startsWith('image/') ? '🖼️' : '📄',
      },
      f,
      (progress) => {
        setUploads(prev => {
          if (!prev[uploadId]) return prev;
          return {
            ...prev,
            [uploadId]: { ...prev[uploadId], progress }
          };
        });
      }
    ).then(() => {
      setUploads(prev => {
        if (!prev[uploadId]) return prev;
        return {
          ...prev,
          [uploadId]: { ...prev[uploadId], progress: 100, status: 'completed' }
        };
      });
      setTimeout(() => {
        setUploads(prev => {
          const next = { ...prev };
          delete next[uploadId];
          return next;
        });
      }, 3000);
    }).catch((err) => {
      setUploads(prev => {
        if (!prev[uploadId]) return prev;
        return {
          ...prev,
          [uploadId]: { ...prev[uploadId], status: 'failed', error: err.message || 'Upload failed' }
        };
      });
      setTimeout(() => {
        setUploads(prev => {
          const next = { ...prev };
          delete next[uploadId];
          return next;
        });
      }, 5000);
    });
  };

  const onDrag = (e) => {
    e.preventDefault();
    if (e.type === 'dragenter' || e.type === 'dragover') setDrag(true);
    else setDrag(false);
  };

  const onDrop = (e) => {
    e.preventDefault();
    setDrag(false);
    const droppedFiles = Array.from(e.dataTransfer?.files || []);
    droppedFiles.forEach(handleUpload);
  };

  const handleFileChange = (e) => {
    const selectedFiles = Array.from(e.target.files || []);
    selectedFiles.forEach(handleUpload);
  };

  const toggle = (fileId) =>
    setSelected((p) => (p.includes(fileId) ? p.filter((x) => x !== fileId) : [...p, fileId]));

  return (
    <div className="page-stack pb-8 min-w-0">
      <header className="page-header flex flex-col sm:flex-row sm:items-end justify-between gap-5">
        <div className="min-w-0">
          <p className="page-eyebrow">Files</p>
          <h1 className="text-xl font-bold tracking-tight text-[var(--text-primary)]">
            File manager
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1">
            {files.length} file{files.length !== 1 ? 's' : ''} in workspace · drag to upload
          </p>
        </div>
        <Button icon={Upload} size="sm" onClick={() => inputRef.current?.click()}>
          Upload File
        </Button>
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleFileChange} />
      </header>

      {/* Dropbox */}
      <motion.div
        onDragEnter={onDrag}
        onDragLeave={onDrag}
        onDragOver={onDrag}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="rounded-[var(--radius-lg)] p-8 text-center transition-all duration-200 cursor-pointer border border-dashed border-[var(--border-color)] hover:border-[var(--border-focus)] hover:bg-[var(--bg-hover)] bg-[var(--bg-secondary)]"
        whileHover={{ scale: 0.995 }}
      >
        <div
          className="w-11 h-11 rounded-lg flex items-center justify-center mx-auto mb-4 border bg-[var(--bg-primary)] border-[var(--border-color)] text-[var(--text-secondary)]"
        >
          <CloudUpload size={20} />
        </div>
        <p className="text-xs font-semibold mb-0.5 text-[var(--text-primary)]">
          {drag ? 'Drop to upload file' : 'Drag and drop files here'}
        </p>
        <p className="text-[11px] text-[var(--text-tertiary)]">
          or click to select files from your computer
        </p>
      </motion.div>

      {/* Filters row */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <div className="relative flex-1 min-w-0 max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <input
            type="text"
            placeholder="Search files…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input-base pl-9 pr-8"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer text-[var(--text-tertiary)]"
            >
              <X size={13} />
            </button>
          )}
        </div>

        <div
          className="flex items-center rounded-md p-0.5 gap-0.5 shrink-0 bg-[var(--bg-secondary)] border border-[var(--border-color)]"
        >
          {[['list', List], ['grid', Grid]].map(([v, Icon]) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className="w-7.5 h-7.5 rounded-md flex items-center justify-center transition-all cursor-pointer"
              style={{
                background: view === v ? 'var(--bg-primary)' : 'transparent',
                color: view === v ? 'var(--text-primary)' : 'var(--text-tertiary)',
                boxShadow: view === v ? 'var(--shadow-xs)' : 'none',
              }}
            >
              <Icon size={13} />
            </button>
          ))}
        </div>

        {selected.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2.5"
          >
            <Badge variant="brand">{selected.length} selected</Badge>
            <Button variant="secondary" size="xs" icon={Download} onClick={() => selected.forEach(id => downloadFile(files.find(f => f.id === id)))}>
              Download
            </Button>
            <Button variant="ghost" size="xs" icon={Trash2} className="!text-[var(--color-danger)] font-semibold" onClick={handleBulkDelete}>
              Delete
            </Button>
          </motion.div>
        )}
      </div>

      {files.length === 0 && !query ? (
        <EmptyState
          icon={FolderOpen}
          title="No files yet"
          description="Upload assets or project timelines."
          actionLabel="Select file"
          actionIcon={Upload}
          onAction={() => inputRef.current?.click()}
        />
      ) : (
        <AnimatePresence mode="wait">
          {filtered.length === 0 ? (
            <EmptyState
              icon={Search}
              title="No files match your query"
              description="Try a different query keyword."
              compact
            />
          ) : view === 'list' ? (
            <motion.div key="list" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Card padding={false} className="overflow-hidden min-w-0 bg-[var(--bg-primary)] border-[var(--border-color)] shadow-sm">
                <div className="flex flex-col">
                  {filtered.map((file, i) => {
                    const cfg = typeConfig[file.type] || typeConfig.document;
                    const Icon = cfg.icon;
                    const uploader = members.find((m) => m.id === file.uploadedBy) || {
                      name: 'Member',
                      initials: 'M',
                      color: '#71717a',
                    };
                    const isSelected = selected.includes(file.id);

                    return (
                      <motion.div
                        key={file.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.02 }}
                        className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 transition-colors group min-w-0"
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
                            className="w-3.5 h-3.5 rounded border-[var(--border-color)] shrink-0 cursor-pointer"
                          />
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                            style={{ background: cfg.bg, borderColor: cfg.color + '18' }}
                          >
                            <Icon size={14} style={{ color: cfg.color }} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-[var(--text-primary)] truncate">
                              {file.name}
                            </p>
                            <div className="flex flex-wrap items-center gap-2 mt-1 sm:hidden">
                              <Badge>{cfg.label}</Badge>
                              <span className="text-[10px] text-[var(--text-tertiary)]">{file.size}</span>
                            </div>
                          </div>
                        </div>

                        <div className="hidden sm:flex items-center gap-5 shrink-0">
                          <Badge>{cfg.label}</Badge>
                          <span className="text-xs w-16 text-right text-[var(--text-tertiary)]">
                            {file.size}
                          </span>
                          <div className="hidden md:flex items-center gap-2 w-28 min-w-0">
                            <Avatar name={uploader?.name} initials={uploader?.initials} color={uploader?.color} size="xs" />
                            <span className="text-xs text-[var(--text-secondary)] font-medium truncate">
                              {uploader?.name?.split(' ')[0]}
                            </span>
                          </div>
                          <span className="hidden lg:block text-[10px] w-20 text-right text-[var(--text-tertiary)]">
                            {file.uploadedAt}
                          </span>
                          <div className="flex items-center gap-1.5 pl-3 border-l border-[var(--border-light)]">
                            <button
                              onClick={() => handleOpenPreview(file)}
                              className="w-7 h-7 rounded-md flex items-center justify-center border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                              title="Preview"
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              onClick={() => downloadFile(file)}
                              className="w-7 h-7 rounded-md flex items-center justify-center border border-[var(--border-color)] hover:bg-[var(--bg-hover)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all cursor-pointer"
                              title="Download"
                            >
                              <Download size={12} />
                            </button>
                            <button
                              onClick={() => deleteFile(workspaceId, file.id)}
                              className="w-7 h-7 rounded-md flex items-center justify-center border border-red-500/15 bg-red-500/5 hover:bg-red-500/10 text-red-500 transition-all cursor-pointer"
                              title="Delete"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        <div className="flex gap-2 sm:hidden self-end mt-1">
                          <button
                            onClick={() => handleOpenPreview(file)}
                            className="w-7.5 h-7.5 rounded-md flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                          >
                            <Eye size={12} />
                          </button>
                          <button
                            onClick={() => downloadFile(file)}
                            className="w-7.5 h-7.5 rounded-md flex items-center justify-center border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] cursor-pointer"
                          >
                            <Download size={12} />
                          </button>
                          <button
                            onClick={() => deleteFile(workspaceId, file.id)}
                            className="w-7.5 h-7.5 rounded-md flex items-center justify-center border border-red-500/15 bg-red-500/5 text-red-500 cursor-pointer"
                          >
                            <Trash2 size={12} />
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
                    initial={{ opacity: 0, scale: 0.99 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <Card hover className="group relative flex flex-col justify-between text-center !p-5 border border-[var(--border-color)] hover:border-[var(--accent)] bg-[var(--bg-primary)] shadow-sm">
                      <div>
                        <div
                          className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3 border"
                          style={{ background: cfg.bg, borderColor: cfg.color + '15' }}
                        >
                          <Icon size={20} style={{ color: cfg.color }} />
                        </div>
                        <p className="text-xs font-semibold text-[var(--text-primary)] truncate px-1 group-hover:text-[var(--accent)] transition-colors">
                          {file.name}
                        </p>
                        <p className="text-[10px] text-[var(--text-tertiary)] mt-0.5">{file.size}</p>
                      </div>
                      <div
                        className="mt-4 pt-3 flex items-center justify-center gap-1.5 border-t border-[var(--border-light)]"
                      >
                        {[
                          { icon: Eye, title: 'Preview' },
                          { icon: Download, title: 'Download' },
                          { icon: Trash2, title: 'Delete', danger: true }
                        ].map((btn, j) => {
                          const Ico = btn.icon;
                          return (
                            <button
                              key={j}
                              onClick={(e) => {
                                e.stopPropagation();
                                if (Ico === Eye) handleOpenPreview(file);
                                else if (Ico === Download) downloadFile(file);
                                else if (Ico === Trash2) deleteFile(workspaceId, file.id);
                              }}
                              className={`w-7 h-7 rounded-md flex items-center justify-center transition-all cursor-pointer border ${
                                btn.danger
                                  ? 'border-red-500/15 bg-red-500/5 text-red-500 hover:bg-red-500/10'
                                  : 'border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]'
                              }`}
                              title={btn.title}
                            >
                              <Ico size={11} />
                            </button>
                          );
                        })}
                      </div>
                    </Card>
                  </motion.div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* File Preview Modal */}
      <Modal isOpen={!!previewFile} onClose={handleClosePreview} title={previewFile?.name || 'File Preview'} size="xl">
        <div className="flex flex-col items-center justify-center min-h-[300px] max-h-[70vh] overflow-auto p-2">
          {previewLoading ? (
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-[var(--accent)]" size={24} />
              <span className="text-xs text-[var(--text-secondary)] font-medium">Loading preview…</span>
            </div>
          ) : previewContent?.error ? (
            <div className="text-center space-y-4">
              <p className="text-xs font-semibold text-[var(--color-danger)]">{previewContent.error}</p>
              <Button onClick={() => downloadFile(previewFile)} icon={Download} size="sm">
                Download File
              </Button>
            </div>
          ) : previewFile?.type === 'image' && previewContent?.url ? (
            <div className="relative w-full flex justify-center">
              <img
                src={previewContent.url}
                alt={previewFile.name}
                className="max-h-[60vh] object-contain rounded-md border border-[var(--border-color)]"
              />
            </div>
          ) : previewFile?.type === 'pdf' && previewContent?.url ? (
            <iframe
              src={previewContent.url}
              title={previewFile.name}
              className="w-full h-[60vh] border-0 rounded-md border border-[var(--border-color)] bg-[var(--bg-secondary)]"
            />
          ) : previewContent?.text !== undefined ? (
            <pre
              className="w-full h-[60vh] p-4 font-mono text-[10px] overflow-auto rounded-md text-left"
              style={{
                background: 'var(--bg-secondary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all',
              }}
            >
              {previewContent.text}
            </pre>
          ) : (
            <div className="text-center space-y-4">
              <p className="text-xs text-[var(--text-secondary)] font-medium">
                No preview available for this file type.
              </p>
              <Button onClick={() => downloadFile(previewFile)} icon={Download} size="sm">
                Download File
              </Button>
            </div>
          )}
        </div>
      </Modal>

      {/* Upload Progress Toaster */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2.5 max-w-sm w-full px-4 sm:px-0">
        <AnimatePresence>
          {Object.entries(uploads).map(([id, upload]) => (
            <motion.div
              key={id}
              initial={{ opacity: 0, y: 30, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="surface-panel p-3.5 flex flex-col gap-2 shadow-lg border border-[var(--border-color)] rounded-lg bg-[var(--bg-primary)]"
              style={{ minWidth: '260px' }}
            >
              <div className="flex items-center justify-between gap-3 min-w-0">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  {upload.status === 'completed' ? (
                    <Check className="text-[var(--color-success)] shrink-0" size={14} />
                  ) : upload.status === 'failed' ? (
                    <X className="text-[var(--color-danger)] shrink-0" size={14} />
                  ) : (
                    <Loader2 className="animate-spin text-[var(--accent)] shrink-0" size={14} />
                  )}
                  <span className="text-xs font-semibold truncate text-[var(--text-primary)]">
                    {upload.name}
                  </span>
                </div>
                <span className="text-[10px] font-bold text-[var(--text-secondary)] shrink-0">
                  {upload.status === 'completed' ? 'Done' : upload.status === 'failed' ? 'Failed' : `${upload.progress}%`}
                </span>
              </div>
              {upload.status === 'uploading' && (
                <div className="w-full bg-[var(--bg-secondary)] rounded-full h-1 overflow-hidden">
                  <div
                    className="h-full transition-all duration-150"
                    style={{ width: `${upload.progress}%`, background: 'var(--accent)' }}
                  />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
