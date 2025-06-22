export interface EditSetsProps {}

export interface CategorizedSets {
  [procedureType: string]: {
    surgerySets: string[];
    implantBoxes: string[];
  };
}

export interface DraggedItem {
  type: 'surgery' | 'implant';
  index: number;
}

export interface SetItemProps {
  name: string;
  index: number;
  type: 'surgery' | 'implant';
  isEditing: boolean;
  editValue: string;
  isDragging: boolean;
  totalItems: number;
  onEdit: (name: string) => void;
  onSave: (oldName: string, newName: string) => void;
  onCancel: () => void;
  onDelete: (name: string) => void;
  onMove: (type: 'surgery' | 'implant', index: number, direction: 'up' | 'down') => void;
  onDragStart: (type: 'surgery' | 'implant', index: number) => void;
  onEditValueChange: (value: string) => void;
}

export interface AddFormProps {
  type: 'surgery' | 'implant';
  show: boolean;
  value: string;
  error: string;
  onValueChange: (value: string) => void;
  onSave: () => void;
  onCancel: () => void;
}

export interface SetsListProps {
  title: string;
  type: 'surgery' | 'implant';
  items: string[];
  editingItem: string | null;
  editValue: string;
  draggedItem: DraggedItem | null;
  showAddForm: boolean;
  addValue: string;
  addError: string;
  onShowAdd: () => void;
  onAddValueChange: (value: string) => void;
  onAdd: () => void;
  onCancelAdd: () => void;
  onEdit: (name: string) => void;
  onSave: (oldName: string, newName: string) => void;
  onCancelEdit: () => void;
  onDelete: (name: string) => void;
  onMove: (type: 'surgery' | 'implant', index: number, direction: 'up' | 'down') => void;
  onDragStart: (type: 'surgery' | 'implant', index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (type: 'surgery' | 'implant', dropIndex: number) => void;
  onDragEnd: () => void;
  onEditValueChange: (value: string) => void;
}