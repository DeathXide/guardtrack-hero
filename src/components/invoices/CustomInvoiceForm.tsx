import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calculator, FileText, Save } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { createInvoiceInDB } from '@/lib/supabaseInvoiceApiNew';
import { generateInvoiceNumber, calculateGST, formatCurrency } from '@/lib/invoiceUtils';
import { companyApi } from '@/lib/companyApi';
import { toast } from 'sonner';

interface CustomSiteData {
  siteName: string;
  organizationName: string;
  gstNumber: string;
  gstType: string;
  address: string;
  personalBillingName?: string;
}

interface LineItem {
  id: string;
  role: 'Security Guard' | 'Supervisor' | 'Housekeeping' | 'Custom Service';
  description: string;
  shiftType: 'day' | 'night';
  rateType: 'monthly' | 'shift';
  quantity: number;
  manDays: number;
  ratePerSlot: number;
  monthlyRate?: number;
  lineTotal: number;
}

export default function CustomInvoiceForm() {
  const navigate = useNavigate();
  const [siteData, setSiteData] = useState<CustomSiteData>({
    siteName: '',
    organizationName: '',
    gstNumber: '',
    gstType: 'GST',
    address: '',
    personalBillingName: ''
  });
  
  const [formData, setFormData] = useState({
    periodFrom: '',
    periodTo: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    notes: ''
  });
  
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { 
      id: '1', 
      role: 'Security Guard',
      description: '', 
      shiftType: 'day', 
      rateType: 'shift', 
      quantity: 1, 
      manDays: 1,
      ratePerSlot: 0, 
      lineTotal: 0 
    }
  ]);
  
  const [availablePersonalNames, setAvailablePersonalNames] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Load personal billing names when component mounts
  useEffect(() => {
    const loadPersonalNames = async () => {
      try {
        const companySettings = await companyApi.getCompanySettings();
        if (companySettings?.personal_billing_names) {
          setAvailablePersonalNames(companySettings.personal_billing_names);
        }
      } catch (error) {
        console.error('Error loading personal names:', error);
      }
    };
    loadPersonalNames();
  }, []);

  const addLineItem = () => {
    const newItem: LineItem = {
      id: (lineItems.length + 1).toString(),
      role: 'Security Guard',
      description: '',
      shiftType: 'day',
      rateType: 'shift',
      quantity: 1,
      manDays: 1,
      ratePerSlot: 0,
      lineTotal: 0
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (id: string) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter(item => item.id !== id));
    }
  };

  const updateLineItem = (id: string, field: keyof LineItem, value: string | number) => {
    setLineItems(items =>
      items.map(item => {
        if (item.id === id) {
          const updatedItem = { ...item, [field]: value };
          // Recalculate total and manDays when quantity or rate changes
          if (field === 'quantity' || field === 'ratePerSlot') {
            updatedItem.manDays = updatedItem.quantity;
            updatedItem.lineTotal = updatedItem.quantity * updatedItem.ratePerSlot;
          }
          return updatedItem;
        }
        return item;
      })
    );
  };

  const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const gstCalculation = calculateGST(subtotal, siteData.gstType);

  const handleCreateInvoice = async () => {
    // Validation
    if (!siteData.siteName || !siteData.organizationName || !formData.periodFrom || !formData.periodTo) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (lineItems.some(item => !item.description || item.quantity <= 0 || item.ratePerSlot <= 0)) {
      toast.error('Please complete all line items with valid quantities and rates');
      return;
    }

    setLoading(true);
    try {
      // Get company settings for invoice generation
      const companySettings = await companyApi.getCompanySettings();
      
      // Generate invoice number
      const invoiceNumber = await generateInvoiceNumber();
      
      // Create temporary site (will be marked as 'custom' status)
      const tempSiteId = `custom-${Date.now()}`;
      
      // Convert line items to invoice format
      const invoiceLineItems = lineItems.map(item => ({
        id: item.id,
        role: item.role,
        shiftType: item.shiftType,
        rateType: item.rateType,
        quantity: item.quantity,
        manDays: item.manDays,
        ratePerSlot: item.ratePerSlot,
        monthlyRate: item.monthlyRate,
        lineTotal: item.lineTotal,
        description: item.description
      }));

      const invoiceData = {
        siteId: tempSiteId,
        invoiceNumber,
        siteName: siteData.siteName,
        siteGst: siteData.gstNumber,
        companyName: companySettings?.company_name || 'Security Management System',
        companyGst: companySettings?.gst_number || '',
        clientName: siteData.personalBillingName && siteData.gstType === 'PERSONAL' 
          ? siteData.personalBillingName 
          : siteData.organizationName,
        clientAddress: siteData.address,
        invoiceDate: formData.invoiceDate,
        periodFrom: formData.periodFrom,
        periodTo: formData.periodTo,
        lineItems: invoiceLineItems,
        subtotal,
        gstType: siteData.gstType as 'GST' | 'IGST' | 'NGST' | 'RCM' | 'PERSONAL',
        gstRate: gstCalculation.gstRate,
        gstAmount: gstCalculation.gstAmount,
        cgstRate: gstCalculation.cgstRate,
        cgstAmount: gstCalculation.cgstAmount,
        sgstRate: gstCalculation.sgstRate,
        sgstAmount: gstCalculation.sgstAmount,
        igstRate: gstCalculation.igstRate,
        igstAmount: gstCalculation.igstAmount,
        totalAmount: gstCalculation.totalAmount,
        notes: formData.notes,
        status: 'draft' as const
      };

      const newInvoice = await createInvoiceInDB(invoiceData);
      toast.success('Custom invoice created successfully');
      navigate(`/invoices/${newInvoice.id}`);
    } catch (error) {
      console.error('Error creating custom invoice:', error);
      toast.error('Failed to create custom invoice');
    } finally {
      setLoading(false);
    }
  };

  const getGstTypeDescription = (gstType: string) => {
    switch (gstType) {
      case 'GST': return 'Intra-State GST (CGST + SGST)';
      case 'IGST': return 'Inter-State GST (IGST)';
      case 'NGST': return 'No GST (0%)';
      case 'RCM': return 'Reverse Charge Mechanism';
      case 'PERSONAL': return 'Personal Billing (No GST)';
      default: return gstType;
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate('/invoices')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Invoices
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Create Custom Invoice</h1>
          <p className="text-muted-foreground">Create an invoice with custom site details</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Invoice Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Site Information */}
            <div className="space-y-4">
              <h3 className="font-medium">Site Information</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Site Name *</Label>
                  <Input
                    id="siteName"
                    value={siteData.siteName}
                    onChange={(e) => setSiteData(prev => ({ ...prev, siteName: e.target.value }))}
                    placeholder="Enter site name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="organizationName">Organization Name *</Label>
                  <Input
                    id="organizationName"
                    value={siteData.organizationName}
                    onChange={(e) => setSiteData(prev => ({ ...prev, organizationName: e.target.value }))}
                    placeholder="Enter organization name"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="gstType">GST Type *</Label>
                  <Select value={siteData.gstType} onValueChange={(value) => setSiteData(prev => ({ ...prev, gstType: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="GST">Intra-State GST (CGST + SGST)</SelectItem>
                      <SelectItem value="IGST">Inter-State GST (IGST)</SelectItem>
                      <SelectItem value="NGST">No GST (0%)</SelectItem>
                      <SelectItem value="RCM">Reverse Charge Mechanism</SelectItem>
                      <SelectItem value="PERSONAL">Personal Billing (No GST)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gstNumber">GST Number</Label>
                  <Input
                    id="gstNumber"
                    value={siteData.gstNumber}
                    onChange={(e) => setSiteData(prev => ({ ...prev, gstNumber: e.target.value }))}
                    placeholder="Enter GST number"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address *</Label>
                <Textarea
                  id="address"
                  value={siteData.address}
                  onChange={(e) => setSiteData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="Enter complete address"
                  rows={3}
                />
              </div>

              {siteData.gstType === 'PERSONAL' && (
                <div className="space-y-2">
                  <Label htmlFor="personalBillingName">Personal Billing Name *</Label>
                  <Select 
                    value={siteData.personalBillingName || ''} 
                    onValueChange={(value) => setSiteData(prev => ({ ...prev, personalBillingName: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select personal billing name" />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePersonalNames.map((name) => (
                        <SelectItem key={name} value={name}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Invoice Details */}
            <div className="space-y-4">
              <h3 className="font-medium">Invoice Period</h3>
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date *</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="periodFrom">Period From *</Label>
                  <Input
                    id="periodFrom"
                    type="date"
                    value={formData.periodFrom}
                    onChange={(e) => setFormData(prev => ({ ...prev, periodFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodTo">Period To *</Label>
                  <Input
                    id="periodTo"
                    type="date"
                    value={formData.periodTo}
                    onChange={(e) => setFormData(prev => ({ ...prev, periodTo: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Line Items</h3>
                <Button type="button" variant="outline" size="sm" onClick={addLineItem}>
                  Add Item
                </Button>
              </div>
              
              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={item.id} className="space-y-3 p-4 border rounded-lg">
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-4">
                        <Label>Role *</Label>
                        <Select value={item.role} onValueChange={(value) => updateLineItem(item.id, 'role', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Security Guard">Security Guard</SelectItem>
                            <SelectItem value="Supervisor">Supervisor</SelectItem>
                            <SelectItem value="Housekeeping">Housekeeping</SelectItem>
                            <SelectItem value="Custom Service">Custom Service</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4">
                        <Label>Shift Type *</Label>
                        <Select value={item.shiftType} onValueChange={(value) => updateLineItem(item.id, 'shiftType', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="day">Day Shift</SelectItem>
                            <SelectItem value="night">Night Shift</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-4">
                        <Label>Rate Type *</Label>
                        <Select value={item.rateType} onValueChange={(value) => updateLineItem(item.id, 'rateType', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="shift">Per Shift</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-3">
                      <div className="col-span-12">
                        <Label>Description *</Label>
                        <Input
                          value={item.description}
                          onChange={(e) => updateLineItem(item.id, 'description', e.target.value)}
                          placeholder="Service description"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="col-span-2">
                        <Label>Quantity *</Label>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(item.id, 'quantity', Number(e.target.value))}
                          min="1"
                        />
                      </div>
                      <div className="col-span-2">
                        <Label>Man Days</Label>
                        <Input value={item.manDays} disabled />
                      </div>
                      <div className="col-span-3">
                        <Label>Rate Per {item.rateType === 'shift' ? 'Shift' : 'Month'} *</Label>
                        <Input
                          type="number"
                          value={item.ratePerSlot}
                          onChange={(e) => updateLineItem(item.id, 'ratePerSlot', Number(e.target.value))}
                          min="0"
                          step="0.01"
                        />
                      </div>
                      <div className="col-span-3">
                        <Label>Line Total</Label>
                        <Input value={formatCurrency(item.lineTotal)} disabled />
                      </div>
                      <div className="col-span-2 flex justify-end">
                        {lineItems.length > 1 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeLineItem(item.id)}
                            className="text-destructive"
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                placeholder="Additional notes or terms..."
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                rows={3}
              />
            </div>

            <Button 
              onClick={handleCreateInvoice} 
              disabled={loading}
              className="w-full gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Creating...' : 'Create Custom Invoice'}
            </Button>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Invoice Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <strong>Client:</strong> {siteData.organizationName || 'Not specified'}
                </div>
                <div>
                  <strong>Site:</strong> {siteData.siteName || 'Not specified'}
                </div>
                <div>
                  <strong>GST Type:</strong> 
                  <Badge variant="outline" className="ml-2">
                    {getGstTypeDescription(siteData.gstType)}
                  </Badge>
                </div>
                <div>
                  <strong>Date:</strong> {new Date(formData.invoiceDate).toLocaleDateString()}
                </div>
              </div>

              {lineItems.some(item => item.description && item.quantity > 0 && item.ratePerSlot > 0) && (
                <>
                  <div>
                    <h4 className="font-semibold mb-3">Line Items</h4>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Role</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Shift/Rate</TableHead>
                          <TableHead>Qty</TableHead>
                          <TableHead>Rate</TableHead>
                          <TableHead>Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {lineItems
                          .filter(item => item.description && item.quantity > 0 && item.ratePerSlot > 0)
                          .map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.role}</TableCell>
                            <TableCell>{item.description}</TableCell>
                            <TableCell>
                              <div className="text-xs">
                                <div>{item.shiftType === 'day' ? 'Day' : 'Night'}</div>
                                <div>{item.rateType === 'shift' ? 'Per Shift' : 'Monthly'}</div>
                              </div>
                            </TableCell>
                            <TableCell>{item.quantity}</TableCell>
                            <TableCell>{formatCurrency(item.ratePerSlot)}</TableCell>
                            <TableCell>{formatCurrency(item.lineTotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span>Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    
                    {/* GST Breakdown */}
                    {siteData.gstType === 'GST' && (
                      <>
                        <div className="flex justify-between">
                          <span>CGST ({gstCalculation.cgstRate}%):</span>
                          <span>{formatCurrency(gstCalculation.cgstAmount)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>SGST ({gstCalculation.sgstRate}%):</span>
                          <span>{formatCurrency(gstCalculation.sgstAmount)}</span>
                        </div>
                      </>
                    )}
                    
                    {siteData.gstType === 'IGST' && (
                      <div className="flex justify-between">
                        <span>IGST ({gstCalculation.igstRate}%):</span>
                        <span>{formatCurrency(gstCalculation.igstAmount)}</span>
                      </div>
                    )}
                    
                    {(siteData.gstType === 'NGST' || siteData.gstType === 'PERSONAL') && (
                      <div className="flex justify-between">
                        <span>GST ({gstCalculation.gstRate}%):</span>
                        <span>{formatCurrency(gstCalculation.gstAmount)}</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between font-bold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span>{formatCurrency(gstCalculation.totalAmount)}</span>
                    </div>
                  </div>
                </>
              )}

              {!lineItems.some(item => item.description && item.quantity > 0 && item.ratePerSlot > 0) && (
                <div className="text-center py-12 text-muted-foreground">
                  <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Add line items to see invoice preview</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}