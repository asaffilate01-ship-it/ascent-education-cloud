import {Link} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {creativeEnterpriseCourses,creativeEnterpriseEnquiry} from '@/lib/creativeEnterprise';

export default function WomenCreativeEnterprise(){
 return <section id="women-creative-enterprise" aria-labelledby="women-creative-enterprise-title" className="scroll-mt-28 space-y-6 rounded-xl border bg-secondary/30 p-5 sm:p-7 [overflow-wrap:anywhere]">
  <div className="max-w-4xl">
   <p className="text-label text-success">Women · creativity · enterprise</p>
   <h2 id="women-creative-enterprise-title" className="mt-3 text-2xl font-bold sm:text-3xl">Fine art and crafts for women building a business</h2>
   <p className="mt-3 leading-relaxed">Specifically designed for women in Pakistan who want to turn creative skills into a microbusiness, a home-based venture or an ecommerce product range. Learn how to make, present, market and sell your work, whether you are starting from an idea or developing an existing small business.</p>
   <p className="mt-3 text-sm text-muted-foreground">Explore the Pearson Level 4 HNC and Level 5 HND in Fine Art above for a longer qualification pathway, or choose focused UniPathway short courses and practical workshops below. Enterprise teaching supports your own product ideas; it does not guarantee income or sales.</p>
  </div>
  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
   {creativeEnterpriseCourses.map(course=><article key={course.id} className="flex min-w-0 flex-col rounded-xl border bg-card p-5">
    <p className="text-sm font-semibold text-success">UniPathway · {course.format}</p>
    <h3 className="mt-2 text-lg font-bold">{course.title}</h3>
    <ul className="mt-3 list-disc space-y-2 pl-5 text-sm">{course.topics.map(topic=><li key={topic}>{topic}</li>)}</ul>
    <p className="mt-4 text-sm"><strong>What you will work towards:</strong> {course.outcome}</p>
    <Button asChild variant="outline" className="mt-5 h-auto min-h-11 max-w-full whitespace-normal"><Link to={creativeEnterpriseEnquiry(course.title)}>Enquire about {course.title}</Link></Button>
   </article>)}
  </div>
  <div className="space-y-3 rounded-lg border bg-card p-4 text-sm">
   <h3 className="font-semibold">Choose a route that fits your starting point</h3>
   <p>Tell admissions about your experience, preferred craft, business goals and availability. Ask about women-focused groups, online business sessions and supervised in-centre practical workshops. Dates, duration, fees, materials, equipment and any completion document will be confirmed before booking.</p>
   <p className="text-muted-foreground">These short courses and workshops are separate UniPathway learning options. They are not Pearson qualifications and do not carry HNC or HND credits. Pearson programme entry and approval checks apply separately.</p>
   <div className="flex flex-wrap gap-3"><Button asChild className="h-auto min-h-11 max-w-full whitespace-normal"><Link to={creativeEnterpriseEnquiry('short courses and workshops')}>Ask about women’s creative enterprise</Link></Button><Button asChild variant="outline" className="h-auto min-h-11 max-w-full whitespace-normal"><Link to="/creative-crafts">See sewing, crafts and creative enterprise courses</Link></Button></div>
  </div>
 </section>;
}
