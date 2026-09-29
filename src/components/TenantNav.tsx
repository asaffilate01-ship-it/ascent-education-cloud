import PublicNav from '@/components/PublicNav';

interface TenantNavProps {
  brandName?: string;
  primaryColor?: string;
  activePage?: 'home' | 'courses' | 'about' | 'contact';
}

export default function TenantNav(_props: TenantNavProps) {
  return <PublicNav />;
}
