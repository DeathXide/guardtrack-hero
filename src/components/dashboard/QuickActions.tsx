import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  ClipboardCheck,
  Users,
  MapPin,
  FileText,
  BarChart3,
  Shirt,
} from 'lucide-react';

const actions = [
  { label: 'Attendance', icon: ClipboardCheck, to: '/attendance', color: 'text-emerald-500' },
  { label: 'Staff', icon: Users, to: '/guards', color: 'text-blue-500' },
  { label: 'Sites', icon: MapPin, to: '/sites', color: 'text-violet-500' },
  { label: 'Invoices', icon: FileText, to: '/invoices', color: 'text-indigo-500' },
  { label: 'Reports', icon: BarChart3, to: '/reports', color: 'text-amber-500' },
  { label: 'Uniforms', icon: Shirt, to: '/uniforms', color: 'text-rose-500' },
];

const QuickActions = () => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
          {actions.map(({ label, icon: Icon, to, color }) => (
            <Link
              key={to}
              to={to}
              className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-muted/50 active:bg-muted/70 transition-colors group"
            >
              <div className="p-2.5 rounded-lg bg-muted group-hover:bg-muted/80 transition-colors">
                <Icon className={`h-5 w-5 ${color}`} />
              </div>
              <span className="text-sm font-medium text-muted-foreground group-hover:text-foreground transition-colors">
                {label}
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
