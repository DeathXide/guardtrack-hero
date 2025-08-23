import { useState, useEffect } from 'react';
import { FileText, Calendar, Building2, Wand2, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { fetchSitesWithStaffing, fetchCompanySettings, convertSiteToInvoiceFormat, SiteWithStaffing, CompanySettings } from '@/lib/supabaseInvoiceApi';
import { createInvoice } from '@/lib/invoiceData';
import { calculateInvoiceFromSite, formatCurrency } from '@/lib/invoiceUtils';
import { toast } from 'sonner';

interface AutoGenerateInvoicesProps {
  onInvoicesCreated: () => void;
}

export default function AutoGenerateInvoices({ onInvoicesCreated }: AutoGenerateInvoicesProps) {
  const [sites, setSites] = useState<SiteWithStaffing[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings | null>(null);
  const [selectedSites, setSelectedSites] = useState<Set<string>>(new Set());
  const [periodFrom, setPeriodFrom] = useState('');
  const [periodTo, setPeriodTo] = useState('');
  const [loading, setLoading] = useState(false);
  const [sitesLoaded, setSitesLoaded] = useState(false);
  const [showInvoiceOptions, setShowInvoiceOptions] = useState(false);
  
  // Invoice customization options
  const [customInvoiceData, setCustomInvoiceData] = useState({
    companyName: '',
    companyGst: '',
    companyPhone: '',
    companyEmail: '',
    companyAddress: '',
    notes: '',
    gstType: 'GST' as 'GST' | 'IGST' | 'NGST' | 'RCM' | 'PERSONAL',
    gstRate: 18,
    invoiceDate: new Date().toISOString().split('T')[0] // Today's date as default
  });

  // Set default period to current month on component mount
  useEffect(() => {
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const pad = (n: number) => String(n).padStart(2, '0');
    const formatLocal = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    
    setPeriodFrom(formatLocal(firstDay));
    setPeriodTo(formatLocal(lastDay));
  }, []);

  const loadSites = async () => {
    try {
      // Load both sites and company settings
      const [sitesData, companyData] = await Promise.all([
        fetchSitesWithStaffing(),
        fetchCompanySettings()
      ]);
      
      setSites(sitesData);
      setCompanySettings(companyData);
      setSitesLoaded(true);
      
      // Pre-fill custom invoice data with company settings
      if (companyData) {
        setCustomInvoiceData({
          companyName: companyData.company_name || '',
          companyGst: companyData.gst_number || '',
          companyPhone: companyData.company_phone || '',
          companyEmail: companyData.company_email || '',
          companyAddress: [
            companyData.company_address_line1,
            companyData.company_address_line2,
            companyData.company_address_line3
          ].filter(Boolean).join(', '),
          notes: '',
          gstType: 'GST',
          gstRate: 18,
          invoiceDate: new Date().toISOString().split('T')[0]
        });
      }
      
      if (sitesData.length === 0) {
        toast.info('No sites found. Please create some sites first.');
      } else {
        // Select all sites by default
        setSelectedSites(new Set(sitesData.map(site => site.id)));
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load sites and company data');
    }
  };

  const toggleSiteSelection = (siteId: string) => {
    const newSelection = new Set(selectedSites);
    if (newSelection.has(siteId)) {
      newSelection.delete(siteId);
    } else {
      newSelection.add(siteId);
    }
    setSelectedSites(newSelection);
  };

  const selectAllSites = () => {
    setSelectedSites(new Set(sites.map(site => site.id)));
  };

  const clearSelection = () => {
    setSelectedSites(new Set());
  };

  const generateInvoices = async () => {
    if (selectedSites.size === 0) {
      toast.error('Please select at least one site');
      return;
    }

    if (!periodFrom || !periodTo) {
      toast.error('Please select the billing period');
      return;
    }

    if (!companySettings && !showInvoiceOptions) {
      toast.error('Company settings not found. Please configure company settings first.');
      return;
    }

    setLoading(true);
    try {
      const selectedSiteData = sites.filter(site => selectedSites.has(site.id));
      let createdCount = 0;

      for (const siteData of selectedSiteData) {
        // Check if site has staffing requirements
        if (!siteData.staffing_requirements || siteData.staffing_requirements.length === 0) {
          console.warn(`Skipping site ${siteData.site_name} - no staffing requirements defined`);
          continue;
        }

        // Calculate total slots to ensure there's something to bill
        const totalSlots = siteData.staffing_requirements.reduce((sum, req) => sum + req.day_slots + req.night_slots, 0);
        if (totalSlots === 0) {
          console.warn(`Skipping site ${siteData.site_name} - no slots configured`);
          continue;
        }

        // Convert to our Site format for invoice calculation
        const site = convertSiteToInvoiceFormat(siteData);
        
        const companyData = showInvoiceOptions ? {
          company_name: customInvoiceData.companyName,
          gst_number: customInvoiceData.companyGst
        } : {
          company_name: companySettings.company_name,
          gst_number: companySettings.gst_number
        };

        const invoiceData = calculateInvoiceFromSite(
          site, 
          periodFrom, 
          periodTo, 
          companyData
        );
        
        // Add company details to invoice
        const enhancedInvoiceData = {
          ...invoiceData,
          companyGst: showInvoiceOptions ? customInvoiceData.companyGst : (companySettings.gst_number || ''),
          companyPhone: showInvoiceOptions ? customInvoiceData.companyPhone : (companySettings.company_phone || ''),
          companyEmail: showInvoiceOptions ? customInvoiceData.companyEmail : (companySettings.company_email || ''),
          companyAddress: showInvoiceOptions ? customInvoiceData.companyAddress : [
            companySettings.company_address_line1,
            companySettings.company_address_line2,
            companySettings.company_address_line3
          ].filter(Boolean).join(', '),
          notes: showInvoiceOptions ? customInvoiceData.notes : '',
          gstType: showInvoiceOptions ? customInvoiceData.gstType : 'GST',
          gstRate: showInvoiceOptions ? customInvoiceData.gstRate : 18,
          invoiceDate: showInvoiceOptions ? customInvoiceData.invoiceDate : new Date().toISOString().split('T')[0]
        };
        
        const newInvoice = createInvoice({
          ...enhancedInvoiceData,
          status: 'draft'
        });
        
        createdCount++;
      }

      if (createdCount > 0) {
        toast.success(`Created ${createdCount} invoice(s) successfully`);
        onInvoicesCreated();
      } else {
        toast.warning('No invoices were created. Please ensure sites have staffing requirements configured.');
      }
    } catch (error) {
      console.error('Error generating invoices:', error);
      toast.error('Failed to generate invoices');
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

  const calculateSiteTotal = (site: SiteWithStaffing) => {
    if (!site.staffing_requirements) return 0;
    return site.staffing_requirements.reduce((sum, req) => {
      return sum + (req.day_slots * Number(req.budget_per_slot)) + (req.night_slots * Number(req.budget_per_slot));
    }, 0);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5" />
          Auto Generate Invoices
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {!sitesLoaded ? (
          <div className="text-center py-8">
            <Button onClick={loadSites} className="gap-2">
              <Building2 className="h-4 w-4" />
              Load Sites & Company Data
            </Button>
          </div>
        ) : (
          <>
            {sites.length === 0 ? (
              <Alert>
                <FileText className="h-4 w-4" />
                <AlertDescription>
                  No sites found. Please create some sites with staffing requirements first before generating invoices.
                </AlertDescription>
              </Alert>
            ) : (
              <>
                {/* Period Selection */}
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Billing Period</Label>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="periodFrom">From Date</Label>
                      <Input
                        id="periodFrom"
                        type="date"
                        value={periodFrom}
                        onChange={(e) => setPeriodFrom(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="periodTo">To Date</Label>
                      <Input
                        id="periodTo"
                        type="date"
                        value={periodTo}
                        onChange={(e) => setPeriodTo(e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Invoice Data Customization Toggle */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label className="text-base font-semibold">Invoice Data</Label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setShowInvoiceOptions(!showInvoiceOptions)}
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        {showInvoiceOptions ? 'Use Company Settings' : 'Customize Invoice Data'}
                      </Button>
                    </div>
                    
                    {showInvoiceOptions ? (
                      <div className="p-4 bg-muted rounded-lg space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="invoiceDate">Invoice Date</Label>
                          <Input
                            id="invoiceDate"
                            type="date"
                            value={customInvoiceData.invoiceDate}
                            onChange={(e) => setCustomInvoiceData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="companyName">Company Name</Label>
                            <Input
                              id="companyName"
                              value={customInvoiceData.companyName}
                              onChange={(e) => setCustomInvoiceData(prev => ({ ...prev, companyName: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="companyGst">GST Number</Label>
                            <Input
                              id="companyGst"
                              value={customInvoiceData.companyGst}
                              onChange={(e) => setCustomInvoiceData(prev => ({ ...prev, companyGst: e.target.value }))}
                            />
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="companyPhone">Phone</Label>
                            <Input
                              id="companyPhone"
                              value={customInvoiceData.companyPhone}
                              onChange={(e) => setCustomInvoiceData(prev => ({ ...prev, companyPhone: e.target.value }))}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="companyEmail">Email</Label>
                            <Input
                              id="companyEmail"
                              type="email"
                              value={customInvoiceData.companyEmail}
                              onChange={(e) => setCustomInvoiceData(prev => ({ ...prev, companyEmail: e.target.value }))}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="companyAddress">Company Address</Label>
                          <Textarea
                            id="companyAddress"
                            value={customInvoiceData.companyAddress}
                            onChange={(e) => setCustomInvoiceData(prev => ({ ...prev, companyAddress: e.target.value }))}
                            placeholder="Enter complete address"
                          />
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="gstType">GST Type</Label>
                            <Select 
                              value={customInvoiceData.gstType} 
                              onValueChange={(value: any) => setCustomInvoiceData(prev => ({ ...prev, gstType: value }))}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="GST">Standard GST</SelectItem>
                                <SelectItem value="IGST">Inter-State GST</SelectItem>
                                <SelectItem value="NGST">No GST</SelectItem>
                                <SelectItem value="RCM">Reverse Charge</SelectItem>
                                <SelectItem value="PERSONAL">Personal Billing</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="gstRate">GST Rate (%)</Label>
                            <Input
                              id="gstRate"
                              type="number"
                              value={customInvoiceData.gstRate}
                              onChange={(e) => setCustomInvoiceData(prev => ({ ...prev, gstRate: Number(e.target.value) }))}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="notes">Invoice Notes</Label>
                          <Textarea
                            id="notes"
                            value={customInvoiceData.notes}
                            onChange={(e) => setCustomInvoiceData(prev => ({ ...prev, notes: e.target.value }))}
                            placeholder="Additional notes for all invoices"
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 bg-muted rounded-lg space-y-2">
                        {companySettings ? (
                          <>
                            <div className="flex justify-between">
                              <span className="font-medium">Company:</span>
                              <span>{companySettings.company_name}</span>
                            </div>
                            {companySettings.gst_number && (
                              <div className="flex justify-between">
                                <span className="font-medium">GST Number:</span>
                                <span>{companySettings.gst_number}</span>
                              </div>
                            )}
                            {companySettings.company_phone && (
                              <div className="flex justify-between">
                                <span className="font-medium">Phone:</span>
                                <span>{companySettings.company_phone}</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-muted-foreground">Loading company settings...</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Site Selection */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Select Sites ({selectedSites.size} of {sites.length})</Label>
                    <div className="space-x-2">
                      <Button variant="outline" size="sm" onClick={selectAllSites}>
                        Select All
                      </Button>
                      <Button variant="outline" size="sm" onClick={clearSelection}>
                        Clear All
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sites.map((site) => {
                      const isSelected = selectedSites.has(site.id);
                      const siteTotal = calculateSiteTotal(site);
                      const hasStaffing = site.staffing_requirements && site.staffing_requirements.length > 0;

                      return (
                        <div
                          key={site.id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'bg-primary/10 border-primary' : 'hover:bg-muted/50'
                          } ${!hasStaffing ? 'opacity-50' : ''}`}
                          onClick={() => hasStaffing && toggleSiteSelection(site.id)}
                        >
                          <div className="flex items-start justify-between">
                            <div className="space-y-1 flex-1">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium">{site.site_name}</h4>
                                {isSelected && <Badge variant="secondary">Selected</Badge>}
                                {!hasStaffing && <Badge variant="destructive">No Staffing</Badge>}
                              </div>
                              <p className="text-sm text-muted-foreground">{site.organization_name}</p>
                              <div className="flex items-center gap-4 text-sm">
                                <Badge variant="outline">{getGstTypeDescription(site.gst_type)}</Badge>
                                {hasStaffing && (
                                  <span className="text-muted-foreground">
                                    Estimated: {formatCurrency(siteTotal)}
                                  </span>
                                )}
                              </div>
                              {hasStaffing && site.staffing_requirements && (
                                <div className="text-xs text-muted-foreground">
                                  {site.staffing_requirements.map((req, index) => (
                                    <span key={index}>
                                      {req.role_type}: {req.day_slots}D + {req.night_slots}N
                                      {index < site.staffing_requirements!.length - 1 ? ' | ' : ''}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Generate Button */}
                <div className="pt-4 border-t">
                  <Button 
                    onClick={generateInvoices} 
                    disabled={selectedSites.size === 0 || loading || (!companySettings && !showInvoiceOptions)}
                    className="w-full gap-2"
                    size="lg"
                  >
                    <Calendar className="h-4 w-4" />
                    {loading ? 'Generating Invoices...' : `Generate ${selectedSites.size} Invoice(s)`}
                  </Button>
                  {selectedSites.size > 0 && (
                    <p className="text-sm text-muted-foreground text-center mt-2">
                      This will create {selectedSites.size} draft invoice(s) for the selected period
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}