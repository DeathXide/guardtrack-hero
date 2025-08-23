import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, User, Phone, MapPin, CreditCard, Calendar, DollarSign } from 'lucide-react';
import { Guard, paymentsApi, guardUtils } from '@/lib/guardsApi';
import { format, subMonths } from 'date-fns';
import { useQuery } from '@tanstack/react-query';
import { ShiftTrackingCard } from './ShiftTrackingCard';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface GuardDetailViewProps {
  guard: Guard;
  onBack: () => void;
  onEdit: (guard: Guard) => void;
  onPayment: (guard: Guard) => void;
}

export const GuardDetailView: React.FC<GuardDetailViewProps> = ({
  guard,
  onBack,
  onEdit,
  onPayment
}) => {
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  // Generate last 12 months for selection
  const monthOptions = Array.from({ length: 12 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return {
      value: format(date, 'yyyy-MM'),
      label: format(date, 'MMMM yyyy')
    };
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Overview
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{guard.name}</h2>
          <p className="text-muted-foreground">Badge: {guard.badge_number}</p>
        </div>
        <div className="ml-auto flex gap-2">
          <Button variant="outline" onClick={() => onEdit(guard)}>
            Edit Details
          </Button>
          <Button onClick={() => onPayment(guard)}>
            <DollarSign className="h-4 w-4 mr-2" />
            Record Payment
          </Button>
        </div>
      </div>

      <Tabs defaultValue="details" className="space-y-6">
        <TabsList>
          <TabsTrigger value="details">Personal Details</TabsTrigger>
          <TabsTrigger value="attendance">Attendance & Shifts</TabsTrigger>
          <TabsTrigger value="payments">Payment History</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Personal Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Name</label>
                    <p className="font-medium">{guard.name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Date of Birth</label>
                    <p className="font-medium">{format(new Date(guard.dob), 'dd MMM yyyy')}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Gender</label>
                    <p className="font-medium capitalize">{guard.gender}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Guard Type</label>
                    <Badge variant={guard.guard_type === 'contract' ? 'outline' : 'default'}>
                      {guard.guard_type || 'Permanent'}
                    </Badge>
                  </div>
                </div>
                
                <div>
                  <label className="text-sm text-muted-foreground">Languages</label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {guard.languages?.map((lang, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">
                        {lang}
                      </Badge>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Phone className="h-5 w-5" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Primary Phone</label>
                  <p className="font-medium">{guard.phone_number}</p>
                </div>
                {guard.alternate_phone_number && (
                  <div>
                    <label className="text-sm text-muted-foreground">Alternate Phone</label>
                    <p className="font-medium">{guard.alternate_phone_number}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Address Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Current Address</label>
                  <p className="font-medium">{guard.current_address}</p>
                </div>
                {guard.permanent_address && (
                  <div>
                    <label className="text-sm text-muted-foreground">Permanent Address</label>
                    <p className="font-medium">{guard.permanent_address}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Financial Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm text-muted-foreground">Monthly Pay Rate</label>
                  <p className="font-medium text-lg">{guardUtils.formatCurrency(guard.monthly_pay_rate)}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm text-muted-foreground">Bank Name</label>
                    <p className="font-medium">{guard.bank_name}</p>
                  </div>
                  <div>
                    <label className="text-sm text-muted-foreground">Account Number</label>
                    <p className="font-medium">{guard.account_number}</p>
                  </div>
                </div>
                {guard.ifsc_code && (
                  <div>
                    <label className="text-sm text-muted-foreground">IFSC Code</label>
                    <p className="font-medium">{guard.ifsc_code}</p>
                  </div>
                )}
                {guard.upi_id && (
                  <div>
                    <label className="text-sm text-muted-foreground">UPI ID</label>
                    <p className="font-medium">{guard.upi_id}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="attendance" className="space-y-6">
          <ShiftTrackingCard 
            guardId={guard.id} 
            guardName={guard.name}
            currentMonth={selectedMonth}
          />
        </TabsContent>

        <TabsContent value="payments" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">Payment History</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {monthlyEarnings && (
            <Card>
              <CardHeader>
                <CardTitle>Monthly Summary - {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Shifts Worked</p>
                    <p className="text-xl font-bold">{monthlyEarnings?.shiftsWorked || 0}</p>
                    <p className="text-xs text-muted-foreground">of {monthlyEarnings?.totalShifts || 0} assigned</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Shift Earnings</p>
                    <p className="text-xl font-bold">{guardUtils.formatCurrency(monthlyEarnings?.shiftBasedSalary || 0)}</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Bonuses</p>
                    <p className="text-xl font-bold text-green-600">+{guardUtils.formatCurrency(monthlyEarnings?.totalBonus || 0)}</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Total Deductions</p>
                    <p className="text-xl font-bold text-red-600">-{guardUtils.formatCurrency(monthlyEarnings?.totalDeduction || 0)}</p>
                  </div>
                  <div className="text-center p-4 border rounded-lg bg-primary/5">
                    <p className="text-sm text-muted-foreground">Net Amount</p>
                    <p className="text-xl font-bold">{guardUtils.formatCurrency(monthlyEarnings?.netAmount || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Payment Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              {monthlyPayments.length === 0 ? (
                <p className="text-center py-8 text-muted-foreground">
                  No payment transactions for {format(new Date(selectedMonth + '-01'), 'MMMM yyyy')}
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Note</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {monthlyPayments.map(payment => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.payment_date), 'dd MMM yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={payment.payment_type === 'bonus' ? 'default' : 'destructive'}
                          >
                            {payment.payment_type}
                          </Badge>
                        </TableCell>
                        <TableCell className={payment.payment_type === 'bonus' ? 'text-green-600' : 'text-red-600'}>
                          {payment.payment_type === 'bonus' ? '+' : '-'}{guardUtils.formatCurrency(payment.amount)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {payment.note || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};