/**
 * useAttachments Hook - File attachment management
 * Handles file upload, validation, and preview
 */

import { useState, useCallback } from 'react';
import { useNotifications } from '../../../hooks';

interface UseAttachmentsOptions {
  maxFiles?: number;
  maxFileSize?: number; // in bytes
  acceptedTypes?: string[];
}

export const useAttachments = (options: UseAttachmentsOptions = {}) => {
  const {
    maxFiles = 5,
    maxFileSize = 10 * 1024 * 1024, // 10MB
    acceptedTypes = ['image/*', '.pdf', '.doc', '.docx', '.txt']
  } = options;

  const { error, success } = useNotifications();
  const [attachments, setAttachments] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

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

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const validFiles: File[] = [];
    const newPreviews: string[] = [];

    // Check total file count
    if (attachments.length + fileArray.length > maxFiles) {
      error('Too Many Files', `Maximum ${maxFiles} files allowed`);
      return;
    }

    fileArray.forEach(file => {
      if (validateFile(file)) {
        validFiles.push(file);
        
        // Create preview for images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            newPreviews.push(e.target?.result as string);
            if (newPreviews.length === validFiles.filter(f => f.type.startsWith('image/')).length) {
              setPreviews(prev => [...prev, ...newPreviews]);
            }
          };
          reader.readAsDataURL(file);
        }
      }
    });

    if (validFiles.length > 0) {
      setAttachments(prev => [...prev, ...validFiles]);
      success('Files Added', `${validFiles.length} file(s) added successfully`);
    }
  }, [attachments.length, maxFiles, validateFile, error, success]);

  const removeFile = useCallback((index: number) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearAll = useCallback(() => {
    setAttachments([]);
    setPreviews([]);
  }, []);

  const getFileInfo = useCallback((file: File) => {
    return {
      name: file.name,
      size: (file.size / 1024).toFixed(2) + ' KB',
      type: file.type,
      isImage: file.type.startsWith('image/'),
      preview: file.type.startsWith('image/') 
        ? previews[attachments.indexOf(file)]
        : null
    };
  }, [attachments, previews]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    addFiles(files);
  }, [addFiles]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  return {
    attachments,
    previews,
    addFiles,
    removeFile,
    clearAll,
    getFileInfo,
    handleDrop,
    handleDragOver,
    canAddMore: attachments.length < maxFiles,
    fileCount: attachments.length,
    maxFiles
  };
};