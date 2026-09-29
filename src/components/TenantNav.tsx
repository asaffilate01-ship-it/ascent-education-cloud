import { useParams } from "react-router-dom";
import PublicNav from '@/components/PublicNav';

interface TenantNavProps {
  brandName?: string;
  primaryColor?: string;
  activePage?: 'home' | 'courses' | 'about' | 'contact';
}

export default function TenantNav(_props: TenantNavProps) {
  const { slug } = useParams();
  return <PublicNav tenantSlug={slug} />;
}
