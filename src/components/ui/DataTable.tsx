import { useState, useMemo, useCallback, useEffect } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { X, ArrowUpDown } from 'lucide-react';
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

  const reduceMotion = useReducedMotion();
  const selectedItems = useMemo(() => data.filter(d => selected.has(d.id)), [data, selected]);
  const allSelected = data.length > 0 && selectedItems.length === data.length;
  useEffect(() => {
    setSelected(previous => {
      const visible = new Set(data.map(row => row.id));
      const next = new Set([...previous].filter(id => visible.has(id)));
      return next.size === previous.size ? previous : next;
    });
  }, [data]);

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
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return 1;
      if (bVal == null) return -1;
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const showBulkBar = selectable && selectedItems.length > 0;

  return (
    <div className="surface-card overflow-hidden relative">
      {/* Bulk action bar */}
      <AnimatePresence>
        {showBulkBar && (
          <motion.div
            initial={reduceMotion ? false : { height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center gap-2 px-3 sm:px-5 py-2.5 bg-primary/5 border-b border-primary/10">
              <span className="text-xs font-semibold text-primary">
                {selectedItems.length} selected
              </span>
              <div className="flex-1" />
              {bulkActions.map((action) => (
                <Button
                  key={action.label}
                  size="sm"
                  variant={action.variant === 'destructive' ? 'destructive' : 'outline'}
                  className="min-h-11 h-auto whitespace-normal text-xs gap-1.5"
                  onClick={() => {
                    action.onClick(selectedItems);
                    setSelected(new Set());
                  }}
                >
                  {action.icon && <action.icon className="w-3 h-3" />}
                  {action.label}
                </Button>
              ))}
              <Button
                size="sm"
                variant="ghost"
                className="h-11 w-11 p-0" aria-label="Clear selection"
                onClick={() => setSelected(new Set())}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary" tabIndex={0} role="region" aria-label="Scrollable records table">
        <table className="w-full text-left">
          <thead>
            <tr className="surface-data">
              {selectable && (
                <th scope="col" className="w-10 pl-3 sm:pl-5 pr-1 py-3">
                  <Checkbox
                    aria-label="Select all visible records"
                    checked={allSelected ? true : selectedItems.length > 0 ? 'indeterminate' : false}
                    onCheckedChange={toggleAll}
                    className="data-[state=checked]:bg-primary"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  scope="col"
                  aria-sort={col.sortable ? (sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none') : undefined}
                  className="text-label text-left px-3 sm:px-4 py-3 first:pl-3 last:pr-3"
                >
                  {col.sortable ? <button type="button" className="inline-flex min-h-11 items-center gap-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded" onClick={() => handleSort(col.key)}>
                    {col.label}
                    <ArrowUpDown aria-hidden="true" className="size-3"/>
                  </button> : col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((item) => (
              <motion.tr
                key={item.id}
                initial={false}
                animate={{ opacity: 1 }}
                transition={{ duration: reduceMotion ? 0 : 0.1 }}
                onClick={e => {
                  if ((e.target as HTMLElement).closest('button,a,input,select,textarea,summary,[role="button"],[role="checkbox"]')) return;
                  onRowClick?.(item);
                }}
                className={`border-t border-border/30 transition-all duration-150 ${
                  onRowClick ? 'cursor-pointer hover:bg-primary/[0.02]' : 'hover:bg-muted/30'
                } ${selected.has(item.id) ? 'bg-primary/5' : ''}`}
              >
                {selectable && (
                  <td className="w-10 pl-5 pr-1 py-3" onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      aria-label={`Select record ${item.id}`}
                      checked={selected.has(item.id)}
                      onCheckedChange={() => toggleOne(item.id)}
                      className="data-[state=checked]:bg-primary"
                    />
                  </td>
                )}
                {columns.map((col, index) => (
                  <td key={col.key} className="px-3 sm:px-4 py-3 text-sm align-top [overflow-wrap:anywhere]">
                    {col.render ? col.render(item) : (item as any)[col.key]}
                    {index === 0 && onRowClick && <button type="button" className="mt-1 block min-h-11 text-xs font-medium underline underline-offset-4" onClick={() => onRowClick(item)}>Open record<span className="sr-only"> {item.id}</span></button>}
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
