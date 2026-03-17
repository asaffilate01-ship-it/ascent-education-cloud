import { motion } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';
import {
  UserPlus, CreditCard, FileCheck, BookOpen, AlertTriangle,
  GraduationCap, MessageSquare, Shield, LucideIcon
} from 'lucide-react';

export interface ActivityItem {
  id: string;
  type: 'enrolment' | 'payment' | 'submission' | 'grade' | 'alert' | 'application' | 'message' | 'compliance';
  title: string;
  description?: string;
  timestamp: string;
  user?: string;
}

const TYPE_CONFIG: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  enrolment: { icon: GraduationCap, color: 'text-success', bg: 'bg-success/10' },
  payment: { icon: CreditCard, color: 'text-gold', bg: 'bg-gold/10' },
  submission: { icon: FileCheck, color: 'text-primary', bg: 'bg-primary/10' },
  grade: { icon: BookOpen, color: 'text-chart-4', bg: 'bg-chart-4/10' },
  alert: { icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
  application: { icon: UserPlus, color: 'text-primary-400', bg: 'bg-primary-100' },
  message: { icon: MessageSquare, color: 'text-muted-foreground', bg: 'bg-muted' },
  compliance: { icon: Shield, color: 'text-destructive', bg: 'bg-destructive/10' },
};

interface ActivityFeedProps {
  items: ActivityItem[];
  maxItems?: number;
  title?: string;
}

export default function ActivityFeed({ items, maxItems = 8, title = 'Recent Activity' }: ActivityFeedProps) {
  const displayItems = items.slice(0, maxItems);

  return (
    <div className="surface-card overflow-hidden">
      <div className="px-5 py-4 border-b border-border/50">
        <h3 className="text-sm font-bold text-foreground">{title}</h3>
      </div>

      <div className="divide-y divide-border/30">
        {displayItems.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground">No recent activity</div>
        ) : (
          displayItems.map((item, i) => {
            const config = TYPE_CONFIG[item.type] || TYPE_CONFIG.message;
            const Icon = config.icon;

            return (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.04, duration: 0.25 }}
                className="flex items-start gap-3 px-5 py-3 hover:bg-secondary/30 transition-default group"
              >
                {/* Timeline dot + line */}
                <div className="relative flex flex-col items-center pt-0.5">
                  <div className={`w-8 h-8 rounded-lg ${config.bg} flex items-center justify-center shrink-0 group-hover:scale-105 transition-default`}>
                    <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{item.description}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {item.user && <span className="text-[10px] font-medium text-muted-foreground">{item.user}</span>}
                    <span className="text-[10px] text-muted-foreground/60">
                      {formatDistanceToNow(new Date(item.timestamp), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
