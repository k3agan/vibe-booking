import React from 'react';

// Define the structure for a feature/amenity
interface Feature {
  icon?: React.ElementType; // Optional: We might assign icons later or directly in the component
  primary: string;
  secondary: string;
}

// Define structure for key rules/policies
interface PolicyInfo {
  title: string;
  details: string;
}

// Define the main structure for hall information
interface HallInfo {
  name: string;
  address: {
    street: string;
    city: string;
    province: string;
    postalCode: string;
  };
  email: string;
  phone: string;
  description: string;
  maxCapacity: number;
  features: Feature[];
  keyPolicies: PolicyInfo[];
  // Add more fields as needed: galleryImages, floorPlanUrl, rates, contactInfo etc.
}

// Export the hall information object - Populated from hall-contract.md
export const hallInfo: HallInfo = {
  name: "Capitol Hill Community Hall Association",
  address: {
    street: "361 Howard Avenue",
    city: "Burnaby",
    province: "B.C.",
    postalCode: "V5B 3P7",
  },
  email: "capitol.hill.hall@gmail.com",
  phone: "604-500-9505",
  description: "This is a great space with high ceilings to host all kinds of events from fitness classes to dances, to movie nights. Please let us know what kind of event you will be hosting in the booking request so that we can best accommodate your needs.",
  maxCapacity: 140,
  features: [
    // Building specifications and capacity
    { primary: "Capacity", secondary: "Maximum 140 persons (Fire Department Regulations)" },
    { primary: "Building Size", secondary: "3,042 square feet (282.7 square meters)" },
    { primary: "Total Lot Area", secondary: "1,608 square meters (building, parking lot, and park)" },
    { primary: "Parking", secondary: "25 parking spaces available on site" },
    { primary: "Bathrooms", secondary: "5 bathrooms available on premises" },
    
    // Amenities and facilities
    { primary: "Furniture", secondary: "Chairs and tables provided. Renter responsible for setup, takedown, cleaning, and stacking." },
    { primary: "Kitchen Facilities", secondary: "Oven, Fridge, Sink, Microwave, and other standard amenities" },
    { primary: "WiFi", secondary: "Free WiFi available on site" },
    { primary: "Accessibility", secondary: "Ramps and accessible facilities available" },
  ],
  keyPolicies: [
    { title: "Decorations", details: "No confetti, rice, glitter, beads, gum, or similar items. No nails, tape, tacks, pins, screws, staples, or similar items on any surfaces." },
    { title: "Alcohol", details: "Not allowed unless the Renter has obtained and presented necessary licenses (Liquor/cannabis, Serving it Right, Food Safe) and additional special event liability and liquor liability insurance ($200,000)." },
    { title: "Insurance", details: "Renter must obtain insurance covering all liabilities. Proof required. Renter indemnifies the Association against all claims." },
    { title: "Music/Noise", details: "All music must cease at 11:00 p.m. Be aware of Burnaby noise bylaws." },
    { title: "Cleanup", details: "Renter responsible for cleaning the Hall after function as per the Hall Closing Checklist (sweeping, mopping, garbage/recycling disposal, etc.). Hall must be cleaned and vacated by 12 midnight." },
    { title: "Smoking", details: "Only permitted outside fire door. Butts must be disposed of correctly." },
    // Add other key policies derived from contract
  ],
  // galleryImages: ['/images/hall-1.jpg', '/images/hall-2.jpg'],
  // floorPlanUrl: '/documents/floor-plan.pdf',
}; 