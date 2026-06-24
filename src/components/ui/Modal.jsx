import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';

export default function Modal({ isOpen, onClose, title, children, size = 'md', noPadding = false }) {
  const maxWidths = { sm: '400px', md: '480px', lg: '640px', xl: '900px' };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop overlay */}
          <motion.div
            key="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
              zIndex: 999,
            }}
          />

          {/* Centering wrapper */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
              pointerEvents: 'none',
            }}
          >
            {/* Animated outer shell — only handles size, shape, animation */}
            <motion.div
              key="modal-panel"
              initial={{ opacity: 0, scale: 0.97, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97, y: 10 }}
              transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
              className="nexus-modal-panel"
              style={{
                pointerEvents: 'auto',
                width: '90%',
                maxWidth: maxWidths[size] || '480px',
                maxHeight: '90vh',
                overflowY: 'auto',
              }}
            >
              {/* Inner content wrapper — handles ALL padding */}
              <div
                style={{
                  padding: noPadding ? '0' : '24px',
                  width: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {/* Title row with close button */}
                {title && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '20px',
                      width: '100%',
                      boxSizing: 'border-box',
                    }}
                  >
                    <h2
                      style={{
                        fontSize: '18px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        margin: 0,
                        padding: 0,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {title}
                    </h2>
                    <button
                      onClick={onClose}
                      type="button"
                      style={{
                        width: '28px',
                        height: '28px',
                        borderRadius: '8px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-tertiary)',
                        cursor: 'pointer',
                        flexShrink: 0,
                        marginLeft: '12px',
                        padding: 0,
                      }}
                    >
                      <X size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                )}

                {/* Modal body */}
                <div
                  className="nexus-modal-body"
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                  }}
                >
                  {children}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
