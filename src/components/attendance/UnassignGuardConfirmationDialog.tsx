import React from 'react';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';

interface UnassignGuardConfirmationDialogProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  siteName: string;
  date: Date;
  guards: Array<{ id: string; name: string; badgeNumber: string }>;
}

const UnassignGuardConfirmationDialog: React.FC<UnassignGuardConfirmationDialogProps> = ({
  isOpen,
  onConfirm,
  onCancel,
  siteName,
  date,
  guards
}) => {
  const formattedDate = format(date, 'PPP');
  
  return (
    <AlertDialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Attendance Records Will Be Deleted
          </AlertDialogTitle>
          <AlertDialogDescription>
            {guards.length === 1 ? (
              <>
                This guard's attendance record for <strong>{siteName}</strong> on <strong>{formattedDate}</strong> will be deleted. Do you want to continue?
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <div className="text-sm font-medium">
                    {guards[0].name} ({guards[0].badgeNumber})
                  </div>
                </div>
              </>
            ) : (
              <>
                These guards' attendance records for <strong>{siteName}</strong> on <strong>{formattedDate}</strong> will be deleted. Do you want to continue?
                <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-md">
                  <ul className="list-disc list-inside space-y-1">
                    {guards.map(guard => (
                      <li key={guard.id} className="text-sm font-medium">
                        {guard.name} ({guard.badgeNumber})
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete & Unassign
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default UnassignGuardConfirmationDialog;