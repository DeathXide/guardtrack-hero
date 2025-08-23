import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { User, DollarSign, Edit, Trash, Shield } from 'lucide-react';
import { Guard } from '@/lib/guardsApi';
import { guardUtils } from '@/lib/guardsApi';

interface MonthlyEarning {
  month: string;
  totalShifts: number;
  baseSalary: number;
  bonuses: number;
  deductions: number;
  netAmount: number;
}

interface GuardOverviewCardProps {
  guard: Guard;
  monthlyEarnings: MonthlyEarning;
  onEdit: (guard: Guard) => void;
  onDelete: (guardId: string) => void;
  onPayment: (guard: Guard) => void;
  onViewDetails: (guard: Guard) => void;
}

export const GuardOverviewCard: React.FC<GuardOverviewCardProps> = ({
  guard,
  monthlyEarnings,
  onEdit,
  onDelete,
  onPayment,
  onViewDetails
}) => {
  return (
    <Card className="overflow-hidden border border-border/60 hover:shadow-md transition-shadow">
      <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="text-base font-medium">{guard.name}</CardTitle>
          <Badge 
            variant={guard.guard_type === 'contract' ? 'outline' : 'default'}
            className={`mt-1 ${guard.guard_type === 'contract' ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500' : ''}`}
          >
            {guard.guard_type || 'Permanent'} Guard
          </Badge>
        </div>
        <User className="h-8 w-8 text-muted-foreground" />
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Badge:</span>
            <div className="font-medium">{guard.badge_number}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>
            <Badge 
              variant={guard.status === 'active' ? 'default' : 'secondary'}
              className="ml-1"
            >
              {guard.status}
            </Badge>
          </div>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Shifts Worked:</span>
            <span className="font-medium">{monthlyEarnings.totalShifts}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Shift Earnings:</span>
            <span className="font-medium">{guardUtils.formatCurrency(monthlyEarnings.baseSalary)}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Bonuses:</span>
            <span className="text-green-600 font-medium">+{guardUtils.formatCurrency(monthlyEarnings.bonuses)}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Deductions:</span>
            <span className="text-red-600 font-medium">-{guardUtils.formatCurrency(monthlyEarnings.deductions)}</span>
          </div>
          
          <div className="border-t pt-2">
            <div className="flex items-center justify-between font-medium">
              <span>Net Amount:</span>
              <span className="text-lg">{guardUtils.formatCurrency(monthlyEarnings.netAmount)}</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onViewDetails(guard)}
            className="flex-1"
          >
            <Shield className="h-3 w-3 mr-1" />
            Details
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPayment(guard)}
          >
            <DollarSign className="h-3 w-3" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(guard)}
          >
            <Edit className="h-3 w-3" />
          </Button>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(guard.id)}
            className="hover:bg-destructive hover:text-destructive-foreground"
          >
            <Trash className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};