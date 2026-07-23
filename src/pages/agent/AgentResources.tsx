import DashboardLayout from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download, ExternalLink, BookOpen, Megaphone, GraduationCap, HelpCircle } from 'lucide-react';

const RESOURCE_CATEGORIES = [
  {
    title: 'Programme Brochures',
    icon: BookOpen,
    items: [
      { name: 'OTHM Level 4 Diploma in Business Management', type: 'PDF' },
      { name: 'OTHM Level 5 Extended Diploma in Business', type: 'PDF' },
      { name: 'OTHM Level 7 Diploma in Strategic Management', type: 'PDF' },
      { name: 'QUALIFI Level 6 Diploma in IT', type: 'PDF' },
      { name: 'IAB Level 2 Certificate in Bookkeeping', type: 'PDF' },
    ],
  },
  {
    title: 'Marketing Materials',
    icon: Megaphone,
    items: [
      { name: 'Social Media Assets Pack', type: 'ZIP' },
      { name: 'Agent Recruitment Flyer Template', type: 'DOCX' },
      { name: 'Email Campaign Templates', type: 'HTML' },
      { name: 'Student Testimonials Sheet', type: 'PDF' },
    ],
  },
  {
    title: 'Admissions Guides',
    icon: GraduationCap,
    items: [
      { name: 'Entry Requirements Matrix', type: 'PDF' },
      { name: 'Application Process Flowchart', type: 'PDF' },
      { name: 'Document Checklist for Students', type: 'PDF' },
      { name: 'Scholarship & Bursary Guide', type: 'PDF' },
    ],
  },
  {
    title: 'Agent Handbook',
    icon: HelpCircle,
    items: [
      { name: 'Agent Commission Structure 2026', type: 'PDF' },
      { name: 'Agent Onboarding Guide', type: 'PDF' },
      { name: 'CRM Pipeline Best Practices', type: 'PDF' },
      { name: 'FAQs for Prospective Students', type: 'PDF' },
    ],
  },
];

export default function AgentResources() {
  return (
    <DashboardLayout
      title="Agent Resources"
      subtitle="Marketing materials, brochures & guides to support your recruitment"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {RESOURCE_CATEGORIES.map((category) => (
          <Card key={category.title} className="surface-card">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <category.icon className="w-4 h-4 text-primary" />
                {category.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {category.items.map((item) => (
                <div
                  key={item.name}
                  className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/50 transition-default"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-sm truncate">{item.name}</span>
                    <span className="text-[10px] font-medium text-muted-foreground bg-muted rounded px-1.5 py-0.5 shrink-0">
                      {item.type}
                    </span>
                  </div>
                  <Button variant="ghost" size="sm" className="text-xs shrink-0 ml-2">
                    <Download className="w-3 h-3" />
                  </Button>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </DashboardLayout>
  );
}
