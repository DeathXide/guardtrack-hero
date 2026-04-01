import { useAuth } from '@/context/AuthContext';
import { Users, MapPin, CheckCircle, AlertTriangle, IndianRupee, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { m } from 'motion/react';
import { useDashboardData } from '@/hooks/useDashboardData';

import DashboardHeader from '@/components/dashboard/DashboardHeader';
import StatCard from '@/components/dashboard/StatCard';
import SiteOperationsGrid from '@/components/dashboard/SiteOperationsGrid';
import AlertsPanel from '@/components/dashboard/AlertsPanel';
import AttendanceTrendChart from '@/components/dashboard/AttendanceTrendChart';
import StaffDistributionChart from '@/components/dashboard/StaffDistributionChart';
import InvoiceSummaryCard from '@/components/dashboard/InvoiceSummaryCard';
import QuickActions from '@/components/dashboard/QuickActions';

// ── Lightweight per-section skeletons ──

function KpiSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {[...Array(6)].map((_, i) => (
        <Card key={i}>
          <CardContent className="p-5">
            <Skeleton className="h-4 w-20 mb-3" />
            <Skeleton className="h-8 w-16 mb-1.5" />
            <Skeleton className="h-3 w-28" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function SiteGridSkeleton() {
  return (
    <Card className="md:col-span-1 lg:col-span-2">
      <CardHeader><Skeleton className="h-5 w-40" /></CardHeader>
      <CardContent className="space-y-2">
        {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </CardContent>
    </Card>
  );
}

function AlertsSkeleton() {
  return (
    <Card>
      <CardHeader><Skeleton className="h-5 w-32" /></CardHeader>
      <CardContent className="space-y-2">
        {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}
      </CardContent>
    </Card>
  );
}

function ChartSkeleton() {
  return (
    <Card>
      <CardHeader><Skeleton className="h-5 w-36" /></CardHeader>
      <CardContent><Skeleton className="h-[200px] w-full" /></CardContent>
    </Card>
  );
}

// ── Dashboard ──

const Dashboard = () => {
  const { profile } = useAuth();
  const data = useDashboardData();

  return (
    <div className="space-y-6">
      {/* Header — always visible, no data dependency */}
      <DashboardHeader userName={profile?.full_name?.split(' ')[0]} />

      {/* Subtle background-refetch indicator */}
      {data.isRefetching && (
        <div className="h-0.5 w-full bg-muted overflow-hidden rounded-full">
          <div className="h-full w-1/3 bg-primary/60 rounded-full animate-[shimmer_1.5s_ease-in-out_infinite]" />
        </div>
      )}

      {/* KPI Cards — load as guards + sites + slots arrive */}
      {data.kpiLoading ? (
        <KpiSkeleton />
      ) : (
        <m.div
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4"
          initial="hidden"
          animate="visible"
          variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.06 } } }}
        >
          {[
            {
              title: 'Active Staff',
              value: data.activeGuards,
              subtitle: `${data.inactiveGuards} inactive \u00b7 ${data.terminatedGuards} exited`,
              icon: Users,
              accentColor: 'blue',
            },
            {
              title: 'Active Sites',
              value: data.activeSites,
              subtitle: `${data.totalSites} total sites`,
              icon: MapPin,
              accentColor: 'green',
            },
            {
              title: 'Attendance',
              value: data.attendanceRate,
              suffix: '%',
              subtitle: `${data.presentSlots} present of ${data.assignedSlots} assigned`,
              icon: CheckCircle,
              accentColor: 'emerald',
            },
            {
              title: 'Open Slots',
              value: data.unfilledSlots + data.pendingSlots,
              subtitle: `${data.unfilledSlots} unfilled \u00b7 ${data.pendingSlots} pending`,
              icon: AlertTriangle,
              accentColor: 'amber',
            },
            {
              title: 'Revenue',
              value: Math.round(data.monthlyRevenue),
              prefix: '\u20b9',
              subtitle: `${data.invoiceCount} invoices this month`,
              icon: IndianRupee,
              accentColor: 'indigo',
            },
            {
              title: 'Pending',
              value: Math.round(data.pendingAmount),
              prefix: '\u20b9',
              subtitle: `${data.invoiceCount - data.paidInvoices} invoices unpaid`,
              icon: Clock,
              accentColor: 'rose',
            },
          ].map((card) => (
            <m.div
              key={card.title}
              variants={{
                hidden: { opacity: 0, y: 16 },
                visible: { opacity: 1, y: 0 },
              }}
            >
              <StatCard {...card} />
            </m.div>
          ))}
        </m.div>
      )}

      {/* Site Operations + Alerts — independent loading */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.sitesLoading ? <SiteGridSkeleton /> : <SiteOperationsGrid sites={data.siteCoverage} />}
        {data.alertsLoading ? <AlertsSkeleton /> : <AlertsPanel alerts={data.alerts} />}
      </div>

      {/* Charts Row — each loads independently */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.trendLoading ? <ChartSkeleton /> : <AttendanceTrendChart data={data.attendanceTrend} />}
        {data.staffChartLoading ? (
          <ChartSkeleton />
        ) : (
          <StaffDistributionChart
            activeGuards={data.activeGuards}
            inactiveGuards={data.inactiveGuards}
            terminatedGuards={data.terminatedGuards}
            staffByRole={data.staffByRole}
          />
        )}
        {data.invoiceLoading ? (
          <ChartSkeleton />
        ) : (
          <InvoiceSummaryCard
            monthlyRevenue={data.monthlyRevenue}
            paidAmount={data.paidAmount}
            pendingAmount={data.pendingAmount}
            invoiceCount={data.invoiceCount}
            paidInvoices={data.paidInvoices}
          />
        )}
      </div>

      {/* Quick Actions — static, always visible */}
      <QuickActions />
    </div>
  );
};

export default Dashboard;
