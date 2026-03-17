import { useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Trash2, Download, MoreHorizontal, X } from 'lucide-react';
import EmptyState from '@/components/ui/EmptyState';

interface Column<T> {
  key: string;
  label: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
}

interface BulkAction<T> {
  label: string;
  icon?: React.ElementType;
  variant?: 'default' | 'destructive';
  onClick: (selectedItems: T[]) => void;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  onRowClick?: (item: T) => void;
  selectable?: boolean;
  bulkActions?: BulkAction<T>[];
  emptyTitle?: string;
  emptyDescription?: string;
  emptyPreset?: 'data' | 'search' | 'students' | 'finance' | 'courses' | 'analytics';
  onEmptyAction?: () => void;
  emptyActionLabel?: string;
}

export default function DataTable<T extends { id: string }>({
  columns,
  data,
  onRowClick,
  selectable = false,
  bulkActions = [],
  emptyTitle = 'No data yet',
  emptyDescription = 'Items will appear here once added.',
  emptyPreset = 'data',
  onEmptyAction,
  emptyActionLabel,
}: DataTableProps<T>) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const allSelected = data.length > 0 && selected.size === data.length;

  const toggleAll = useCallback(() => {
    if (allSelected) {
      setSelected(new Set());
    } else {
      setSelected(new Set(data.map((d) => d.id)));
    }
  }, [allSelected, data]);

  const toggleOne = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSort = useCallback((key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }, [sortKey]);

  const sortedData = useMemo(() => {
    if (!sortKey) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as any)[sortKey];
      const bVal = (b as any)[sortKey];
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const selectedItems = useMemo(
    () => data.filter((d) => selected.has(d.id)),
    [data, selected]
  );

  const showBulkBar = selectable && selected.size > 0;

  return (
    <div className="surface-card overflow-hidden relative">
      {/* Bulk action bar */}
      <AnimatePresence>
        {showBulkBar && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex items-center gap-2 px-5 py-2.5 bg-primary/5 border-b border-primary/10">
              <span className="text-xs font-semibold text-primary">
                {selected.size} selected
              </span>
              <div className="flex-1" />
              {bulkActions.map((action) => (
                <Button
                  key={action.label}
                  size="sm"
                  variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                  className="h-7 text-xs gap-1.5"
                  onClick={() => {
                    action.onClick(selectedItems);
                    setSelected(new Set());
                  }}
                >
                  {action.icon && <action.icon className="w-3 h-3" />}
                  {action.label}
                </Button>
              ))}
              {bulkActions.length === 0 && (
                <>
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1.5">
                    <Download className="w-3 h-3" /> Export
                  </Button>
                  <Button size="sm" variant="destructive" className="h-7 text-xs gap-1.5">
                    <Trash2 className="w-3 h-3" /> Delete
                  </Button>
                </>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setSelected(new Set())}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="surface-data">
              {selectable && (
                <th className="w-10 pl-5 pr-1 py-3">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    className="data-[state=checked]:bg-primary"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  className={`text-label text-left px-4 py-3 first:pl-5 last:pr-5 ${
                    col.sortable ? 'cursor-pointer hover:text-foreground select-none' : ''
                  }`}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.label}
                    {col.sortable && sortKey === col.key && (
                      <span className="text-[9px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item, idx) => (
              <motion.tr
                key={item.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: idx * 0.02, duration: 0.2 }}
                onClick={() => onRowClick?.(item)}
                className={`border-t border-border/50 transition-default ${
                  onRowClick ? 'cursor-pointer hover:bg-secondary/50' : ''
                } ${selected.has(item.id) ? 'bg-primary/5' : ''}`}
              >
                {selectable && (
                  <td className="w-10 pl-5 pr-1 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggleOne(item.id)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className="px-4 py-3 text-sm first:pl-5 last:pr-5">
                    {col.render ? col.render(item) : (item as any)[col.key]}
                  </td>
                ))}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>

      {data.length === 0 && (
        <EmptyState
          title={emptyTitle}
          description={emptyDescription}
          preset={emptyPreset}
          variant="compact"
          actionLabel={emptyActionLabel}
          onAction={onEmptyAction}
        />
      )}
    </div>
  );
}
