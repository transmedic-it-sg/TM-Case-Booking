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
    console.log('🔢 QUANTITIES HOOK DEBUG - Effect triggered:', {
      caseId,
      hasCaseId: !!caseId,
      caseIdType: typeof caseId,
      timestamp: new Date().toISOString()
    });

    if (!caseId) {
      console.log('🔢 QUANTITIES HOOK DEBUG - No caseId, resetting quantities:', {
        caseId,
        action: 'setQuantities([])' 
      });
      setQuantities([]);
      return;
    }

    const loadQuantities = async () => {
      console.log('🔢 QUANTITIES HOOK DEBUG - Starting quantity load:', {
        caseId,
        timestamp: new Date().toISOString(),
        getCaseQuantitiesFunction: typeof getCaseQuantities === 'function'
      });

      setLoading(true);
      setError(null);
      
      try {
        const caseQuantities = await getCaseQuantities(caseId);
        
        console.log('🔢 QUANTITIES HOOK DEBUG - Quantities loaded:', {
          caseId,
          quantitiesReceived: caseQuantities,
          quantitiesCount: caseQuantities?.length || 0,
          quantitiesType: typeof caseQuantities,
          isArray: Array.isArray(caseQuantities),
          sampleQuantities: caseQuantities?.slice(0, 3),
          timestamp: new Date().toISOString()
        });

        setQuantities(caseQuantities);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load quantities';
        
        console.error('❌ QUANTITIES HOOK DEBUG - Load failed:', {
          caseId,
          error: err,
          errorMessage,
          errorType: typeof err,
          errorName: err instanceof Error ? err.name : 'Unknown',
          errorStack: err instanceof Error ? err.stack : undefined,
          timestamp: new Date().toISOString()
        });

        setError(errorMessage);
        setQuantities([]);
      } finally {
        setLoading(false);
        console.log('🔢 QUANTITIES HOOK DEBUG - Load completed:', {
          caseId,
          loading: false,
          timestamp: new Date().toISOString()
        });
      }
    };

    loadQuantities();
  }, [caseId]);

  const getQuantityForItem = (itemName: string, itemType: 'surgery_set' | 'implant_box'): number => {
    console.log('🔢 QUANTITIES HOOK DEBUG - getQuantityForItem called:', {
      caseId,
      itemName,
      itemType,
      availableQuantities: quantities,
      quantitiesCount: quantities.length,
      timestamp: new Date().toISOString()
    });

    const quantity = quantities.find(q => q.item_name === itemName && q.item_type === itemType);
    
    console.log('🔢 QUANTITIES HOOK DEBUG - Quantity lookup result:', {
      caseId,
      itemName,
      itemType,
      foundQuantity: quantity,
      finalQuantity: quantity?.quantity || 1,
      hasMatch: !!quantity,
      allItemNames: quantities.map(q => q.item_name),
      allItemTypes: quantities.map(q => q.item_type),
      exactMatches: quantities.filter(q => q.item_name === itemName),
      typeMatches: quantities.filter(q => q.item_type === itemType)
    });

    return quantity?.quantity || 1; // Default to 1 instead of 0 for better UX
  };

  return {
    quantities,
    loading,
    error,
    getQuantityForItem
  };
};