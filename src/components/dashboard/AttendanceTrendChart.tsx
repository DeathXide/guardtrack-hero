import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { TrendPoint } from '@/hooks/useDashboardData';

interface AttendanceTrendChartProps {
  data: TrendPoint[];
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload as TrendPoint;
  return (
    <div className="rounded-lg border bg-popover px-3 py-2 text-sm shadow-md">
      <p className="font-medium mb-1">{d?.date}</p>
      <div className="space-y-0.5 text-xs">
        <p>
          <span className="inline-block w-2 h-2 rounded-full bg-primary mr-1.5" />
          Present: <span className="font-medium">{d?.present}</span>
        </p>
        <p>
          <span className="inline-block w-2 h-2 rounded-full bg-muted-foreground/30 mr-1.5" />
          Assigned: <span className="font-medium">{d?.assigned}</span>
        </p>
        <p>
          Rate: <span className="font-medium">{d?.rate}%</span>
        </p>
      </div>
    </div>
  );
};

const AttendanceTrendChart = ({ data }: AttendanceTrendChartProps) => {
  const hasData = data.some(d => d.assigned > 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">7-Day Attendance</CardTitle>
        <CardDescription>Daily attendance rate trend</CardDescription>
      </CardHeader>
      <CardContent>
        {!hasData ? (
          <div className="flex items-center justify-center h-[200px] text-sm text-muted-foreground">
            No attendance data for the past week
          </div>
        ) : (
          <div className="h-[200px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="attendanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  className="fill-muted-foreground"
                />
                <YAxis
                  tick={{ fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  domain={[0, 100]}
                  unit="%"
                  className="fill-muted-foreground"
                />
                <Tooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  fill="url(#attendanceGrad)"
                  dot={{ r: 3, fill: 'hsl(var(--primary))' }}
                  activeDot={{ r: 5 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AttendanceTrendChart;
