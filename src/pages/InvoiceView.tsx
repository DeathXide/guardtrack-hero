import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Download, Send, Check, X, Phone, Mail, MapPin, Building2, Hash, Calendar, Info } from 'lucide-react';
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
          <Card className="shadow-sm border-0">
            <CardContent id="invoice-content" className="p-0 font-sans bg-white w-[794px] mx-auto box-border min-h-[1123px] flex flex-col">
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 mb-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-3">
                    <h1 className="text-3xl font-light text-foreground tracking-wide">{companySettings?.company_name || invoice.companyName}</h1>
                    <div className="text-sm text-muted-foreground space-y-1 font-mono">
                      {(companySettings?.gst_number || invoice.companyGst) && <p>GST: {companySettings?.gst_number || invoice.companyGst}</p>}
                      {companySettings?.company_address_line1 && (
                        <p className="text-xs leading-relaxed">
                          {[companySettings.company_address_line1, companySettings.company_address_line2, companySettings.company_address_line3].filter(Boolean).join(', ')}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-4 text-xs">
                        {companySettings?.company_phone && (
                          <div className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            <span>{companySettings.company_phone}</span>
                          </div>
                        )}
                        {companySettings?.company_email && (
                          <div className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            <span>{companySettings.company_email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="bg-white border border-border rounded-lg p-4 shadow-sm">
                    <h2 className="text-lg font-medium text-foreground mb-3">INVOICE</h2>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center gap-8">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Hash className="h-3 w-3" />
                          <span>Number:</span>
                        </div>
                        <span className="font-mono font-medium">{invoice.invoiceNumber}</span>
                      </div>
                      <div className="flex justify-between items-center gap-8">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Date:</span>
                        </div>
                        <span className="font-mono">{new Date(invoice.invoiceDate).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Info */}
              <div className="px-4 mb-6">
                <div className="bg-accent/50 rounded-lg p-4 max-w-md">
                  <div className="flex items-center gap-2 mb-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <h3 className="text-sm font-medium text-muted-foreground">BILL TO</h3>
                  </div>
                  <div className="space-y-2">
                    <p className="font-medium text-foreground">{invoice.siteName}</p>
                    <div className="flex items-start gap-1">
                      <MapPin className="h-3 w-3 text-muted-foreground mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-muted-foreground leading-relaxed">{invoice.clientAddress.split(', ').filter(Boolean).join(', ')}</p>
                    </div>
                    {invoice.siteGst && (
                      <p className="text-xs text-muted-foreground font-mono mt-2">
                        <span className="font-medium">GST:</span> {invoice.siteGst}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Content Area - flex-grow to push footer down */}
              <div className="flex-1">
                {/* Line Items */}
                <div className="px-4 mb-6">
                  <div className="overflow-hidden rounded-lg border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/50 hover:bg-muted/50">
                          <TableHead className="text-center w-12 font-medium text-xs">No.</TableHead>
                          <TableHead className="font-medium text-xs min-w-[200px]">Description</TableHead>
                          <TableHead className="text-center font-medium text-xs w-24">Period</TableHead>
                          <TableHead className="text-center font-medium text-xs w-16">Qty</TableHead>
                          <TableHead className="text-center font-medium text-xs w-20">Days</TableHead>
                          <TableHead className="text-right font-medium text-xs w-24">Rate</TableHead>
                          <TableHead className="text-right font-medium text-xs w-28">Amount</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {invoice.lineItems.map((item, index) => {
                          const fromDate = new Date(invoice.periodFrom);
                          const toDate = new Date(invoice.periodTo);
                          const timeDiff = toDate.getTime() - fromDate.getTime();
                          const daysInPeriod = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;
                          const manDays = daysInPeriod * item.quantity;
                          return (
                            <TableRow key={item.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                              <TableCell className="text-center text-sm text-muted-foreground">{index + 1}</TableCell>
                              <TableCell className="text-sm font-medium">{item.description}</TableCell>
                              <TableCell className="text-center text-xs text-muted-foreground font-mono">
                                {new Date(invoice.periodFrom).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: '2-digit'
                                })} - {new Date(invoice.periodTo).toLocaleDateString('en-GB', {
                                  day: '2-digit',
                                  month: '2-digit'
                                })}
                              </TableCell>
                              <TableCell className="text-center text-sm font-medium">{item.quantity}</TableCell>
                              <TableCell className="text-center text-sm font-medium">{manDays}</TableCell>
                              <TableCell className="text-right text-sm font-mono">{formatCurrency(item.ratePerSlot)}</TableCell>
                              <TableCell className="text-right text-sm font-mono font-semibold">{formatCurrency(item.lineTotal)}</TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                </div>

                {/* Totals */}
                <div className="px-4 mb-6">
                  <div className={`flex ${invoice.gstType === 'RCM' ? 'justify-between items-start gap-8' : 'justify-end'}`}>
                    {/* RCM Notice - Subtle Design */}
                    {invoice.gstType === 'RCM' && (
                      <div className="flex-1 max-w-sm">
                        <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-4">
                          <div className="flex items-start gap-2 mb-2">
                            <Info className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-xs font-medium text-blue-900 leading-tight">Reverse Charge Mechanism</p>
                              <p className="text-xs text-blue-700 mt-1">Security Services - Notification No.29/2018</p>
                            </div>
                          </div>
                          <p className="text-xs text-blue-800 leading-relaxed">
                            Recipient liable for CGST ({(invoice.cgstRate || 0).toFixed(1)}%) & SGST ({(invoice.sgstRate || 0).toFixed(1)}%) 
                            totaling {formatCurrency(invoice.subtotal * (invoice.cgstRate || 0) / 100 + invoice.subtotal * (invoice.sgstRate || 0) / 100)}
                          </p>
                        </div>
                      </div>
                    )}
                    
                    {/* Totals Section */}
                    <div className="w-72">
                      <div className="space-y-3 text-sm">
                        <div className="flex justify-between py-2">
                          <span className="text-muted-foreground">Subtotal</span>
                          <span className="font-mono font-medium">{formatCurrency(invoice.subtotal)}</span>
                        </div>
                        
                        {/* GST Breakdown */}
                        {invoice.gstType === 'GST' && (
                          <div className="space-y-1 border-l-2 border-muted pl-3">
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">CGST ({(invoice.cgstRate || 0).toFixed(1)}%)</span>
                              <span className="font-mono">{formatCurrency(invoice.cgstAmount || 0)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-muted-foreground">SGST ({(invoice.sgstRate || 0).toFixed(1)}%)</span>
                              <span className="font-mono">{formatCurrency(invoice.sgstAmount || 0)}</span>
                            </div>
                          </div>
                        )}
                        
                        {invoice.gstType === 'IGST' && (
                          <div className="flex justify-between text-xs border-l-2 border-muted pl-3">
                            <span className="text-muted-foreground">IGST ({(invoice.igstRate || 0).toFixed(1)}%)</span>
                            <span className="font-mono">{formatCurrency(invoice.igstAmount || 0)}</span>
                          </div>
                        )}
                        
                        {invoice.gstType === 'RCM' && (
                          <div className="bg-blue-50/30 border border-blue-100 rounded p-2">
                            <div className="text-xs text-blue-900 font-medium mb-1">Tax Payable by Recipient</div>
                            <div className="space-y-0.5 text-xs">
                              <div className="flex justify-between text-blue-800">
                                <span>CGST ({(invoice.cgstRate || 0).toFixed(1)}%)</span>
                                <span className="font-mono">{formatCurrency(invoice.subtotal * (invoice.cgstRate || 0) / 100)}</span>
                              </div>
                              <div className="flex justify-between text-blue-800">
                                <span>SGST ({(invoice.sgstRate || 0).toFixed(1)}%)</span>
                                <span className="font-mono">{formatCurrency(invoice.subtotal * (invoice.sgstRate || 0) / 100)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {(invoice.gstType === 'NGST' || invoice.gstType === 'PERSONAL') && (
                          <div className="flex justify-between text-xs border-l-2 border-muted pl-3">
                            <span className="text-muted-foreground">GST ({(invoice.gstRate || 0).toFixed(1)}%)</span>
                            <span className="font-mono">{formatCurrency(invoice.gstAmount || 0)}</span>
                          </div>
                        )}
                        
                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
                          <div className="flex justify-between items-center">
                            <span className="font-medium text-primary">Total Amount</span>
                            <span className="text-xl font-mono font-bold text-primary">{formatCurrency(invoice.totalAmount || 0)}</span>
                          </div>
                        </div>
                        
                        <div className="pt-3 border-t border-border">
                          <p className="text-xs text-muted-foreground font-medium">
                            Amount in Words: <span className="font-normal italic">{numberToWords(invoice.totalAmount || 0)}</span>
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Terms */}
                <div className="px-4 mb-6">
                  <div className="bg-orange-50/30 border border-orange-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-orange-900 mb-3">Payment Terms</h4>
                    <div className="space-y-2 text-sm text-orange-800">
                      <p>Kindly release the payment towards the bill on or before the 3rd of this month.</p>
                      <p>Interest at 24% per annum will be charged on all outstanding amounts beyond the due date.</p>
                    </div>
                  </div>
                </div>

                {/* Authorized Signatory */}
                <div className="px-4 mb-6">
                  <div className="flex justify-start">
                    <div className="text-left space-y-4">
                      <div className="h-12 w-32 flex items-end justify-end">
                        {companySettings?.company_seal_image_url && (
                          <img src={companySettings.company_seal_image_url} alt="Company Seal" className="h-24 w-auto object-contain opacity-80 ml-auto" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-foreground">For {invoice.companyName}</p>
                        <p className="text-xs text-muted-foreground mt-1">Authorized Signatory</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {invoice.notes && (
                  <div className="px-4 mb-6">
                    <div className="bg-accent/30 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-muted-foreground mb-2">Notes</h4>
                      <p className="text-sm text-foreground leading-relaxed">{invoice.notes}</p>
                    </div>
                  </div>
                )}
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