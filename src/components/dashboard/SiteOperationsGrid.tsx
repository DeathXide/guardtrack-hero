import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Building2, Sun, Moon, ExternalLink } from 'lucide-react';
import { SiteCoverage } from '@/hooks/useDashboardData';

interface SiteOperationsGridProps {
  sites: SiteCoverage[];
}

function CoverageBar({ assigned, total, colorClass }: { assigned: number; total: number; colorClass: string }) {
  const pct = total > 0 ? Math.round((assigned / total) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="w-14 sm:w-20 h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs font-medium tabular-nums w-8 text-right">
        {assigned}/{total}
      </span>
    </div>
  );
}

function StatusBadge({ site }: { site: SiteCoverage }) {
  if (!site.hasSlots) {
    return <Badge variant="outline" className="text-xs bg-muted/50">No Slots</Badge>;
  }

  const totalAssigned = site.dayAssigned + site.nightAssigned;
  const totalSlots = site.dayTotal + site.nightTotal;
  const pct = totalSlots > 0 ? Math.round((totalAssigned / totalSlots) * 100) : 0;

  if (pct >= 90) {
    return <Badge className="text-xs bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20">Full</Badge>;
  }
  if (pct >= 60) {
    return <Badge className="text-xs bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20">Partial</Badge>;
  }
  return <Badge className="text-xs bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 hover:bg-rose-500/20">Low</Badge>;
}

const SiteOperationsGrid = ({ sites }: SiteOperationsGridProps) => {
  return (
    <Card className="md:col-span-1 lg:col-span-2">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Site Operations</CardTitle>
            <CardDescription>Today's coverage across all active sites</CardDescription>
          </div>
          <Link
            to="/sites"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            All Sites <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {sites.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No active sites found</p>
          </div>
        ) : (
          <ScrollArea className="h-[340px] pr-3">
            {/* Header row */}
            <div className="flex items-center gap-4 px-3 py-2 text-xs font-medium text-muted-foreground border-b mb-1 sticky top-0 bg-card z-10">
              <div className="flex-1 min-w-0">Site</div>
              <div className="w-28 sm:w-36 flex items-center gap-1">
                <Sun className="h-3 w-3" /> Day
              </div>
              <div className="w-28 sm:w-36 flex items-center gap-1">
                <Moon className="h-3 w-3" /> Night
              </div>
              <div className="w-16 text-center">Status</div>
            </div>

            <div className="space-y-1">
              {sites.map((site) => (
                <Link
                  key={site.id}
                  to="/attendance"
                  className="flex items-center gap-4 px-3 py-2.5 rounded-lg hover:bg-muted/50 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                      {site.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{site.org}</p>
                  </div>

                  <div className="w-28 sm:w-36">
                    {site.dayTotal > 0 ? (
                      <CoverageBar
                        assigned={site.dayAssigned}
                        total={site.dayTotal}
                        colorClass="bg-amber-500"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </div>

                  <div className="w-28 sm:w-36">
                    {site.nightTotal > 0 ? (
                      <CoverageBar
                        assigned={site.nightAssigned}
                        total={site.nightTotal}
                        colorClass="bg-blue-500"
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">--</span>
                    )}
                  </div>

                  <div className="w-16 flex justify-center">
                    <StatusBadge site={site} />
                  </div>
                </Link>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default SiteOperationsGrid;
