import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ExternalLink, FileText, CheckCircle, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface InvoiceSummaryCardProps {
  monthlyRevenue: number;
  paidAmount: number;
  pendingAmount: number;
  invoiceCount: number;
  paidInvoices: number;
}

function formatINR(amount: number): string {
  if (amount >= 10000000) return `${(amount / 10000000).toFixed(1)}Cr`;
  if (amount >= 100000) return `${(amount / 100000).toFixed(1)}L`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(1)}K`;
  return amount.toLocaleString('en-IN');
}

const InvoiceSummaryCard = ({
  monthlyRevenue,
  paidAmount,
  pendingAmount,
  invoiceCount,
  paidInvoices,
}: InvoiceSummaryCardProps) => {
  const paidPct = monthlyRevenue > 0 ? Math.round((paidAmount / monthlyRevenue) * 100) : 0;
  const monthName = format(new Date(), 'MMMM');

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base">Invoice Summary</CardTitle>
            <CardDescription>{monthName} billing overview</CardDescription>
          </div>
          <Link
            to="/invoices"
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            View <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        {invoiceCount === 0 ? (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <FileText className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No invoices this month</p>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Total revenue */}
            <div className="text-center py-2">
              <p className="text-2xl font-bold tabular-nums">
                ₹{formatINR(monthlyRevenue)}
              </p>
              <p className="text-xs text-muted-foreground">
                {invoiceCount} invoice{invoiceCount !== 1 ? 's' : ''} generated
              </p>
            </div>

            {/* Collection progress bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Collection</span>
                <span className="font-medium">{paidPct}%</span>
              </div>
              <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${paidPct}%` }}
                />
              </div>
            </div>

            {/* Paid vs Pending */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10">
                <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Paid</p>
                  <p className="text-sm font-semibold tabular-nums">₹{formatINR(paidAmount)}</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10">
                <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="text-xs text-muted-foreground">Pending</p>
                  <p className="text-sm font-semibold tabular-nums">₹{formatINR(pendingAmount)}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default InvoiceSummaryCard;
