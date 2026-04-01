import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, Phone, MapPin, CreditCard, Calendar, DollarSign, Briefcase, Shield, Languages, Shirt } from 'lucide-react';
import { Guard, paymentsApi, guardUtils } from '@/lib/guardsApi';
import { format, subMonths } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { ShiftTrackingCard } from './ShiftTrackingCard';
import { GuardUniformTab } from '@/components/uniforms/GuardUniformTab';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { m, AnimatePresence } from 'motion/react';

interface GuardDetailViewProps {
  guard: Guard;
  onBack: () => void;
  onEdit: (guard: Guard) => void;
  onPayment: (guard: Guard) => void;
  isEmbedded?: boolean;
}

// Compact info row component
const InfoRow = ({ icon: Icon, label, value, badge, badgeVariant }: {
  icon?: React.ElementType;
  label: string;
  value?: string | number | null;
  badge?: string;
  badgeVariant?: 'default' | 'secondary' | 'destructive' | 'outline';
}) => (
  <div className="flex items-center justify-between py-2.5 border-b border-border/40 last:border-0">
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      {Icon && <Icon className="h-3.5 w-3.5" />}
      {label}
    </div>
    {badge ? (
      <Badge variant={badgeVariant || 'secondary'} className="text-xs capitalize">{badge}</Badge>
    ) : (
      <span className={`text-sm font-medium ${!value ? 'text-muted-foreground' : ''}`}>
        {value || 'Not provided'}
      </span>
    )}
  </div>
);

// Stat pill component for payment summary
const StatPill = ({ label, value, color }: { label: string; value: string; color?: string }) => (
  <div className="flex flex-col items-center p-3 rounded-lg bg-muted/50 flex-1 min-w-0">
    <span className="text-xs text-muted-foreground truncate">{label}</span>
    <span className={`text-sm font-bold mt-0.5 ${color || ''}`}>{value}</span>
  </div>
);

export const GuardDetailView: React.FC<GuardDetailViewProps> = ({
  guard,
  onBack,
  onEdit,
  onPayment,
  isEmbedded = false
}) => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return { value: format(date, 'yyyy-MM'), label: format(date, 'MMMM yyyy') };
  });

  const { data: monthlyPayments = [] } = useQuery({
    queryKey: ['guard-payments', guard.id, selectedMonth],
    queryFn: () => paymentsApi.getPaymentsByGuardId(guard.id).then(payments =>
      payments.filter(p => p.payment_month === selectedMonth)
    )
  });

  const { data: monthlyEarnings } = useQuery({
    queryKey: ['guard-monthly-summary', guard.id, selectedMonth],
    queryFn: () => paymentsApi.getGuardMonthlySummary(guard.id, selectedMonth)
  });

  const statusVariant = guard.status === 'active' ? 'outline' as const
    : (guard.status === 'terminated' || guard.status === 'resigned') ? 'destructive' as const
    : 'secondary' as const;
  const statusClass = guard.status === 'active' ? 'bg-green-500/10 text-green-600' : '';

  return (
    <div className="space-y-0">
      {/* Non-embedded header */}
      {!isEmbedded && (
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{guard.name}</h2>
            <p className="text-muted-foreground">{guard.badge_number}</p>
          </div>
          <div className="ml-auto flex gap-2">
            <Button variant="outline" onClick={() => onEdit(guard)}>Edit</Button>
            <Button onClick={() => onPayment(guard)}>
              <DollarSign className="h-4 w-4 mr-2" />Payment
            </Button>
          </div>
        </div>
      )}

      <Tabs defaultValue="details">
        <TabsList className={`w-full grid grid-cols-4 ${isEmbedded ? '' : ''}`}>
          <TabsTrigger value="details" className="text-xs">Overview</TabsTrigger>
          <TabsTrigger value="attendance" className="text-xs">Attendance</TabsTrigger>
          <TabsTrigger value="payments" className="text-xs">Payments</TabsTrigger>
          <TabsTrigger value="uniform" className="text-xs">Uniform</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="mt-4 space-y-6">
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-6"
          >
            {/* Personal Section */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Personal</h4>
              <div className="rounded-lg border bg-card">
                <div className="px-4">
                  <InfoRow icon={User} label="Full Name" value={guard.name} />
                  <InfoRow icon={Calendar} label="Date of Birth" value={guard.dob ? format(new Date(guard.dob), 'dd MMM yyyy') : null} />
                  <InfoRow label="Gender" value={guard.gender} />
                  <InfoRow icon={Languages} label="Languages" value={guard.languages?.join(', ') || null} />
                </div>
              </div>
            </div>

            {/* Employment Section */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Employment</h4>
              <div className="rounded-lg border bg-card">
                <div className="px-4">
                  <InfoRow icon={Briefcase} label="Staff Role" badge={guard.staff_role || 'Security Guard'} />
                  <InfoRow label="Employment Type" badge={guard.guard_type || 'Permanent'} badgeVariant={guard.guard_type === 'contract' ? 'outline' : 'default'} />
                  <InfoRow icon={Shield} label="Status" badge={guard.status} badgeVariant={statusVariant} />
                  <InfoRow label="Badge Number" value={guard.badge_number} />
                  <InfoRow icon={Shirt} label="Uniform" badge={guard.uniform_issued ? 'Issued' : 'Not Issued'} badgeVariant={guard.uniform_issued ? 'default' : 'outline'} />
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contact</h4>
              <div className="rounded-lg border bg-card">
                <div className="px-4">
                  <InfoRow icon={Phone} label="Phone" value={guard.phone_number} />
                  {guard.alternate_phone_number && <InfoRow label="Alt. Phone" value={guard.alternate_phone_number} />}
                  <InfoRow icon={MapPin} label="Address" value={guard.current_address || null} />
                  {guard.permanent_address && <InfoRow label="Permanent Address" value={guard.permanent_address} />}
                </div>
              </div>
            </div>

            {/* Financial Section */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Financial</h4>
              <div className="rounded-lg border bg-card">
                <div className="px-4">
                  <InfoRow icon={CreditCard} label={guard.per_shift_rate ? 'Per Shift Rate' : 'Monthly Rate'} value={guardUtils.formatCurrency(guard.per_shift_rate || guard.monthly_pay_rate || 0)} />
                  <InfoRow label="Bank" value={guard.bank_name || null} />
                  <InfoRow label="Account No." value={guard.account_number || null} />
                  {guard.ifsc_code && <InfoRow label="IFSC" value={guard.ifsc_code} />}
                  {guard.upi_id && <InfoRow label="UPI ID" value={guard.upi_id} />}
                </div>
              </div>
            </div>
          </m.div>
        </TabsContent>

        <TabsContent value="attendance" className="mt-4">
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            <ShiftTrackingCard
              guardId={guard.id}
              guardName={guard.name}
              currentMonth={selectedMonth}
            />
          </m.div>
        </TabsContent>

        <TabsContent value="payments" className="mt-4 space-y-4">
          <m.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="space-y-4"
          >
            {/* Month selector */}
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
              </h4>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-40 h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map(option => (
                    <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Earnings summary — compact stat pills */}
            {monthlyEarnings && (
              <div className="flex gap-2">
                <StatPill label="Shifts" value={`${monthlyEarnings.shiftsWorked || 0}/${monthlyEarnings.totalShifts || 0}`} />
                <StatPill label="Earned" value={guardUtils.formatCurrency(monthlyEarnings.shiftBasedSalary || 0)} />
                <StatPill label="Bonus" value={`+${guardUtils.formatCurrency(monthlyEarnings.totalBonus || 0)}`} color="text-green-600" />
                <StatPill label="Deduct" value={`-${guardUtils.formatCurrency(monthlyEarnings.totalDeduction || 0)}`} color="text-red-600" />
              </div>
            )}

            {/* Net amount highlight */}
            {monthlyEarnings && (
              <div className="flex items-center justify-between p-3 rounded-lg bg-primary/5 border">
                <span className="text-sm font-medium">Net Amount</span>
                <span className="text-lg font-bold">{guardUtils.formatCurrency(monthlyEarnings.netAmount || 0)}</span>
              </div>
            )}

            {/* Transaction list */}
            <div>
              <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Transactions</h4>
              {monthlyPayments.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No transactions for this month
                </div>
              ) : (
                <div className="space-y-2">
                  {monthlyPayments.map(payment => (
                    <div key={payment.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${payment.payment_type === 'bonus' ? 'bg-green-500/10 text-green-600' : 'bg-red-500/10 text-red-600'}`}>
                          {payment.payment_type === 'bonus' ? '+' : '-'}
                        </div>
                        <div>
                          <div className="text-sm font-medium capitalize">
                            {payment.payment_type === 'bonus'
                              ? (payment.bonus_category || 'Bonus')
                              : (payment.deduction_category || 'Deduction')
                            }
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                            {payment.note && ` · ${payment.note}`}
                          </div>
                        </div>
                      </div>
                      <span className={`text-sm font-bold ${payment.payment_type === 'bonus' ? 'text-green-600' : 'text-red-600'}`}>
                        {payment.payment_type === 'bonus' ? '+' : '-'}{guardUtils.formatCurrency(payment.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </m.div>
        </TabsContent>
        <TabsContent value="uniform" className="mt-4">
          <GuardUniformTab guardId={guard.id} guardName={guard.name} />
        </TabsContent>
      </Tabs>
    </div>
  );
};
