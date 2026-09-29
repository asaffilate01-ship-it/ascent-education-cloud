import { Link } from 'react-router-dom';
import logo from '@/assets/unipathway-logo.png';
import { studyLinks } from './PublicNav';

export default function PublicFooter() {
  return <footer className="border-t border-border bg-secondary/50 py-12">
    <div className="mx-auto grid max-w-7xl gap-10 px-5 sm:px-8 md:grid-cols-[2fr_1fr_1fr]">
      <div><Link to="/"><img src={logo} alt="UniPathway" className="h-16 w-auto max-w-[220px] object-contain" /></Link><p className="mt-4 max-w-sm text-sm text-muted-foreground">Qualifications, school tuition, employer learning and global progression — connected through one learning experience.</p><p className="mt-5 text-xs text-muted-foreground">UniPathway is a trading name of iTechLounge GmbH in Germany and iTechLounge Ltd in the UK and rest of the world.</p></div>
      <div><h2 className="font-bold">Explore</h2><div className="mt-4 grid gap-3 text-sm text-muted-foreground">{studyLinks.map(item => <Link className="hover:text-foreground" key={item.to} to={item.to}>{item.label}</Link>)}<Link to="/about">About</Link><Link to="/contact">Contact</Link></div></div>
      <div><h2 className="font-bold">Information</h2><div className="mt-4 grid gap-3 text-sm text-muted-foreground"><Link to="/blog">Blog</Link><Link to="/privacy">Privacy</Link><Link to="/terms">Terms</Link><Link to="/cookies">Cookie policy</Link><Link to="/disclaimer">Disclaimer</Link></div></div>
    </div><div className="mx-auto mt-10 max-w-7xl border-t border-border px-5 pt-6 text-xs text-muted-foreground sm:px-8">© {new Date().getFullYear()} UNIPATHWAY.PK</div>
  </footer>;
}