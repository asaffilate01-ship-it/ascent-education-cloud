import { LucideIcon, Inbox, FileSearch, Users, CreditCard, BookOpen, BarChart3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  variant?: 'default' | 'compact' | 'card';
  preset?: 'data' | 'search' | 'students' | 'finance' | 'courses' | 'analytics';
}

const PRESET_CONFIG: Record<string, { icon: LucideIcon; gradient: string }> = {
  data: { icon: Inbox, gradient: 'from-primary/10 to-primary/5' },
  search: { icon: FileSearch, gradient: 'from-warning/10 to-warning/5' },
  students: { icon: Users, gradient: 'from-success/10 to-success/5' },
  finance: { icon: CreditCard, gradient: 'from-gold/10 to-gold/5' },
  courses: { icon: BookOpen, gradient: 'from-chart-4/10 to-chart-4/5' },
  analytics: { icon: BarChart3, gradient: 'from-primary/10 to-primary/5' },
};

export default function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  variant = 'default',
  preset = 'data',
}: EmptyStateProps) {
  const config = PRESET_CONFIG[preset] || PRESET_CONFIG.data;
  const Icon = icon || config.icon;
  const isCompact = variant === 'compact';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }}
      className={`flex flex-col items-center justify-center text-center ${
        variant === 'card' ? 'surface-card p-8' : ''
      } ${isCompact ? 'py-8 px-4' : 'py-16 px-6'}`}
    >
      {/* Animated icon with gradient background */}
      <motion.div
        initial={{ scale: 0.8 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, duration: 0.3, type: 'spring', stiffness: 200 }}
        className={`relative mb-4 ${isCompact ? 'w-12 h-12' : 'w-16 h-16'}`}
      >
        <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${config.gradient} blur-lg`} />
        <div className={`relative w-full h-full rounded-2xl bg-gradient-to-br ${config.gradient} border border-border/30 flex items-center justify-center`}>
          <Icon className={`text-muted-foreground ${isCompact ? 'w-5 h-5' : 'w-7 h-7'}`} />
        </div>
      </motion.div>

      <h3 className={`font-bold text-foreground ${isCompact ? 'text-sm' : 'text-base'}`}>
        {title}
      </h3>
      <p className={`text-muted-foreground mt-1 max-w-sm ${isCompact ? 'text-xs' : 'text-sm'}`}>
        {description}
      </p>

      {actionLabel && onAction && (
        <Button
          onClick={onAction}
          size={isCompact ? 'sm' : 'default'}
          className="mt-4"
        >
          {actionLabel}
        </Button>
      )}
    </motion.div>
  );
}
