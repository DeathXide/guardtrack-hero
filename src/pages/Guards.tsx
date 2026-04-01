import React, { useState, useEffect, useMemo } from 'react';
import { usePersistedFilters } from '@/hooks/usePersistedFilters';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Edit, Trash, UserPlus, DollarSign, History, CheckSquare, X, UserCheck, UserX, MoreHorizontal, ArrowUpDown, Phone, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Checkbox } from '@/components/ui/checkbox';
import { Guard, PaymentRecord, MonthlyEarning } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format, subMonths } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Skeleton } from '@/components/ui/skeleton';
import {
  guardsApi,
  paymentsApi,
  guardUtils,
  type Guard as SupabaseGuard,
  type CreateGuardData,
  type CreatePaymentData
} from '@/lib/guardsApi';
import { GuardDetailView } from '@/components/guards/GuardDetailView';
import { ScrollArea } from '@/components/ui/scroll-area';

// Mapping functions between Supabase types and local types
const mapSupabaseGuardToLocal = (supabaseGuard: SupabaseGuard): Guard => {
  return {
    id: supabaseGuard.id,
    name: supabaseGuard.name,
    dateOfBirth: supabaseGuard.dob || '',
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
    staffRole: supabaseGuard.staff_role || 'Security Guard',
    payType: supabaseGuard.per_shift_rate ? 'per_shift' : 'monthly',
    payRate: supabaseGuard.monthly_pay_rate ? Number(supabaseGuard.monthly_pay_rate) : undefined,
    perShiftRate: supabaseGuard.per_shift_rate ? Number(supabaseGuard.per_shift_rate) : undefined,
    bankName: supabaseGuard.bank_name || '',
    accountNumber: supabaseGuard.account_number || '',
    ifscCode: supabaseGuard.ifsc_code || '',
    upiId: supabaseGuard.upi_id || '',
    badgeNumber: supabaseGuard.badge_number,
    uniformIssued: supabaseGuard.uniform_issued || false,
    uniformIssuedDate: supabaseGuard.uniform_issued_date || '',
    created_at: supabaseGuard.created_at
  };
};

const mapLocalGuardToSupabase = (localGuard: any): CreateGuardData => {
  return {
    name: localGuard.name,
    dob: localGuard.dateOfBirth || null,
    gender: localGuard.gender,
    languages: localGuard.languagesSpoken || [],
    guard_photo_url: localGuard.guardPhoto || null,
    aadhaar_number: localGuard.aadhaarNumber || null,
    aadhaar_card_photo_url: localGuard.aadhaarCardPhoto || null,
    pan_card_number: localGuard.panCard || null,
    phone_number: localGuard.phone,
    alternate_phone_number: localGuard.alternatePhone || null,
    current_address: localGuard.currentAddress || null,
    permanent_address: localGuard.permanentAddress || null,
    guard_type: localGuard.type,
    status: localGuard.status,
    staff_role: localGuard.staffRole || 'Security Guard',
    monthly_pay_rate: localGuard.payType === 'monthly' ? Number(localGuard.payRate) : null,
    per_shift_rate: localGuard.payType === 'per_shift' ? Number(localGuard.perShiftRate) : null,
    bank_name: localGuard.bankName || null,
    account_number: localGuard.accountNumber || null,
    ifsc_code: localGuard.ifscCode || null,
    upi_id: localGuard.upiId || null,
    uniform_issued: localGuard.uniformIssued || false,
    uniform_issued_date: localGuard.uniformIssuedDate || null,
  };
};
import GuardForm from '@/components/forms/GuardForm';

const Guards = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const guardFilterDefaults = useMemo(() => ({
    search: '',
    type: 'permanent',
  }), []);
  const { values: guardFilters, setFilter: setGuardFilter } = usePersistedFilters(guardFilterDefaults);
  const searchTerm = guardFilters.search;
  const guardType = guardFilters.type as 'permanent' | 'contract';
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGuardId, setSelectedGuardId] = useState<string | null>(null);
  const [selectedGuardForDetail, setSelectedGuardForDetail] = useState<SupabaseGuard | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentType, setPaymentType] = useState<'bonus' | 'deduction'>('bonus');
  const [deductionCategory, setDeductionCategory] = useState<string>('advance');
  const [bonusCategory, setBonusCategory] = useState<string>('performance');
  const [selectedGuard, setSelectedGuard] = useState<SupabaseGuard | null>(null);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));

  const [guardEarnings, setGuardEarnings] = useState<Record<string, MonthlyEarning>>({});
  const [editingPayment, setEditingPayment] = useState<PaymentRecord | null>(null);
  const [paymentHistoryTab, setPaymentHistoryTab] = useState('new');

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<string>('all');

  // Bulk operations state
  const [selectedGuardIds, setSelectedGuardIds] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [bulkStatusAction, setBulkStatusAction] = useState<{ open: boolean; status: string }>({ open: false, status: '' });
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);

  // Sorting
  const [sortField, setSortField] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  const monthOptions = useMemo(() => Array.from({ length: 6 }, (_, i) => {
    const date = subMonths(new Date(), i);
    return { value: format(date, 'yyyy-MM'), label: format(date, 'MMM yyyy') };
  }), []);

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
  });

  const updateGuardMutation = useMutation({
    mutationFn: ({ id, guard }: { id: string; guard: any }) => {
      const supabaseGuardData = mapLocalGuardToSupabase(guard);
      return guardsApi.updateGuard(id, supabaseGuardData);
    },
  });

  const deleteGuardMutation = useMutation({
    mutationFn: (id: string) => guardsApi.deleteGuard(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({ title: "Staff Deleted", description: "The staff member has been successfully removed" });
      setDeleteDialogOpen(false);
      setSelectedGuardId(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: `Failed to delete: ${error.message}`, variant: "destructive" });
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
      toast({ title: "Error", description: `Failed to record payment: ${error.message}`, variant: "destructive" });
    }
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, payment }: { id: string; payment: any }) => paymentsApi.updatePayment(id, payment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', selectedGuard?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-payments', currentMonth] });
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({ title: "Payment Updated", description: "Payment record has been successfully updated" });
      setIsPaymentDialogOpen(false);
      setEditingPayment(null);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: `Failed to update payment: ${error.message}`, variant: "destructive" });
    }
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => paymentsApi.deletePayment(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['payments', selectedGuard?.id] });
      queryClient.invalidateQueries({ queryKey: ['all-payments', currentMonth] });
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({ title: "Payment Deleted", description: "Payment record has been successfully deleted" });
    },
    onError: (error: any) => {
      toast({ title: "Error", description: `Failed to delete payment: ${error.message}`, variant: "destructive" });
    }
  });

  const bulkUpdateStatusMutation = useMutation({
    mutationFn: async ({ ids, status }: { ids: string[]; status: string }) => {
      return Promise.all(ids.map(id => guardsApi.updateGuard(id, { status } as any)));
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({ title: "Staff Updated", description: `${variables.ids.length} staff member(s) marked as ${variables.status}` });
      setSelectedGuardIds(new Set());
    },
    onError: (error: any) => {
      toast({ title: "Error", description: `Failed to update: ${error.message}`, variant: "destructive" });
    }
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => { await Promise.all(ids.map(id => guardsApi.deleteGuard(id))); },
    onSuccess: (_, ids) => {
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      toast({ title: "Staff Deleted", description: `${ids.length} staff member(s) have been deleted` });
      setSelectedGuardIds(new Set());
      setBulkDeleteDialogOpen(false);
    },
    onError: (error: any) => {
      toast({ title: "Error", description: `Failed to delete: ${error.message}`, variant: "destructive" });
    }
  });

  // Selection helpers
  const toggleGuardSelection = (guardId: string) => {
    setSelectedGuardIds(prev => {
      const next = new Set(prev);
      next.has(guardId) ? next.delete(guardId) : next.add(guardId);
      return next;
    });
  };
  const selectAllFiltered = () => setSelectedGuardIds(new Set(filteredGuards.map(g => g.id)));
  const clearSelection = () => setSelectedGuardIds(new Set());

  // Handlers
  const handleEditGuard = (guard: SupabaseGuard) => {
    setSelectedGuardForForm(mapSupabaseGuardToLocal(guard));
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handlePaymentDialog = (guard: SupabaseGuard) => {
    setSelectedGuard(guard);
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentType('bonus');
    setDeductionCategory('advance');
    setBonusCategory('performance');
    setEditingPayment(null);
    setPaymentHistoryTab('new');
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setIsPaymentDialogOpen(true);
  };

  const handleEditPayment = (payment: any) => {
    setEditingPayment(payment);
    setPaymentAmount(payment.amount.toString());
    setPaymentNote(payment.note || '');
    setPaymentType(payment.payment_type);
    setDeductionCategory(payment.deduction_category || 'advance');
    setBonusCategory(payment.bonus_category || 'performance');
    setPaymentDate(payment.payment_date);
    setPaymentHistoryTab('new');
  };

  const handleSavePayment = () => {
    if (!selectedGuard || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({ title: "Invalid Payment", description: "Please enter a valid payment amount", variant: "destructive" });
      return;
    }
    const paymentData: CreatePaymentData = {
      guard_id: selectedGuard.id,
      amount: parseFloat(paymentAmount),
      note: paymentNote || undefined,
      payment_type: paymentType,
      deduction_category: paymentType === 'deduction' ? deductionCategory : null,
      bonus_category: paymentType === 'bonus' ? bonusCategory : null,
      payment_date: paymentDate,
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

  const confirmDelete = () => { if (selectedGuardId) deleteGuardMutation.mutate(selectedGuardId); };

  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setSelectedGuardForForm(undefined);
  };

  const handleAddGuard = () => {
    setSelectedGuardForForm(undefined);
    setIsEditMode(false);
    setIsDialogOpen(true);
  };

  const handleFormSubmit = async (data: any) => {
    try {
      if (isEditMode && selectedGuardForForm) {
        await updateGuardMutation.mutateAsync({ id: selectedGuardForForm.id, guard: data });
        toast({ title: "Staff Updated", description: "Staff member has been successfully updated" });
      } else {
        await createGuardMutation.mutateAsync(data);
        toast({ title: "Staff Added", description: "Staff member has been successfully added" });
      }
      queryClient.invalidateQueries({ queryKey: ['guards'] });
      handleDialogClose();
    } catch (error: any) {
      toast({ title: "Error", description: error.message || "Failed to save", variant: "destructive" });
      throw error;
    }
  };

  // Sorting helper
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  // Filter + Sort
  const filteredGuards = useMemo(() => {
    let result = guardList.filter(guard =>
      (guard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
       guard.badge_number.includes(searchTerm)) &&
      (guardType === 'permanent' ?
        guard.guard_type === 'permanent' || !guard.guard_type :
        guard.guard_type === 'contract') &&
      (statusFilter === 'all' || guard.status === statusFilter) &&
      (roleFilter === 'all' || guard.staff_role === roleFilter)
    );

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') cmp = a.name.localeCompare(b.name);
      else if (sortField === 'role') cmp = (a.staff_role || '').localeCompare(b.staff_role || '');
      else if (sortField === 'status') cmp = a.status.localeCompare(b.status);
      else if (sortField === 'shifts') {
        const sa = guardEarnings[a.id]?.totalShifts || 0;
        const sb = guardEarnings[b.id]?.totalShifts || 0;
        cmp = sa - sb;
      } else if (sortField === 'net') {
        const na = guardEarnings[a.id]?.netAmount || 0;
        const nb = guardEarnings[b.id]?.netAmount || 0;
        cmp = na - nb;
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [guardList, searchTerm, guardType, statusFilter, roleFilter, sortField, sortDir, guardEarnings]);

  const getCurrentMonthEarnings = (guard: SupabaseGuard): MonthlyEarning => {
    return guardEarnings[guard.id] || { month: currentMonth, totalShifts: 0, baseSalary: 0, bonuses: 0, deductions: 0, netAmount: 0 };
  };

  // Fetch earnings in parallel
  const { data: allPayments } = useQuery({
    queryKey: ['all-payments', currentMonth],
    queryFn: () => paymentsApi.getPaymentsByMonth(currentMonth),
    enabled: guardList.length > 0
  });

  useEffect(() => {
    const fetchAllGuardEarnings = async () => {
      const earningsMap: Record<string, MonthlyEarning> = {};
      const results = await Promise.allSettled(
        guardList.map(guard =>
          paymentsApi.getGuardMonthlySummary(guard.id, currentMonth)
            .then(result => ({ guardId: guard.id, result }))
        )
      );
      results.forEach((entry, idx) => {
        if (entry.status === 'fulfilled') {
          const { guardId, result } = entry.value;
          earningsMap[guardId] = {
            month: currentMonth,
            totalShifts: result.shiftsWorked || 0,
            baseSalary: result.shiftBasedSalary || 0,
            bonuses: result.totalBonus,
            deductions: result.totalDeduction,
            netAmount: result.netAmount
          };
        } else {
          earningsMap[guardList[idx].id] = { month: currentMonth, totalShifts: 0, baseSalary: 0, bonuses: 0, deductions: 0, netAmount: 0 };
        }
      });
      setGuardEarnings(earningsMap);
    };
    if (guardList.length > 0) fetchAllGuardEarnings();
  }, [guardList, currentMonth, allPayments]);

  const formatCurrency = guardUtils.formatCurrency;

  const statusBadge = (status: string) => {
    if (status === 'active') return <Badge variant="outline" className="bg-green-500/10 text-green-600 capitalize">{status}</Badge>;
    if (status === 'terminated' || status === 'resigned') return <Badge variant="destructive" className="capitalize">{status}</Badge>;
    return <Badge variant="secondary" className="capitalize">{status}</Badge>;
  };

  const SortHeader = ({ field, children }: { field: string; children: React.ReactNode }) => (
    <TableHead className="cursor-pointer select-none hover:bg-muted/50" onClick={() => handleSort(field)}>
      <div className="flex items-center gap-1">
        {children}
        <ArrowUpDown className={`h-3 w-3 ${sortField === field ? 'text-foreground' : 'text-muted-foreground/40'}`} />
      </div>
    </TableHead>
  );

  // Loading
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-28" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-10 flex-1" />
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="border rounded-lg">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 border-b last:border-0">
              <Skeleton className="h-4 w-4" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-5 w-24 rounded-full" />
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-8 ml-auto" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isAllSelected = filteredGuards.length > 0 && filteredGuards.every(g => selectedGuardIds.has(g.id));

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Staff <span className="text-muted-foreground font-normal text-lg">({filteredGuards.length})</span></h2>
          <p className="text-sm text-muted-foreground">Manage staff members, payments, and assignments</p>
        </div>
        <Button onClick={handleAddGuard}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search by name or badge number..."
            className="pl-9 h-11"
            defaultValue={searchTerm}
            onChange={e => setGuardFilter('search', e.target.value, 300)}
          />
        </div>
        <Tabs value={guardType} className="w-auto" onValueChange={(v) => setGuardFilter('type', v)}>
          <TabsList className="h-11">
            <TabsTrigger value="permanent" className="text-sm h-9 px-4">Permanent</TabsTrigger>
            <TabsTrigger value="contract" className="text-sm h-9 px-4">Contract</TabsTrigger>
          </TabsList>
        </Tabs>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-11"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
            <SelectItem value="resigned">Resigned</SelectItem>
          </SelectContent>
        </Select>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[150px] h-11"><SelectValue placeholder="Role" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="Security Guard">Security Guard</SelectItem>
            <SelectItem value="Supervisor">Supervisor</SelectItem>
            <SelectItem value="Housekeeping">Housekeeping</SelectItem>
            <SelectItem value="Receptionist">Receptionist</SelectItem>
            <SelectItem value="Maintenance">Maintenance</SelectItem>
            <SelectItem value="Office Boy">Office Boy</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>
        <Select value={currentMonth} onValueChange={setCurrentMonth}>
          <SelectTrigger className="w-[130px] h-11"><SelectValue /></SelectTrigger>
          <SelectContent>
            {monthOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      {selectedGuardIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 p-4 bg-primary/5 border rounded-lg sticky top-0 z-20">
          <CheckSquare className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{selectedGuardIds.size} selected</span>
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <Button variant="outline" size="sm" className="h-10 px-3 text-sm" onClick={selectAllFiltered}>Select All ({filteredGuards.length})</Button>
            <Button variant="outline" size="sm" className="h-10 px-3 text-sm" onClick={() => setBulkStatusAction({ open: true, status: 'active' })}><UserCheck className="h-4 w-4 mr-1.5" />Activate</Button>
            <Button variant="outline" size="sm" className="h-10 px-3 text-sm" onClick={() => setBulkStatusAction({ open: true, status: 'inactive' })}><UserX className="h-4 w-4 mr-1.5" />Deactivate</Button>
            <Button variant="destructive" size="sm" className="h-10 px-3 text-sm" onClick={() => setBulkDeleteDialogOpen(true)}><Trash className="h-4 w-4 mr-1.5" />Delete</Button>
            <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={clearSelection}><X className="h-4 w-4" /></Button>
          </div>
        </div>
      )}

      {/* Data Table */}
      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(checked) => checked ? selectAllFiltered() : clearSelection()}
                />
              </TableHead>
              <SortHeader field="name">Name</SortHeader>
              <SortHeader field="role">Role</SortHeader>
              <SortHeader field="status">Status</SortHeader>
              <TableHead>Phone</TableHead>
              <SortHeader field="shifts">Shifts</SortHeader>
              <SortHeader field="net">Net Pay</SortHeader>
              <TableHead className="w-28 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredGuards.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                  No staff found. Try a different search or add a new staff member.
                </TableCell>
              </TableRow>
            ) : (
              filteredGuards.map(guard => {
                const earnings = getCurrentMonthEarnings(guard);
                return (
                  <TableRow
                    key={guard.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => setSelectedGuardForDetail(guard)}
                  >
                    <TableCell onClick={e => e.stopPropagation()}>
                      <Checkbox
                        checked={selectedGuardIds.has(guard.id)}
                        onCheckedChange={() => toggleGuardSelection(guard.id)}
                      />
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{guard.name}</div>
                        <div className="text-xs text-muted-foreground">{guard.badge_number}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="text-xs font-normal">{guard.staff_role || 'Security Guard'}</Badge>
                    </TableCell>
                    <TableCell>{statusBadge(guard.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{guard.phone_number}</TableCell>
                    <TableCell className="text-sm font-medium">{earnings.totalShifts}</TableCell>
                    <TableCell className="text-sm font-medium">{formatCurrency(earnings.netAmount)}</TableCell>
                    <TableCell onClick={e => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => handleEditGuard(guard)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-10 w-10 p-0" onClick={() => handlePaymentDialog(guard)}>
                              <DollarSign className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Record Payment</TooltipContent>
                        </Tooltip>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-10 w-10 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setSelectedGuardForDetail(guard)}>
                              <Eye className="h-4 w-4 mr-2" />View Details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(guard.id)}>
                              <Trash className="h-4 w-4 mr-2" />Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Detail Sheet (slides in from right) */}
      <Sheet open={!!selectedGuardForDetail} onOpenChange={(open) => !open && setSelectedGuardForDetail(null)}>
        <SheetContent side="right" className="w-full sm:max-w-2xl md:max-w-[680px] lg:max-w-2xl p-0 overflow-y-auto">
          <SheetHeader className="sr-only">
            <SheetTitle>{selectedGuardForDetail?.name}</SheetTitle>
            <SheetDescription>Staff member details</SheetDescription>
          </SheetHeader>
          {selectedGuardForDetail && (
            <div className="h-full">
              <div className="sticky top-0 z-10 bg-background border-b px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{selectedGuardForDetail.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-muted-foreground">
                      <span>{selectedGuardForDetail.badge_number}</span>
                      <span>·</span>
                      <Badge variant="secondary" className="text-xs">{selectedGuardForDetail.staff_role || 'Security Guard'}</Badge>
                      <span>·</span>
                      {statusBadge(selectedGuardForDetail.status)}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="h-10 px-3 text-sm" onClick={() => handleEditGuard(selectedGuardForDetail)}>
                      <Edit className="h-4 w-4 mr-1.5" />Edit
                    </Button>
                    <Button size="sm" className="h-10 px-3 text-sm" onClick={() => handlePaymentDialog(selectedGuardForDetail)}>
                      <DollarSign className="h-4 w-4 mr-1.5" />Payment
                    </Button>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4">
                <GuardDetailView
                  guard={selectedGuardForDetail}
                  onBack={() => setSelectedGuardForDetail(null)}
                  onEdit={handleEditGuard}
                  onPayment={handlePaymentDialog}
                  isEmbedded={true}
                />
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add/Edit Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>{isEditMode ? 'Edit Staff' : 'Add New Staff'}</DialogTitle>
            <DialogDescription>{isEditMode ? 'Update staff profile and details' : 'Create a new staff member profile'}</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(90vh-8rem)] px-6 pb-6">
            <GuardForm
              guard={selectedGuardForForm}
              onSubmit={handleFormSubmit}
              onCancel={handleDialogClose}
              isLoading={createGuardMutation.isPending || updateGuardMutation.isPending}
              isEditMode={isEditMode}
            />
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[80vh] p-0">
          <DialogHeader className="px-6 pt-6">
            <DialogTitle>Payment Management - {selectedGuard?.name}</DialogTitle>
            <DialogDescription>Record new payments and manage payment history</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[calc(80vh-8rem)] px-6 pb-6">
            <Tabs value={paymentHistoryTab} onValueChange={setPaymentHistoryTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="new">{editingPayment ? 'Edit Payment' : 'New Payment'}</TabsTrigger>
                <TabsTrigger value="history"><History className="h-4 w-4 mr-2" />History</TabsTrigger>
              </TabsList>
              <TabsContent value="new" className="space-y-4 mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Payment Type</Label>
                    <Select value={paymentType} onValueChange={(v) => setPaymentType(v as 'bonus' | 'deduction')}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bonus">Bonus Payment</SelectItem>
                        <SelectItem value="deduction">Deduction/Advance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {paymentType === 'bonus' && (
                    <div className="space-y-2">
                      <Label>Bonus Category</Label>
                      <Select value={bonusCategory} onValueChange={setBonusCategory}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="performance">Performance</SelectItem>
                          <SelectItem value="festival">Festival</SelectItem>
                          <SelectItem value="incentive">Incentive</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  {paymentType === 'deduction' && (
                    <div className="space-y-2">
                      <Label>Deduction Category</Label>
                      <Select value={deductionCategory} onValueChange={setDeductionCategory}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="advance">Advance</SelectItem>
                          <SelectItem value="penalty">Penalty</SelectItem>
                          <SelectItem value="uniform">Uniform</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label>{paymentType === 'deduction' ? 'Deduction Amount (INR)' : 'Bonus Amount (INR)'}</Label>
                    <Input type="number" min="0" step="0.01" placeholder="Enter amount" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Payment Date</Label>
                    <Input type="date" value={paymentDate} onChange={e => setPaymentDate(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Note (Optional)</Label>
                    <Input placeholder={paymentType === 'deduction' ? 'Reason for deduction' : 'Reason for bonus'} value={paymentNote} onChange={e => setPaymentNote(e.target.value)} />
                  </div>
                  <div className="bg-muted p-3 rounded-md text-sm">
                    <div className="font-medium mb-1">Current Month Summary</div>
                    <div className="grid grid-cols-2 gap-1">
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
                    <Button variant="outline" onClick={() => { setEditingPayment(null); setPaymentAmount(''); setPaymentNote(''); setIsPaymentDialogOpen(false); }}>Cancel</Button>
                    <Button onClick={handleSavePayment} disabled={createPaymentMutation.isPending || updatePaymentMutation.isPending}>
                      {createPaymentMutation.isPending || updatePaymentMutation.isPending ? 'Saving...' : editingPayment ? 'Update Payment' : (paymentType === 'deduction' ? 'Record Deduction' : 'Record Bonus')}
                    </Button>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="history" className="space-y-4 mt-4">
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
                            <TableCell className="font-medium">{format(new Date(payment.payment_date), 'MMM dd, yyyy')}</TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <Badge variant={payment.payment_type === 'bonus' ? 'default' : 'destructive'}>{payment.payment_type === 'bonus' ? 'Bonus' : 'Deduction'}</Badge>
                                {payment.payment_type === 'bonus' && payment.bonus_category && (
                                  <Badge variant="outline" className="text-xs capitalize">{payment.bonus_category}</Badge>
                                )}
                                {payment.payment_type === 'deduction' && payment.deduction_category && (
                                  <Badge variant="outline" className="text-xs capitalize">{payment.deduction_category}</Badge>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className={payment.payment_type === 'bonus' ? 'text-green-500' : 'text-red-500'}>
                              {payment.payment_type === 'bonus' ? '+' : '-'}{formatCurrency(payment.amount)}
                            </TableCell>
                            <TableCell className="max-w-32 truncate">{payment.note || '-'}</TableCell>
                            <TableCell>
                              <div className="flex gap-1.5">
                                <Button variant="outline" size="sm" className="h-10 w-10 p-0" onClick={() => handleEditPayment(payment)}><Edit className="h-4 w-4" /></Button>
                                <Button variant="outline" size="sm" className="h-10 w-10 p-0 text-destructive" onClick={() => setPaymentToDelete(payment.id)} disabled={deletePaymentMutation.isPending}><Trash className="h-4 w-4" /></Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialogs */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>This will permanently delete <strong>{guardList.find(g => g.id === selectedGuardId)?.name}</strong> and all associated records.</div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={deleteGuardMutation.isPending}>
              {deleteGuardMutation.isPending ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedGuardIds.size} staff member(s)?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete the selected staff and all their associated records.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => bulkDeleteMutation.mutate(Array.from(selectedGuardIds))} className="bg-destructive text-destructive-foreground hover:bg-destructive/90" disabled={bulkDeleteMutation.isPending}>
              {bulkDeleteMutation.isPending ? 'Deleting...' : `Delete ${selectedGuardIds.size} Staff`}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={bulkStatusAction.open} onOpenChange={(open) => setBulkStatusAction({ ...bulkStatusAction, open })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change status of {selectedGuardIds.size} staff member(s)?</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark {selectedGuardIds.size} staff member(s) as {bulkStatusAction.status}. {bulkStatusAction.status !== 'active' ? 'Non-active staff cannot be assigned to new shifts.' : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { bulkUpdateStatusMutation.mutate({ ids: Array.from(selectedGuardIds), status: bulkStatusAction.status }); setBulkStatusAction({ open: false, status: '' }); }}>
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!paymentToDelete} onOpenChange={(open) => !open && setPaymentToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete payment record?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this payment record.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (paymentToDelete) { deletePaymentMutation.mutate(paymentToDelete); setPaymentToDelete(null); }}} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Guards;
