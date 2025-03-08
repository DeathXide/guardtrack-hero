import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, Search, Phone, Mail, Shield, Edit, Trash, UserPlus, DollarSign, Plus, Minus, CalendarDays } from 'lucide-react';
import { guards } from '@/lib/data';
import { Guard, PaymentRecord, MonthlyEarning } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { format } from 'date-fns';

const Guards = () => {
  const [guardList, setGuardList] = useState<Guard[]>(guards);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedGuardId, setSelectedGuardId] = useState<string | null>(null);
  const [guardType, setGuardType] = useState<'permanent' | 'temporary'>('permanent');
  const { toast } = useToast();
  
  // Payment state
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNote, setPaymentNote] = useState('');
  const [paymentType, setPaymentType] = useState<'bonus' | 'deduction'>('bonus');
  const [selectedGuard, setSelectedGuard] = useState<Guard | null>(null);
  const [currentMonth, setCurrentMonth] = useState(format(new Date(), 'yyyy-MM'));
  
  // Form state
  const initialFormState: Omit<Guard, 'id'> & { id?: string } = {
    name: '',
    email: '',
    phone: '',
    badgeNumber: '',
    status: 'active',
    type: 'permanent',
    payRate: 15000.00, // Default monthly pay rate (15,000)
    paymentHistory: []
  };
  
  const [newGuard, setNewGuard] = useState(initialFormState);

  // Calculate shift rate based on monthly pay rate and days in the month
  const calculateShiftRate = (monthlyRate: number) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return monthlyRate / daysInMonth;
  };

  // Calculate current month's earnings for each guard
  useEffect(() => {
    const updatedGuards = guardList.map(guard => {
      if (!guard.payRate) return guard;
      
      // Calculate shift rate based on days in current month
      const shiftRate = calculateShiftRate(guard.payRate);
      
      // Count attendance for current month
      const year = new Date().getFullYear();
      const month = new Date().getMonth();
      const currentMonth = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      // In a real app, this would fetch from the attendance records
      // For this demo, we'll simulate with random shift counts
      const shiftsWorked = Math.floor(Math.random() * 20) + 5; // Between 5-25 shifts
      
      // Calculate salary based on shifts worked and shift rate
      const monthlySalary = shiftsWorked * shiftRate;
      
      // Get bonuses and deductions for this month
      const bonuses = guard.paymentHistory?.filter(p => 
        p.type === 'bonus' && p.date.startsWith(currentMonth)) || [];
      
      const deductions = guard.paymentHistory?.filter(p => 
        p.type === 'deduction' && p.date.startsWith(currentMonth)) || [];
      
      const totalBonuses = bonuses.reduce((sum, p) => sum + p.amount, 0);
      const totalDeductions = deductions.reduce((sum, p) => sum + p.amount, 0);
      
      // Monthly earnings object
      const monthlyEarning: MonthlyEarning = {
        month: currentMonth,
        totalShifts: shiftsWorked,
        baseSalary: monthlySalary,
        bonuses: totalBonuses,
        deductions: totalDeductions,
        netAmount: monthlySalary + totalBonuses - totalDeductions
      };
      
      // Store monthly earnings in the guard object
      const monthlyEarnings = { ...guard.monthlyEarnings, [currentMonth]: monthlyEarning };
      
      return {
        ...guard,
        shiftRate,
        monthlyEarnings
      } as Guard;
    });
    
    setGuardList(updatedGuards);
  }, []);

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    
    if (id === 'payRate') {
      const payRate = parseFloat(value);
      const shiftRate = calculateShiftRate(payRate);
      
      setNewGuard({
        ...newGuard,
        payRate,
        shiftRate
      });
    } else {
      setNewGuard({
        ...newGuard,
        [id]: id === 'status' ? value as 'active' | 'inactive' : 
               id === 'type' ? value as 'permanent' | 'temporary' : value
      });
    }
  };

  // Open edit dialog
  const handleEditGuard = (guard: Guard) => {
    setNewGuard({
      id: guard.id,
      name: guard.name,
      email: guard.email,
      phone: guard.phone,
      badgeNumber: guard.badgeNumber,
      status: guard.status,
      type: guard.type || 'permanent',
      payRate: guard.payRate || 15000.00,
      paymentHistory: guard.paymentHistory || []
    });
    setIsEditMode(true);
    setIsDialogOpen(true);
  };

  // Open payment dialog
  const handlePaymentDialog = (guard: Guard) => {
    setSelectedGuard(guard);
    setPaymentAmount('');
    setPaymentNote('');
    setPaymentType('bonus');
    setIsPaymentDialogOpen(true);
  };

  // Save payment
  const handleSavePayment = () => {
    if (!selectedGuard || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast({
        title: "Invalid Payment",
        description: "Please enter a valid payment amount",
        variant: "destructive"
      });
      return;
    }

    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    
    const payment: PaymentRecord = {
      id: `pay-${Date.now()}`,
      amount: parseFloat(paymentAmount),
      date: now.toISOString(),
      note: paymentNote,
      type: paymentType,
      month: currentMonth
    };

    const updatedGuard = {
      ...selectedGuard,
      paymentHistory: [...(selectedGuard.paymentHistory || []), payment]
    };

    // Recalculate monthly earnings
    const currentMonthEarning = updatedGuard.monthlyEarnings?.[currentMonth] || {
      month: currentMonth,
      totalShifts: 0,
      baseSalary: 0,
      bonuses: 0,
      deductions: 0,
      netAmount: 0
    };
    
    if (paymentType === 'bonus') {
      currentMonthEarning.bonuses += parseFloat(paymentAmount);
    } else {
      currentMonthEarning.deductions += parseFloat(paymentAmount);
    }
    
    currentMonthEarning.netAmount = currentMonthEarning.baseSalary + 
                                  currentMonthEarning.bonuses - 
                                  currentMonthEarning.deductions;
    
    updatedGuard.monthlyEarnings = {
      ...(updatedGuard.monthlyEarnings || {}),
      [currentMonth]: currentMonthEarning
    };

    setGuardList(guardList.map(g => g.id === selectedGuard.id ? updatedGuard : g));
    
    setIsPaymentDialogOpen(false);
    toast({
      title: paymentType === 'deduction' ? "Deduction Recorded" : "Bonus Recorded",
      description: `${paymentType === 'deduction' ? 'Deduction' : 'Bonus'} of $${paymentAmount} recorded for ${selectedGuard.name}`,
    });
  };

  // Open delete dialog
  const handleDeleteClick = (guardId: string) => {
    setSelectedGuardId(guardId);
    setDeleteDialogOpen(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (selectedGuardId) {
      setGuardList(guardList.filter(guard => guard.id !== selectedGuardId));
      toast({
        title: "Guard Deleted",
        description: "The guard has been successfully removed",
      });
      setDeleteDialogOpen(false);
      setSelectedGuardId(null);
    }
  };

  // Handle dialog close
  const handleDialogClose = () => {
    setIsDialogOpen(false);
    setIsEditMode(false);
    setNewGuard(initialFormState);
  };

  // Handle form submission
  const handleSubmit = () => {
    if (!newGuard.name || !newGuard.email || !newGuard.phone || !newGuard.badgeNumber || !newGuard.payRate) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newGuard.email)) {
      toast({
        title: "Invalid Email",
        description: "Please provide a valid email address",
        variant: "destructive"
      });
      return;
    }
    
    if (!isEditMode && guardList.some(guard => guard.badgeNumber === newGuard.badgeNumber)) {
      toast({
        title: "Badge Number Already Exists",
        description: "Please provide a unique badge number",
        variant: "destructive"
      });
      return;
    }

    const shiftRate = calculateShiftRate(newGuard.payRate);
    
    if (isEditMode && newGuard.id) {
      setGuardList(guardList.map(guard => 
        guard.id === newGuard.id ? 
          { 
            ...newGuard, 
            shiftRate,
            paymentHistory: guard.paymentHistory || [],
            monthlyEarnings: guard.monthlyEarnings || {}
          } as Guard : 
          guard
      ));
      
      toast({
        title: "Guard Updated",
        description: `${newGuard.name} has been successfully updated`,
      });
    } else {
      const newGuardObject: Guard = {
        id: `g${guardList.length + 1}`,
        name: newGuard.name,
        email: newGuard.email,
        phone: newGuard.phone,
        badgeNumber: newGuard.badgeNumber,
        status: newGuard.status,
        type: newGuard.type || 'permanent',
        payRate: newGuard.payRate,
        shiftRate,
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(newGuard.name)}&background=0D8ABC&color=fff`,
        paymentHistory: [],
        monthlyEarnings: {}
      };

      setGuardList([...guardList, newGuardObject]);
      
      toast({
        title: "Guard Added",
        description: `${newGuard.name} has been successfully added`,
      });
    }
    
    setIsDialogOpen(false);
    setIsEditMode(false);
    setNewGuard(initialFormState);
  };
  
  const filteredGuards = guardList.filter(guard => 
    (guard.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     guard.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
     guard.badgeNumber.includes(searchTerm)) &&
    (guardType === 'permanent' ? 
      guard.type === 'permanent' || !guard.type : 
      guard.type === 'temporary')
  );

  const getCurrentMonthEarnings = (guard: Guard): MonthlyEarning => {
    const now = new Date();
    const currentMonth = format(now, 'yyyy-MM');
    
    return guard.monthlyEarnings?.[currentMonth] || {
      month: currentMonth,
      totalShifts: 0,
      baseSalary: 0,
      bonuses: 0,
      deductions: 0,
      netAmount: 0
    };
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2
    }).format(amount);
  };

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
        
        <Tabs defaultValue="permanent" className="w-full md:w-auto" onValueChange={(v) => setGuardType(v as 'permanent' | 'temporary')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="permanent">Permanent</TabsTrigger>
            <TabsTrigger value="temporary">Temporary</TabsTrigger>
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
            
            return (
              <Card key={guard.id} className="overflow-hidden border border-border/60">
                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                  <div>
                    <CardTitle className="text-base font-medium">{guard.name}</CardTitle>
                    <Badge 
                      variant={guard.type === 'temporary' ? 'outline' : 'default'}
                      className={`mt-1 ${guard.type === 'temporary' ? 'bg-amber-500/10 hover:bg-amber-500/20 text-amber-500' : ''}`}
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
                    
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="truncate">{guard.email}</span>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <DollarSign className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Monthly Rate:</span>
                      <span className="font-medium ml-2">{formatCurrency(guard.payRate || 0)}</span>
                    </div>
                    
                    <div className="flex items-center text-sm">
                      <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
                      <span className="text-muted-foreground">Shift Rate:</span>
                      <span className="font-medium ml-2">{formatCurrency(guard.shiftRate || 0)}</span>
                    </div>
                    
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium">Current Month Summary</span>
                        <Badge variant="outline" className="text-xs">
                          {format(new Date(), 'MMMM yyyy')}
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
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{isEditMode ? 'Edit Guard' : 'Add New Guard'}</DialogTitle>
            <DialogDescription>
              {isEditMode 
                ? 'Update guard profile and contact details' 
                : 'Create a new security guard profile with contact details'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input 
                id="name" 
                placeholder="Enter full name" 
                value={newGuard.name}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="Enter email address" 
                value={newGuard.email}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input 
                id="phone" 
                placeholder="Enter phone number" 
                value={newGuard.phone}
                onChange={handleInputChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badgeNumber">Badge Number</Label>
              <Input 
                id="badgeNumber" 
                placeholder="Enter badge number" 
                value={newGuard.badgeNumber}
                onChange={handleInputChange}
                disabled={isEditMode}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="payRate">Monthly Pay Rate ($)</Label>
              <Input 
                id="payRate" 
                type="number"
                min="0"
                step="0.01"
                placeholder="Enter monthly pay rate" 
                value={newGuard.payRate?.toString() || ''}
                onChange={handleInputChange}
              />
              {newGuard.payRate && (
                <div className="text-xs text-muted-foreground mt-1">
                  Per shift rate: {formatCurrency(calculateShiftRate(newGuard.payRate))}
                  <br />
                  <span className="italic">*Calculated based on current month's days</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="type">Guard Type</Label>
              <select 
                id="type" 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newGuard.type || 'permanent'}
                onChange={handleInputChange}
              >
                <option value="permanent">Permanent</option>
                <option value="temporary">Temporary</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <select 
                id="status" 
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={newGuard.status}
                onChange={handleInputChange}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleDialogClose}>Cancel</Button>
            <Button onClick={handleSubmit}>{isEditMode ? 'Save Changes' : 'Add Guard'}</Button>
          </DialogFooter>
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
                <span>{format(new Date(), 'MMMM yyyy')}</span>
                
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
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Guards;
