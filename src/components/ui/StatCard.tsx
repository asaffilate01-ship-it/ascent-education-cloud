import { LucideIcon, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion, useReducedMotion } from 'framer-motion';

interface StatCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: LucideIcon;
  sparklineData?: number[];
}

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  if (!data || data.length < 2 || !data.every(Number.isFinite)) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 64;
  const h = 24;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w;
    const y = h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg width={w} height={h} aria-hidden="true" focusable="false" className="max-w-full opacity-60 group-hover:opacity-100 transition-default">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function StatCard({ label, value, change, changeType = 'neutral', icon: Icon, sparklineData }: StatCardProps) {
  const reduceMotion = useReducedMotion();
  const formattedValue = typeof value === 'number' ? (Number.isFinite(value) ? value.toLocaleString(undefined,{maximumFractionDigits:20}) : 'Unavailable') : value;
  const changeColor = {
    positive: 'text-success',
    negative: 'text-destructive',
    neutral: 'text-muted-foreground',
  }[changeType];

  const TrendIcon = changeType === 'positive' ? TrendingUp : changeType === 'negative' ? TrendingDown : Minus;
  const sparkColor = changeType === 'positive' ? 'hsl(160, 84%, 39%)' : changeType === 'negative' ? 'hsl(0, 72%, 51%)' : 'hsl(220, 9%, 46%)';

  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.35, ease: [0.25, 0.1, 0.25, 1] }}
      className="surface-card min-w-0 p-3 sm:p-5 group hover:shadow-md transition-shadow duration-300 motion-reduce:transition-none relative overflow-hidden"
    >
      {/* Subtle gradient accent line at top */}
      <div className="absolute top-0 left-0 right-0 h-[2px] gradient-primary opacity-0 group-hover:opacity-100 transition-default" />

      <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
        <div className="space-y-1 flex-[1_1_6rem] min-w-0">
          <p className="text-label [overflow-wrap:anywhere]">{label}</p>
          <p className="stat-value mt-1.5 tabular-nums [overflow-wrap:anywhere]">
            {formattedValue}
          </p>
          {change && (
            <div className={`flex min-w-0 items-start gap-1 mt-1 ${changeColor}`}>
              <TrendIcon aria-hidden="true" className="w-3 h-3 shrink-0 mt-0.5" />
              <span className="text-xs font-semibold [overflow-wrap:anywhere]">{change}</span>
            </div>
          )}
        </div>

        <div className="flex max-w-full flex-col items-end gap-2">
          <div className="p-2 sm:p-2.5 rounded-xl bg-primary/10 border border-primary/10">
            <Icon aria-hidden="true" className="w-[18px] h-[18px] text-primary" />
          </div>
          {sparklineData && <MiniSparkline data={sparklineData} color={sparkColor} />}
        </div>
      </div>
    </motion.div>
  );
}
