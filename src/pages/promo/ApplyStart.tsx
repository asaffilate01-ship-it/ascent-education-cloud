import {Link} from 'react-router-dom';
import PublicNav from '@/components/PublicNav';
import PublicFooter from '@/components/PublicFooter';
import Seo from '@/components/Seo';
export default function ApplyStart(){
 return <div className="public-site min-h-dvh bg-background"><Seo title="Start your application | UniPathway" description="Choose a Pakistan course enquiry or a UK or Germany study-abroad application." canonical="/apply"/><PublicNav/><main className="mx-auto max-w-4xl px-5 py-12 sm:px-8"><p className="text-label text-success">Start here</p><h1 className="mt-3 text-3xl font-bold sm:text-4xl">What would you like to apply for?</h1><p className="mt-4 max-w-2xl text-muted-foreground">Choose your route so we ask for the right information. You don’t need to upload documents to make an initial enquiry.</p><div className="mt-8 grid gap-4">{[
 ['Learn with us in Pakistan','Tuition, languages, technology, finance, beauty or qualifications. Ask admissions to confirm eligibility, fees and your preferred class format.','/contact?subject=Course%20Enquiry','Enquire about a course'],
 ['Study in the United Kingdom','Start a five-step university consultancy application with your academic history and document checklist.','/tenant/unipathway/apply/uk','Start UK application'],
 ['Study in Germany','Start a five-step consultancy application including language preparation and your academic background.','/tenant/unipathway/apply/germany','Start Germany application'],
 ].map(([title,copy,to,label])=><article key={to} className="rounded-2xl border bg-card p-6"><h2 className="text-xl font-bold">{title}</h2><p className="mt-3 text-sm leading-relaxed text-muted-foreground">{copy}</p><Link className="mt-4 inline-flex min-h-12 items-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground" to={to}>{label} →</Link></article>)}</div><p className="mt-8 text-sm text-muted-foreground">Already enrolled? <Link to="/login" className="font-semibold underline">Sign in to your student portal</Link>.</p></main><PublicFooter/></div>;
}
