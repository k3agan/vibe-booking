// Define the structure for charity information
interface Charity {
  name: string;
  logoUrl?: string; // Placeholder for actual logo path/URL
  websiteUrl?: string; // Placeholder for charity website link
  description?: string; // Optional brief description
}

// Export the list of charities (only those with working logos)
export const supportedCharities: Charity[] = [
  { name: "Burnaby Firefighters Charitable Society", logoUrl: "/burnaby-firefighters.png", websiteUrl: "https://www.burnabyfirefighters.ca/charity" },
  { name: "Burnaby Hospital Foundation", logoUrl: "/burnaby-hospital-foundation.png", websiteUrl: "https://www.bhfoundation.ca/" },
  { name: "Canadian Red Cross", logoUrl: "/canadian-red-cross.png", websiteUrl: "https://www.redcross.ca/" },
  { name: "B.C Children's Hospital", logoUrl: "/bc-childrens.jpg", websiteUrl: "https://www.bcchf.ca/" },
  { name: "Heart and Stroke Foundation of Canada", logoUrl: "/heart-and-stroke.jpg", websiteUrl: "https://www.heartandstroke.ca/" },
  { name: "BGC South Coast BC", description: "formerly Boys and Girls Clubs of South Coast BC, serving Burnaby", logoUrl: "/BGC-South-Coast-BC-logo.svg", websiteUrl: "https://www.bgcbc.ca/" },
  { name: "Burnaby Family Life", logoUrl: "/family-life-burnaby.png", websiteUrl: "https://www.burnabyfamilylife.org/" },
  { name: "Parkinson Society British Columbia", logoUrl: "/psbc-logo-header-1.jpg", websiteUrl: "https://www.parkinson.bc.ca/" },
  { name: "Alzheimer Society of B.C.", logoUrl: "/alzheimersociety.webp", websiteUrl: "https://alzheimer.ca/bc/en" },
  { name: "Diabetes Canada", logoUrl: "/diabetes-canada.png", websiteUrl: "https://www.diabetes.ca/" },
  { name: "BC Cancer Foundation", logoUrl: "/BC-cancer-logo.jpg", websiteUrl: "https://bccancerfoundation.com/" },
];

// Note on Logos:
// Only charities with working logos are included. Removed charities without logos:
// - Capitol Hill Elementary School (no logo available)
// - Confederation Park Elementary School (no logo available) 
// - Burnaby Christmas Bureau (no logo available)
// These can be re-added once logos are obtained and added to the `/public/` directory.
// Ensure compliance with each charity's branding guidelines. 