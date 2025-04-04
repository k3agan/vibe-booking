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
  description: "[Detailed text describing the hall's atmosphere, potential uses, and unique characteristics will go here...]", // Keep placeholder or update if contract had description
  maxCapacity: 140,
  features: [
    // Update features based on contract if applicable, otherwise keep placeholders or derive
    { primary: "Capacity", secondary: "Maximum 140 persons (Fire Department Regulations)" },
    { primary: "Dimensions", secondary: "[XXm x YYm / ZZZ sq ft]" }, // Not in contract
    { primary: "Furniture", secondary: "Chairs and tables provided. Renter responsible for setup, takedown, cleaning, and stacking." },
    { primary: "Kitchen Facilities", secondary: "[Oven, Fridge, Sink, Microwave, etc.]" }, // Details not in contract, assume standard
    { primary: "AV Equipment", secondary: "[Projector, Screen, Sound System, WiFi Details]" }, // Not mentioned in contract
    { primary: "Washrooms", secondary: "Available on premises." }, // Implied by checklist
    { primary: "Accessibility", secondary: "[Ramps, Accessible Washrooms, etc.]" }, // Not mentioned in contract
    { primary: "Parking", secondary: "Available on site." }, // Implied by checklist mentioning parking area
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