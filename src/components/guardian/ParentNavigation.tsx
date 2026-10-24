import {Link,useLocation} from 'react-router-dom';
import {Button} from '@/components/ui/button';
import {parentPages} from '@/lib/parentNavigation';
export default function ParentNavigation(){const {pathname}=useLocation();return <nav aria-label="Parent portal" className="mb-5 flex flex-wrap gap-2">{parentPages.map(([label,to])=><Button key={to} asChild variant={pathname===to?'default':'outline'}><Link to={to} aria-current={pathname===to?'page':undefined}>{label}</Link></Button>)}</nav>;}
