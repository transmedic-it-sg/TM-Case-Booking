import React, { useState } from 'react';
import { getCurrentUser } from '../utils/authCompat';
import { supabase } from '../lib/supabase';

interface ImageAmendmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseId: string;
  caseRef: string;
  statusHistoryId: string;
  currentImageData: string;
  attachmentIndex: number;
  statusType: string;
}

const ImageAmendmentModal: React.FC<ImageAmendmentModalProps> = ({
  isOpen,
  onClose,
  caseId,
  caseRef,
  statusHistoryId,
  currentImageData,
  attachmentIndex,
  statusType
}) => {
  const [newImage, setNewImage] = useState<string>('');
  const [amendmentReason, setAmendmentReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setNewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newImage) {
      setError('Please select a new image');
      return;
    }

    if (!amendmentReason.trim()) {
      setError('Please provide a reason for the image amendment');
      return;
    }

    const currentUser = getCurrentUser();
    if (!currentUser) {
      setError('You must be logged in to amend images');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // Get current status history entry
      const { data: statusHistory, error: fetchError } = await supabase
        .from('status_history')
        .select('attachments, details')
        .eq('id', statusHistoryId)
        .single();

      if (fetchError) {
        throw fetchError;
      }

      // Update the specific attachment in the array
      const updatedAttachments = [...(statusHistory.attachments || [])];

      // Create new image file data
      const newImageFile = {
        name: `amended_image_${Date.now()}.jpg`,
        type: 'image/jpeg',
        size: Math.round(newImage.length * 0.75),
        data: newImage
      };

      updatedAttachments[attachmentIndex] = JSON.stringify(newImageFile);

      // Update status history with new attachment
      const { error: updateError } = await supabase
        .from('status_history')
        .update({
          attachments: updatedAttachments,
          updated_at: new Date().toISOString()
        })
        .eq('id', statusHistoryId);

      if (updateError) {
        throw updateError;
      }

      // Create audit log for image amendment
      const auditEntry = {
        case_id: caseId,
        amended_by: currentUser.name,
        timestamp: new Date().toISOString(),
        reason: `Image amendment for ${statusType}: ${amendmentReason}`,
        changes: [{
          field: `${statusType} Image #${attachmentIndex + 1}`,
          oldValue: '[Image replaced]',
          newValue: '[New image uploaded]'
        }],
        amendment_type: 'image_replacement'
      };

      const { error: auditError } = await supabase
        .from('amendment_history')
        .insert([auditEntry]);

      if (auditError) {
        // // // console.error('Error logging image amendment:', auditError);
        // Continue even if audit log fails
      }

      // Close modal and refresh
      onClose();
      window.location.reload(); // Force refresh to show updated image

    } catch (error) {
      // // // console.error('Error amending image:', error);
      setError('Failed to amend image. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    setNewImage('');
    setAmendmentReason('');
    setError('');
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={handleClose}>
      <div className="modal-content image-amendment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Amend Image - {caseRef}</h3>
          <button className="close-button" onClick={handleClose}>✕</button>
        </div>

        <div className="modal-body">
          <p><strong>Status:</strong> {statusType}</p>
          <p><strong>Image Position:</strong> #{attachmentIndex + 1}</p>

          {error && (
            <div className="alert alert-danger">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="required">Current Image</label>
              <div className="current-image-preview">
                <img
                  src={JSON.parse(currentImageData).data}
                  alt="Current attachment"
                  style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover' }}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="required">New Image</label>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                className="form-control"
                disabled={isSubmitting}
              />
              {newImage && (
                <div className="new-image-preview">
                  <img
                    src={newImage}
                    alt="New attachment"
                    style={{ maxWidth: '200px', maxHeight: '150px', objectFit: 'cover' }}
                  />
                </div>
              )}
            </div>

            <div className="form-group">
              <label className="required">Reason for Amendment</label>
              <textarea
                value={amendmentReason}
                onChange={(e) => setAmendmentReason(e.target.value)}
                placeholder="Explain why you are replacing this image"
                rows={3}
                className="form-control"
                disabled={isSubmitting}
                required
              />
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={isSubmitting || !newImage || !amendmentReason.trim()}
              >
                {isSubmitting ? 'Amending...' : 'Amend Image'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ImageAmendmentModal;