import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = false, padding = true, onClick, ...props }) {
  const Tag = hover || onClick ? motion.div : 'div';
  const motionProps =
    hover || onClick
      ? {
          whileHover: { y: -2 },
          transition: { duration: 0.25, ease: 'easeOut' },
        }
      : {};

  return (
    <Tag
      className={`glass-card ${padding ? 'p-4 sm:p-5' : ''} ${hover || onClick ? 'glass-card-hover cursor-pointer' : ''} ${className}`}
      style={{ boxSizing: 'border-box', minWidth: 0 }}
      onClick={onClick}
      {...motionProps}
      {...props}
    >
      {children}
    </Tag>
  );
}
