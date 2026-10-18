import TenantNav from '@/components/TenantNav';
import PathwayComparisonTable from '@/components/tenant/PathwayComparisonTable';
import ComplianceDisclosure from '@/components/tenant/ComplianceDisclosure';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import Seo from '@/components/Seo';
import InternationalEnquiryForm from '@/components/enquiry/InternationalEnquiryForm';

export default function PathwaysCompare() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const destinations = ['All', 'UK', 'Germany', 'USA', 'Australia', 'Canada', 'Pakistan'];
  const selected = destinations.includes(params.get('destination') || '') ? params.get('destination')! : 'All';
  return (
    <div className="min-h-dvh bg-background text-foreground">
      <Seo title="University Progression & Admissions | UniPathway" description="Explore OTHM and Qualifi university progression enquiries for the UK, USA, Canada, Australia, Germany and Pakistan." canonical="/pathways" />
      <TenantNav brandName="UniPathway" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
        <div>
          <span className="text-xs font-bold uppercase tracking-widest text-primary">Pathways</span>
          <h1 className="text-3xl sm:text-4xl font-extrabold mt-2 tracking-tight">Explore university progression from Pakistan</h1>
          <p className="text-muted-foreground mt-3 max-w-3xl">
            Enquire about university admission in Pakistan, the UK, USA, Canada, Australia or Germany. Our comparison below focuses on the existing Pakistan, UK and Germany routes; other destinations are assessed individually. Only verified institution agreements and evidence-reviewed OTHM/Qualifi progression routes are described as confirmed.
          </p>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="Filter study destinations">
          {destinations.map(destination => <Button key={destination} type="button" size="sm" variant={selected === destination ? 'default' : 'outline'} onClick={() => setParams(destination === 'All' ? {} : { destination })}>{destination}</Button>)}
        </div>
        <p className="text-sm text-muted-foreground" role="status">{selected === 'All' ? 'Explore all destinations.' : `Enquire about ${selected} university admissions and programme-specific eligibility. Admissions, recognition and partner status are subject to verification.`}</p>
        {(selected === 'All' || selected === 'UK' || selected === 'Germany' || selected === 'Pakistan') && <PathwayComparisonTable />}

        <div className="grid md:grid-cols-3 gap-4">
          <Link to={`/tenant/${slug}/courses`}><Button variant="outline" className="w-full">🇵🇰 Pakistan in-country</Button></Link>
          <Link to={`/tenant/${slug}/germany`}><Button variant="outline" className="w-full">🇩🇪 Germany</Button></Link>
          <Link to={`/tenant/${slug}/uk`}><Button variant="outline" className="w-full">🇬🇧 United Kingdom</Button></Link>
        </div>

        <div className="rounded-xl border p-5 bg-secondary/40"><h2 className="font-semibold">Education consultancy and admissions assistance</h2><p className="text-sm mt-1 text-muted-foreground">Guidance for UK, Germany, USA, Australia, Canada and Pakistan; qualification mapping, university enquiries, application support and agent referrals. No institutional approval, guaranteed admission or commission is implied without verified evidence and signed terms.</p></div>
        <InternationalEnquiryForm kind="university" />
        <ComplianceDisclosure />
      </div>
    </div>
  );
}
