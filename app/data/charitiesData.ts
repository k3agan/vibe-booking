// Define the structure for charity information
interface Charity {
  name: string;
  logoUrl?: string; // Placeholder for actual logo path/URL
  websiteUrl?: string; // Placeholder for charity website link
  description?: string; // Optional brief description
}

// Export the list of charities
export const supportedCharities: Charity[] = [
  { name: "Burnaby Firefighters Charitable Society", logoUrl: "/burnaby-firefighters.png", websiteUrl: "https://www.burnabyfirefighters.ca/charity" },
  { name: "Burnaby Hospital Foundation", logoUrl: "/burnaby-hospital-foundation.png", websiteUrl: "https://www.bhfoundation.ca/" },
  { name: "Canadian Red Cross", logoUrl: "/canadian-red-cross.png", websiteUrl: "https://www.redcross.ca/" },
  { name: "B.C Children's Hospital", logoUrl: "/bc-childrens.jpg", websiteUrl: "https://www.bcchf.ca/" },
  { name: "Heart and Stroke Foundation of Canada", logoUrl: "/heart-and-stroke.jpg", websiteUrl: "https://www.heartandstroke.ca/" },
  { name: "Capitol Hill Elementary School", logoUrl: "/images/logos/placeholder.png", websiteUrl: "https://capitolhill.burnabyschools.ca/" },
  { name: "Confederation Park Elementary School", logoUrl: "/images/logos/placeholder.png", websiteUrl: "https://confederationpark.burnabyschools.ca/" },
  { name: "BGC South Coast BC", description: "formerly Boys and Girls Clubs of South Coast BC, serving Burnaby", logoUrl: "/BGC-South-Coast-BC-logo.svg", websiteUrl: "https://www.bgcbc.ca/" },
  { name: "Burnaby Christmas Bureau", logoUrl: "/images/logos/placeholder.png", websiteUrl: "https://burnabycommunityconnections.com/christmas-bureau/" },
  { name: "Burnaby Family Life", logoUrl: "/family-life-burnaby.png", websiteUrl: "https://www.burnabyfamilylife.org/" },
  { name: "Parkinson Society British Columbia", logoUrl: "/psbc-logo-header-1.jpg", websiteUrl: "https://www.parkinson.bc.ca/" },
  { name: "Alzheimer Society of B.C.", logoUrl: "/alzheimersociety.webp", websiteUrl: "https://alzheimer.ca/bc/en" },
  { name: "Diabetes Canada", logoUrl: "/diabetes-canada.png", websiteUrl: "https://www.diabetes.ca/" },
  { name: "BC Cancer Foundation", logoUrl: "/BC-cancer-logo.jpg", websiteUrl: "https://bccancerfoundation.com/" },
];

// Note on Logos:
// Fetching and using official logos requires permission from each organization.
// The `logoUrl` should be updated with the correct path once logos are obtained and added to the `/public/images/logos/` directory (or hosted elsewhere).
// Ensure compliance with each charity's branding guidelines. 