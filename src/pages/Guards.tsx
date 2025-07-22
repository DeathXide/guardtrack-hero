import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { User, Search, Phone, Mail, Shield, Edit, Trash, UserPlus, DollarSign, Plus, Minus, CalendarDays, History } from 'lucide-react';
import { Guard, PaymentRecord, MonthlyEarning } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  guardsApi, 
  paymentsApi, 
  guardUtils,
  type Guard as SupabaseGuard,
  type CreateGuardData,
  type CreatePaymentData
} from '@/lib/guardsApi';

// Mapping functions between Supabase types and local types
const mapSupabaseGuardToLocal = (supabaseGuard: SupabaseGuard): Guard => {
  return {
    id: supabaseGuard.id,
    name: supabaseGuard.name,
    dateOfBirth: supabaseGuard.dob,
    gender: supabaseGuard.gender,
    languagesSpoken: supabaseGuard.languages || [],
    guardPhoto: supabaseGuard.guard_photo_url || '',
    aadhaarNumber: supabaseGuard.aadhaar_number || '',
    aadhaarCardPhoto: supabaseGuard.aadhaar_card_photo_url || '',
    panCard: supabaseGuard.pan_card_number || '',
    phone: supabaseGuard.phone_number,
    alternatePhone: supabaseGuard.alternate_phone_number || '',
    currentAddress: supabaseGuard.current_address || '',
    permanentAddress: supabaseGuard.permanent_address || '',
    type: supabaseGuard.guard_type,
    status: supabaseGuard.status,
    payRate: Number(supabaseGuard.monthly_pay_rate),
    bankName: supabaseGuard.bank_name || '',
    accountNumber: supabaseGuard.account_number || '',
    ifscCode: supabaseGuard.ifsc_code || '',
    upiId: supabaseGuard.upi_id || '',
    badgeNumber: supabaseGuard.badge_number,
    created_at: supabaseGuard.created_at
  };
};

const mapLocalGuardToSupabase = (localGuard: any): CreateGuardData => {
  return {
    name: localGuard.name,
    dob: localGuard.dateOfBirth,
    gender: localGuard.gender,
    languages: localGuard.languagesSpoken || [],
    guard_photo_url: localGuard.guardPhoto,
    aadhaar_number: localGuard.aadhaarNumber,
    aadhaar_card_photo_url: localGuard.aadhaarCardPhoto,
    pan_card_number: localGuard.panCard,
    phone_number: localGuard.phone,
    alternate_phone_number: localGuard.alternatePhone,
    current_address: localGuard.currentAddress,
    permanent_address: localGuard.permanentAddress,
    guard_type: localGuard.type,
    status: localGuard.status,
    monthly_pay_rate: Number(localGuard.payRate),
    bank_name: localGuard.bankName,
    account_number: localGuard.accountNumber,
    ifsc_code: localGuard.ifscCode,
    upi_id: localGuard.upiId
  };
};
import GuardForm from '@/components/forms/GuardForm';

const Guards = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGuardId, setSelectedGuardId] = useState<string | null>(null);
  const [guardType, setGuardType] = useState<'permanent' | 'contract'>('permanent');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentType, setPaymentType] = useState<'bonus' | 'deduction'>('bonus');
  const [selectedGuard, setSelectedGuard] = useState<SupabaseGuard | null>(null);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  const [guardEarnings, setGuardEarnings] = useState<Record<string, MonthlyEarning>>({});
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [paymentHistoryTab, setPaymentHistoryTab] = useState('new');

  const { data: guardList = [], isLoading } = useQuery({
    queryKey: ['guards'],
    queryFn: () => guardsApi.getAllGuards()
  });

  const { data: paymentHistory = [] } = useQuery({
    queryKey: ['payments', selectedGuard?.id],
    queryFn: () => selectedGuard ? paymentsApi.getPaymentsByGuardId(selectedGuard.id) : Promise.resolve([]),
    enabled: !!selectedGuard
  });

  const [selectedGuardForForm, setSelectedGuardForForm] = useState<Guard | undefined>(undefined);

  const createGuardMutation = useMutation({
    mutationFn: (guardData: any) => {
      const supabaseGuardData = mapLocalGuardToSupabase(guardData);
      return guardsApi.createGuard(supabaseGuardData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({
        title: "Guard Added",
        description: "Guard has been successfully added",
      });
      handleDialogClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to add guard: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const updateGuardMutation = useMutation({
    mutationFn: ({ id, guard }: { id: string; guard: any }) => {
      const supabaseGuardData = mapLocalGuardToSupabase(guard);
      return guardsApi.updateGuard(id, supabaseGuardData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({
        title: "Guard Updated",
        description: "Guard has been successfully updated",
      });
      handleDialogClose();
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update guard: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const deleteGuardMutation = useMutation({
    mutationFn: (id: string) => guardsApi.deleteGuard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({
        title: "Guard Deleted",
        description: "The guard has been successfully removed",
      });
      setDeleteDialogOpen(false);
      setSelectedGuardId(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete guard: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const createPaymentMutation = useMutation({
    mutationFn: (paymentData: CreatePaymentData) => paymentsApi.createPayment(paymentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', selectedGuard?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-payments', currentMonth] });
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({
        title: paymentType === 'deduction' ? "Deduction Recorded" : "Bonus Recorded",
        description: `${paymentType === 'deduction' ? 'Deduction' : 'Bonus'} of ${formatCurrency(parseFloat(paymentAmount))} recorded for ${selectedGuard?.name}`,
      });
      setIsPaymentDialogOpen(false);
      setPaymentAmount('');
      setPaymentNote('');
      setEditingPayment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to record payment: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, payment }: { id: string; payment: any }) => 
      paymentsApi.updatePayment(id, payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', selectedGuard?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-payments', currentMonth] });
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({
        title: "Payment Updated",
        description: "Payment record has been successfully updated",
      });
      setIsPaymentDialogOpen(false);
      setEditingPayment(null);
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to update payment: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', selectedGuard?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-payments', currentMonth] });
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({
        title: "Payment Deleted",
        description: "Payment record has been successfully deleted",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete payment: ${error.message}`,
        variant: "destructive"
      });
    }
  });

  // Badge numbers are now auto-generated by the database trigger

  const calculateShiftRate = (monthlyRate: number) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return monthlyRate / daysInMonth;
  };

  const handleEditGuard = (guard: SupabaseGuard) => {
    const localGuard = mapSupabaseGuardToLocal(guard);
    setSelectedGuardForForm(localGuard);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handlePaymentDialog = (guard: SupabaseGuard) => {
    setSelectedGuard(guard);
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentType('bonus');
    setEditingPayment(null);
    setPaymentHistoryTab('new');
    setIsPaymentDialogOpen(true);
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setPaymentAmount(payment.amount.toString());
    setPaymentNote(payment.note || '');
    setPaymentType(payment.payment_type);
    setPaymentHistoryTab('new');
  };

  const handleSavePayment = () => {
    if (!selectedGuard || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Invalid Payment",
        description: "Please enter a valid payment amount",
        variant: "destructive"
      });
      return;
    }

    const paymentData: CreatePaymentData = {
      guard_id: selectedGuard.id,
      amount: parseFloat(paymentAmount),
      note: paymentNote || undefined,
      payment_type: paymentType,
      payment_date: new Date().toISOString().split('T')[0],
      payment_month: currentMonth
    };

    if (editingPayment) {
      updatePaymentMutation.mutate({ id: editingPayment.id, payment: paymentData });
    } else {
      createPaymentMutation.mutate(paymentData);
    }
  };

  const handleDeleteClick = (guardId: string) => {
    setSelectedGuardId(guardId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (selectedGuardId) {
      deleteGuardMutation.mutate(selectedGuardId);
    }
  };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setSelectedGuardForForm(undefined);
  };

  const handleFormSubmit = (data: any) => {
    if (isEditMode && selectedGuardForForm) {
      updateGuardMutation.mutate({ 
        id: selectedGuardForForm.id, 
        guard: data
      });
    } else {
      createGuardMutation.mutate(data);
    }
  };

  const filteredGuards = guardList.filter(guard => 
    (guard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     guard.badge_number.includes(searchTerm)) &&
    (guardType === 'permanent' ? 
      guard.guard_type === 'permanent' || !guard.guard_type : 
      guard.guard_type === 'contract')
  );

  const getCurrentMonthEarnings = (guard: SupabaseGuard): MonthlyEarning => {
    return guardEarnings[guard.id] || {
      month: currentMonth,
      totalShifts: 0,
      baseSalary: 0,
      bonuses: 0,
      deductions: 0,
      netAmount: 0
    };
  };

  // Query to track payments and trigger earnings recalculation
  const { data: allPayments } = useQuery({
    queryKey: ['all-payments', currentMonth],
    queryFn: () => paymentsApi.getPaymentsByMonth(currentMonth),
    enabled: guardList.length > 0
  });

  useEffect(() => {
    const fetchAllGuardEarnings = async () => {
      console.log('Fetching guard earnings for month:', currentMonth);
      const earningsMap: Record<string, MonthlyEarning> = {};
      
      for (const guard of guardList) {
        try {
          const result = await paymentsApi.getGuardMonthlySummary(guard.id, currentMonth);
          console.log(`Guard ${guard.name} earnings:`, result);
          earningsMap[guard.id] = {
            month: currentMonth,
            totalShifts: 0, // This would need shift data if available
            baseSalary: result.baseSalary,
            bonuses: result.totalBonus,
            deductions: result.totalDeduction,
            netAmount: result.netAmount // Now includes base salary + bonuses - deductions
          };
        } catch (error) {
          console.error('Error fetching monthly earnings for guard:', error);
          earningsMap[guard.id] = {
            month: currentMonth,
            totalShifts: 0,
            baseSalary: guard.monthly_pay_rate || 0,
            bonuses: 0,
            deductions: 0,
            netAmount: guard.monthly_pay_rate || 0 // Base salary when no payments
          };
        }
      }
      
      setGuardEarnings(earningsMap);
    };
    
    if (guardList.length > 0) {
      fetchAllGuardEarnings();
    }
  }, [guardList, currentMonth, allPayments]);

  const formatCurrency = guardUtils.formatCurrency;

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Guards</h2>
            <p className="text-muted-foreground">Loading guards...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Guards</h2>
          <p className="text-muted-foreground">
            Manage security personnel and their details
          </p>
        </div>
        
        <Button onClick={() => setIsDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Guard
        </Button>
      </div>
      
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name, email or badge number..."
            className="pl-8"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Tabs defaultValue="permanent" className="w-full md:w-auto" onValueChange={(v) => setGuardType(v as 'permanent' | 'contract')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="permanent">Permanent</TabsTrigger>
            <TabsTrigger value="contract">Contract</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredGuards.length === 0 ? (
          <p className="col-span-full text-center py-10 text-muted-foreground">
            No guards found. Try a different search term or add a new guard.
          </p>
        ) : (
          filteredGuards.map(guard => {
            const monthlyEarnings = getCurrentMonthEarnings(guard);
            const shiftRate = guard.monthly_pay_rate ? calculateShiftRate(guard.monthly_pay_rate) : 0;
            
            return (
              <Card key={guard.id} className="overflow-hidden border border-border/60">
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
                  <Badge 
                    variant={guard.status === 'active' ? 'default' : 'secondary'}
                    className={`${guard.status === 'active' ? 'bg-success/80 hover:bg-success/70' : 'bg-muted text-muted-foreground'}`}
                  >
                    {guard.status === 'active' ? 'Active' : 'Inactive'}
                  </Badge>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center text-sm">
                      <Shield className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Badge:</span>
                      <span className="font-medium ml-2">{guard.badge_number}</span>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{guard.phone_number}</span>
                    </div>
                    
                    
                    <div className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Monthly Rate:</span>
                      <span className="font-medium ml-2">{formatCurrency(guard.monthly_pay_rate || 0)}</span>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Shift Rate:</span>
                      <span className="font-medium ml-2">{formatCurrency(shiftRate)}</span>
                    </div>
                    
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Current Month Summary</span>
                        <Badge variant="outline" className="text-xs">
                          {format(new Date(currentMonth + '-01'), 'MMMM yyyy')}
                        </Badge>
                      </div>
                      
                      <div className="space-y-1 mt-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center">
                            <span>Shifts worked:</span>
                          </span>
                          <span>{monthlyEarnings.totalShifts} shifts</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Salary earned:</span>
                          <span>{formatCurrency(monthlyEarnings.baseSalary)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center">
                            <Plus className="h-3 w-3 mr-1 text-green-500" />
                            Bonuses:
                          </span>
                          <span className="text-green-500">+{formatCurrency(monthlyEarnings.bonuses)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground flex items-center">
                            <Minus className="h-3 w-3 mr-1 text-red-500" />
                            Deductions:
                          </span>
                          <span className="text-red-500">-{formatCurrency(monthlyEarnings.deductions)}</span>
                        </div>
                        <div className="flex justify-between pt-1 border-t font-medium">
                          <span>Net Total:</span>
                          <span>{formatCurrency(monthlyEarnings.netAmount)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => handlePaymentDialog(guard)}>
                        <DollarSign className="h-3.5 w-3.5 mr-1" />
                        Record Payment
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 px-2" onClick={() => handleEditGuard(guard)}>
                        <Edit className="h-3.5 w-3.5 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 px-2 text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30" onClick={() => handleDeleteClick(guard.id)}>
                        <Trash className="h-3.5 w-3.5 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
      
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Guard' : 'Add New Guard'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Update guard profile and details' 
                : 'Create a comprehensive security guard profile'}
            </DialogDescription>
          </DialogHeader>
          <GuardForm
            guard={selectedGuardForForm}
            onSubmit={handleFormSubmit}
            onCancel={handleDialogClose}
            isLoading={createGuardMutation.isPending || updateGuardMutation.isPending}
            isEditMode={isEditMode}
          />
        </DialogContent>
      </Dialog>
      
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Management - {selectedGuard?.name}</DialogTitle>
            <DialogDescription>
              Record new payments and manage payment history
            </DialogDescription>
          </DialogHeader>
          
          <Tabs value={paymentHistoryTab} onValueChange={setPaymentHistoryTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="new">
                {editingPayment ? 'Edit Payment' : 'New Payment'}
              </TabsTrigger>
              <TabsTrigger value="history">
                <History className="h-4 w-4 mr-2" />
                Payment History
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="new" className="space-y-4 mt-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="payment-type">Payment Type</Label>
                  <Select 
                    value={paymentType} 
                    onValueChange={(value) => setPaymentType(value as 'bonus' | 'deduction')}
                  >
                    <SelectTrigger id="payment-type">
                      <SelectValue placeholder="Select payment type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="bonus">Bonus Payment</SelectItem>
                      <SelectItem value="deduction">Deduction/Advance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-amount">
                    {paymentType === 'deduction' ? 'Deduction Amount (INR)' : 'Bonus Amount (INR)'}
                  </Label>
                  <Input 
                    id="payment-amount" 
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="Enter amount" 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="payment-note">Note (Optional)</Label>
                  <Input 
                    id="payment-note" 
                    placeholder={
                      paymentType === 'deduction' ? 'Reason for deduction' : 'Reason for bonus'
                    }
                    value={paymentNote}
                    onChange={(e) => setPaymentNote(e.target.value)}
                  />
                </div>
                
                <div className="bg-muted p-3 rounded-md text-sm">
                  <div className="font-medium mb-1">Current Month Summary</div>
                  <div className="grid grid-cols-2 gap-1">
                    <span className="text-muted-foreground">Month:</span>
                    <span>{format(new Date(currentMonth + '-01'), 'MMMM yyyy')}</span>
                    
                    <span className="text-muted-foreground">Shifts Worked:</span>
                    <span>{selectedGuard ? getCurrentMonthEarnings(selectedGuard).totalShifts : 0}</span>
                    
                    <span className="text-muted-foreground">Salary Earned:</span>
                    <span>{selectedGuard ? formatCurrency(getCurrentMonthEarnings(selectedGuard).baseSalary) : formatCurrency(0)}</span>
                    
                    <span className="text-muted-foreground">Total Bonuses:</span>
                    <span className="text-green-500">{selectedGuard ? formatCurrency(getCurrentMonthEarnings(selectedGuard).bonuses) : formatCurrency(0)}</span>
                    
                    <span className="text-muted-foreground">Total Deductions:</span>
                    <span className="text-red-500">{selectedGuard ? formatCurrency(getCurrentMonthEarnings(selectedGuard).deductions) : formatCurrency(0)}</span>
                    
                    <span className="font-medium border-t pt-1 mt-1">Net Amount:</span>
                    <span className="font-medium border-t pt-1 mt-1">{selectedGuard ? formatCurrency(getCurrentMonthEarnings(selectedGuard).netAmount) : formatCurrency(0)}</span>
                  </div>
                </div>
                
                <div className="flex gap-2 pt-4">
                  <Button variant="outline" onClick={() => {
                    setEditingPayment(null);
                    setPaymentAmount('');
                    setPaymentNote('');
                    setIsPaymentDialogOpen(false);
                  }}>
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleSavePayment}
                    disabled={createPaymentMutation.isPending || updatePaymentMutation.isPending}
                  >
                    {createPaymentMutation.isPending || updatePaymentMutation.isPending 
                      ? 'Saving...' 
                      : editingPayment 
                        ? 'Update Payment' 
                        : (paymentType === 'deduction' ? 'Record Deduction' : 'Record Bonus')
                    }
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="history" className="space-y-4 mt-4">
              <div className="space-y-4">
                {paymentHistory.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No payment history found</p>
                    <p className="text-sm">Add payments to see them here</p>
                  </div>
                ) : (
                  <div className="border rounded-md">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Note</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {paymentHistory.map((payment) => (
                          <TableRow key={payment.id}>
                            <TableCell className="font-medium">
                              {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                            </TableCell>
                            <TableCell>
                              <Badge variant={payment.payment_type === 'bonus' ? 'default' : 'destructive'}>
                                {payment.payment_type === 'bonus' ? 'Bonus' : 'Deduction'}
                              </Badge>
                            </TableCell>
                            <TableCell className={payment.payment_type === 'bonus' ? 'text-green-500' : 'text-red-500'}>
                              {payment.payment_type === 'bonus' ? '+' : '-'}{formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell className="max-w-32 truncate">
                              {payment.note || '-'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 px-2"
                                  onClick={() => handleEditPayment(payment)}
                                >
                                  <Edit className="h-3 w-3" />
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm" 
                                  className="h-8 px-2 text-destructive border-destructive/30 hover:bg-destructive/10"
                                  onClick={() => deletePaymentMutation.mutate(payment.id)}
                                  disabled={deletePaymentMutation.isPending}
                                >
                                  <Trash className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the guard and all associated records.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleteDialogOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteGuardMutation.isPending}
            >
              {deleteGuardMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Guards;
