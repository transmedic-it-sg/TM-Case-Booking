/**
 * Hook for loading case quantities
 */

import { useState, useEffect } from 'react';
import { getCaseQuantities, type CaseQuantity } from '../utils/doctorService';

export const useCaseQuantities = (caseId: string) => {
  const [quantities, setQuantities] = useState<CaseQuantity[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!caseId) {
      setQuantities([]);
      return;
    }

    const loadQuantities = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const caseQuantities = await getCaseQuantities(caseId);
        setQuantities(caseQuantities);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load quantities');
        setQuantities([]);
      } finally {
        setLoading(false);
      }
    };

    loadQuantities();
  }, [caseId]);

  const getQuantityForItem = (itemName: string, itemType: 'surgery_set' | 'implant_box'): number => {
    const quantity = quantities.find(q => q.item_name === itemName && q.item_type === itemType);
    return quantity?.quantity || 1; // Default to 1 instead of 0 for better UX
  };

  return {
    quantities,
    loading,
    error,
    getQuantityForItem
  };
};