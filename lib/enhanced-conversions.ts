import crypto from 'crypto';

/**
 * Enhanced Conversions utility for Google Ads
 * Provides PII hashing and data formatting for improved conversion tracking
 */

export interface EnhancedConversionData {
  email?: string;
  phone?: string;
  name?: string;
  address?: {
    first_name?: string;
    last_name?: string;
    country?: string;
    postal_code?: string;
  };
}

export interface ConversionData {
  transaction_id: string;
  value: number;
  currency: string;
  event_type?: string;
  booking_type?: string;
  days_until_event?: number;
  guest_count?: number;
  enhanced_conversions?: EnhancedConversionData;
}

/**
 * Hash PII data using SHA-256 for enhanced conversions
 * @param data - The PII data to hash
 * @returns Hashed data in lowercase hex format
 */
export function hashPII(data: string): string {
  if (!data) return '';
  return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
}

/**
 * Format enhanced conversion data with hashed PII
 * @param data - Raw PII data
 * @returns Formatted data with hashed PII
 */
export function formatEnhancedConversionData(data: EnhancedConversionData): EnhancedConversionData {
  const hashed: EnhancedConversionData = {};
  
  if (data.email) {
    hashed.email = hashPII(data.email);
  }
  
  if (data.phone) {
    // Remove all non-digit characters before hashing
    const cleanPhone = data.phone.replace(/\D/g, '');
    hashed.phone = hashPII(cleanPhone);
  }
  
  if (data.name) {
    hashed.name = hashPII(data.name);
  }
  
  if (data.address) {
    hashed.address = {};
    if (data.address.first_name) {
      hashed.address.first_name = hashPII(data.address.first_name);
    }
    if (data.address.last_name) {
      hashed.address.last_name = hashPII(data.address.last_name);
    }
    if (data.address.country) {
      hashed.address.country = hashPII(data.address.country);
    }
    if (data.address.postal_code) {
      hashed.address.postal_code = hashPII(data.address.postal_code);
    }
  }
  
  return hashed;
}

/**
 * Calculate days until event for conversion tracking
 * @param eventDate - The event date string
 * @returns Number of days until the event
 */
export function calculateDaysUntilEvent(eventDate: string): number {
  const event = new Date(eventDate);
  const today = new Date();
  const diffTime = event.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Format conversion data for Google Ads API
 * @param conversionData - The conversion data to format
 * @returns Formatted conversion data ready for API submission
 */
export function formatConversionData(conversionData: ConversionData) {
  const formatted = {
    transaction_id: conversionData.transaction_id,
    value: conversionData.value,
    currency: conversionData.currency,
    event_type: conversionData.event_type,
    booking_type: conversionData.booking_type,
    days_until_event: conversionData.days_until_event,
    guest_count: conversionData.guest_count,
  };

  // Add enhanced conversions if available
  if (conversionData.enhanced_conversions) {
    formatted.enhanced_conversions = formatEnhancedConversionData(conversionData.enhanced_conversions);
  }

  return formatted;
}

/**
 * Send conversion to GA4 via Measurement Protocol
 * @param conversionData - The conversion data to send
 * @returns Promise<boolean> - Success status
 */
export async function sendConversionToGA4(conversionData: ConversionData): Promise<boolean> {
  try {
    const ga4Id = process.env.NEXT_PUBLIC_GA4_ID;
    const apiSecret = process.env.GA4_MEASUREMENT_PROTOCOL_SECRET;
    
    if (!ga4Id || !apiSecret) {
      console.warn('GA4 tracking IDs not configured');
      return false;
    }

    const formattedData = formatConversionData(conversionData);
    
    // Send to GA4 Measurement Protocol
    const measurementUrl = `https://www.google-analytics.com/mp/collect?measurement_id=${ga4Id}&api_secret=${apiSecret}`;
    
    const payload = {
      client_id: `booking_${conversionData.transaction_id}`, // Unique client ID
      events: [{
        name: 'purchase',
        params: {
          transaction_id: formattedData.transaction_id,
          value: formattedData.value,
          currency: formattedData.currency,
          event_type: formattedData.event_type,
          booking_type: formattedData.booking_type,
          days_until_event: formattedData.days_until_event,
          guest_count: formattedData.guest_count,
          // Enhanced conversions
          user_data: formattedData.enhanced_conversions
        }
      }]
    };

    const response = await fetch(measurementUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log('GA4 conversion sent successfully:', conversionData.transaction_id);
      return true;
    } else {
      console.error('Failed to send GA4 conversion:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('Error sending conversion to GA4:', error);
    return false;
  }
}

/**
 * Send conversion to Google Ads via Measurement Protocol
 * @param conversionData - The conversion data to send
 * @returns Promise<boolean> - Success status
 */
export async function sendConversionToGoogleAds(conversionData: ConversionData): Promise<boolean> {
  try {
    // Send to both GA4 and Google Ads
    const ga4Success = await sendConversionToGA4(conversionData);
    
    // For Google Ads, we'll rely on GA4 import rather than direct API calls
    // This is more reliable and easier to maintain
    console.log('Conversion data prepared for Google Ads import via GA4:', {
      transaction_id: conversionData.transaction_id,
      value: conversionData.value,
      ga4_sent: ga4Success
    });
    
    return ga4Success;
  } catch (error) {
    console.error('Error sending conversion to Google Ads:', error);
    return false;
  }
}
