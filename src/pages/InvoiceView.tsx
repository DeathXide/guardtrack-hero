import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Edit, Download, Send, Phone, Mail, MapPin, Building2, Hash, Calendar, Info } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchInvoiceByIdFromDB, updateInvoiceInDB } from '@/lib/supabaseInvoiceApiNew';
import { formatCurrency, calculateRoundOff } from '@/lib/invoiceUtils';
import { generatePDF } from '@/lib/pdfUtils';
import { numberToWords } from '@/lib/numberToWords';
import { companyApi } from '@/lib/companyApi';
import { Invoice } from '@/types/invoice';
import { toast } from 'sonner';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/layout/PageHeader';

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
  const invoiceContentRef = useRef<HTMLDivElement>(null);
  const [contentScale, setContentScale] = useState(1);
  useEffect(() => {
    if (id) {
      loadInvoice(id);
      loadCompanySettings();
    }

    // Listen for messages from parent window (for bulk download)
    const handleMessage = (event: MessageEvent) => {
      if (event.data.action === 'downloadPDF') {
        handleDownloadPDF();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [id]);

  // Auto-scale invoice content to fit one A4 page
  useEffect(() => {
    if (!invoiceContentRef.current || loading || !invoice) return;

    const el = invoiceContentRef.current;
    const A4_HEIGHT = 1123; // A4 height in px at 96dpi
    // scrollHeight is unaffected by CSS transform, always returns natural height
    const naturalHeight = el.scrollHeight;

    if (naturalHeight > A4_HEIGHT) {
      setContentScale(A4_HEIGHT / naturalHeight);
    } else {
      setContentScale(1);
    }
  }, [invoice, loading]);

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
  const handleBack = () => {
    if (window.history.length > 1) navigate(-1);
    else navigate('/invoices');
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'success' as const;
      case 'sent': return 'info' as const;
      case 'overdue': return 'warning' as const;
      case 'draft': return 'outline' as const;
      default: return 'outline' as const;
    }
  };
  const getInvoiceFilename = () => {
    if (!invoice) return 'Invoice.pdf';
    const siteName = invoice.siteName?.replace(/[^a-zA-Z0-9\s]/g, '').replace(/\s+/g, '_') || 'Unknown_Site';
    const period = new Date(invoice.periodFrom);
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthYear = `${monthNames[period.getMonth()]}_${period.getFullYear()}`;
    return `${siteName}_${monthYear}_${invoice.invoiceNumber}.pdf`;
  };

  const handleDownloadPDF = async () => {
    try {
      await generatePDF('invoice-content', getInvoiceFilename());
      toast.success(`Downloaded: ${getInvoiceFilename()}`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to download PDF');
    }
  };

  const handleShareWhatsApp = async () => {
    if (!invoice) return;
    try {
      const filename = getInvoiceFilename();
      const period = new Date(invoice.periodFrom);
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
      const monthYear = `${monthNames[period.getMonth()]} ${period.getFullYear()}`;
      const { roundedTotal } = calculateRoundOff(invoice.totalAmount || 0);
      const message = `*${invoice.siteName}*\nInvoice: ${invoice.invoiceNumber}\nPeriod: ${monthYear}\nAmount: ${formatCurrency(roundedTotal)}`;

      // Try Web Share API first (works on mobile)
      if (navigator.share && navigator.canShare) {
        const { generatePDFBlob } = await import('@/lib/pdfUtils');
        const blob = await generatePDFBlob('invoice-content');
        const file = new File([blob], filename, { type: 'application/pdf' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({ title: filename, text: message, files: [file] });
          toast.success('Shared successfully');
          return;
        }
      }

      // Fallback: download PDF + open WhatsApp with message
      await generatePDF('invoice-content', filename);
      const encoded = encodeURIComponent(message);
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
      toast.success(`Downloaded: ${filename}`);
    } catch (error: any) {
      if (error.name === 'AbortError') return;
      console.error('Error sharing:', error);
      toast.error('Failed to share invoice');
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
    return <div className="space-y-6">
        <div className="space-y-2">
          <Skeleton className="h-4 w-48" />
          <Skeleton className="h-8 w-64" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Skeleton className="h-[600px] w-full rounded-lg" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-48 w-full rounded-lg" />
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>;
  }
  if (!invoice) {
    return <div className="text-center py-12">
        <h2 className="text-2xl font-bold mb-4">Invoice Not Found</h2>
        <Button onClick={handleBack}>
          Back to Invoices
        </Button>
      </div>;
  }
  const isPersonal = invoice.gstType === 'PERSONAL';
  const displayCompanyName = isPersonal ? invoice.companyName : (companySettings?.company_name || invoice.companyName);
  return <div className="space-y-6">
      <PageHeader
        title={`Invoice ${invoice.invoiceNumber}`}
        subtitle={`Created on ${new Date(invoice.created_at).toLocaleDateString()}`}
        breadcrumbs={[
          { label: 'Invoices', href: '/invoices' },
          { label: invoice.invoiceNumber },
        ]}
        backButton
        actions={<div className="flex items-center gap-2">
          <Badge variant={getStatusBadgeVariant(invoice.status)} className="capitalize">
            {invoice.status}
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
          <Button variant="outline" onClick={handleShareWhatsApp} className="gap-2 text-green-700 border-green-200 hover:bg-green-50">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            WhatsApp
          </Button>
          <Button>
            <Send className="h-4 w-4 mr-2" />
            Send Invoice
          </Button>
        </div>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Invoice Content */}
        <div className="lg:col-span-2">
          <Card className="shadow-sm border-0 overflow-hidden">
            <div
              className="mx-auto"
              style={{
                width: '794px',
                height: contentScale < 1 ? '1123px' : undefined,
                overflow: contentScale < 1 ? 'hidden' : undefined,
              }}
            >
            <CardContent
              id="invoice-content"
              ref={invoiceContentRef}
              className="p-0 font-sans bg-white w-[794px] box-border min-h-[1123px] flex flex-col"
              style={{
                transform: contentScale < 1 ? `scale(${contentScale})` : undefined,
                transformOrigin: 'top left',
              }}
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-slate-50 to-gray-50 p-4 mb-6">
                <div className="flex justify-between items-start">
                  <div className="space-y-3">
                    <h1 className="text-3xl font-light text-foreground tracking-wide">{displayCompanyName}</h1>
                    {!isPersonal && companySettings?.company_motto && (
                      <p className="text-sm italic text-muted-foreground mt-1">{companySettings.company_motto}</p>
                    )}
                     <div className="text-sm text-muted-foreground space-y-1 font-mono">
                       {!isPersonal && (companySettings?.gst_number || invoice.companyGst) && <p>GST: {companySettings?.gst_number || invoice.companyGst}</p>}
                       {!isPersonal && <p>SAC: 99852</p>}
                      {companySettings?.company_address_line1 && (
                        <p className="text-xs leading-relaxed">
                          {[companySettings.company_address_line1, companySettings.company_address_line2, companySettings.company_address_line3].filter(Boolean).join(', ')}
                        </p>
                      )}
                      {!isPersonal && (
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
                      )}
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
                      <div className="flex justify-between items-center gap-8">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          <span>Period:</span>
                        </div>
                        <span className="font-mono text-xs">
                          {new Date(invoice.periodFrom).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })} - {new Date(invoice.periodTo).toLocaleDateString('en-GB', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric'
                          })}
                        </span>
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
                    {!isPersonal && invoice.siteGst && (
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
                           const isUtility = item.rateType === 'utility';
                           
                           return (
                             <TableRow key={item.id} className={index % 2 === 0 ? "bg-background" : "bg-muted/20"}>
                               <TableCell className="text-center text-sm text-muted-foreground">{index + 1}</TableCell>
                               {isUtility ? (
                                 <>
                                   <TableCell colSpan={4} className="text-sm font-medium">{item.description}</TableCell>
                                   <TableCell className="text-right text-sm font-mono font-semibold">{formatCurrency(item.lineTotal)}</TableCell>
                                 </>
                               ) : (
                                 <>
                                    <TableCell className="text-sm font-medium">
                                      <div className="space-y-1">
                                        <div>{item.description}</div>
                                        {item.customDescription && (
                                          <div className="text-xs text-muted-foreground font-normal leading-relaxed">
                                            {item.customDescription}
                                          </div>
                                        )}
                                      </div>
                                    </TableCell>
                                   <TableCell className="text-center text-sm font-medium">{item.quantity}</TableCell>
                                   <TableCell className="text-center text-sm font-medium">
                                     {(item.manDays ?? daysInPeriod) * item.quantity}
                                   </TableCell>
                                   <TableCell className="text-right text-sm font-mono">
                                     {formatCurrency(item.rateType === 'monthly' ? (item.monthlyRate || 0) : item.ratePerSlot)}
                                   </TableCell>
                                   <TableCell className="text-right text-sm font-mono font-semibold">{formatCurrency(item.lineTotal)}</TableCell>
                                 </>
                               )}
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
                            totaling {formatCurrency((invoice.cgstAmount || 0) + (invoice.sgstAmount || 0))}
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
                                <span className="font-mono">{formatCurrency(invoice.cgstAmount || 0)}</span>
                              </div>
                              <div className="flex justify-between text-blue-800">
                                <span>SGST ({(invoice.sgstRate || 0).toFixed(1)}%)</span>
                                <span className="font-mono">{formatCurrency(invoice.sgstAmount || 0)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                        
                        {invoice.gstType === 'NGST' && (
                          <div className="flex justify-between text-xs border-l-2 border-muted pl-3">
                            <span className="text-muted-foreground">GST ({(invoice.gstRate || 0).toFixed(1)}%)</span>
                            <span className="font-mono">{formatCurrency(invoice.gstAmount || 0)}</span>
                          </div>
                        )}
                        
                        {(() => {
                          const { roundOff, roundedTotal } = calculateRoundOff(invoice.totalAmount || 0);
                          return (
                            <>
                              {roundOff !== 0 && (
                                <div className="flex justify-between text-xs py-1">
                                  <span className="text-muted-foreground">Round Off</span>
                                  <span className="font-mono">{roundOff > 0 ? '+' : ''}{roundOff.toFixed(2)}</span>
                                </div>
                              )}
                              <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium text-primary">Total Amount</span>
                                  <span className="text-xl font-mono font-bold text-primary">{formatCurrency(roundedTotal)}</span>
                                </div>
                              </div>
                              <div className="pt-3 border-t border-border">
                                <p className="text-xs text-muted-foreground font-medium">
                                  Amount in Words: <span className="font-normal italic">{numberToWords(roundedTotal)}</span>
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Payment Terms */}
                {!isPersonal && (
                <div className="px-4 mb-6">
                  <div className="bg-muted/20 border border-border/50 rounded p-3">
                    <h4 className="text-xs font-medium text-muted-foreground mb-2">Payment Terms</h4>
                    <div className="space-y-1 text-xs text-muted-foreground">
                      <p>Kindly release the payment towards the bill on or before the 3rd of this month.</p>
                      <p>Interest at 24% per annum will be charged on all outstanding amounts beyond the due date.</p>
                    </div>
                  </div>
                </div>
                )}

                {/* Authorized Signatory */}
<div className="px-4 mb-6">
  <div className="flex justify-start">
    <div className="text-left">
      <p className="text-sm font-medium text-foreground">
        For {displayCompanyName}
      </p>

    <div className="relative h-auto inline-block w-32">
  {!isPersonal && companySettings?.company_seal_image_url && (
    <img
      src={companySettings.company_seal_image_url}
      alt="Company Seal"
      className="block w-full h-auto object-contain opacity-100 relative z-10" 
    />
  )}
  <p className={`absolute inset-0 flex  text-xs text-muted-foreground z-0 ${isPersonal ? 'mt-12' : 'items-center justify-center'}`}>
    Authorized Signatory
  </p>
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
            </div>
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
                  {invoice.status}
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