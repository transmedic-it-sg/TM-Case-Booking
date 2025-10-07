/**
 * Utility to add refresh animation to buttons
 */

export const addRefreshAnimation = (button: HTMLElement | null) => {
  if (!button) return;
  
  button.classList.add('refresh-button');
  
  // Check if button already has click handler
  if (button.dataset.refreshAnimationAdded === 'true') return;
  
  button.dataset.refreshAnimationAdded = 'true';
  
  button.addEventListener('click', function() {
    // Don't animate if already refreshing or disabled
    if (this.classList.contains('refreshing') || this.hasAttribute('disabled')) {
      return;
    }
    
    // Add refreshing class
    this.classList.add('refreshing');
    
    // Remove refreshing class after animation
    setTimeout(() => {
      this.classList.remove('refreshing');
      this.classList.add('success');
      
      // Remove success class after animation
      setTimeout(() => {
        this.classList.remove('success');
      }, 1000);
    }, 1500);
  });
};

/**
 * Apply refresh animations to all refresh buttons on the page
 */
export const initRefreshAnimations = () => {
  // Find all potential refresh buttons
  const selectors = [
    'button[title*="Refresh"]',
    'button[title*="refresh"]',
    '.btn-refresh',
    '.refresh-button',
    'button:has(.refresh-icon)',
    '[onclick*="refresh"]',
    '[onclick*="Refresh"]'
  ];
  
  selectors.forEach(selector => {
    try {
      const buttons = document.querySelectorAll(selector);
      buttons.forEach(button => {
        if (button instanceof HTMLElement) {
          addRefreshAnimation(button);
        }
      });
    } catch (e) {
      // Ignore selector errors (e.g., :has not supported)
    }
  });
  
  // Also check for buttons with refresh emoji
  const allButtons = document.querySelectorAll('button');
  allButtons.forEach(button => {
    if (button.textContent?.includes('🔄') || 
        button.innerHTML?.includes('🔄') ||
        button.title?.toLowerCase().includes('refresh')) {
      addRefreshAnimation(button as HTMLElement);
    }
  });
};

/**
 * Hook to automatically add refresh animations
 */
export const useRefreshAnimation = () => {
  // Initialize on mount and when DOM changes
  if (typeof window !== 'undefined') {
    // Initial setup
    setTimeout(initRefreshAnimations, 100);
    
    // Watch for DOM changes
    const observer = new MutationObserver(() => {
      initRefreshAnimations();
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Cleanup
    return () => {
      observer.disconnect();
    };
  }
};