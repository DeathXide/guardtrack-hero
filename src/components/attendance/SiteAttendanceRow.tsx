import React, { useState } from 'react';
import { ChevronDown, ChevronRight, CheckCircle, XCircle, UserPlus, UserMinus, AlertCircle, Users, RefreshCw, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { SiteAttendanceSummary } from '@/lib/dailyAttendanceSlotsApi';

interface SiteAttendanceRowProps {
  site: SiteAttendanceSummary;
  onMarkAttendance: (slotId: string, isPresent: boolean) => void;
  onAssignGuard: (slotId: string, shiftType: 'day' | 'night', roleType: string, siteId: string) => void;
  onReplaceGuard: (slotId: string, shiftType: 'day' | 'night', roleType: string, guardId: string, siteId: string) => void;
  onUnassignGuard: (slotId: string) => void;
  onMarkAllPresent: (siteId: string) => void;
  onViewDetails: (siteId: string) => void;
  onManageTempSlots?: (siteId: string) => void;
  isLoading?: boolean;
  defaultExpanded?: boolean;
}

const SiteAttendanceRow: React.FC<SiteAttendanceRowProps> = ({
  site,
  onMarkAttendance,
  onAssignGuard,
  onReplaceGuard,
  onUnassignGuard,
  onMarkAllPresent,
  onViewDetails,
  onManageTempSlots,
  isLoading = false,
  defaultExpanded = false,
}) => {
  const [expanded, setExpanded] = useState(defaultExpanded);

  const needsAttention = site.pendingSlots > 0 || site.absentGuards > 0 || site.unfilledSlots > 0;
  const isAllGood = site.totalSlots > 0 && site.presentGuards === site.assignedSlots && site.unfilledSlots === 0;
  const isNew = site.totalSlots === 0 && site.hasStaffingRequirements;
  const noRequirements = !site.hasStaffingRequirements;

  const getStatusBadge = () => {
    if (noRequirements) return <Badge variant="outline" className="text-xs text-gray-500">No Requirements</Badge>;
    if (isNew) return <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">New Site</Badge>;
    if (isAllGood) return <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">All Good</Badge>;
    if (site.absentGuards > 0) return <Badge className="text-xs bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300">{site.absentGuards} Absent</Badge>;
    if (site.pendingSlots > 0) return <Badge className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">{site.pendingSlots} Pending</Badge>;
    if (site.unfilledSlots > 0) return <Badge className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300">{site.unfilledSlots} Unfilled</Badge>;
    return null;
  };

  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const attendanceRate = site.assignedSlots > 0
    ? Math.round((site.presentGuards / site.assignedSlots) * 100)
    : 0;

  return (
    <div className={`border rounded-lg transition-all duration-200 ${
      needsAttention
        ? 'border-amber-200 dark:border-amber-800 bg-amber-50/30 dark:bg-amber-950/10'
        : isAllGood
        ? 'border-green-200 dark:border-green-800 bg-green-50/30 dark:bg-green-950/10'
        : 'border-border bg-card'
    }`}>
      {/* Collapsed Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-4 p-4 md:py-5 text-left hover:bg-muted/30 active:bg-muted/50 transition-colors rounded-lg"
        disabled={noRequirements}
      >
        <div className="text-muted-foreground">
          {expanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground truncate">{site.siteName}</span>
            {getStatusBadge()}
          </div>
          {(site.organizationName || site.address) && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">
              {site.organizationName}{site.organizationName && site.address ? ' · ' : ''}{site.address}
            </p>
          )}
        </div>

        {/* Quick Stats */}
        {site.totalSlots > 0 && (
          <div className="flex items-center gap-3 text-sm shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">{site.totalSlots}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Total slots</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                  <span className="text-green-600 dark:text-green-400 font-medium">{site.presentGuards}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>Present</TooltipContent>
            </Tooltip>

            {site.absentGuards > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <XCircle className="h-3.5 w-3.5 text-red-500" />
                    <span className="text-red-600 dark:text-red-400 font-medium">{site.absentGuards}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Absent</TooltipContent>
              </Tooltip>
            )}

            {site.pendingSlots > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
                    <span className="text-amber-600 dark:text-amber-400 font-medium">{site.pendingSlots}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Pending</TooltipContent>
              </Tooltip>
            )}

            <div className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              attendanceRate >= 80 ? 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300'
              : attendanceRate >= 50 ? 'bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300'
              : site.assignedSlots === 0 ? 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
              : 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
            }`}>
              {attendanceRate}%
            </div>
          </div>
        )}
      </button>

      {/* Expanded Content */}
      {expanded && site.totalSlots > 0 && (
        <div className="px-4 pb-4 border-t border-border/50">
          {/* Site Actions */}
          <div className="flex items-center gap-2 py-3">
            {site.pendingSlots > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); onMarkAllPresent(site.siteId); }}
                disabled={isLoading}
                className="text-sm h-10 gap-1.5 text-green-600 border-green-200 hover:bg-green-50 active:bg-green-100 dark:border-green-800 dark:hover:bg-green-950"
              >
                <CheckCircle className="h-4 w-4" />
                Mark All Present
              </Button>
            )}
            {onManageTempSlots && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); onManageTempSlots(site.siteId); }}
                className="text-sm h-10 gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 active:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-950"
              >
                <Clock className="h-4 w-4" />
                Temp Slots
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onViewDetails(site.siteId); }}
              className="text-sm h-10 gap-1.5 text-muted-foreground ml-auto"
            >
              View Details
            </Button>
          </div>

          {/* Guard List */}
          <div className="space-y-2">
            {site.slots.map(slot => {
              const guard = slot.guards;
              const status = !guard ? 'empty'
                : slot.is_present === true ? 'present'
                : slot.is_present === false ? 'absent'
                : 'pending';

              return (
                <div
                  key={slot.id}
                  className={`flex items-center gap-3 py-3 px-3 rounded-md transition-colors ${
                    status === 'present' ? 'bg-green-50/50 dark:bg-green-950/20'
                    : status === 'absent' ? 'bg-red-50/50 dark:bg-red-950/20'
                    : status === 'pending' ? 'bg-amber-50/30 dark:bg-amber-950/10'
                    : 'bg-muted/20'
                  }`}
                >
                  {/* Guard Info */}
                  {guard ? (
                    <>
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
                          {getInitials(guard.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{guard.name}</span>
                          <Badge variant="outline" className="text-[11px] h-5 px-1.5">{slot.role_type}</Badge>
                          <Badge variant="outline" className="text-[11px] h-5 px-1.5 capitalize">{slot.shift_type}</Badge>
                        </div>
                        <span className="text-xs text-muted-foreground">{guard.badge_number}</span>
                      </div>

                      {/* Attendance Buttons */}
                      <div className="flex items-center gap-2 shrink-0">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant={status === 'present' ? 'default' : 'outline'}
                              onClick={(e) => { e.stopPropagation(); onMarkAttendance(slot.id, true); }}
                              disabled={isLoading}
                              className={`h-10 w-10 p-0 ${
                                status === 'present'
                                  ? 'bg-green-600 hover:bg-green-700 active:bg-green-800 text-white'
                                  : 'hover:bg-green-50 hover:text-green-700 hover:border-green-300 active:bg-green-100'
                              }`}
                            >
                              <CheckCircle className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mark Present</TooltipContent>
                        </Tooltip>

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant={status === 'absent' ? 'default' : 'outline'}
                              onClick={(e) => { e.stopPropagation(); onMarkAttendance(slot.id, false); }}
                              disabled={isLoading}
                              className={`h-10 w-10 p-0 ${
                                status === 'absent'
                                  ? 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white'
                                  : 'hover:bg-red-50 hover:text-red-700 hover:border-red-300 active:bg-red-100'
                              }`}
                            >
                              <XCircle className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Mark Absent</TooltipContent>
                        </Tooltip>

                        {status === 'absent' && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onReplaceGuard(slot.id, slot.shift_type, slot.role_type, guard.id, site.siteId);
                                }}
                                disabled={isLoading}
                                className="h-10 px-3 text-sm gap-1.5 active:bg-muted"
                              >
                                <RefreshCw className="h-4 w-4" />
                                Replace
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Replace this guard</TooltipContent>
                          </Tooltip>
                        )}

                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(e) => {
                                e.stopPropagation();
                                onUnassignGuard(slot.id);
                              }}
                              disabled={isLoading}
                              className="h-10 w-10 p-0 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-300 active:bg-orange-100"
                            >
                              <UserMinus className="h-5 w-5" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Unassign guard</TooltipContent>
                        </Tooltip>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="h-9 w-9 rounded-full border-2 border-dashed border-muted-foreground/30 flex items-center justify-center">
                        <UserPlus className="h-4 w-4 text-muted-foreground/50" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground italic">Empty Slot</span>
                          <Badge variant="outline" className="text-[11px] h-5 px-1.5">{slot.role_type}</Badge>
                          <Badge variant="outline" className="text-[11px] h-5 px-1.5 capitalize">{slot.shift_type}</Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssignGuard(slot.id, slot.shift_type, slot.role_type, site.siteId);
                        }}
                        disabled={isLoading}
                        className="h-10 px-3 text-sm gap-1.5 border-dashed active:bg-muted"
                      >
                        <UserPlus className="h-4 w-4" />
                        Assign
                      </Button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* New site message */}
      {expanded && isNew && (
        <div className="px-4 pb-4 border-t border-border/50">
          <div className="flex items-center gap-2 py-3 text-sm text-blue-600 dark:text-blue-400">
            <AlertCircle className="h-4 w-4" />
            New site — slots will be generated when you run "Start Day"
          </div>
          <div className="flex items-center gap-2">
            {onManageTempSlots && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => { e.stopPropagation(); onManageTempSlots(site.siteId); }}
                className="text-sm h-10 gap-1.5 text-amber-600 border-amber-200 hover:bg-amber-50 active:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-950"
              >
                <Clock className="h-4 w-4" />
                Temp Slots
              </Button>
            )}
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); onViewDetails(site.siteId); }}
              className="text-sm h-10 gap-1.5 text-muted-foreground ml-auto"
            >
              View Details
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SiteAttendanceRow;
