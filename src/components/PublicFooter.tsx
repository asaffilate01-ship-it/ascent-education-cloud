import SocialIcons from '@/components/SocialIcons';
import CompanyDetails from '@/components/CompanyDetails';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BrandLogo from '@/components/BrandLogo';
import { destinationLinks, studyLinks } from './PublicNav';

export default function PublicFooter() {
  return <footer className="border-t border-border bg-card pb-28 lg:pb-0">
    <div className="mx-auto max-w-7xl px-5 sm:px-8">
      <div className="-translate-y-0 flex flex-col items-start justify-between gap-5 border-b border-border py-10 md:flex-row md:items-center">
        <div><h2 className="text-2xl font-bold sm:text-3xl">Ready to take your next step?</h2><p className="mt-2 text-sm text-muted-foreground">Speak to an adviser about courses, tuition or studying abroad.</p></div>
        <div className="flex flex-wrap gap-2"><Button variant="outline" className="rounded-full" asChild><Link to="/contact">Contact us</Link></Button><Button className="rounded-full" asChild><Link to="/apply">Apply now <ArrowRight /></Link></Button></div>
      </div>
      <div className="grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.6fr_1fr_1fr_1fr]">
        <div><Link to="/" aria-label="UniPathway home"><BrandLogo className="h-16" /></Link><p className="mt-4 max-w-sm text-sm leading-relaxed text-muted-foreground">Qualifications, school tuition, employer learning and global progression — connected through one learning experience.</p><p className="mt-3 text-sm font-semibold">Learn online across Pakistan or in class in Jhelum.</p><SocialIcons className="mt-4" /></div>
        <FooterCol title="Learn" links={studyLinks.filter(l => ['/study', '/qualifications', '/tuition', '/ielts-preparation', '/german-preparation', '/tech-academy', '/finance-academy', '/beauty-aesthetics'].includes(l.to)).map(l => [l.label, l.to])} />
        <FooterCol title="Study abroad" links={destinationLinks.map(l => [l.label, l.to])} />
        <FooterCol title="Company" links={[['About', '/about'], ['Contact', '/contact'], ['Blog', '/blog'], ['Careers & internships', '/careers'], ['Sign in', '/login']]} />
      </div>
      <div className="flex flex-col gap-3 border-t border-border py-6 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
        <div><CompanyDetails /><p className="mt-4">© {new Date().getFullYear()} UniPathway Education (Pvt.) Ltd. All rights reserved.</p></div>
        <div className="flex flex-wrap gap-x-5 gap-y-2">{[['Privacy', '/privacy'], ['Terms', '/terms'], ['Cookies', '/cookies'], ['Disclaimer', '/disclaimer']].map(([l, to]) => <Link key={to} to={to} className="hover:text-foreground">{l}</Link>)}</div>
      </div>
    </div>
  </footer>;
}

function FooterCol({ title, links }: { title: string; links: string[][] }) {
  return <div><h3 className="text-label text-foreground">{title}</h3><ul className="mt-4 grid gap-2.5 text-sm text-muted-foreground">{links.map(([l, to]) => <li key={to + l}><Link to={to} className="transition-colors hover:text-foreground">{l}</Link></li>)}</ul></div>;
}
