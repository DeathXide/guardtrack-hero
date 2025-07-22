import { supabase } from './client';

export interface FileUploadOptions {
  bucket: string;
  path: string;
  file: File;
  upsert?: boolean;
}

export interface FileDownloadOptions {
  bucket: string;
  path: string;
}

export class FileService {
  // Upload file to storage
  async uploadFile({ bucket, path, file, upsert = false }: FileUploadOptions) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert
      });

    if (error) throw error;
    return data;
  }

  // Download file from storage
  async downloadFile({ bucket, path }: FileDownloadOptions) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .download(path);

    if (error) throw error;
    return data;
  }

  // Get public URL for file
  getPublicUrl(bucket: string, path: string) {
    const { data } = supabase.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  // Create signed URL for private files
  async createSignedUrl(bucket: string, path: string, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data;
  }

  // Delete file
  async deleteFile(bucket: string, paths: string | string[]) {
    const pathArray = Array.isArray(paths) ? paths : [paths];
    
    const { data, error } = await supabase.storage
      .from(bucket)
      .remove(pathArray);

    if (error) throw error;
    return data;
  }

  // List files in a directory
  async listFiles(bucket: string, path = '', limit = 100) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .list(path, {
        limit,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (error) throw error;
    return data;
  }

  // Upload guard profile picture
  async uploadGuardPhoto(guardId: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${guardId}-${Date.now()}.${fileExt}`;
    const filePath = `guards/${fileName}`;

    return this.uploadFile({
      bucket: 'avatars',
      path: filePath,
      file,
      upsert: true
    });
  }

  // Upload site document/image
  async uploadSiteDocument(siteId: string, file: File, type: 'contract' | 'image') {
    const fileExt = file.name.split('.').pop();
    const fileName = `${siteId}-${type}-${Date.now()}.${fileExt}`;
    const filePath = `sites/${type}s/${fileName}`;

    return this.uploadFile({
      bucket: 'documents',
      path: filePath,
      file,
      upsert: true
    });
  }

  // Upload attendance report
  async uploadAttendanceReport(siteId: string, month: string, file: File) {
    const fileExt = file.name.split('.').pop();
    const fileName = `${siteId}-${month}-report.${fileExt}`;
    const filePath = `reports/attendance/${fileName}`;

    return this.uploadFile({
      bucket: 'reports',
      path: filePath,
      file,
      upsert: true
    });
  }

  // Get guard photo URL
  getGuardPhotoUrl(photoPath: string) {
    return this.getPublicUrl('avatars', photoPath);
  }

  // Get site document URL
  getSiteDocumentUrl(documentPath: string) {
    return this.getPublicUrl('documents', documentPath);
  }
}

export const fileService = new FileService();