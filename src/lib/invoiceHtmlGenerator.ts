import { generateInvoiceHTML as generateHTML, CompanySettings } from './invoiceTemplate';
import { Invoice } from '@/types/invoice';

export type { CompanySettings };

export function generateInvoiceHTML(invoice: Invoice, companySettings?: CompanySettings): string {
  return generateHTML(invoice, companySettings);
}