import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.52.0'
import JSZip from 'https://esm.sh/jszip@3.10.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Utility functions (inlined since we can't import from src)
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
}

function numberToWords(num: number): string {
  const ones = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
  const teens = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
  const tens = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
  
  if (num === 0) return 'zero';
  if (num < 10) return ones[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) return tens[Math.floor(num / 10)] + (num % 10 ? ' ' + ones[num % 10] : '');
  if (num < 1000) return ones[Math.floor(num / 100)] + ' hundred' + (num % 100 ? ' ' + numberToWords(num % 100) : '');
  if (num < 100000) return numberToWords(Math.floor(num / 1000)) + ' thousand' + (num % 1000 ? ' ' + numberToWords(num % 1000) : '');
  if (num < 10000000) return numberToWords(Math.floor(num / 100000)) + ' lakh' + (num % 100000 ? ' ' + numberToWords(num % 100000) : '');
  return numberToWords(Math.floor(num / 10000000)) + ' crore' + (num % 10000000 ? ' ' + numberToWords(num % 10000000) : '');
}

function generateInvoiceHTML(invoice: any, companySettings?: any): string {
  const fromDate = new Date(invoice.periodFrom);
  const toDate = new Date(invoice.periodTo);
  const timeDiff = toDate.getTime() - fromDate.getTime();
  const baseDaysInPeriod = Math.ceil(timeDiff / (1000 * 3600 * 24)) + 1;

  const lineItemsHTML = invoice.lineItems.map((item: any, index: number) => {
    const daysInPeriod = baseDaysInPeriod;
    const manDays = daysInPeriod * item.quantity;
    const backgroundColor = index % 2 === 0 ? '#ffffff' : '#f8fafc';
    
    return `
      <tr style="background-color: ${backgroundColor};">
        <td style="padding: 12px 8px; text-align: center; color: #64748b; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${index + 1}</td>
        <td style="padding: 12px 8px; font-weight: 500; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${item.description}</td>
        <td style="padding: 12px 8px; text-align: center; font-weight: 500; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${item.quantity}</td>
        <td style="padding: 12px 8px; text-align: center; font-weight: 500; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${manDays}</td>
        <td style="padding: 12px 8px; text-align: right; font-family: monospace; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.ratePerSlot)}</td>
        <td style="padding: 12px 8px; text-align: right; font-family: monospace; font-weight: 600; font-size: 14px; border-bottom: 1px solid #e2e8f0;">${formatCurrency(item.lineTotal)}</td>
      </tr>
    `;
  }).join('');

  const gstBreakdownHTML = () => {
    if (invoice.gstType === 'GST') {
      return `
        <div style="border-left: 2px solid #e2e8f0; padding-left: 12px; margin: 8px 0;">
          <div style="display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 4px;">
            <span style="color: #64748b;">CGST (${(invoice.cgstRate || 0).toFixed(1)}%)</span>
            <span style="font-family: monospace;">${formatCurrency(invoice.cgstAmount || 0)}</span>
          </div>
          <div style="display: flex; justify-content: space-between; font-size: 12px;">
            <span style="color: #64748b;">SGST (${(invoice.sgstRate || 0).toFixed(1)}%)</span>
            <span style="font-family: monospace;">${formatCurrency(invoice.sgstAmount || 0)}</span>
          </div>
        </div>
      `;
    }
    
    if (invoice.gstType === 'IGST') {
      return `
        <div style="border-left: 2px solid #e2e8f0; padding-left: 12px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">IGST (${(invoice.igstRate || 0).toFixed(1)}%)</span>
            <span style="font-family: monospace;">${formatCurrency(invoice.igstAmount || 0)}</span>
          </div>
        </div>
      `;
    }
    
    if (invoice.gstType === 'RCM') {
      return `
        <div style="background-color: #eff6ff; border: 1px solid #dbeafe; border-radius: 6px; padding: 8px; margin: 8px 0;">
          <div style="font-size: 12px; font-weight: 500; color: #1e3a8a; margin-bottom: 4px;">Tax Payable by Recipient</div>
          <div style="font-size: 12px;">
            <div style="display: flex; justify-content: space-between; color: #1e40af; margin-bottom: 2px;">
              <span>CGST (${(invoice.cgstRate || 0).toFixed(1)}%)</span>
              <span style="font-family: monospace;">${formatCurrency(invoice.subtotal * (invoice.cgstRate || 0) / 100)}</span>
            </div>
            <div style="display: flex; justify-content: space-between; color: #1e40af;">
              <span>SGST (${(invoice.sgstRate || 0).toFixed(1)}%)</span>
              <span style="font-family: monospace;">${formatCurrency(invoice.subtotal * (invoice.sgstRate || 0) / 100)}</span>
            </div>
          </div>
        </div>
      `;
    }
    
    if (invoice.gstType === 'NGST' || invoice.gstType === 'PERSONAL') {
      return `
        <div style="border-left: 2px solid #e2e8f0; padding-left: 12px; font-size: 12px;">
          <div style="display: flex; justify-content: space-between;">
            <span style="color: #64748b;">GST (${(invoice.gstRate || 0).toFixed(1)}%)</span>
            <span style="font-family: monospace;">${formatCurrency(invoice.gstAmount || 0)}</span>
          </div>
        </div>
      `;
    }
    
    return '';
  };

  const rcmNoticeHTML = invoice.gstType === 'RCM' ? `
    <div style="flex: 1; max-width: 400px;">
      <div style="background-color: #f0f9ff; border: 1px solid #e0f2fe; border-radius: 8px; padding: 16px;">
        <div style="display: flex; align-items: flex-start; gap: 8px; margin-bottom: 8px;">
          <div style="color: #0284c7; margin-top: 2px;">ℹ️</div>
          <div>
            <p style="font-size: 12px; font-weight: 500; color: #0c4a6e; line-height: 1.3; margin: 0 0 4px 0;">Reverse Charge Mechanism</p>
            <p style="font-size: 12px; color: #0369a1; margin: 0;">Security Services - Notification No.29/2018</p>
          </div>
        </div>
        <p style="font-size: 12px; color: #0c4a6e; line-height: 1.4; margin: 0;">
          Recipient liable for CGST (${(invoice.cgstRate || 0).toFixed(1)}%) & SGST (${(invoice.sgstRate || 0).toFixed(1)}%) 
          totaling ${formatCurrency(invoice.subtotal * (invoice.cgstRate || 0) / 100 + invoice.subtotal * (invoice.sgstRate || 0) / 100)}
        </p>
      </div>
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Invoice ${invoice.invoiceNumber}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif; }
    .invoice-container { 
      width: 794px; 
      margin: 0 auto; 
      background: white; 
      min-height: 1123px; 
      display: flex; 
      flex-direction: column;
      padding: 20px;
    }
  </style>
</head>
<body>
  <div class="invoice-container">
    <!-- Header -->
    <div style="background: linear-gradient(to right, #f8fafc, #f1f5f9); padding: 16px; margin-bottom: 24px; border-radius: 8px;">
      <div style="display: flex; justify-content: space-between; align-items: flex-start;">
        <div style="flex: 1;">
          <h1 style="font-size: 32px; font-weight: 300; color: #0f172a; letter-spacing: 0.05em; margin-bottom: 12px;">
            ${companySettings?.company_name || invoice.companyName}
          </h1>
          ${companySettings?.company_motto ? `
            <p style="font-size: 14px; font-style: italic; color: #64748b; margin-bottom: 12px;">
              ${companySettings.company_motto}
            </p>
          ` : ''}
          <div style="font-size: 14px; color: #64748b; font-family: monospace;">
            ${(companySettings?.gst_number || invoice.companyGst) ? `
              <p style="margin-bottom: 4px;">GST: ${companySettings?.gst_number || invoice.companyGst}</p>
            ` : ''}
            ${companySettings?.company_address_line1 ? `
              <p style="font-size: 12px; line-height: 1.5; margin-bottom: 8px;">
                ${[companySettings.company_address_line1, companySettings.company_address_line2, companySettings.company_address_line3].filter(Boolean).join(', ')}
              </p>
            ` : ''}
            <div style="display: flex; flex-wrap: wrap; gap: 16px; font-size: 12px;">
              ${companySettings?.company_phone ? `
                <div style="display: flex; align-items: center; gap: 4px;">
                  📞 <span>${companySettings.company_phone}</span>
                </div>
              ` : ''}
              ${companySettings?.company_email ? `
                <div style="display: flex; align-items: center; gap: 4px;">
                  ✉️ <span>${companySettings.company_email}</span>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; box-shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);">
          <h2 style="font-size: 18px; font-weight: 500; color: #0f172a; margin-bottom: 12px;">INVOICE</h2>
          <div style="font-size: 14px;">
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 32px; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 4px; color: #64748b;">
                # <span>Number:</span>
              </div>
              <span style="font-family: monospace; font-weight: 500;">${invoice.invoiceNumber}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 32px; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 4px; color: #64748b;">
                📅 <span>Date:</span>
              </div>
              <span style="font-family: monospace;">${new Date(invoice.invoiceDate).toLocaleDateString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 32px;">
              <div style="display: flex; align-items: center; gap: 4px; color: #64748b;">
                📅 <span>Period:</span>
              </div>
              <span style="font-family: monospace; font-size: 12px;">
                ${new Date(invoice.periodFrom).toLocaleDateString('en-GB')} - ${new Date(invoice.periodTo).toLocaleDateString('en-GB')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Client Info -->
    <div style="margin-bottom: 24px;">
      <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; max-width: 448px;">
        <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 8px;">
          🏢 <h3 style="font-size: 14px; font-weight: 500; color: #64748b;">BILL TO</h3>
        </div>
        <div>
          <p style="font-weight: 500; color: #0f172a; margin-bottom: 8px;">${invoice.siteName}</p>
          <div style="display: flex; align-items: flex-start; gap: 4px; margin-bottom: 8px;">
            📍 <p style="font-size: 14px; color: #64748b; line-height: 1.5;">${invoice.clientAddress}</p>
          </div>
          ${invoice.siteGst ? `
            <p style="font-size: 12px; color: #64748b; font-family: monospace; margin-top: 8px;">
              <span style="font-weight: 500;">GST:</span> ${invoice.siteGst}
            </p>
          ` : ''}
        </div>
      </div>
    </div>

    <!-- Line Items -->
    <div style="margin-bottom: 24px;">
      <div style="border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background-color: #f8fafc;">
              <th style="padding: 12px 8px; text-align: center; font-weight: 500; font-size: 12px; color: #374151;">No.</th>
              <th style="padding: 12px 8px; text-align: left; font-weight: 500; font-size: 12px; color: #374151;">Description</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 500; font-size: 12px; color: #374151;">Qty</th>
              <th style="padding: 12px 8px; text-align: center; font-weight: 500; font-size: 12px; color: #374151;">Days</th>
              <th style="padding: 12px 8px; text-align: right; font-weight: 500; font-size: 12px; color: #374151;">Rate</th>
              <th style="padding: 12px 8px; text-align: right; font-weight: 500; font-size: 12px; color: #374151;">Amount</th>
            </tr>
          </thead>
          <tbody>
            ${lineItemsHTML}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Totals -->
    <div style="margin-bottom: 24px;">
      <div style="display: ${invoice.gstType === 'RCM' ? 'flex' : 'block'}; ${invoice.gstType === 'RCM' ? 'justify-content: space-between; align-items: flex-start; gap: 32px;' : 'text-align: right;'}">
        ${rcmNoticeHTML}
        
        <div style="width: 288px; ${invoice.gstType !== 'RCM' ? 'margin-left: auto;' : ''}">
          <div style="font-size: 14px;">
            <div style="display: flex; justify-content: space-between; padding: 8px 0;">
              <span style="color: #64748b;">Subtotal</span>
              <span style="font-family: monospace; font-weight: 500;">${formatCurrency(invoice.subtotal)}</span>
            </div>
            
            ${gstBreakdownHTML()}
            
            <div style="background-color: #f0f9ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; margin-top: 16px;">
              <div style="display: flex; justify-content: space-between; align-items: center;">
                <span style="font-weight: 500; color: #1d4ed8;">Total Amount</span>
                <span style="font-size: 20px; font-family: monospace; font-weight: bold; color: #1d4ed8;">${formatCurrency(invoice.totalAmount || 0)}</span>
              </div>
            </div>
            
            <div style="margin-top: 16px; padding: 12px; background-color: #f8fafc; border-radius: 6px;">
              <p style="font-size: 12px; color: #475569; font-weight: 500; margin-bottom: 4px;">Amount in Words:</p>
              <p style="font-size: 12px; color: #334155; font-style: italic; text-transform: capitalize;">
                ${numberToWords(Math.round(invoice.totalAmount || 0))} only
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div style="margin-top: auto; padding: 16px 0; border-top: 2px solid #e2e8f0;">
      <div style="display: flex; justify-content: space-between; align-items: flex-end;">
        <div style="max-width: 50%;">
          <h4 style="font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px;">Payment Terms & Conditions:</h4>
          <ul style="font-size: 12px; color: #64748b; line-height: 1.4; padding-left: 16px;">
            <li style="margin-bottom: 4px;">Payment due within 30 days of invoice date</li>
            <li style="margin-bottom: 4px;">Services are subject to satisfactory performance</li>
            <li style="margin-bottom: 4px;">All disputes subject to local jurisdiction</li>
            <li>Thank you for your business</li>
          </ul>
        </div>
        <div style="text-align: center;">
          <div style="margin-bottom: 40px;">
            <div style="width: 150px; height: 60px; border: 1px dashed #cbd5e1; border-radius: 4px; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 12px;">
              [Company Seal]
            </div>
          </div>
          <div style="border-top: 1px solid #cbd5e1; padding-top: 8px; width: 180px;">
            <p style="font-size: 12px; font-weight: 500; color: #374151;">Authorized Signatory</p>
            <p style="font-size: 11px; color: #64748b;">${companySettings?.company_name || invoice.companyName}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
  `;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Starting bulk PDF generation...');
    
    const { invoiceIds } = await req.json();
    
    if (!invoiceIds || !Array.isArray(invoiceIds) || invoiceIds.length === 0) {
      throw new Error('No invoice IDs provided');
    }

    console.log(`Processing ${invoiceIds.length} invoices...`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch all invoices
    const { data: invoices, error: invoicesError } = await supabase
      .from('invoices')
      .select('*')
      .in('id', invoiceIds);

    if (invoicesError) {
      throw new Error(`Failed to fetch invoices: ${invoicesError.message}`);
    }

    if (!invoices || invoices.length === 0) {
      throw new Error('No invoices found');
    }

    console.log(`Fetched ${invoices.length} invoices from database`);

    // Fetch company settings
    const { data: companySettings, error: companyError } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .single();

    if (companyError) {
      console.warn('Failed to fetch company settings:', companyError.message);
    }

    console.log('Fetched company settings');

    // Create ZIP file
    const zip = new JSZip();

    // Generate HTML for each invoice
    for (const invoice of invoices) {
      try {
        console.log(`Processing invoice ${invoice.invoice_number}...`);
        
        // Convert database record to expected format
        const invoiceData = {
          id: invoice.id,
          invoiceNumber: invoice.invoice_number,
          siteId: invoice.site_id,
          siteName: invoice.site_name,
          siteGst: invoice.site_gst,
          companyName: invoice.company_name,
          companyGst: invoice.company_gst,
          clientName: invoice.client_name,
          clientAddress: invoice.client_address,
          invoiceDate: invoice.invoice_date,
          periodFrom: invoice.period_from,
          periodTo: invoice.period_to,
          lineItems: invoice.line_items,
          subtotal: parseFloat(invoice.subtotal),
          gstType: invoice.gst_type,
          gstRate: parseFloat(invoice.gst_rate),
          gstAmount: parseFloat(invoice.gst_amount),
          cgstRate: parseFloat(invoice.cgst_rate),
          cgstAmount: parseFloat(invoice.cgst_amount),
          sgstRate: parseFloat(invoice.sgst_rate),
          sgstAmount: parseFloat(invoice.sgst_amount),
          igstRate: parseFloat(invoice.igst_rate),
          igstAmount: parseFloat(invoice.igst_amount),
          totalAmount: parseFloat(invoice.total_amount),
          status: invoice.status,
          notes: invoice.notes,
          created_at: invoice.created_at,
        };

        // Generate HTML
        const html = generateInvoiceHTML(invoiceData, companySettings);
        
        // Add HTML file to ZIP
        const filename = `invoice-${invoice.invoice_number}.html`;
        zip.file(filename, html);
        
        console.log(`Generated HTML for invoice ${invoice.invoice_number}`);
      } catch (error) {
        console.error(`Error processing invoice ${invoice.invoice_number}:`, error);
        // Continue with other invoices even if one fails
      }
    }

    console.log('Generating ZIP file...');

    // Generate ZIP file
    const zipBlob = await zip.generateAsync({ 
      type: 'uint8array',
      compression: 'DEFLATE',
      compressionOptions: { level: 6 }
    });

    console.log(`ZIP file generated successfully. Size: ${zipBlob.length} bytes`);

    // Return ZIP file
    return new Response(zipBlob, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="invoices-${new Date().toISOString().split('T')[0]}.zip"`,
        'Content-Length': zipBlob.length.toString(),
      },
    });

  } catch (error) {
    console.error('Error in bulk PDF generation:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'An unexpected error occurred',
        details: error.stack 
      }), 
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
})