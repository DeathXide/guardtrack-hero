
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/layout/AppSidebar";
import Header from "@/components/layout/Header";
import Index from "./pages/Index";
import Dashboard from "./pages/Dashboard";
import SitesNew from "./pages/SitesNew";
import SiteDetail from "./pages/SiteDetail";
import Guards from "./pages/Guards";
import Attendance from "./pages/Attendance";
import Schedule from "./pages/Schedule";
import Reports from "./pages/Reports";
import Invoices from "./pages/Invoices";
import InvoiceCreate from "./pages/InvoiceCreate";
import InvoiceView from "./pages/InvoiceView";
import InvoiceEdit from "./pages/InvoiceEdit";
import CustomInvoiceForm from "./components/invoices/CustomInvoiceForm";
import CompanySettings from "./pages/CompanySettings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/dashboard" element={<DashboardLayout><Dashboard /></DashboardLayout>} />
            <Route path="/sites" element={<DashboardLayout><SitesNew /></DashboardLayout>} />
            <Route path="/sites/:id" element={<DashboardLayout><SiteDetail /></DashboardLayout>} />
            <Route path="/guards" element={<DashboardLayout><Guards /></DashboardLayout>} />
            <Route path="/attendance" element={<DashboardLayout><Attendance /></DashboardLayout>} />
            <Route path="/schedule" element={<DashboardLayout><Schedule /></DashboardLayout>} />
            <Route path="/invoices" element={<DashboardLayout><Invoices /></DashboardLayout>} />
            <Route path="/invoices/create" element={<DashboardLayout><InvoiceCreate /></DashboardLayout>} />
            <Route path="/invoices/create-custom" element={<DashboardLayout><CustomInvoiceForm /></DashboardLayout>} />
            <Route path="/invoices/:id" element={<DashboardLayout><InvoiceView /></DashboardLayout>} />
            <Route path="/invoices/:id/edit" element={<DashboardLayout><InvoiceEdit /></DashboardLayout>} />
            <Route path="/reports" element={<DashboardLayout><Reports /></DashboardLayout>} />
            <Route path="/company-settings" element={<DashboardLayout><CompanySettings /></DashboardLayout>} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <AppSidebar />
        <SidebarInset>
          <Header />
          <main className="flex-1">
            <div className="container mx-auto px-6 py-8">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default App;
