import { Link, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { GraduationCap, Menu, X, Moon, Sun } from 'lucide-react';
import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';

interface TenantNavProps {
  brandName?: string;
  primaryColor?: string;
  activePage?: 'home' | 'courses' | 'about' | 'contact';
}

export default function TenantNav({ brandName = 'EduPathway', primaryColor, activePage }: TenantNavProps) {
  const { slug } = useParams();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const links = [
    { label: 'Home', path: `/tenant/${slug}`, key: 'home' },
    { label: 'Courses', path: `/tenant/${slug}/courses`, key: 'courses' },
    { label: 'About', path: `/tenant/${slug}/about`, key: 'about' },
    { label: 'Contact', path: `/tenant/${slug}/contact`, key: 'contact' },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-background/80 backdrop-blur-sm shadow-surface-sm">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <Link to={`/tenant/${slug}`} className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center bg-primary"
            style={primaryColor ? { backgroundColor: primaryColor } : undefined}
          >
            <GraduationCap className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">{brandName}</span>
        </Link>

        {/* Desktop */}
        <div className="hidden md:flex items-center gap-6 text-sm text-muted-foreground">
          {links.map((l) => (
            <Link
              key={l.key}
              to={l.path}
              className={activePage === l.key ? 'text-primary font-medium' : 'hover:text-foreground transition-default'}
            >
              {l.label}
            </Link>
          ))}
          <Link to="/login"><Button variant="outline" size="sm">Login</Button></Link>
          <Link to="/apply">
            <Button size="sm" style={primaryColor ? { backgroundColor: primaryColor } : undefined}>Apply Now</Button>
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background px-4 py-4 space-y-3">
          {links.map((l) => (
            <Link
              key={l.key}
              to={l.path}
              className={`block text-sm ${activePage === l.key ? 'text-primary font-medium' : 'text-muted-foreground'}`}
              onClick={() => setMobileOpen(false)}
            >
              {l.label}
            </Link>
          ))}
          <div className="flex gap-2 pt-2">
            <Link to="/login" className="flex-1">
              <Button variant="outline" size="sm" className="w-full">Login</Button>
            </Link>
            <Link to="/apply" className="flex-1">
              <Button size="sm" className="w-full" style={primaryColor ? { backgroundColor: primaryColor } : undefined}>Apply</Button>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}
