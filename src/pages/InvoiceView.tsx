import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Download, Send, Check, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchInvoiceByIdFromDB, updateInvoiceInDB } from '@/lib/supabaseInvoiceApiNew';
import { formatCurrency } from '@/lib/invoiceUtils';
import { generatePDF } from '@/lib/pdfUtils';
import { numberToWords } from '@/lib/numberToWords';
import { companyApi } from '@/lib/companyApi';
import { Invoice } from '@/types/invoice';
import { toast } from 'sonner';
export default function InvoiceView() {
  const {
    id
  } = useParams<{
    id: string;
  }>();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [companySettings, setCompanySettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    if (id) {
      loadInvoice(id);
      loadCompanySettings();
    }
  }, [id]);
  const loadInvoice = async (invoiceId: string) => {
    setLoading(true);
    try {
      const data = await fetchInvoiceByIdFromDB(invoiceId);
      if (data) {
        setInvoice(data);
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
  const loadCompanySettings = async () => {
    try {
      const data = await companyApi.getCompanySettings();
      setCompanySettings(data);
    } catch (error) {
      console.error('Error loading company settings:', error);
    }
  };
  const handleStatusChange = async (newStatus: string) => {
    if (!invoice) return;
    try {
      const updatedInvoice = await updateInvoiceInDB(invoice.id, {
        status: newStatus as any
      });
      if (updatedInvoice) {
        setInvoice(updatedInvoice);
        toast.success('Invoice status updated');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };
  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'sent':
        return 'secondary';
      case 'overdue':
        return 'destructive';
      case 'draft':
        return 'outline';
      default:
        return 'outline';
    }
  };
  const handleDownloadPDF = async () => {
    try {
      await generatePDF('invoice-content', `Invoice-${invoice?.invoiceNumber}.pdf`);
      toast.success('PDF downloaded successfully');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };
  const getGstTypeDescription = (gstType: string) => {
    switch (gstType) {
      case 'GST':
        return 'Intra-State GST';
      case 'IGST':
        return 'Inter-State GST';
      case 'NGST':
        return 'No GST';
      case 'RCM':
        return 'Reverse Charge Mechanism';
      case 'PERSONAL':
        return 'Personal Billing';
      default:
        return gstType;
    }
  };
  if (loading) {
    return <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>;
  }
  if (!invoice) {
    return <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Invoice Not Found</h2>
          <Button onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
        </div>
      </div>;
  }
  return <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/invoices')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Invoices
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Invoice {invoice.invoiceNumber}</h1>
            <p className="text-muted-foreground">
              Created on {new Date(invoice.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(invoice.status)}>
            {invoice.status.toUpperCase()}
          </Badge>
          <Select value={invoice.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
            <Edit className="h-4 w-4 mr-2" />
            Edit
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button>
            <Send className="h-4 w-4 mr-2" />
            Send Invoice
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Content */}
        <div className="lg:col-span-2">
          <Card>
            <CardContent id="invoice-content" className="p-8 font-sans bg-background print:bg-white">
              {/* Modern Header with Brand Identity */}
              <div className="flex justify-between items-start mb-8 pb-6 border-b border-border">
                {/* Company Branding - Left Side */}
                <div className="flex-1">
                  <div className="mb-4">
                    <h1 className="text-3xl font-bold text-foreground mb-1 tracking-wide">
                      {companySettings?.company_name || invoice.companyName}
                    </h1>
                    <div className="text-sm text-muted-foreground space-y-1 leading-relaxed">
                      {(companySettings?.gst_number || invoice.companyGst) && (
                        <p className="flex items-center gap-2">
                          <span className="font-medium">GST:</span> 
                          <span>{companySettings?.gst_number || invoice.companyGst}</span>
                        </p>
                      )}
                      {companySettings?.company_phone && (
                        <p className="flex items-center gap-2">
                          📞 <span>{companySettings.company_phone}</span>
                        </p>
                      )}
                      {companySettings?.company_email && (
                        <p className="flex items-center gap-2">
                          ✉ <span>{companySettings.company_email}</span>
                        </p>
                      )}
                      {companySettings?.company_website && (
                        <p className="flex items-center gap-2">
                          🌐 <span>{companySettings.company_website}</span>
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Invoice Details - Right Side Boxed */}
                <div className="bg-secondary/50 border border-border rounded-lg p-6 min-w-[280px]">
                  <h2 className="text-2xl font-bold text-foreground mb-4 text-center tracking-wide">
                    INVOICE
                  </h2>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-muted-foreground">Invoice No:</span>
                      <span className="font-bold text-foreground">{invoice.invoiceNumber}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="font-semibold text-muted-foreground">Date:</span>
                      <span className="font-medium text-foreground">
                        {new Date(invoice.invoiceDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bill To Section - Enhanced */}
              <div className="mb-8">
                <div className="bg-info/30 border border-info/50 rounded-lg p-6">
                  <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
                    📄 Bill To:
                  </h3>
                  <div className="space-y-2">
                    <div>
                      <span className="text-sm font-semibold text-muted-foreground">Client Name:</span>
                      <p className="text-base font-bold text-foreground mt-1">{invoice.siteName}</p>
                    </div>
                    <div>
                      <span className="text-sm font-semibold text-muted-foreground">Address:</span>
                      <p className="text-sm text-foreground mt-1 leading-relaxed">
                        {invoice.clientAddress.split(', ').filter(Boolean).join(', ')}
                      </p>
                    </div>
                    {invoice.siteGst && (
                      <div className="pt-2 border-t border-info/30">
                        <span className="text-sm font-semibold text-muted-foreground">GST No:</span>
                        <p className="text-sm font-medium text-foreground mt-1">{invoice.siteGst}</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Enhanced Invoice Table */}
              <div className="mb-8">
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-secondary border-b border-border">
                        <TableHead className="text-center w-16 font-bold text-foreground text-sm">S.No</TableHead>
                        <TableHead className="font-bold text-foreground text-sm">Description</TableHead>
                        <TableHead className="text-center font-bold text-foreground text-sm w-32">Period</TableHead>
                        <TableHead className="text-center font-bold text-foreground text-sm w-20">Qty</TableHead>
                        <TableHead className="text-center font-bold text-foreground text-sm w-24">Man Days</TableHead>
                        <TableHead className="text-right font-bold text-foreground text-sm w-28">Rate</TableHead>
                        <TableHead className="text-right font-bold text-foreground text-sm w-32">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invoice.lineItems.map((item, index) => {
                      // Calculate days in the billing period
                      const fromDate = new Date(invoice.periodFrom);
                      const toDate = new Date(invoice.periodTo);
                      const timeDiff = toDate.getTime() - fromDate.getTime();
                      const daysInPeriod = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
                      const manDays = daysInPeriod * item.quantity;
                      return <TableRow 
                              key={item.id} 
                              className={index % 2 === 0 ? "bg-background" : "bg-muted/30 hover:bg-muted/50"}
                            >
                            <TableCell className="text-center text-sm font-medium text-foreground py-4">
                              {index + 1}
                            </TableCell>
                            <TableCell className="text-sm text-foreground py-4 font-medium">
                              {item.description}
                            </TableCell>
                            <TableCell className="text-center text-xs text-muted-foreground py-4">
                              {new Date(invoice.periodFrom).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })} to {new Date(invoice.periodTo).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                            </TableCell>
                            <TableCell className="text-center text-sm font-semibold text-foreground py-4">
                              {item.quantity}
                            </TableCell>
                            <TableCell className="text-center text-sm font-semibold text-foreground py-4">
                              {manDays}
                            </TableCell>
                            <TableCell className="text-right text-sm font-bold text-foreground py-4">
                              {formatCurrency(item.ratePerSlot)}
                            </TableCell>
                            <TableCell className="text-right text-sm font-bold text-foreground py-4">
                              {formatCurrency(item.lineTotal)}
                            </TableCell>
                          </TableRow>;
                    })}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Enhanced Totals & Summary Section */}
              <div className="border-t border-border pt-6">
                <div className={`flex ${invoice.gstType === 'RCM' ? 'justify-between items-start gap-8' : 'justify-end'}`}>
                  {/* RCM Information Card - Left Side */}
                  {invoice.gstType === 'RCM' && (
                    <div className="flex-1 max-w-lg">
                      <div className="bg-info/50 border border-info rounded-lg p-6">
                        <div className="flex items-center gap-2 mb-3">
                          🛡️ <span className="font-bold text-info-foreground text-base">
                            Reverse Charge Mechanism
                          </span>
                        </div>
                        <div className="text-sm text-info-foreground mb-3 font-medium">
                          Security Services - Notification No.29/2018
                        </div>
                        <div className="text-xs text-info-foreground/80 mb-3">
                          Union Territory Tax (Rate) W.E.F 01/01/2019
                        </div>
                        <div className="bg-background/60 rounded p-3 border border-info/30">
                          <p className="text-xs text-foreground leading-relaxed">
                            <strong>Important:</strong> The recipient is liable to pay CGST ({(invoice.cgstRate || 0).toFixed(1)}%) 
                            and SGST ({(invoice.sgstRate || 0).toFixed(1)}%) totaling{' '}
                            <span className="font-bold">
                              {formatCurrency(invoice.subtotal * (invoice.cgstRate || 0) / 100 + invoice.subtotal * (invoice.sgstRate || 0) / 100)}
                            </span>{' '}
                            directly to the government.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Professional Totals Section - Right Side */}
                  <div className="w-96">
                    <div className="bg-secondary/30 border border-border rounded-lg p-6 space-y-4">
                      {/* Subtotal */}
                      <div className="flex justify-between items-center py-2">
                        <span className="text-base font-medium text-foreground">Subtotal:</span>
                        <span className="text-base font-bold text-foreground">
                          {formatCurrency(invoice.subtotal)}
                        </span>
                      </div>
                      
                      {/* GST Breakdown */}
                      {invoice.gstType === 'GST' && (
                        <>
                          <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>CGST ({(invoice.cgstRate || 0).toFixed(1)}%):</span>
                            <span className="font-semibold">{formatCurrency(invoice.cgstAmount || 0)}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm text-muted-foreground">
                            <span>SGST ({(invoice.sgstRate || 0).toFixed(1)}%):</span>
                            <span className="font-semibold">{formatCurrency(invoice.sgstAmount || 0)}</span>
                          </div>
                        </>
                      )}
                      
                      {invoice.gstType === 'IGST' && (
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <span>IGST ({(invoice.igstRate || 0).toFixed(1)}%):</span>
                          <span className="font-semibold">{formatCurrency(invoice.igstAmount || 0)}</span>
                        </div>
                      )}
                      
                      {invoice.gstType === 'RCM' && (
                        <div className="bg-info/30 border border-info/50 rounded-lg p-4">
                          <div className="text-sm font-bold text-info-foreground mb-2">
                            Tax Payable by Recipient:
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-sm text-info-foreground">
                              <span>CGST ({(invoice.cgstRate || 0).toFixed(1)}%):</span>
                              <span className="font-semibold">
                                {formatCurrency(invoice.subtotal * (invoice.cgstRate || 0) / 100)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm text-info-foreground">
                              <span>SGST ({(invoice.sgstRate || 0).toFixed(1)}%):</span>
                              <span className="font-semibold">
                                {formatCurrency(invoice.subtotal * (invoice.sgstRate || 0) / 100)}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {(invoice.gstType === 'NGST' || invoice.gstType === 'PERSONAL') && (
                        <div className="flex justify-between items-center text-sm text-muted-foreground">
                          <span>GST ({(invoice.gstRate || 0).toFixed(1)}%):</span>
                          <span className="font-semibold">{formatCurrency(invoice.gstAmount || 0)}</span>
                        </div>
                      )}
                      
                      {/* Divider */}
                      <div className="border-t border-border my-4"></div>
                      
                      {/* Total Amount - Highlighted */}
                      <div className="bg-primary text-primary-foreground rounded-lg p-4">
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold">Total Amount:</span>
                          <span className="text-xl font-bold">
                            {formatCurrency(invoice.totalAmount || 0)}
                          </span>
                        </div>
                      </div>
                      
                      {/* Amount in Words */}
                      <div className="mt-4 pt-4 border-t border-border">
                        <p className="text-xs font-medium text-muted-foreground leading-relaxed">
                          <span className="font-semibold">Amount in Words:</span><br />
                          <span className="text-foreground font-medium italic">
                            {numberToWords(invoice.totalAmount || 0)}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notes Section */}
              {invoice.notes && (
                <div className="mt-8 pt-6 border-t border-border">
                  <div className="bg-muted/30 border border-border rounded-lg p-4">
                    <h4 className="font-bold text-foreground mb-3 flex items-center gap-2">
                      📝 Notes:
                    </h4>
                    <p className="text-sm text-foreground leading-relaxed">{invoice.notes}</p>
                  </div>
                </div>
              )}

              {/* Professional Signature Section */}
              <div className="mt-8 pt-6 border-t border-border">
                <div className="flex justify-between items-end">
                  <div className="flex-1"></div>
                  
                  {/* Signature Area */}
                  <div className="text-right min-w-[250px]">
                    <div className="space-y-6">
                      {/* Company Seal/Logo */}
                      <div className="flex justify-end">
                        {companySettings?.company_seal_image_url ? (
                          <img 
                            src={companySettings.company_seal_image_url} 
                            alt="Company Seal" 
                            className="h-16 w-auto object-contain opacity-80" 
                          />
                        ) : (
                          <div className="h-16 w-32 bg-muted/20 border-2 border-dashed border-border rounded flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">Company Seal</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Signature Line */}
                      <div className="border-t border-border pt-4">
                        <p className="font-bold text-foreground mb-1">
                          For {invoice.companyName}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Authorized Signatory
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modern Footer */}
              <div className="mt-8 pt-6 border-t border-border">
                <div className="text-center space-y-4">
                  <div className="bg-secondary/20 rounded-lg p-4">
                    <p className="text-lg font-semibold text-foreground mb-2">
                      🙏 Thank you for your business!
                    </p>
                    
                    {/* Company Address */}
                    {companySettings?.company_address_line1 && (
                      <p className="text-sm text-muted-foreground mb-3">
                        📍 {[
                          companySettings.company_address_line1, 
                          companySettings.company_address_line2, 
                          companySettings.company_address_line3
                        ].filter(Boolean).join(', ')}
                      </p>
                    )}
                    
                    {/* Contact Information with Icons */}
                    <div className="flex justify-center items-center gap-6 text-sm text-muted-foreground flex-wrap">
                      {companySettings?.company_phone && (
                        <div className="flex items-center gap-1">
                          📞 <span>{companySettings.company_phone}</span>
                        </div>
                      )}
                      {companySettings?.company_email && (
                        <div className="flex items-center gap-1">
                          ✉ <span>{companySettings.company_email}</span>
                        </div>
                      )}
                      {companySettings?.company_website && (
                        <div className="flex items-center gap-1">
                          🌐 <span>{companySettings.company_website}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>


            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Invoice Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between">
                <span>Status:</span>
                <Badge variant={getStatusBadgeVariant(invoice.status)}>
                  {invoice.status.toUpperCase()}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>Total Amount:</span>
                <span className="font-semibold">{formatCurrency(invoice.totalAmount)}</span>
              </div>
              <div className="flex justify-between">
                <span>GST Type:</span>
                <span>{getGstTypeDescription(invoice.gstType)}</span>
              </div>
              <div className="flex justify-between">
                <span>Created:</span>
                <span>{new Date(invoice.created_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full">
                <Send className="h-4 w-4 mr-2" />
                Send via Email
              </Button>
              <Button variant="outline" className="w-full" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate(`/invoices/${invoice.id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Invoice
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>;
}