// Accessibility utilities and helpers for WCAG 2.1 AA compliance

export interface AccessibilityConfig {
  highContrast: boolean;
  reducedMotion: boolean;
  fontSize: 'small' | 'medium' | 'large' | 'extra-large';
  screenReader: boolean;
  keyboardNavigation: boolean;
}

export class AccessibilityService {
  private config: AccessibilityConfig = {
    highContrast: false,
    reducedMotion: false,
    fontSize: 'medium',
    screenReader: false,
    keyboardNavigation: false
  };

  private listeners: Map<string, (config: AccessibilityConfig) => void> = new Map();

  constructor() {
    this.initializeAccessibility();
    this.detectUserPreferences();
  }

  /**
   * Initialize accessibility features
   */
  private initializeAccessibility(): void {
    // Add ARIA landmarks
    this.addAriaLandmarks();
    
    // Set up keyboard navigation
    this.setupKeyboardNavigation();
    
    // Add focus management
    this.setupFocusManagement();
    
    // Add screen reader announcements
    this.setupScreenReaderAnnouncements();
  }

  /**
   * Detect user accessibility preferences
   */
  private detectUserPreferences(): void {
    // Check for reduced motion preference
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.config.reducedMotion = true;
      this.applyReducedMotion();
    }

    // Check for high contrast preference
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.config.highContrast = true;
      this.applyHighContrast();
    }

    // Check for color scheme preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
    }

    // Listen for preference changes
    window.matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change', (e) => {
      this.config.reducedMotion = e.matches;
      this.applyReducedMotion();
      this.notifyListeners();
    });

    window.matchMedia('(prefers-contrast: high)').addEventListener('change', (e) => {
      this.config.highContrast = e.matches;
      this.applyHighContrast();
      this.notifyListeners();
    });
  }

  /**
   * Add ARIA landmarks to the page
   */
  private addAriaLandmarks(): void {
    // Add main landmark if not present
    if (!document.querySelector('main[role="main"]')) {
      const main = document.createElement('main');
      main.setAttribute('role', 'main');
      main.setAttribute('aria-label', 'Main content');
      document.body.appendChild(main);
    }

    // Add navigation landmarks
    const navs = document.querySelectorAll('nav');
    navs.forEach((nav, index) => {
      if (!nav.getAttribute('aria-label')) {
        nav.setAttribute('aria-label', `Navigation ${index + 1}`);
      }
    });

    // Add banner landmark
    const header = document.querySelector('header');
    if (header && !header.getAttribute('role')) {
      header.setAttribute('role', 'banner');
    }

    // Add contentinfo landmark
    const footer = document.querySelector('footer');
    if (footer && !footer.getAttribute('role')) {
      footer.setAttribute('role', 'contentinfo');
    }
  }

  /**
   * Set up keyboard navigation
   */
  private setupKeyboardNavigation(): void {
    document.addEventListener('keydown', (e) => {
      // Skip to main content
      if (e.key === 'Tab' && e.shiftKey && e.target === document.body) {
        e.preventDefault();
        this.focusMainContent();
      }

      // Escape key handling
      if (e.key === 'Escape') {
        this.handleEscapeKey();
      }

      // Arrow key navigation for custom components
      if (e.key.startsWith('Arrow')) {
        this.handleArrowKeyNavigation(e);
      }
    });
  }

  /**
   * Set up focus management
   */
  private setupFocusManagement(): void {
    // Track focus changes
    document.addEventListener('focusin', (e) => {
      this.config.keyboardNavigation = true;
      this.updateFocusIndicator(e.target as HTMLElement);
    });

    // Remove focus indicator on mouse interaction
    document.addEventListener('mousedown', () => {
      this.config.keyboardNavigation = false;
      this.removeFocusIndicator();
    });
  }

  /**
   * Set up screen reader announcements
   */
  private setupScreenReaderAnnouncements(): void {
    // Create live region for announcements
    const liveRegion = document.createElement('div');
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.setAttribute('class', 'sr-only');
    liveRegion.id = 'live-region';
    document.body.appendChild(liveRegion);
  }

  /**
   * Apply reduced motion styles
   */
  private applyReducedMotion(): void {
    if (this.config.reducedMotion) {
      document.documentElement.style.setProperty('--animation-duration', '0.01ms');
      document.documentElement.style.setProperty('--animation-iteration-count', '1');
      document.documentElement.classList.add('reduced-motion');
    } else {
      document.documentElement.style.removeProperty('--animation-duration');
      document.documentElement.style.removeProperty('--animation-iteration-count');
      document.documentElement.classList.remove('reduced-motion');
    }
  }

  /**
   * Apply high contrast styles
   */
  private applyHighContrast(): void {
    if (this.config.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }
  }

  /**
   * Focus main content area
   */
  private focusMainContent(): void {
    const main = document.querySelector('main[role="main"]') as HTMLElement;
    if (main) {
      main.focus();
      main.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Handle escape key
   */
  private handleEscapeKey(): void {
    // Close any open modals or dropdowns
    const modals = document.querySelectorAll('[role="dialog"]');
    modals.forEach(modal => {
      const closeButton = modal.querySelector('[aria-label*="close"], [aria-label*="Close"]') as HTMLElement;
      if (closeButton) {
        closeButton.click();
      }
    });
  }

  /**
   * Handle arrow key navigation
   */
  private handleArrowKeyNavigation(e: KeyboardEvent): void {
    const target = e.target as HTMLElement;
    
    // Handle menu navigation
    if (target.getAttribute('role') === 'menuitem') {
      e.preventDefault();
      const menuItems = Array.from(document.querySelectorAll('[role="menuitem"]'));
      const currentIndex = menuItems.indexOf(target);
      
      let nextIndex = currentIndex;
      if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
        nextIndex = (currentIndex + 1) % menuItems.length;
      } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
        nextIndex = currentIndex === 0 ? menuItems.length - 1 : currentIndex - 1;
      }
      
      (menuItems[nextIndex] as HTMLElement).focus();
    }
  }

  /**
   * Update focus indicator
   */
  private updateFocusIndicator(element: HTMLElement): void {
    if (this.config.keyboardNavigation) {
      element.classList.add('focus-visible');
    }
  }

  /**
   * Remove focus indicator
   */
  private removeFocusIndicator(): void {
    document.querySelectorAll('.focus-visible').forEach(el => {
      el.classList.remove('focus-visible');
    });
  }

  /**
   * Announce message to screen readers
   */
  announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const liveRegion = document.getElementById('live-region');
    if (liveRegion) {
      liveRegion.setAttribute('aria-live', priority);
      liveRegion.textContent = message;
      
      // Clear after announcement
      setTimeout(() => {
        liveRegion.textContent = '';
      }, 1000);
    }
  }

  /**
   * Create accessible button
   */
  createAccessibleButton(
    text: string,
    onClick: () => void,
    options: {
      variant?: 'primary' | 'secondary' | 'danger';
      disabled?: boolean;
      ariaLabel?: string;
      ariaDescribedBy?: string;
    } = {}
  ): HTMLButtonElement {
    const button = document.createElement('button');
    button.textContent = text;
    button.type = 'button';
    button.className = `btn btn-${options.variant || 'primary'}`;
    
    if (options.disabled) {
      button.disabled = true;
      button.setAttribute('aria-disabled', 'true');
    }
    
    if (options.ariaLabel) {
      button.setAttribute('aria-label', options.ariaLabel);
    }
    
    if (options.ariaDescribedBy) {
      button.setAttribute('aria-describedby', options.ariaDescribedBy);
    }
    
    button.addEventListener('click', onClick);
    
    return button;
  }

  /**
   * Create accessible form field
   */
  createAccessibleFormField(
    type: 'text' | 'email' | 'password' | 'tel' | 'url',
    label: string,
    options: {
      required?: boolean;
      placeholder?: string;
      ariaDescribedBy?: string;
      errorMessage?: string;
    } = {}
  ): { container: HTMLDivElement; input: HTMLInputElement; label: HTMLLabelElement } {
    const container = document.createElement('div');
    container.className = 'form-field';
    
    const labelElement = document.createElement('label');
    labelElement.textContent = label;
    labelElement.className = 'form-label';
    
    const input = document.createElement('input');
    input.type = type;
    input.className = 'form-input';
    
    if (options.required) {
      input.required = true;
      input.setAttribute('aria-required', 'true');
    }
    
    if (options.placeholder) {
      input.placeholder = options.placeholder;
    }
    
    if (options.ariaDescribedBy) {
      input.setAttribute('aria-describedby', options.ariaDescribedBy);
    }
    
    if (options.errorMessage) {
      const errorElement = document.createElement('div');
      errorElement.id = `${input.id}-error`;
      errorElement.className = 'form-error';
      errorElement.textContent = options.errorMessage;
      errorElement.setAttribute('role', 'alert');
      container.appendChild(errorElement);
    }
    
    labelElement.htmlFor = input.id;
    container.appendChild(labelElement);
    container.appendChild(input);
    
    return { container, input, label: labelElement };
  }

  /**
   * Get current accessibility configuration
   */
  getConfig(): AccessibilityConfig {
    return { ...this.config };
  }

  /**
   * Update accessibility configuration
   */
  updateConfig(updates: Partial<AccessibilityConfig>): void {
    this.config = { ...this.config, ...updates };
    this.notifyListeners();
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(id: string, callback: (config: AccessibilityConfig) => void): void {
    this.listeners.set(id, callback);
  }

  /**
   * Unsubscribe from configuration changes
   */
  unsubscribe(id: string): void {
    this.listeners.delete(id);
  }

  /**
   * Notify listeners of configuration changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => callback(this.config));
  }

  /**
   * Check if element is visible to screen readers
   */
  isVisibleToScreenReader(element: HTMLElement): boolean {
    const style = window.getComputedStyle(element);
    return (
      style.display !== 'none' &&
      style.visibility !== 'hidden' &&
      element.getAttribute('aria-hidden') !== 'true' &&
      element.offsetWidth > 0 &&
      element.offsetHeight > 0
    );
  }

  /**
   * Get accessible color contrast ratio
   */
  getContrastRatio(color1: string, color2: string): number {
    // Simplified contrast ratio calculation
    // In a real implementation, you would use a proper color contrast library
    return 4.5; // Placeholder value
  }

  /**
   * Validate accessibility compliance
   */
  validateAccessibility(): {
    errors: string[];
    warnings: string[];
    score: number;
  } {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // Check for missing alt text on images
    const images = document.querySelectorAll('img');
    images.forEach((img, index) => {
      if (!img.alt && !img.getAttribute('aria-label')) {
        errors.push(`Image ${index + 1} is missing alt text`);
      }
    });
    
    // Check for missing form labels
    const inputs = document.querySelectorAll('input, select, textarea');
    inputs.forEach((input, index) => {
      const label = document.querySelector(`label[for="${input.id}"]`);
      if (!label && !input.getAttribute('aria-label') && !input.getAttribute('aria-labelledby')) {
        errors.push(`Form field ${index + 1} is missing a label`);
      }
    });
    
    // Check for proper heading hierarchy
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.charAt(1));
      if (level > previousLevel + 1) {
        warnings.push(`Heading ${index + 1} skips levels (h${previousLevel} to h${level})`);
      }
      previousLevel = level;
    });
    
    // Calculate score
    const totalChecks = errors.length + warnings.length;
    const score = totalChecks === 0 ? 100 : Math.max(0, 100 - (errors.length * 10) - (warnings.length * 5));
    
    return { errors, warnings, score };
  }
}

// Export singleton instance
export const accessibilityService = new AccessibilityService();

// CSS classes for accessibility
export const accessibilityClasses = {
  srOnly: 'sr-only',
  focusVisible: 'focus-visible',
  reducedMotion: 'reduced-motion',
  highContrast: 'high-contrast',
  keyboardNavigation: 'keyboard-navigation'
};

// ARIA roles and attributes
export const ariaAttributes = {
  roles: {
    button: 'button',
    link: 'link',
    menu: 'menu',
    menuitem: 'menuitem',
    dialog: 'dialog',
    alert: 'alert',
    status: 'status',
    main: 'main',
    navigation: 'navigation',
    banner: 'banner',
    contentinfo: 'contentinfo'
  },
  states: {
    expanded: 'aria-expanded',
    selected: 'aria-selected',
    checked: 'aria-checked',
    disabled: 'aria-disabled',
    hidden: 'aria-hidden',
    required: 'aria-required',
    invalid: 'aria-invalid'
  },
  properties: {
    label: 'aria-label',
    labelledBy: 'aria-labelledby',
    describedBy: 'aria-describedby',
    live: 'aria-live',
    atomic: 'aria-atomic'
  }
};
