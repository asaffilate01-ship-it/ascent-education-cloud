import DashboardLayout from '@/components/layout/DashboardLayout';
import SavedLearning from '@/components/learning/SavedLearning';
import {useAuth} from '@/contexts/AuthContext';
export default function LearningDownloads(){const {user}=useAuth();return <DashboardLayout title="Saved learning" subtitle="Manage downloads and synchronise progress across your modules">{user?.tenantId?<SavedLearning key={`${user.tenantId}:${user.id}`} account={{id:user.id,tenantId:user.tenantId}} authenticated/>:<p>Sign in to your centre to manage saved learning.</p>}</DashboardLayout>;}
