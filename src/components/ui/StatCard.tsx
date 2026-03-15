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
    <div className="surface-card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-label">{label}</p>
          <p className="stat-value mt-1">{value}</p>
          {change && (
            <p className={`text-xs mt-1 font-medium ${changeColor}`}>{change}</p>
          )}
        </div>
        <div className="p-2 rounded-lg bg-primary/10">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
    </div>
  );
}
