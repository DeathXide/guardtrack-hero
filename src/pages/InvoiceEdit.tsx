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
    
    // Recalculate line total based on rate type
    const item = newLineItems[index];
    if (field === 'quantity' || field === 'manDays' || field === 'ratePerSlot' || field === 'monthlyRate' || field === 'rateType' || field === 'lineTotal') {
      if (item.rateType === 'utility') {
        // For utility items, lineTotal is directly editable and no calculation needed
        if (field !== 'lineTotal') {
          return;
        }
      } else if (item.rateType === 'monthly' && item.monthlyRate) {
        newLineItems[index].lineTotal = item.quantity * item.monthlyRate;
      } else if (item.rateType === 'shift') {
        newLineItems[index].lineTotal = item.quantity * item.manDays * item.ratePerSlot;
      }
    }
    
    setLineItems(newLineItems);
  };

  const addLineItem = (itemType: 'service' | 'utility' = 'service') => {
    if (itemType === 'utility') {
      const newItem: InvoiceLineItem = {
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
      };
      setLineItems([...lineItems, newItem]);
    } else {
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
    }
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.lineTotal, 0);
    const gstCalculation = calculateGST(subtotal, invoice?.gstType || 'GST');
    
    return { 
      subtotal, 
      gstRate: gstCalculation.gstRate,
      gstAmount: gstCalculation.gstAmount,
      cgstRate: gstCalculation.cgstRate,
      cgstAmount: gstCalculation.cgstAmount,
      sgstRate: gstCalculation.sgstRate,
      sgstAmount: gstCalculation.sgstAmount,
      igstRate: gstCalculation.igstRate,
      igstAmount: gstCalculation.igstAmount,
      totalAmount: gstCalculation.totalAmount
    };
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

  const { subtotal, gstRate, gstAmount, cgstRate, cgstAmount, sgstRate, sgstAmount, igstRate, igstAmount, totalAmount } = calculateTotals();

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

      <div className="space-y-6">
        {/* Invoice Details Form */}
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

            <div className="grid grid-cols-2 gap-4">
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
                  rows={2}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Line Items - Full Width */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Line Items</CardTitle>
              <div className="flex gap-2">
                <Button onClick={() => addLineItem('service')} size="sm" variant="outline">Add Service</Button>
                <Button onClick={() => addLineItem('utility')} size="sm">Add Utility</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Description</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Qty</TableHead>
                    <TableHead>Man Days</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
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
                        {item.rateType === 'utility' ? (
                          <Select 
                            value={item.role} 
                            onValueChange={(value) => updateLineItem(index, 'role', value)}
                          >
                            <SelectTrigger className="w-32">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Water Bill">Water</SelectItem>
                              <SelectItem value="Electricity Bill">Electricity</SelectItem>
                              <SelectItem value="Maintenance Charges">Maintenance</SelectItem>
                              <SelectItem value="Other Utility">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
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
                        )}
                      </TableCell>
                      <TableCell>
                        {item.rateType === 'utility' ? (
                          <span className="text-muted-foreground text-sm">-</span>
                        ) : (
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateLineItem(index, 'quantity', parseInt(e.target.value) || 0)}
                            className="w-16"
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        {item.rateType === 'utility' ? (
                          <span className="text-muted-foreground text-sm">-</span>
                        ) : item.rateType === 'shift' ? (
                          <Input
                            type="number"
                            value={item.manDays}
                            onChange={(e) => updateLineItem(index, 'manDays', parseInt(e.target.value) || 0)}
                            className="w-20"
                          />
                        ) : (
                          <span className="text-muted-foreground text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {item.rateType === 'utility' ? (
                          <span className="text-muted-foreground text-sm">-</span>
                        ) : item.rateType === 'monthly' ? (
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
                      <TableCell className="font-medium">
                        {item.rateType === 'utility' ? (
                          <Input
                            type="number"
                            value={item.lineTotal}
                            onChange={(e) => updateLineItem(index, 'lineTotal', parseFloat(e.target.value) || 0)}
                            className="w-24"
                            placeholder="Amount"
                          />
                        ) : (
                          <span>{formatCurrency(item.lineTotal)}</span>
                        )}
                      </TableCell>
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

        {/* Invoice Totals - Compact Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Invoice Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-mono">{formatCurrency(subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>
                    {invoice.gstType === 'RCM' ? 'GST (Reverse Charge)' : `GST (${gstRate}%)`}:
                  </span>
                  <span className="font-mono">{formatCurrency(gstAmount)}</span>
                </div>
                <div className="flex justify-between font-bold text-lg border-t pt-3">
                  <span>Total:</span>
                  <span className="font-mono">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex justify-between">
                  <span>Client:</span>
                  <span className="text-foreground">{invoice.clientName}</span>
                </div>
                <div className="flex justify-between">
                  <span>Site:</span>
                  <span className="text-foreground">{invoice.siteName}</span>
                </div>
                <div className="flex justify-between">
                  <span>GST Type:</span>
                  <span className="text-foreground">{invoice.gstType}</span>
                </div>
                
                {invoice.gstType === 'RCM' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-4">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> Reverse Charge Mechanism - Client pays GST directly.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}