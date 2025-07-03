import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Guard } from '@/types';
import { User, Phone, Mail, MapPin, Banknote, CreditCard } from 'lucide-react';

const guardSchema = z.object({
  // Personal Details - Required
  name: z.string().min(1, 'Full name is required'),
  gender: z.enum(['male', 'female', 'other'], { required_error: 'Gender is required' }),
  languagesSpoken: z.string().min(1, 'Languages spoken is required'),
  
  // Personal Details - Optional
  dateOfBirth: z.string().optional(),
  guardPhoto: z.string().optional(),
  
  // Identity Documents - Optional
  aadhaarNumber: z.string().optional(),
  aadhaarCardPhoto: z.string().optional(),
  panCard: z.string().optional(),
  
  // Contact Information - Required
  phone: z.string().min(1, 'Primary phone number is required'),
  
  // Contact Information - Optional
  alternatePhone: z.string().optional(),
  email: z.string().email('Invalid email format').optional().or(z.literal('')),
  
  // Addresses - Optional
  currentAddress: z.string().optional(),
  permanentAddress: z.string().optional(),
  
  // Employment Status - Required
  type: z.enum(['permanent', 'contract'], { required_error: 'Guard type is required' }),
  status: z.enum(['active', 'inactive'], { required_error: 'Status is required' }),
  
  // Compensation - Required
  salary: z.number().min(0, 'Salary must be positive').optional(),
  payRate: z.number().min(0, 'Monthly pay rate must be positive'),
  
  // Banking & Payments - Optional
  bankName: z.string().optional(),
  accountNumber: z.string().optional(),
  ifscCode: z.string().optional(),
  upiId: z.string().optional(),
});

type GuardFormData = z.infer<typeof guardSchema>;

interface GuardFormProps {
  guard?: Guard;
  onSubmit: (data: GuardFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  isEditMode?: boolean;
}

const GuardForm: React.FC<GuardFormProps> = ({
  guard,
  onSubmit,
  onCancel,
  isLoading = false,
  isEditMode = false
}) => {
  const form = useForm<GuardFormData>({
    resolver: zodResolver(guardSchema),
    defaultValues: {
      name: guard?.name || '',
      dateOfBirth: guard?.dateOfBirth || '',
      gender: guard?.gender || 'male',
      languagesSpoken: guard?.languagesSpoken?.join(', ') || '',
      guardPhoto: guard?.guardPhoto || '',
      aadhaarNumber: guard?.aadhaarNumber || '',
      aadhaarCardPhoto: guard?.aadhaarCardPhoto || '',
      panCard: guard?.panCard || '',
      phone: guard?.phone || '',
      alternatePhone: guard?.alternatePhone || '',
      email: guard?.email || '',
      currentAddress: guard?.currentAddress || '',
      permanentAddress: guard?.permanentAddress || '',
      type: guard?.type || 'permanent',
      status: guard?.status || 'active',
      salary: guard?.salary || undefined,
      payRate: guard?.payRate || 15000,
      bankName: guard?.bankName || '',
      accountNumber: guard?.accountNumber || '',
      ifscCode: guard?.ifscCode || '',
      upiId: guard?.upiId || '',
    }
  });

  const handleSubmit = (data: GuardFormData) => {
    const processedData = {
      ...data,
      languagesSpoken: data.languagesSpoken.split(',').map(lang => lang.trim()).filter(Boolean),
      email: data.email === '' ? undefined : data.email,
    } as any;
    onSubmit(processedData);
  };

  const calculateShiftRate = (monthlyRate: number) => {
    const date = new Date();
    const year = date.getFullYear();
    const month = date.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return monthlyRate / daysInMonth;
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0
    }).format(amount);
  };

  const payRateValue = form.watch('payRate');

  return (
    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
      {/* Personal Details */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <User className="h-5 w-5" />
            Personal Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                {...form.register('name')}
                placeholder="Enter full name"
              />
              {form.formState.errors.name && (
                <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="dateOfBirth">Date of Birth</Label>
              <Input
                id="dateOfBirth"
                type="date"
                {...form.register('dateOfBirth')}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">
                Gender <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.watch('gender')}
                onValueChange={(value) => form.setValue('gender', value as 'male' | 'female' | 'other')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="male">Male</SelectItem>
                  <SelectItem value="female">Female</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.gender && (
                <p className="text-sm text-destructive">{form.formState.errors.gender.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="languagesSpoken">
                Languages Spoken <span className="text-destructive">*</span>
              </Label>
              <Input
                id="languagesSpoken"
                {...form.register('languagesSpoken')}
                placeholder="e.g., English, Hindi, Tamil"
              />
              {form.formState.errors.languagesSpoken && (
                <p className="text-sm text-destructive">{form.formState.errors.languagesSpoken.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Phone className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="phone">
                Primary Phone Number <span className="text-destructive">*</span>
              </Label>
              <Input
                id="phone"
                {...form.register('phone')}
                placeholder="Enter primary phone number"
              />
              {form.formState.errors.phone && (
                <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="alternatePhone">Alternate Phone Number</Label>
              <Input
                id="alternatePhone"
                {...form.register('alternatePhone')}
                placeholder="Enter alternate phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                <Mail className="h-4 w-4 inline mr-1" />
                Email Address
              </Label>
              <Input
                id="email"
                type="email"
                {...form.register('email')}
                placeholder="Enter email address (optional)"
              />
              {form.formState.errors.email && (
                <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Employment & Compensation */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Banknote className="h-5 w-5" />
            Employment & Compensation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">
                Guard Type <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.watch('type')}
                onValueChange={(value) => form.setValue('type', value as 'permanent' | 'contract')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select guard type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="permanent">Permanent</SelectItem>
                  <SelectItem value="contract">Contract</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.type && (
                <p className="text-sm text-destructive">{form.formState.errors.type.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Status <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.watch('status')}
                onValueChange={(value) => form.setValue('status', value as 'active' | 'inactive')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
              {form.formState.errors.status && (
                <p className="text-sm text-destructive">{form.formState.errors.status.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary">Salary (₹)</Label>
              <Input
                id="salary"
                type="number"
                min="0"
                step="1"
                {...form.register('salary', { valueAsNumber: true })}
                placeholder="Enter salary in INR"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payRate">
                Monthly Pay Rate ($) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="payRate"
                type="number"
                min="0"
                step="0.01"
                {...form.register('payRate', { valueAsNumber: true })}
                placeholder="Enter monthly pay rate in USD"
              />
              {payRateValue && (
                <div className="text-xs text-muted-foreground">
                  Per shift rate: ${calculateShiftRate(payRateValue).toFixed(2)}
                  <br />
                  <span className="italic">*Calculated based on current month's days</span>
                </div>
              )}
              {form.formState.errors.payRate && (
                <p className="text-sm text-destructive">{form.formState.errors.payRate.message}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Optional Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Addresses */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <MapPin className="h-5 w-5" />
              Addresses
              <Badge variant="outline" className="ml-auto text-xs">Optional</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentAddress">Current Address</Label>
              <Textarea
                id="currentAddress"
                {...form.register('currentAddress')}
                placeholder="Enter current address"
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="permanentAddress">Permanent Address</Label>
              <Textarea
                id="permanentAddress"
                {...form.register('permanentAddress')}
                placeholder="Enter permanent address"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Banking & Payments */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <CreditCard className="h-5 w-5" />
              Banking & Payments
              <Badge variant="outline" className="ml-auto text-xs">Optional</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="bankName">Bank Name</Label>
              <Input
                id="bankName"
                {...form.register('bankName')}
                placeholder="Enter bank name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="accountNumber">Account Number</Label>
              <Input
                id="accountNumber"
                {...form.register('accountNumber')}
                placeholder="Enter account number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ifscCode">IFSC Code</Label>
              <Input
                id="ifscCode"
                {...form.register('ifscCode')}
                placeholder="Enter IFSC code"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="upiId">UPI ID</Label>
              <Input
                id="upiId"
                {...form.register('upiId')}
                placeholder="Enter UPI ID"
              />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Identity Documents */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            Identity Documents
            <Badge variant="outline" className="ml-auto text-xs">Optional</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="aadhaarNumber">Aadhaar Number</Label>
              <Input
                id="aadhaarNumber"
                {...form.register('aadhaarNumber')}
                placeholder="Enter Aadhaar number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="aadhaarCardPhoto">Aadhaar Card Photo URL</Label>
              <Input
                id="aadhaarCardPhoto"
                {...form.register('aadhaarCardPhoto')}
                placeholder="Enter Aadhaar card photo URL"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="panCard">PAN Card</Label>
              <Input
                id="panCard"
                {...form.register('panCard')}
                placeholder="Enter PAN card number"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {!isEditMode && (
        <div className="bg-muted p-3 rounded-md text-sm">
          <span className="font-medium">Badge Number:</span>
          <span className="ml-2 text-muted-foreground">Will be auto-generated</span>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? 'Saving...' : isEditMode ? 'Save Changes' : 'Add Guard'}
        </Button>
      </div>
    </form>
  );
};

export default GuardForm;