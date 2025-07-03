import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Search, Phone, Mail, Shield, Edit, Trash, UserPlus, DollarSign, Plus, Minus, CalendarDays } from 'lucide-react';
import { Guard, PaymentRecord, MonthlyEarning } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  fetchGuards, 
  createGuard, 
  updateGuard, 
  deleteGuard, 
  fetchGuardMonthlyStats 
} from '@/lib/localService';
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
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  const [guardEarnings, setGuardEarnings] = useState<Record<string, MonthlyEarning>>({});

  const { data: guardList = [], isLoading } = useQuery({
    queryKey: ['guards'],
    queryFn: fetchGuards
  });

  const [selectedGuardForForm, setSelectedGuardForForm] = useState<Guard | undefined>(undefined);

  const createGuardMutation = useMutation({
    mutationFn: (guardData: any) => {
      const badgeNumber = generateBadgeNumber();
      return createGuard({ ...guardData, badgeNumber });
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
    mutationFn: ({ id, guard }: { id: string; guard: Partial<Guard> }) => 
      updateGuard(id, guard),
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
    mutationFn: deleteGuard,
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

  const generateBadgeNumber = (): string => {
    const prefix = 'SG';
    const timestamp = Date.now().toString().slice(-6);
    const randomDigits = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}${timestamp}${randomDigits}`;
  };

  const calculateShiftRate = (monthlyRate: number) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return monthlyRate / daysInMonth;
  };

  const handleEditGuard = (guard: Guard) => {
    setSelectedGuardForForm(guard);
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  const handlePaymentDialog = (guard: Guard) => {
    setSelectedGuard(guard);
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentType('bonus');
    setIsPaymentDialogOpen(true);
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

    setIsPaymentDialogOpen(false);
    toast({
      title: paymentType === 'deduction' ? "Deduction Recorded" : "Bonus Recorded",
      description: `${paymentType === 'deduction' ? 'Deduction' : 'Bonus'} of $${paymentAmount} recorded for ${selectedGuard.name}`,
    });
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
     (guard.email && guard.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
     guard.badgeNumber.includes(searchTerm)) &&
    (guardType === 'permanent' ? 
      guard.type === 'permanent' || !guard.type : 
      guard.type === 'contract')
  );

  const getCurrentMonthEarnings = (guard: Guard): MonthlyEarning => {
    return guardEarnings[guard.id] || {
      month: currentMonth,
      totalShifts: 0,
      baseSalary: 0,
      bonuses: 0,
      deductions: 0,
      netAmount: 0
    };
  };

  useEffect(() => {
    const fetchAllGuardEarnings = async () => {
      const earningsMap: Record<string, MonthlyEarning> = {};
      
      for (const guard of guardList) {
        try {
          const result = await fetchGuardMonthlyStats(guard.id, currentMonth);
          earningsMap[guard.id] = {
            month: currentMonth,
            totalShifts: result.totalShifts,
            baseSalary: result.earnings,
            bonuses: 0,
            deductions: 0,
            netAmount: result.earnings
          };
        } catch (error) {
          console.error('Error fetching monthly earnings for guard:', error);
          earningsMap[guard.id] = {
            month: currentMonth,
            totalShifts: 0,
            baseSalary: 0,
            bonuses: 0,
            deductions: 0,
            netAmount: 0
          };
        }
      }
      
      setGuardEarnings(earningsMap);
    };
    
    if (guardList.length > 0) {
      fetchAllGuardEarnings();
    }
  }, [guardList, currentMonth]);

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

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
            const shiftRate = guard.payRate ? calculateShiftRate(guard.payRate) : 0;
            
            return (
              <Card key={guard.id} className="overflow-hidden border border-border/60">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base font-medium">{guard.name}</CardTitle>
                    <Badge 
                      variant={guard.type === 'contract' ? 'outline' : 'default'}
                      className={`mt-1 ${guard.type === 'contract' ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500' : ''}`}
                    >
                      {guard.type || 'Permanent'} Guard
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
                      <span className="font-medium ml-2">{guard.badgeNumber}</span>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <Phone className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span>{guard.phone}</span>
                    </div>
                    
                    {guard.email && (
                      <div className="flex items-center text-sm">
                        <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                        <span className="truncate">{guard.email}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Monthly Rate:</span>
                      <span className="font-medium ml-2">{formatCurrency(guard.payRate || 0)}</span>
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
            <DialogDescription>
              Add payment information for {selectedGuard?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
                {paymentType === 'deduction' ? 'Deduction Amount ($)' : 'Bonus Amount ($)'}
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
                <span>{selectedGuard ? formatCurrency(getCurrentMonthEarnings(selectedGuard).baseSalary) : '$0.00'}</span>
                
                <span className="text-muted-foreground">Total Bonuses:</span>
                <span className="text-green-500">{selectedGuard ? formatCurrency(getCurrentMonthEarnings(selectedGuard).bonuses) : '$0.00'}</span>
                
                <span className="text-muted-foreground">Total Deductions:</span>
                <span className="text-red-500">{selectedGuard ? formatCurrency(getCurrentMonthEarnings(selectedGuard).deductions) : '$0.00'}</span>
                
                <span className="font-medium border-t pt-1 mt-1">Net Amount:</span>
                <span className="font-medium border-t pt-1 mt-1">{selectedGuard ? formatCurrency(getCurrentMonthEarnings(selectedGuard).netAmount) : '$0.00'}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSavePayment}>
              {paymentType === 'deduction' ? 'Record Deduction' : 'Record Bonus'}
            </Button>
          </DialogFooter>
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
