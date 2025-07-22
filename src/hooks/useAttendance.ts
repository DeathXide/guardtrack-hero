import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  fetchAttendanceRecords, 
  fetchTodayAttendance,
  createAttendanceRecord,
  updateAttendanceRecord,
  checkInEmployee,
  checkOutEmployee,
  fetchLeaveRequests,
  createLeaveRequest,
  updateLeaveRequest,
  approveLeaveRequest,
  rejectLeaveRequest,
  fetchAttendanceSettings,
  createAttendanceSettings,
  updateAttendanceSettings,
  getAttendanceAnalytics,
  getEmployeeAttendanceSummary,
  fetchEmployeeTypes
} from '@/lib/attendanceApi';

export const useAttendanceRecords = (filters?: {
  siteId?: string;
  employeeId?: string;
  employeeType?: string;
  startDate?: Date;
  endDate?: Date;
}) => {
  return useQuery({
    queryKey: ['attendanceRecords', filters],
    queryFn: () => fetchAttendanceRecords(filters)
  });
};

export const useTodayAttendance = (siteId?: string) => {
  return useQuery({
    queryKey: ['todayAttendance', siteId],
    queryFn: () => fetchTodayAttendance(siteId),
    refetchInterval: 30000 // Refresh every 30 seconds
  });
};

export const useEmployeeTypes = () => {
  return useQuery({
    queryKey: ['employeeTypes'],
    queryFn: fetchEmployeeTypes
  });
};

export const useAttendanceMutations = () => {
  const queryClient = useQueryClient();

  const checkInMutation = useMutation({
    mutationFn: checkInEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['todayAttendance'] });
      toast.success('Check-in successful!');
    },
    onError: (error: any) => {
      toast.error(`Check-in failed: ${error.message}`);
    }
  });

  const checkOutMutation = useMutation({
    mutationFn: ({ recordId, params }: { recordId: string; params: any }) =>
      checkOutEmployee(recordId, params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['todayAttendance'] });
      toast.success('Check-out successful!');
    },
    onError: (error: any) => {
      toast.error(`Check-out failed: ${error.message}`);
    }
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) =>
      updateAttendanceRecord(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['attendanceRecords'] });
      queryClient.invalidateQueries({ queryKey: ['todayAttendance'] });
      toast.success('Attendance record updated successfully!');
    },
    onError: (error: any) => {
      toast.error(`Update failed: ${error.message}`);
    }
  });

  return {
    checkIn: checkInMutation,
    checkOut: checkOutMutation,
    updateAttendance: updateAttendanceMutation
  };
};

export const useLeaveRequests = (filters?: {
  employeeId?: string;
  employeeType?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
}) => {
  return useQuery({
    queryKey: ['leaveRequests', filters],
    queryFn: () => fetchLeaveRequests(filters)
  });
};

export const useLeaveRequestMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createLeaveRequest,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      toast.success('Leave request submitted successfully!');
    },
    onError: (error: any) => {
      toast.error(`Failed to submit leave request: ${error.message}`);
    }
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, approverId }: { id: string; approverId: string }) =>
      approveLeaveRequest(id, approverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      toast.success('Leave request approved!');
    },
    onError: (error: any) => {
      toast.error(`Failed to approve leave request: ${error.message}`);
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, approverId, reason }: { id: string; approverId: string; reason: string }) =>
      rejectLeaveRequest(id, approverId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leaveRequests'] });
      toast.success('Leave request rejected!');
    },
    onError: (error: any) => {
      toast.error(`Failed to reject leave request: ${error.message}`);
    }
  });

  return {
    create: createMutation,
    approve: approveMutation,
    reject: rejectMutation
  };
};

export const useAttendanceSettings = (siteId: string) => {
  return useQuery({
    queryKey: ['attendanceSettings', siteId],
    queryFn: () => fetchAttendanceSettings(siteId),
    enabled: !!siteId
  });
};

export const useAttendanceSettingsMutations = () => {
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: createAttendanceSettings,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSettings', data.site_id] });
      toast.success('Attendance settings created successfully!');
    },
    onError: (error: any) => {
      toast.error(`Failed to create settings: ${error.message}`);
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ siteId, updates }: { siteId: string; updates: any }) =>
      updateAttendanceSettings(siteId, updates),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['attendanceSettings', data.site_id] });
      toast.success('Attendance settings updated successfully!');
    },
    onError: (error: any) => {
      toast.error(`Failed to update settings: ${error.message}`);
    }
  });

  return {
    create: createMutation,
    update: updateMutation
  };
};

export const useAttendanceAnalytics = (params: {
  siteId?: string;
  employeeType?: string;
  startDate: Date;
  endDate: Date;
}) => {
  return useQuery({
    queryKey: ['attendanceAnalytics', params],
    queryFn: () => getAttendanceAnalytics(params),
    enabled: !!(params.startDate && params.endDate)
  });
};

export const useEmployeeAttendanceSummary = (
  employeeId: string,
  employeeType: string,
  month?: string
) => {
  return useQuery({
    queryKey: ['employeeAttendanceSummary', employeeId, employeeType, month],
    queryFn: () => getEmployeeAttendanceSummary(employeeId, employeeType, month),
    enabled: !!(employeeId && employeeType)
  });
};