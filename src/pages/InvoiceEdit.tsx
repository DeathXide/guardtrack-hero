import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, RotateCcw, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/layout/PageHeader';
import { fetchInvoiceByIdFromDB, updateInvoiceInDB } from '@/lib/supabaseInvoiceApiNew';
import { calculateGST, formatCurrency } from '@/lib/invoiceUtils';
import { Invoice, InvoiceLineItem } from '@/types/invoice';
import { toast } from 'sonner';
import { ChevronDown } from 'lucide-react';

const ROLE_TYPES = [
  'Security Guard',
  'Supervisor',
  'Housekeeping',
  'Receptionist',
  'Maintenance',
  'Office Boy',
  'Other'
];

const UTILITY_TYPES = [
  { value: 'Water Bill', label: 'Water' },
  { value: 'Electricity Bill', label: 'Electricity' },
  { value: 'Maintenance Charges', label: 'Maintenance' },
  { value: 'Other Utility', label: 'Other' }
];

function getDaysInBillingMonth(periodFrom: string): number {
  if (!periodFrom) return 30;
  const date = new Date(periodFrom);
  // Total days in the month of the billing period start date
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function generateDescription(role: string, daySlots: number, nightSlots: number): string {
  let desc = role;
  if (daySlots > 0 && nightSlots > 0) {
    desc += ` - [${daySlots} Day, ${nightSlots} Night]`;
  } else if (daySlots > 0) {
    desc += daySlots === 1 ? ' - [Day]' : ` - [${daySlots} Day]`;
  } else if (nightSlots > 0) {
    desc += nightSlots === 1 ? ' - [Night]' : ` - [${nightSlots} Night]`;
  }
  return desc;
}

function parseSlotsFromDescription(description: string): { daySlots: number; nightSlots: number } | null {
  // Match patterns like "Role - [2 Day, 1 Night]", "Role - [Day]", "Role - [Night]"
  const match = description.match(/\[(\d+)?\s*Day(?:,\s*(\d+)?\s*Night)?\]/);
  if (match) {
    return {
      daySlots: match[1] ? parseInt(match[1]) : 1,
      nightSlots: match[2] ? parseInt(match[2]) : 0
    };
  }
  const nightMatch = description.match(/\[(\d+)?\s*Night\]/);
  if (nightMatch) {
    return {
      daySlots: 0,
      nightSlots: nightMatch[1] ? parseInt(nightMatch[1]) : 1
    };
  }
  return null;
}

function hydrateSlots(item: InvoiceLineItem): InvoiceLineItem {
  if (item.rateType === 'utility') return item;
  if (item.daySlots !== undefined && item.nightSlots !== undefined) return item;

  // Try to parse from description
  const parsed = item.description ? parseSlotsFromDescription(item.description) : null;
  if (parsed) {
    return { ...item, daySlots: parsed.daySlots, nightSlots: parsed.nightSlots };
  }
  // Fallback: all slots are day
  return { ...item, daySlots: item.quantity, nightSlots: 0 };
}

export default function InvoiceEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    invoiceDate: '',
    clientName: '',
    clientAddress: '',
    siteName: '',
    siteGst: '',
    gstType: 'GST' as string,
    companyName: '',
    companyGst: '',
    periodFrom: '',
    periodTo: '',
    notes: '',
    status: 'draft' as 'draft' | 'sent' | 'paid' | 'overdue'
  });
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [companyOpen, setCompanyOpen] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [initialSnapshot, setInitialSnapshot] = useState('');

  useEffect(() => {
    if (id) {
      loadInvoice(id);
    }
  }, [id]);

  // Track changes
  useEffect(() => {
    if (!invoice) return;
    const snapshot = JSON.stringify({ formData, lineItems });
    setHasChanges(snapshot !== initialSnapshot);
  }, [formData, lineItems, initialSnapshot, invoice]);

  const loadInvoice = async (invoiceId: string) => {
    setLoading(true);
    try {
      const data = await fetchInvoiceByIdFromDB(invoiceId);
      if (data) {
        setInvoice(data);
        const fd = {
          invoiceDate: data.invoiceDate || '',
          clientName: data.clientName || '',
          clientAddress: data.clientAddress || '',
          siteName: data.siteName || '',
          siteGst: data.siteGst || '',
          gstType: data.gstType || 'GST',
          companyName: data.companyName || '',
          companyGst: data.companyGst || '',
          periodFrom: data.periodFrom,
          periodTo: data.periodTo,
          notes: data.notes || '',
          status: data.status
        };
        setFormData(fd);
        const items = data.lineItems.map(hydrateSlots);
        setLineItems(items);
        setInitialSnapshot(JSON.stringify({ formData: fd, lineItems: items }));
      } else {
        toast.error('Invoice not found');
        handleBack();
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Failed to load invoice');
      handleBack();
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/invoices');
  };

  // Conditional editability based on status
  const editability = useMemo(() => {
    const status = invoice?.status;
    if (status === 'paid') {
      return { allFields: false, lineItems: false, statusNotes: true };
    }
    if (status === 'sent') {
      return { allFields: false, lineItems: true, statusNotes: true };
    }
    // draft or overdue
    return { allFields: true, lineItems: true, statusNotes: true };
  }, [invoice?.status]);

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };

    const item = newLineItems[index];

    if (item.rateType === 'utility') {
      if (field === 'lineTotal') {
        setLineItems(newLineItems);
      }
      return setLineItems(newLineItems);
    }

    // Recalculate quantity from slots
    if (field === 'daySlots' || field === 'nightSlots') {
      const daySlots = field === 'daySlots' ? (value as number) : (item.daySlots || 0);
      const nightSlots = field === 'nightSlots' ? (value as number) : (item.nightSlots || 0);
      newLineItems[index].quantity = daySlots + nightSlots;
    }

    // Auto-generate description when role or slots change
    if (field === 'role' || field === 'daySlots' || field === 'nightSlots') {
      const role = field === 'role' ? (value as string) : item.role;
      const daySlots = field === 'daySlots' ? (value as number) : (item.daySlots || 0);
      const nightSlots = field === 'nightSlots' ? (value as number) : (item.nightSlots || 0);
      newLineItems[index].description = generateDescription(role, daySlots, nightSlots);
    }

    // When switching rateType, auto-convert the rate
    if (field === 'rateType') {
      const prev = lineItems[index];
      if (value === 'shift' && prev.rateType === 'monthly' && prev.monthlyRate) {
        // Monthly → Shift: ratePerSlot = monthlyRate / days in the billing month
        const daysInMonth = getDaysInBillingMonth(formData.periodFrom);
        newLineItems[index].ratePerSlot = Math.round(prev.monthlyRate / daysInMonth);
        newLineItems[index].manDays = daysInMonth;
      } else if (value === 'monthly' && prev.rateType === 'shift' && prev.ratePerSlot) {
        // Shift → Monthly: monthlyRate = ratePerSlot × days in the billing month
        const daysInMonth = getDaysInBillingMonth(formData.periodFrom);
        newLineItems[index].monthlyRate = Math.round(prev.ratePerSlot * daysInMonth);
      }
    }

    // Recalculate line total
    const updated = newLineItems[index];
    if (updated.rateType === 'monthly' && updated.monthlyRate) {
      newLineItems[index].lineTotal = updated.quantity * updated.monthlyRate;
    } else if (updated.rateType === 'shift') {
      newLineItems[index].lineTotal = updated.quantity * updated.manDays * updated.ratePerSlot;
    }

    setLineItems(newLineItems);
  };

  const addLineItem = (itemType: 'service' | 'utility' = 'service') => {
    if (itemType === 'utility') {
      setLineItems([...lineItems, {
        id: Date.now().toString(),
        role: 'Water Bill',
        shiftType: 'day',
        rateType: 'utility',
        quantity: 1,
        manDays: 1,
        ratePerSlot: 0,
        lineTotal: 0,
        description: 'Utility Charge',
        utilityType: 'water'
      }]);
    } else {
      setLineItems([...lineItems, {
        id: Date.now().toString(),
        role: 'Security Guard',
        shiftType: 'day',
        rateType: 'shift',
        quantity: 1,
        manDays: 30,
        ratePerSlot: 1500,
        lineTotal: 45000,
        description: 'Security Guard - [Day]',
        customDescription: '',
        daySlots: 1,
        nightSlots: 0
      }]);
    }
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Use formData.gstType for live recalculation (not invoice.gstType)
  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const gstCalculation = calculateGST(subtotal, formData.gstType);
    return { subtotal, ...gstCalculation };
  };

  const handleDiscard = () => {
    if (invoice) loadInvoice(invoice.id);
  };

  const handleSave = async () => {
    if (!invoice) return;

    setSaving(true);
    try {
      const totals = calculateTotals();

      const updatedInvoice = await updateInvoiceInDB(invoice.id, {
        ...formData,
        lineItems,
        subtotal: totals.subtotal,
        gstRate: totals.gstRate,
        gstAmount: totals.gstAmount,
        cgstRate: totals.cgstRate,
        cgstAmount: totals.cgstAmount,
        sgstRate: totals.sgstRate,
        sgstAmount: totals.sgstAmount,
        igstRate: totals.igstRate,
        igstAmount: totals.igstAmount,
        totalAmount: totals.totalAmount
      });

      if (updatedInvoice) {
        toast.success('Invoice updated successfully');
        navigate(`/invoices/${invoice.id}`);
      } else {
        toast.error('Failed to update invoice');
      }
    } catch (error) {
      console.error('Error updating invoice:', error);
      toast.error('Failed to update invoice');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-1/3" />
        <Skeleton className="h-4 w-1/4" />
        <div className="space-y-6">
          <Skeleton className="h-[200px] w-full rounded-lg" />
          <Skeleton className="h-[200px] w-full rounded-lg" />
          <Skeleton className="h-[300px] w-full rounded-lg" />
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Invoice Not Found</h2>
        <Button onClick={handleBack}>Back to Invoices</Button>
      </div>
    );
  }

  const { subtotal, gstRate, gstAmount, totalAmount } = calculateTotals();

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        title={`Edit Invoice ${invoice.invoiceNumber}`}
        subtitle="Modify invoice details and line items"
        breadcrumbs={[
          { label: 'Invoices', href: '/invoices' },
          { label: invoice.invoiceNumber, href: `/invoices/${invoice.id}` },
          { label: 'Edit' },
        ]}
        backButton
      />

      {invoice.status === 'sent' && (
        <Alert>
          <AlertDescription>
            This invoice has been sent. Only status, notes, and line items can be edited.
          </AlertDescription>
        </Alert>
      )}

      {invoice.status === 'paid' && (
        <Alert>
          <AlertDescription>
            This invoice is paid. Only status and notes can be edited.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Section 1: Invoice Header */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice Header</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Invoice Number</Label>
                <Input value={invoice.invoiceNumber} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="invoiceDate">Invoice Date</Label>
                <Input
                  id="invoiceDate"
                  type="date"
                  value={formData.invoiceDate}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                  disabled={!editability.allFields}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Client / Bill-To */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Client / Bill-To</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="clientName">Client Name</Label>
                <Input
                  id="clientName"
                  value={formData.clientName}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientName: e.target.value }))}
                  disabled={!editability.allFields}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={formData.siteName}
                  onChange={(e) => setFormData(prev => ({ ...prev, siteName: e.target.value }))}
                  disabled={!editability.allFields}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="clientAddress">Client Address</Label>
                <Textarea
                  id="clientAddress"
                  value={formData.clientAddress}
                  onChange={(e) => setFormData(prev => ({ ...prev, clientAddress: e.target.value }))}
                  disabled={!editability.allFields}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="siteGst">Site GST Number</Label>
                <Input
                  id="siteGst"
                  value={formData.siteGst}
                  onChange={(e) => setFormData(prev => ({ ...prev, siteGst: e.target.value }))}
                  disabled={!editability.allFields}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gstType">GST Type</Label>
                <Select
                  value={formData.gstType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, gstType: value }))}
                  disabled={!editability.allFields}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GST">Standard GST (CGST + SGST)</SelectItem>
                    <SelectItem value="IGST">Inter-State GST (IGST)</SelectItem>
                    <SelectItem value="NGST">No GST</SelectItem>
                    <SelectItem value="RCM">Reverse Charge Mechanism</SelectItem>
                    <SelectItem value="PERSONAL">Personal Billing</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 3: Billing Period & Status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billing Period & Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodFrom">Period From</Label>
                <Input
                  id="periodFrom"
                  type="date"
                  value={formData.periodFrom}
                  onChange={(e) => setFormData(prev => ({ ...prev, periodFrom: e.target.value }))}
                  disabled={!editability.allFields}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodTo">Period To</Label>
                <Input
                  id="periodTo"
                  type="date"
                  value={formData.periodTo}
                  onChange={(e) => setFormData(prev => ({ ...prev, periodTo: e.target.value }))}
                  disabled={!editability.allFields}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="sent">Sent</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 4: Line Items + Summary */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Line Items</CardTitle>
              {editability.lineItems && (
                <div className="flex gap-2">
                  <Button onClick={() => addLineItem('service')} size="sm" variant="outline">Add Service</Button>
                  <Button onClick={() => addLineItem('utility')} size="sm" variant="outline">Add Utility</Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              {lineItems.map((item, index) => (
                item.rateType === 'utility' ? (
                  /* Utility Line Item Card */
                  <Card key={item.id} className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                        <div className="space-y-2">
                          <Label>Utility Type</Label>
                          <Select
                            value={item.role}
                            onValueChange={(value) => updateLineItem(index, 'role', value)}
                            disabled={!editability.lineItems}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {UTILITY_TYPES.map(u => (
                                <SelectItem key={u.value} value={u.value}>{u.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Amount (₹)</Label>
                          <Input
                            type="number"
                            value={item.lineTotal}
                            onChange={(e) => updateLineItem(index, 'lineTotal', parseFloat(e.target.value) || 0)}
                            disabled={!editability.lineItems}
                          />
                        </div>
                        <div className="space-y-2 md:col-span-2">
                          <Label>Description</Label>
                          <Input
                            value={item.description || ''}
                            onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                            placeholder="Utility charge description"
                            disabled={!editability.lineItems}
                          />
                        </div>
                      </div>
                      {editability.lineItems && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                          className="text-destructive shrink-0 mt-7"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </Card>
                ) : (
                  /* Service Line Item Card */
                  <Card key={item.id} className="p-4 space-y-4">
                    {/* Row 1: Role Type, Rate Type, Delete */}
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                        <div className="space-y-2">
                          <Label>Role Type</Label>
                          <Select
                            value={item.role}
                            onValueChange={(value) => updateLineItem(index, 'role', value)}
                            disabled={!editability.lineItems}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {ROLE_TYPES.map(role => (
                                <SelectItem key={role} value={role}>{role}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Rate Type</Label>
                          <Select
                            value={item.rateType}
                            onValueChange={(value) => updateLineItem(index, 'rateType', value)}
                            disabled={!editability.lineItems}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="shift">Shift</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      {editability.lineItems && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLineItem(index)}
                          className="text-destructive shrink-0 mt-7"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>

                    {/* Row 2: Day Slots, Night Slots, Rate, Man Days */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="space-y-2">
                        <Label>Day Slots</Label>
                        <Input
                          type="number"
                          value={item.daySlots ?? 0}
                          onChange={(e) => updateLineItem(index, 'daySlots', parseInt(e.target.value) || 0)}
                          disabled={!editability.lineItems}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Night Slots</Label>
                        <Input
                          type="number"
                          value={item.nightSlots ?? 0}
                          onChange={(e) => updateLineItem(index, 'nightSlots', parseInt(e.target.value) || 0)}
                          disabled={!editability.lineItems}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>{item.rateType === 'monthly' ? 'Monthly Rate (₹)' : 'Rate Per Slot (₹)'}</Label>
                        {item.rateType === 'monthly' ? (
                          <Input
                            type="number"
                            value={item.monthlyRate || 0}
                            onChange={(e) => updateLineItem(index, 'monthlyRate', parseFloat(e.target.value) || 0)}
                            disabled={!editability.lineItems}
                          />
                        ) : (
                          <Input
                            type="number"
                            value={item.ratePerSlot}
                            onChange={(e) => updateLineItem(index, 'ratePerSlot', parseFloat(e.target.value) || 0)}
                            disabled={!editability.lineItems}
                          />
                        )}
                      </div>
                      {item.rateType === 'shift' && (
                        <div className="space-y-2">
                          <Label>Man Days</Label>
                          <Input
                            type="number"
                            value={item.manDays}
                            onChange={(e) => updateLineItem(index, 'manDays', parseInt(e.target.value) || 0)}
                            disabled={!editability.lineItems}
                          />
                        </div>
                      )}
                    </div>

                    {/* Row 3: Service Description */}
                    <div className="space-y-2">
                      <Label>Service Description</Label>
                      <Textarea
                        value={item.customDescription || ''}
                        onChange={(e) => updateLineItem(index, 'customDescription', e.target.value)}
                        placeholder="Describe the service scope for this role (will appear on invoices)"
                        rows={2}
                        disabled={!editability.lineItems}
                      />
                    </div>

                    {/* Footer: Amount */}
                    <div className="flex justify-end pt-1 border-t">
                      <span className="text-sm text-muted-foreground mr-2">Amount:</span>
                      <span className="font-mono font-semibold">{formatCurrency(item.lineTotal)}</span>
                    </div>
                  </Card>
                )
              ))}

              {lineItems.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No line items. Add a service or utility to get started.
                </div>
              )}
            </div>

            {/* Inline Summary */}
            <div className="border-t pt-4">
              <div className="flex justify-end">
                <div className="w-72 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-mono font-medium">{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      {formData.gstType === 'RCM' ? 'GST (Reverse Charge)' : `GST (${gstRate}%)`}
                    </span>
                    <span className="font-mono">{formatCurrency(gstAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total</span>
                    <span className="font-mono">{formatCurrency(totalAmount)}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Section 5: Notes */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              placeholder="Additional notes or terms..."
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
            />
          </CardContent>
        </Card>

        {/* Section 6: Company Details (Collapsible) */}
        <Collapsible open={companyOpen} onOpenChange={setCompanyOpen}>
          <Card>
            <CollapsibleTrigger asChild>
              <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">Company Details</CardTitle>
                  <ChevronDown className={`h-4 w-4 transition-transform ${companyOpen ? 'rotate-180' : ''}`} />
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="companyName">Company Name</Label>
                    <Input
                      id="companyName"
                      value={formData.companyName}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyName: e.target.value }))}
                      disabled={!editability.allFields}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="companyGst">Company GST</Label>
                    <Input
                      id="companyGst"
                      value={formData.companyGst}
                      onChange={(e) => setFormData(prev => ({ ...prev, companyGst: e.target.value }))}
                      disabled={!editability.allFields}
                    />
                  </div>
                </div>
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      </div>

      {/* Sticky Save Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            {hasChanges && (
              <Badge variant="warning" className="text-xs">Unsaved changes</Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleDiscard} disabled={!hasChanges || saving}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Discard Changes
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || saving}>
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
