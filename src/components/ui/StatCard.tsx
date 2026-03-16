import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
}

export default function StatCard({ label, value, change, changeType = 'neutral', icon: Icon }: StatCardProps) {
  const changeColor = {
    positive: 'text-success',
    negative: 'text-destructive',
    neutral: 'text-muted-foreground',
  }[changeType];

  return (
    <div className="surface-card p-5 group hover:shadow-surface-lg transition-default relative overflow-hidden">
      {/* Subtle gradient accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] gradient-primary opacity-0 group-hover:opacity-100 transition-default" />
      
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-label">{label}</p>
          <p className="stat-value mt-1.5">{value}</p>
          {change && (
            <p className={`text-xs mt-1 font-semibold ${changeColor}`}>{change}</p>
          )}
        </div>
        <div className="p-2.5 rounded-xl bg-primary/8 border border-primary/10 group-hover:bg-primary/12 transition-default">
          <Icon className="w-4.5 h-4.5 text-primary" />
        </div>
      </div>
    </div>
  );
}