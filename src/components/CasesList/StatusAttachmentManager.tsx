import React, { useState, useRef } from 'react';
import { AttachmentModal } from './AttachmentModal';
import { supabase } from '../../lib/supabase';
import { 
  CASE_BOOKINGS_FIELDS, 
  CASE_QUANTITIES_FIELDS, 
  STATUS_HISTORY_FIELDS, 
  AMENDMENT_HISTORY_FIELDS,
  PROFILES_FIELDS,
  DOCTORS_FIELDS,
  getDbField
} from '../../utils/fieldMappings';

interface StatusAttachmentManagerProps {
  historyItem: {
    id?: string; // Optional since some history items might not have database IDs
    attachments?: string[];
    status: string;
    timestamp: string; // ⚠️ timestamp field
    processed_by: string; // ⚠️ processed_by (processedBy)
  };
  caseId: string;
  canEdit?: boolean;
  onAttachmentsUpdated?: () => void;
}

export const StatusAttachmentManager: React.FC<StatusAttachmentManagerProps> = ({
  historyItem,
  caseId,
  canEdit = false,
  onAttachmentsUpdated
}) => {
  const [selectedAttachment, setSelectedAttachment] = useState<{ data: any; index: number } | null>(null);
  const [isAddingAttachment, setIsAddingAttachment] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAddAttachment = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleFileAdd = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && historyItem.id) { // Check if ID exists
      setIsAddingAttachment(true);
      try {
        const reader = new FileReader();
        reader.onloadend = async () => {
          const newAttachment = {
            name: file.name,
            type: file.type,
            size: file.size,
            data: reader.result,
            uploadedAt: new Date().toISOString()
          };

          // Update the status history with new attachment
          const updatedAttachments = [
            ...(historyItem.attachments || []),
            JSON.stringify(newAttachment)
          ];

          const { error } = await supabase
            .from('status_history')
            .update({ attachments: updatedAttachments })
            .eq('id', historyItem.id);

          if (!error) {
            onAttachmentsUpdated?.();
          }
        };
        reader.readAsDataURL(file);
      } catch (error) {
        // Error handling
      } finally {
        setIsAddingAttachment(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      }
    }
  };

  const handleReplaceAttachment = async (newFile: File) => {
    if (!selectedAttachment || !historyItem.id) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const newAttachmentData = {
        name: newFile.name,
        type: newFile.type,
        size: newFile.size,
        data: reader.result,
        uploadedAt: new Date().toISOString()
      };

      const updatedAttachments = [...(historyItem.attachments || [])];
      updatedAttachments[selectedAttachment.index] = JSON.stringify(newAttachmentData);

      const { error } = await supabase
        .from('status_history')
        .update({ attachments: updatedAttachments })
        .eq('id', historyItem.id);

      if (!error) {
        onAttachmentsUpdated?.();
      }
    };
    reader.readAsDataURL(newFile);
  };

  const handleDeleteAttachment = async () => {
    if (!selectedAttachment || !historyItem.id) return;

    const updatedAttachments = historyItem.attachments?.filter((_, idx) => idx !== selectedAttachment.index);

    const { error } = await supabase
      .from('status_history')
      .update({ attachments: updatedAttachments || [] })
      .eq('id', historyItem.id);

    if (!error) {
      onAttachmentsUpdated?.();
    }
  };

  return (
    <div className="status-attachments-section">
      {historyItem.attachments && historyItem.attachments.length > 0 && (
        <div>
          <div className="attachments-header">
            <strong>Attachments ({historyItem.attachments.length}):</strong>
            {canEdit && historyItem.id && (
              <button
                className="btn-add-attachment"
                onClick={handleAddAttachment}
                disabled={isAddingAttachment}
                style={{
                  marginLeft: '10px',
                  background: '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '50%',
                  width: '24px',
                  height: '24px',
                  cursor: 'pointer',
                  fontSize: '18px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  lineHeight: 1
                }}
                title="Add attachment"
              >
                +
              </button>
            )}
          </div>
          <div className="attachment-preview-grid">
            {historyItem.attachments.map((attachment: string, idx: number) => {
              try {
                const fileData = JSON.parse(attachment);
                const isImage = fileData.type?.startsWith('image/');

                return (
                  <div 
                    key={idx} 
                    className="attachment-preview-item"
                    style={{ position: 'relative', cursor: 'pointer' }}
                    onClick={() => setSelectedAttachment({ data: fileData, index: idx })}
                  >
                    {isImage ? (
                      <div className="image-attachment">
                        <img
                          src={fileData.data}
                          alt={fileData.name}
                          className="attachment-thumbnail"
                          style={{ 
                            maxWidth: '100px', 
                            maxHeight: '75px', 
                            borderRadius: '4px', 
                            border: '1px solid #ddd',
                            display: 'block'
                          }}
                        />
                        {canEdit && (
                          <div 
                            className="attachment-overlay"
                            style={{
                              position: 'absolute',
                              top: 0,
                              right: 0,
                              background: 'rgba(231, 76, 60, 0.9)',
                              color: 'white',
                              borderRadius: '50%',
                              width: '20px',
                              height: '20px',
                              display: 'none',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              cursor: 'pointer'
                            }}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAttachment({ data: fileData, index: idx });
                            }}
                          >
                            🗑
                          </div>
                        )}
                        <div className="attachment-info">
                          <div className="file-name" title={fileData.name}>{fileData.name}</div>
                        </div>
                      </div>
                    ) : (
                      <div className="file-attachment">
                        <div className="file-icon">📄</div>
                        <div className="attachment-info">
                          <div className="file-name" title={fileData.name}>{fileData.name}</div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              } catch {
                return null;
              }
            })}
          </div>
        </div>
      )}

      {canEdit && historyItem.id && (!historyItem.attachments || historyItem.attachments.length === 0) && (
        <button
          className="btn-add-first-attachment"
          onClick={handleAddAttachment}
          disabled={isAddingAttachment}
          style={{
            background: '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            padding: '8px 16px',
            cursor: 'pointer',
            fontSize: '14px',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px'
          }}
        >
          <span>+</span> Add Attachment
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,application/pdf"
        onChange={handleFileAdd}
        style={{ display: 'none' }}
      />

      {selectedAttachment && (
        <AttachmentModal
          fileData={selectedAttachment.data}
          caseId={caseId}
          onClose={() => setSelectedAttachment(null)}
          onReplace={canEdit ? handleReplaceAttachment : undefined}
          onDelete={canEdit ? handleDeleteAttachment : undefined}
          canEdit={canEdit}
        />
      )}

      <style>{`
        .attachment-preview-item:hover .attachment-overlay {
          display: flex !important;
        }
        
        .attachments-header {
          display: flex;
          align-items: center;
          margin-bottom: 10px;
        }
        
        .attachment-preview-grid {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-top: 10px;
        }
      `}</style>
    </div>
  );
};