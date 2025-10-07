/**
 * useEnhancedAttachments Hook - Enhanced file attachment management with versioning
 * Handles file upload, re-upload, deletion, validation, and amendment history tracking
 */

import { useState, useCallback, useEffect } from 'react';
import { useNotifications } from '../../../hooks';
import { getCurrentUserSync } from '../../../utils/auth';
import { auditAttachmentChange } from '../../../utils/auditService';

export interface AttachmentFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadedBy: string;
  uploadedAt: string;
  isNew?: boolean; // For newly added files before save
  isDeleted?: boolean; // For files marked for deletion
  isReplaced?: boolean; // For files being replaced
  file?: File; // The actual file object for new uploads
  preview?: string | null; // Preview URL for images
  originalFile?: AttachmentFile; // Reference to original when replacing
}

export interface AttachmentChange {
  type: 'add' | 'delete' | 'replace';
  fileName: string;
  oldFileName?: string; // For replace operations
  user: string;
  timestamp: string;
}

interface UseEnhancedAttachmentsOptions {
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
  caseId?: string;
  onAttachmentsChange?: (attachments: AttachmentFile[], changes: AttachmentChange[]) => void;
}

export const useEnhancedAttachments = (options: UseEnhancedAttachmentsOptions = {}) => {
  const {
    maxFiles = 5,
    maxFileSize = 10 * 1024 * 1024, // 10MB
    acceptedTypes = ['image/*', '.pdf', '.doc', '.docx', '.txt'],
    caseId,
    onAttachmentsChange
  } = options;

  const { error, success } = useNotifications();
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [attachmentChanges, setAttachmentChanges] = useState<AttachmentChange[]>([]);
  const [previews, setPreviews] = useState<Map<string, string>>(new Map());

  // Initialize with existing attachments
  const initializeAttachments = useCallback((existingAttachments: string[] = []) => {
    const initialized = existingAttachments.map((attachment, index): AttachmentFile | null => {
      let attachmentData;
      try {
        attachmentData = typeof attachment === 'string' ? JSON.parse(attachment) : attachment;
      } catch (error) {
        // Skip malformed attachments instead of using false data
        return null;
      }

      // Validate required attachment data
      if (!attachmentData.name || !attachmentData.type) {
        return null;
      }

      return {
        id: `existing-${caseId || 'unknown'}-${index}-${Date.now()}`,
        name: attachmentData.name,
        type: attachmentData.type,
        size: typeof attachmentData.size === 'number' ? attachmentData.size : 0,
        uploadedBy: attachmentData.uploadedBy || 'System',
        uploadedAt: attachmentData.uploadedAt || new Date().toISOString(),
        isNew: false as const,
        isDeleted: false as const,
        isReplaced: false as const
      };
    }).filter((item): item is AttachmentFile => item !== null);

    setAttachments(initialized);
    setAttachmentChanges([]);
  }, [caseId]); // Include caseId to prevent stale closures

  const validateFile = useCallback((file: File): boolean => {
    // Check file size
    if (file.size > maxFileSize) {
      error('File Too Large', `File ${file.name} is larger than ${maxFileSize / 1024 / 1024}MB`);
      return false;
    }

    // Check file type
    const isValidType = acceptedTypes.some(type => {
      if (type.includes('*')) {
        const baseType = type.split('/')[0];
        return file.type.startsWith(baseType);
      }
      return file.type === type || file.name.toLowerCase().endsWith(type);
    });

    if (!isValidType) {
      error('Invalid File Type', `File ${file.name} is not an accepted file type`);
      return false;
    }

    return true;
  }, [maxFileSize, acceptedTypes, error]);

  const createPreview = useCallback((file: File): Promise<string | null> => {
    return new Promise((resolve) => {
      if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(file);
      } else {
        resolve(null);
      }
    });
  }, []);

  const addFiles = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const currentUser = getCurrentUserSync();

    // Check total file count (excluding deleted files)
    const activeAttachments = attachments.filter(a => !a.isDeleted);
    if (activeAttachments.length + fileArray.length > maxFiles) {
      error('Too Many Files', `Maximum ${maxFiles} files allowed`);
      return;
    }

    // Validate files
    for (const file of fileArray) {
      if (validateFile(file)) {
        validFiles.push(file);
      }
    }

    if (validFiles.length === 0) return;

    // Create attachment objects
    const newAttachments: AttachmentFile[] = [];
    const newChanges: AttachmentChange[] = [];

    for (const file of validFiles) {
      const attachmentId = `new-${caseId || 'temp'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const preview = await createPreview(file);

      if (preview) {
        setPreviews(prev => new Map(prev).set(attachmentId, preview));
      }

      const newAttachment: AttachmentFile = {
        id: attachmentId,
        name: file.name,
        type: file.type,
        size: file.size,
        uploadedBy: currentUser?.name || (() => {
          throw new Error('User authentication required for file upload');
        })(),
        uploadedAt: new Date().toISOString(),
        isNew: true,
        file,
        preview
      };

      newAttachments.push(newAttachment);

      // Track the change
      newChanges.push({
        type: 'add',
        fileName: file.name,
        user: currentUser?.name || (() => {
          throw new Error('User authentication required for file operations');
        })(),
        timestamp: new Date().toISOString()
      });

      // Log audit trail if we have a case ID
      if (caseId && currentUser) {
        try {
          await auditAttachmentChange(
            currentUser.name,
            currentUser.id,
            currentUser.role,
            caseId,
            'add',
            file.name,
            currentUser.selectedCountry || ''
          );
        } catch (auditError) {
        }
      }
    }

    setAttachments(prev => [...prev, ...newAttachments]);
    setAttachmentChanges(prev => [...prev, ...newChanges]);
    success('Files Added', `${validFiles.length} file(s) added successfully`);
  }, [attachments, maxFiles, validateFile, error, success, caseId, createPreview]);

  const removeFile = useCallback(async (attachmentId: string) => {
    const currentUser = getCurrentUserSync();
    const attachment = attachments.find(a => a.id === attachmentId);

    if (!attachment) return;

    if (attachment.isNew) {
      // For new files, completely remove them
      setAttachments(prev => prev.filter(a => a.id !== attachmentId));
      setPreviews(prev => {
        const newPreviews = new Map(prev);
        newPreviews.delete(attachmentId);
        return newPreviews;
      });
      // Remove from changes as well since it was never saved
      setAttachmentChanges(prev => prev.filter(c => c.fileName !== attachment.name));
    } else {
      // For existing files, mark as deleted
      setAttachments(prev => prev.map(a =>
        a.id === attachmentId
          ? { ...a, isDeleted: true }
          : a
      ));

      // Track the deletion
      const deleteChange: AttachmentChange = {
        type: 'delete',
        fileName: attachment.name,
        user: currentUser?.name || (() => {
          throw new Error('User authentication required for file operations');
        })(),
        timestamp: new Date().toISOString()
      };

      setAttachmentChanges(prev => [...prev, deleteChange]);

      // Log audit trail
      if (caseId && currentUser) {
        try {
          await auditAttachmentChange(
            currentUser.name,
            currentUser.id,
            currentUser.role,
            caseId,
            'delete',
            attachment.name,
            currentUser.selectedCountry || ''
          );
        } catch (auditError) {
        }
      }
    }

    success('File Removed', `${attachment.name} removed successfully`);
  }, [attachments, caseId, success]);

  const replaceFile = useCallback(async (attachmentId: string, newFile: File) => {
    if (!validateFile(newFile)) return;

    const currentUser = getCurrentUserSync();
    const existingAttachment = attachments.find(a => a.id === attachmentId);

    if (!existingAttachment) return;

    const preview = await createPreview(newFile);
    const newAttachmentId = `replace-${caseId || 'temp'}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    if (preview) {
      setPreviews(prev => new Map(prev).set(newAttachmentId, preview));
    }

    // Create replacement attachment
    const replacementAttachment: AttachmentFile = {
      id: newAttachmentId,
      name: newFile.name,
      type: newFile.type,
      size: newFile.size,
      uploadedBy: currentUser?.name || (() => {
        throw new Error('User authentication required for file operations');
      })(),
      uploadedAt: new Date().toISOString(),
      isNew: true,
      isReplaced: true,
      file: newFile,
      preview,
      originalFile: existingAttachment
    };

    // Mark original as deleted and add replacement
    setAttachments(prev => prev.map(a =>
      a.id === attachmentId
        ? { ...a, isDeleted: true }
        : a
    ).concat(replacementAttachment));

    // Track the replacement
    const replaceChange: AttachmentChange = {
      type: 'replace',
      fileName: newFile.name,
      oldFileName: existingAttachment.name,
      user: currentUser?.name || (() => {
        throw new Error('User authentication required for file operations');
      })(),
      timestamp: new Date().toISOString()
    };

    setAttachmentChanges(prev => [...prev, replaceChange]);

    // Log audit trail
    if (caseId && currentUser) {
      try {
        await auditAttachmentChange(
          currentUser.name,
          currentUser.id,
          currentUser.role,
          caseId,
          'replace',
          `${existingAttachment.name} → ${newFile.name}`,
          currentUser.selectedCountry || ''
        );
      } catch (auditError) {
      }
    }

    success('File Replaced', `${existingAttachment.name} replaced with ${newFile.name}`);
  }, [attachments, validateFile, caseId, success, createPreview]);

  const clearAll = useCallback(async () => {
    const currentUser = getCurrentUserSync();
    const activeAttachments = attachments.filter(a => !a.isDeleted);

    if (activeAttachments.length === 0) return;

    // Mark all existing files as deleted
    setAttachments(prev => prev.map(a => ({ ...a, isDeleted: true })));

    // Track all deletions
    const deleteChanges: AttachmentChange[] = activeAttachments.map(attachment => ({
      type: 'delete' as const,
      fileName: attachment.name,
      user: currentUser?.name || (() => {
        throw new Error('User authentication required for file operations');
      })(),
      timestamp: new Date().toISOString()
    }));

    setAttachmentChanges(prev => [...prev, ...deleteChanges]);

    // Clear previews
    setPreviews(new Map());

    success('All Files Cleared', `${activeAttachments.length} file(s) removed`);
  }, [attachments, success]);

  const getFileInfo = useCallback((attachment: AttachmentFile) => {
    return {
      name: attachment.name,
      size: (attachment.size / 1024).toFixed(2) + ' KB',
      type: attachment.type,
      isImage: attachment.type.startsWith('image/'),
      preview: previews.get(attachment.id) || attachment.preview,
      uploadedBy: attachment.uploadedBy,
      uploadedAt: attachment.uploadedAt,
      isNew: attachment.isNew,
      isDeleted: attachment.isDeleted,
      isReplaced: attachment.isReplaced
    };
  }, [previews]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    addFiles(files);
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  // Get active (non-deleted) attachments
  const activeAttachments = attachments.filter(a => !a.isDeleted);

  // Notify parent of changes
  useEffect(() => {
    onAttachmentsChange?.(attachments, attachmentChanges);
  }, [attachments, attachmentChanges, onAttachmentsChange]);

  return {
    attachments: activeAttachments,
    allAttachments: attachments, // Include deleted for history
    attachmentChanges,
    previews,
    addFiles,
    removeFile,
    replaceFile,
    clearAll,
    getFileInfo,
    handleDrop,
    handleDragOver,
    initializeAttachments,
    canAddMore: activeAttachments.length < maxFiles,
    fileCount: activeAttachments.length,
    totalChanges: attachmentChanges.length,
    maxFiles,
    hasChanges: attachmentChanges.length > 0
  };
};