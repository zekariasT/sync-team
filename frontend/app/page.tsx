import DashboardShell from '@/components/DashboardShell';
import PulseView from '@/components/PulseView';

export default function Dashboard() {
  return (
    <DashboardShell pulseContent={<PulseView />} />
  );
}