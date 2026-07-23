import { DragDropContext, Droppable, Draggable, type DropResult } from '@hello-pangea/dnd';
import StatusBadge from '@/components/ui/StatusBadge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

const PIPELINE_STAGES = [
  { key: 'lead', label: 'Lead', color: 'neutral' },
  { key: 'contacted', label: 'Contacted', color: 'neutral' },
  { key: 'qualified', label: 'Qualified', color: 'neutral' },
  { key: 'applied', label: 'Applied', color: 'warning' },
  { key: 'under_review', label: 'Under Review', color: 'warning' },
  { key: 'conditional_offer', label: 'Conditional', color: 'info' },
  { key: 'unconditional_offer', label: 'Unconditional', color: 'info' },
  { key: 'deposit_paid', label: 'Deposit Paid', color: 'success' },
  { key: 'enrolled', label: 'Enrolled', color: 'success' },
  { key: 'lost', label: 'Lost', color: 'danger' },
] as const;

type Application = Tables<'applications'>;

interface KanbanBoardProps {
  applications: Application[];
  onRefetch: () => void;
}

export default function KanbanBoard({ applications, onRefetch }: KanbanBoardProps) {
  const { toast } = useToast();

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return;
    const newStage = result.destination.droppableId;
    const appId = result.draggableId;
    const app = applications.find((a) => a.id === appId);
    if (!app || app.stage === newStage) return;

    const { error } = await supabase
      .from('applications')
      .update({ stage: newStage as Application['stage'] })
      .eq('id', appId);

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Stage Updated', description: `${app.student_name} moved to ${newStage.replace(/_/g, ' ')}` });

      // Auto-generate invoice on enrolment
      if (newStage === 'enrolled' && app.stage !== 'enrolled') {
        await supabase.from('invoices').insert({
          student_name: app.student_name,
          student_id: app.user_id,
          tenant_id: app.tenant_id,
          type: 'tuition',
          amount: 4500,
          paid: 0,
          status: 'pending',
          instalments: 3,
        });
        toast({ title: 'Invoice Created', description: `Tuition invoice generated for ${app.student_name}` });
      }
      onRefetch();
    }
  };

  const grouped = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    items: applications.filter((a) => a.stage === stage.key),
  }));

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-2 overflow-x-auto pb-4 min-h-[400px]">
        {grouped.map((stage) => (
          <Droppable droppableId={stage.key} key={stage.key}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`flex-shrink-0 w-48 rounded-lg border border-border/50 transition-colors ${
                  snapshot.isDraggingOver ? 'bg-primary/5 border-primary/30' : 'bg-muted/30'
                }`}
              >
                <div className="p-2.5 border-b border-border/50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">{stage.label}</span>
                    <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-full">
                      {stage.items.length}
                    </span>
                  </div>
                </div>
                <div className="p-1.5 space-y-1.5 min-h-[300px]">
                  {stage.items.map((app, index) => (
                    <Draggable key={app.id} draggableId={app.id} index={index}>
                      {(prov, snap) => (
                        <div
                          ref={prov.innerRef}
                          {...prov.draggableProps}
                          {...prov.dragHandleProps}
                          className={`surface-card p-2.5 rounded-md border border-border/50 cursor-grab active:cursor-grabbing transition-shadow ${
                            snap.isDragging ? 'shadow-lg ring-2 ring-primary/20' : 'hover:shadow-sm'
                          }`}
                        >
                          <p className="text-xs font-medium text-foreground truncate">{app.student_name}</p>
                          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{app.email}</p>
                          {app.programme_name && (
                            <p className="text-[10px] text-muted-foreground truncate mt-1">{app.programme_name}</p>
                          )}
                          <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                            {(() => {
                              const dest = (app as any).destination
                                || ((app.source || '').startsWith('consultancy_') ? (app.source as string).replace('consultancy_', '') : null);
                              if (!dest) return null;
                              const flag = dest === 'germany' ? '🇩🇪' : dest === 'uk' ? '🇬🇧' : '🇵🇰';
                              return (
                                <span className="inline-block text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-semibold">
                                  {flag} {dest.toUpperCase()}
                                </span>
                              );
                            })()}
                            {app.source && !app.source.startsWith('consultancy_') && (
                              <span className="inline-block text-[9px] bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded">
                                {app.source}
                              </span>
                            )}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
