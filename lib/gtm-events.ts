/**
 * Google Tag Manager Events Helper
 * Provides consistent event tracking across the application
 */

// Extend Window interface for GTM dataLayer
declare global {
  interface Window {
    dataLayer: any[];
    gtag: (...args: any[]) => void;
  }
}

export interface GTMEvent {
  event: string;
  [key: string]: any;
}

export interface PurchaseEvent extends GTMEvent {
  event: 'purchase';
  transaction_id: string;
  value: number;
  currency: string;
  event_type?: string;
  booking_type?: string;
  days_until_event?: number;
  guest_count?: number;
}

export interface BeginCheckoutEvent extends GTMEvent {
  event: 'begin_checkout';
  currency: string;
  value?: number;
}

export interface PageViewEvent extends GTMEvent {
  event: 'page_view';
  page_title: string;
  page_location: string;
  page_path: string;
}

export interface SelectContentEvent extends GTMEvent {
  event: 'select_content';
  content_type: string;
  item_id?: string;
}

export interface GenerateLeadEvent extends GTMEvent {
  event: 'generate_lead';
  currency: string;
  value?: number;
}

/**
 * Push event to GTM dataLayer
 * @param event - The event object to push
 */
export function pushToDataLayer(event: GTMEvent): void {
  if (typeof window !== 'undefined' && window.dataLayer) {
    window.dataLayer.push(event);
  } else {
    console.warn('GTM dataLayer not available');
  }
}

/**
 * Track purchase conversion
 * @param transactionId - Unique transaction identifier
 * @param value - Transaction value
 * @param currency - Currency code
 * @param additionalData - Additional event data
 */
export function trackPurchase(
  transactionId: string,
  value: number,
  currency: string = 'CAD',
  additionalData?: {
    event_type?: string;
    booking_type?: string;
    days_until_event?: number;
    guest_count?: number;
  }
): void {
  const event: PurchaseEvent = {
    event: 'purchase',
    transaction_id: transactionId,
    value,
    currency,
    ...additionalData
  };
  
  pushToDataLayer(event);
}

/**
 * Track begin checkout (form started)
 * @param currency - Currency code
 * @param value - Optional estimated value
 */
export function trackBeginCheckout(currency: string = 'CAD', value?: number): void {
  const event: BeginCheckoutEvent = {
    event: 'begin_checkout',
    currency,
    value
  };
  
  pushToDataLayer(event);
}

/**
 * Track page view
 * @param pageTitle - Page title
 * @param pageLocation - Full URL
 * @param pagePath - URL path
 */
export function trackPageView(pageTitle: string, pageLocation: string, pagePath: string): void {
  const event: PageViewEvent = {
    event: 'page_view',
    page_title: pageTitle,
    page_location: pageLocation,
    page_path: pagePath
  };
  
  pushToDataLayer(event);
}

/**
 * Track content selection (calendar view, gallery view, etc.)
 * @param contentType - Type of content selected
 * @param itemId - Optional item identifier
 */
export function trackSelectContent(contentType: string, itemId?: string): void {
  const event: SelectContentEvent = {
    event: 'select_content',
    content_type: contentType,
    item_id: itemId
  };
  
  pushToDataLayer(event);
}

/**
 * Track lead generation (contact form, phone click)
 * @param currency - Currency code
 * @param value - Optional lead value
 */
export function trackGenerateLead(currency: string = 'CAD', value?: number): void {
  const event: GenerateLeadEvent = {
    event: 'generate_lead',
    currency,
    value
  };
  
  pushToDataLayer(event);
}

/**
 * Track custom event
 * @param eventName - Name of the custom event
 * @param parameters - Event parameters
 */
export function trackCustomEvent(eventName: string, parameters: Record<string, any> = {}): void {
  const event: GTMEvent = {
    event: eventName,
    ...parameters
  };
  
  pushToDataLayer(event);
}

/**
 * Initialize GTM dataLayer if not already present
 */
export function initializeDataLayer(): void {
  if (typeof window !== 'undefined' && !window.dataLayer) {
    window.dataLayer = [];
  }
}
