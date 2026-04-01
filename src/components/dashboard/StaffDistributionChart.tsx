import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';

interface StaffDistributionChartProps {
  activeGuards: number;
  inactiveGuards: number;
  terminatedGuards: number;
  staffByRole: Record<string, number>;
}

const STATUS_COLORS = [
  'hsl(142, 71%, 45%)',  // active - green
  'hsl(45, 93%, 47%)',   // inactive - amber
  'hsl(0, 84%, 60%)',    // terminated/resigned - red
];

const ROLE_COLORS = [
  'hsl(217, 91%, 60%)', // blue
  'hsl(142, 71%, 45%)', // green
  'hsl(280, 67%, 55%)', // purple
  'hsl(25, 95%, 53%)',  // orange
  'hsl(174, 72%, 40%)', // teal
  'hsl(346, 77%, 50%)', // pink
];

const CustomTooltip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-popover px-3 py-1.5 text-xs shadow-md">
      <span className="font-medium">{payload[0].name}</span>: {payload[0].value}
    </div>
  );
};

const StaffDistributionChart = ({
  activeGuards,
  inactiveGuards,
  terminatedGuards,
  staffByRole,
}: StaffDistributionChartProps) => {
  const statusData = [
    { name: 'Active', value: activeGuards },
    { name: 'Inactive', value: inactiveGuards },
    { name: 'Terminated/Resigned', value: terminatedGuards },
  ].filter(d => d.value > 0);

  const roleData = Object.entries(staffByRole)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const totalStaff = activeGuards + inactiveGuards + terminatedGuards;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Staff Overview</CardTitle>
        <CardDescription>{totalStaff} total staff members</CardDescription>
      </CardHeader>
      <CardContent>
        {totalStaff === 0 ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            No staff data available
          </div>
        ) : (
          <div className="space-y-4">
            {/* Status donut */}
            <div className="flex items-center gap-4">
              <div className="w-24 h-24 flex-shrink-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={25}
                      outerRadius={40}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {statusData.map((_, i) => (
                        <Cell key={i} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex-1 space-y-1.5">
                {statusData.map((item, i) => (
                  <div key={item.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: STATUS_COLORS[i] }}
                      />
                      <span className="text-muted-foreground">{item.name}</span>
                    </div>
                    <span className="font-medium tabular-nums">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Role breakdown */}
            {roleData.length > 0 && (
              <div className="border-t pt-3">
                <p className="text-xs font-medium text-muted-foreground mb-2">By Role (Active)</p>
                <div className="space-y-1.5">
                  {roleData.slice(0, 5).map((role, i) => {
                    const pct = activeGuards > 0 ? Math.round((role.value / activeGuards) * 100) : 0;
                    return (
                      <div key={role.name} className="space-y-0.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground truncate">{role.name}</span>
                          <span className="font-medium tabular-nums ml-2">{role.value}</span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{
                              width: `${pct}%`,
                              backgroundColor: ROLE_COLORS[i % ROLE_COLORS.length],
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StaffDistributionChart;
