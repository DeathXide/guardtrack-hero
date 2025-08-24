import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Calculator } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { fetchInvoiceByIdFromDB, updateInvoiceInDB } from '@/lib/supabaseInvoiceApiNew';
import { calculateGST, formatCurrency } from '@/lib/invoiceUtils';
import { Invoice, InvoiceLineItem } from '@/types/invoice';
import { toast } from 'sonner';

export default function InvoiceEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [formData, setFormData] = useState({
    periodFrom: '',
    periodTo: '',
    notes: '',
    status: 'draft' as 'draft' | 'sent' | 'paid' | 'overdue'
  });
  const [lineItems, setLineItems] = useState<InvoiceLineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (id) {
      loadInvoice(id);
    }
  }, [id]);

  const loadInvoice = async (invoiceId: string) => {
    setLoading(true);
    try {
      const data = await fetchInvoiceByIdFromDB(invoiceId);
      if (data) {
        setInvoice(data);
        setFormData({
          periodFrom: data.periodFrom,
          periodTo: data.periodTo,
          notes: data.notes || '',
          status: data.status
        });
        setLineItems([...data.lineItems]);
      } else {
        toast.error('Invoice not found');
        navigate('/invoices');
      }
    } catch (error) {
      console.error('Error loading invoice:', error);
      toast.error('Failed to load invoice');
      navigate('/invoices');
    } finally {
      setLoading(false);
    }
  };

  const updateLineItem = (index: number, field: keyof InvoiceLineItem, value: any) => {
    const newLineItems = [...lineItems];
    newLineItems[index] = { ...newLineItems[index], [field]: value };
    
    // Handle rate type switching
    if (field === 'rateType') {
      const item = newLineItems[index];
      if (value === 'monthly') {
        // If switching to monthly and no monthlyRate set, use current calculation to derive it
        if (!item.monthlyRate && item.ratePerSlot && item.quantity && item.manDays) {
          newLineItems[index].monthlyRate = (item.lineTotal || (item.quantity * item.manDays * item.ratePerSlot)) / item.quantity;
        }
      } else if (value === 'shift') {
        // If switching to shift and no ratePerSlot set, derive it from monthlyRate
        if (!item.ratePerSlot && item.monthlyRate && item.quantity && item.manDays) {
          newLineItems[index].ratePerSlot = (item.lineTotal || (item.quantity * item.monthlyRate)) / (item.quantity * item.manDays);
        }
      }
    }
    
    // Recalculate line total based on rate type
    const item = newLineItems[index];
    if (field === 'quantity' || field === 'manDays' || field === 'ratePerSlot' || field === 'monthlyRate' || field === 'rateType') {
      if (item.rateType === 'monthly' && item.monthlyRate) {
        newLineItems[index].lineTotal = item.quantity * item.monthlyRate;
      } else {
        newLineItems[index].lineTotal = item.quantity * item.manDays * item.ratePerSlot;
      }
    }
    
    setLineItems(newLineItems);
  };

  const addLineItem = () => {
    const newItem: InvoiceLineItem = {
      id: Date.now().toString(),
      role: 'Security Guard',
      shiftType: 'day',
      rateType: 'shift',
      quantity: 1,
      manDays: 30,
      ratePerSlot: 1500,
      lineTotal: 45000,
      description: 'Security Guard - Day Shift'
    };
    setLineItems([...lineItems, newItem]);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const { gstRate, gstAmount, totalAmount } = calculateGST(subtotal, invoice?.gstType || 'GST');
    
    return { subtotal, gstRate, gstAmount, totalAmount };
  };

  const handleSave = async () => {
    if (!invoice) return;

    setSaving(true);
    try {
      const { subtotal, gstRate, gstAmount, totalAmount } = calculateTotals();
      
      const updatedInvoice = await updateInvoiceInDB(invoice.id, {
        ...formData,
        lineItems,
        subtotal,
        gstRate,
        gstAmount,
        totalAmount
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
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Invoice Not Found</h2>
          <Button onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </div>
      </div>
    );
  }

  const { subtotal, gstRate, gstAmount, totalAmount } = calculateTotals();

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(`/invoices/${invoice.id}`)}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoice
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Edit Invoice {invoice.invoiceNumber}</h1>
            <p className="text-muted-foreground">Modify invoice details and line items</p>
          </div>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="periodFrom">Period From</Label>
                  <Input
                    id="periodFrom"
                    type="date"
                    value={formData.periodFrom}
                    onChange={(e) => setFormData(prev => ({ ...prev, periodFrom: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="periodTo">Period To</Label>
                  <Input
                    id="periodTo"
                    type="date"
                    value={formData.periodTo}
                    onChange={(e) => setFormData(prev => ({ ...prev, periodTo: e.target.value }))}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value as any }))}>
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
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Line Items</CardTitle>
                <Button onClick={addLineItem} size="sm">Add Item</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Rate Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Man Days</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lineItems.map((item, index) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.description || ''}
                          onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                          placeholder="Description"
                          className="min-w-40"
                        />
                      </TableCell>
                      <TableCell>
                        <Select 
                          value={item.rateType} 
                          onValueChange={(value) => updateLineItem(index, 'rateType', value)}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="shift">Shift</SelectItem>
                            <SelectItem value="monthly">Monthly</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          className="w-16"
                        />
                      </TableCell>
                      <TableCell>
                        {item.rateType === 'shift' ? (
                          <Input
                            type="number"
                            value={item.manDays}
                            onChange={(e) => updateLineItem(index, 'manDays', parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">N/A</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.rateType === 'monthly' ? (
                          <Input
                            type="number"
                            value={item.monthlyRate || 0}
                            onChange={(e) => updateLineItem(index, 'monthlyRate', parseFloat(e.target.value) || 0)}
                            className="w-24"
                            placeholder="Monthly rate"
                          />
                        ) : (
                          <Input
                            type="number"
                            value={item.ratePerSlot}
                            onChange={(e) => updateLineItem(index, 'ratePerSlot', parseFloat(e.target.value) || 0)}
                            className="w-24"
                            placeholder="Per shift"
                          />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{formatCurrency(item.lineTotal)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeLineItem(index)}
                          className="text-destructive"
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Invoice Totals
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span>
                  {invoice.gstType === 'RCM' ? 'GST (Reverse Charge)' : `GST (${gstRate}%)`}:
                </span>
                <span>{formatCurrency(gstAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-lg border-t pt-3">
                <span>Total:</span>
                <span>{formatCurrency(totalAmount)}</span>
              </div>
            </div>

            <div className="pt-4 border-t space-y-2">
              <div className="text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Client:</span>
                  <span>{invoice.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Site:</span>
                  <span>{invoice.siteName}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Type:</span>
                  <span>{invoice.gstType}</span>
                </div>
              </div>
            </div>

            {invoice.gstType === 'RCM' && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Reverse Charge Mechanism - Client pays GST directly.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}