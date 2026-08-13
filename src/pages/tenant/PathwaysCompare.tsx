import TenantNav from '@/components/TenantNav';
import PathwayComparisonTable from '@/components/tenant/PathwayComparisonTable';
import ComplianceDisclosure from '@/components/tenant/ComplianceDisclosure';
import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function PathwaysCompare() {
  const { slug } = useParams();
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <TenantNav brandName="UniPathway" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Pathways</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight">Study in Pakistan, Germany or the United Kingdom</h1>
          <p className="text-muted-foreground mt-3 max-w-3xl">
            Three transparent routes with different tuition, language and post-study work profiles. Choose the pathway that fits your qualifications and budget — we support the counselling, document preparation and language teaching. All admission and visa decisions rest with the institution and competent authority.
          </p>
        </div>

        <PathwayComparisonTable />

        <div className="grid md:grid-cols-3 gap-4">
          <Link to={`/tenant/${slug}/courses`}><Button variant="outline" className="w-full">🇵🇰 Pakistan in-country</Button></Link>
          <Link to={`/tenant/${slug}/germany`}><Button variant="outline" className="w-full">🇩🇪 Germany</Button></Link>
          <Link to={`/tenant/${slug}/uk`}><Button variant="outline" className="w-full">🇬🇧 United Kingdom</Button></Link>
        </div>

        <ComplianceDisclosure />
      </div>
    </div>
  );
}
