import React from 'react';
import { SetsListProps } from './types';
import AddForm from './AddForm';
import SetItem from './SetItem';

const SetsList: React.FC<SetsListProps> = ({
  title,
  type,
  items,
  editingItem,
  editValue,
  draggedItem,
  showAddForm,
  addValue,
  addError,
  onShowAdd,
  onAddValueChange,
  onAdd,
  onCancelAdd,
  onEdit,
  onSave,
  onCancelEdit,
  onDelete,
  onMove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
  onEditValueChange
}) => {
  return (
    <div className="sets-section">
      <div className="section-header">
        <h3>{title}</h3>
        <button 
          onClick={onShowAdd}
          className="add-button"
        >
          + Add {type === 'surgery' ? 'Surgery Set' : 'Implant Box'}
        </button>
      </div>

      <AddForm
        type={type}
        show={showAddForm}
        value={addValue}
        error={addError}
        onValueChange={onAddValueChange}
        onSave={onAdd}
        onCancel={onCancelAdd}
      />

      <div className="sets-list">
        {items.map((item, index) => (
          <div
            key={item}
            onDragOver={onDragOver}
            onDrop={() => onDrop(type, index)}
            onDragEnd={onDragEnd}
          >
            <SetItem
              name={item}
              index={index}
              type={type}
              isEditing={editingItem === item}
              editValue={editValue}
              isDragging={draggedItem?.type === type && draggedItem.index === index}
              totalItems={items.length}
              onEdit={onEdit}
              onSave={onSave}
              onCancel={onCancelEdit}
              onDelete={onDelete}
              onMove={onMove}
              onDragStart={onDragStart}
              onEditValueChange={onEditValueChange}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default SetsList;