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
import { fetchSites } from '@/lib/localService';
import { createInvoice } from '@/lib/invoiceData';
import { calculateInvoiceFromSite, formatCurrency } from '@/lib/invoiceUtils';
import { Site } from '@/types';
import { InvoiceFormData } from '@/types/invoice';
import { toast } from 'sonner';

export default function InvoiceCreate() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<Site[]>([]);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const [formData, setFormData] = useState<InvoiceFormData>({
    siteId: '',
    periodFrom: '',
    periodTo: '',
    notes: ''
  });
  const [preview, setPreview] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadSites();
    // Set default period to current month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    
    setFormData(prev => ({
      ...prev,
      periodFrom: firstDay.toISOString().split('T')[0],
      periodTo: lastDay.toISOString().split('T')[0]
    }));
  }, []);

  const loadSites = async () => {
    try {
      const data = await fetchSites();
      setSites(data);
    } catch (error) {
      console.error('Error loading sites:', error);
      toast.error('Failed to load sites');
    }
  };

  const handleSiteChange = (siteId: string) => {
    const site = sites.find(s => s.id === siteId);
    setSelectedSite(site || null);
    setFormData(prev => ({ ...prev, siteId }));
    
    if (site && formData.periodFrom && formData.periodTo) {
      generatePreview(site, formData.periodFrom, formData.periodTo);
    }
  };

  const handlePeriodChange = (field: 'periodFrom' | 'periodTo', value: string) => {
    const newFormData = { ...formData, [field]: value };
    setFormData(newFormData);
    
    if (selectedSite && newFormData.periodFrom && newFormData.periodTo) {
      generatePreview(selectedSite, newFormData.periodFrom, newFormData.periodTo);
    }
  };

  const generatePreview = (site: Site, periodFrom: string, periodTo: string) => {
    try {
      const invoiceData = calculateInvoiceFromSite(site, periodFrom, periodTo);
      setPreview(invoiceData);
    } catch (error) {
      console.error('Error generating preview:', error);
      toast.error('Failed to generate invoice preview');
    }
  };

  const handleCreateInvoice = async () => {
    if (!selectedSite || !formData.periodFrom || !formData.periodTo) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!preview) {
      toast.error('Please generate a preview first');
      return;
    }

    setLoading(true);
    try {
      const invoiceData = {
        ...preview,
        notes: formData.notes,
        status: 'draft' as const
      };

      const newInvoice = createInvoice(invoiceData);
      toast.success('Invoice created successfully');
      navigate(`/invoices/${newInvoice.id}`);
    } catch (error) {
      console.error('Error creating invoice:', error);
      toast.error('Failed to create invoice');
    } finally {
      setLoading(false);
    }
  };

  const getGstTypeDescription = (gstType: string) => {
    switch (gstType) {
      case 'GST': return 'Standard GST (18%)';
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
          <h1 className="text-3xl font-bold tracking-tight">Create Invoice</h1>
          <p className="text-muted-foreground">Generate a new invoice for your client</p>
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
            <div className="space-y-2">
              <Label htmlFor="site">Site *</Label>
              <Select value={formData.siteId} onValueChange={handleSiteChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a site" />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((site) => (
                    <SelectItem key={site.id} value={site.id}>
                      {site.name} - {site.organizationName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedSite && (
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span className="font-medium">Organization:</span>
                  <span>{selectedSite.organizationName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">GST Type:</span>
                  <Badge variant="outline">{getGstTypeDescription(selectedSite.gstType)}</Badge>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">GST Number:</span>
                  <span>{selectedSite.gstNumber || 'Not provided'}</span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="periodFrom">Period From *</Label>
                <Input
                  id="periodFrom"
                  type="date"
                  value={formData.periodFrom}
                  onChange={(e) => handlePeriodChange('periodFrom', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="periodTo">Period To *</Label>
                <Input
                  id="periodTo"
                  type="date"
                  value={formData.periodTo}
                  onChange={(e) => handlePeriodChange('periodTo', e.target.value)}
                />
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
              disabled={!preview || loading}
              className="w-full gap-2"
            >
              <Save className="h-4 w-4" />
              {loading ? 'Creating...' : 'Create Invoice'}
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
            {preview ? (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Invoice #:</strong> {preview.invoiceNumber}
                  </div>
                  <div>
                    <strong>Date:</strong> {new Date(preview.invoiceDate).toLocaleDateString()}
                  </div>
                  <div>
                    <strong>Client:</strong> {preview.clientName}
                  </div>
                  <div>
                    <strong>Period:</strong> {new Date(preview.periodFrom).toLocaleDateString()} - {new Date(preview.periodTo).toLocaleDateString()}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Line Items</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Qty</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.lineItems.map((item: any) => (
                        <TableRow key={item.id}>
                          <TableCell>{item.description}</TableCell>
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
                    <span>{formatCurrency(preview.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>
                      {preview.gstType === 'RCM' ? 'GST (Reverse Charge)' : `GST (${preview.gstRate}%)`}:
                    </span>
                    <span>{formatCurrency(preview.gstAmount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(preview.totalAmount)}</span>
                  </div>
                </div>

                {preview.gstType === 'RCM' && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                    <p className="text-sm text-yellow-800">
                      <strong>Note:</strong> This invoice is under Reverse Charge Mechanism. 
                      The recipient is liable to pay GST directly to the government.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Select a site and period to generate invoice preview</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}