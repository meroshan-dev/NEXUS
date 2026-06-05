import { motion } from 'framer-motion';

export default function Card({ children, className = '', hover = false, padding = true, onClick, ...props }) {
  const Tag = hover || onClick ? motion.div : 'div';
  const motionProps =
    hover || onClick
      ? {
          whileHover: { y: -1 },
          transition: { duration: 0.2, ease: 'easeOut' },
        }
      : {};

  return (
    <Tag
      className={`card min-w-0 ${padding ? 'p-5 sm:p-6' : ''} ${hover || onClick ? 'card-hover cursor-pointer' : ''} ${className}`}
      onClick={onClick}
      {...motionProps}
      {...props}
    >
      {children}
    </Tag>
  );
}
