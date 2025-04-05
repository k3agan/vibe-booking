'use client'; // Theme definition needs to be client-side compatible for ThemeProvider

import { createTheme } from '@mui/material/styles';
import { Geist } from 'next/font/google'; // Use the project's font

// Initialize Geist font if needed within theme (or rely on layout.tsx)
// const geistSans = Geist({
//   variable: "--font-geist-sans",
//   subsets: ["latin"],
//   weight: ['300', '400', '500', '700'] // Adjust weights as needed
// });

// Define the theme
const theme = createTheme({
  palette: {
    mode: 'light', // Start with light mode, can add dark mode later
    primary: {
      // Let's try a professional blue
      main: '#1976d2', // MUI blue[700]
      light: '#42a5f5', // MUI blue[500]
      dark: '#1565c0', // MUI blue[800]
      contrastText: '#ffffff',
    },
    secondary: {
      // A neutral grey
      main: '#9e9e9e', // MUI grey[500]
      light: '#bdbdbd', // MUI grey[400]
      dark: '#616161', // MUI grey[700]
      contrastText: '#000000',
    },
    background: {
      default: '#f5f5f5', // A slightly off-white background
      paper: '#ffffff',
    },
    text: {
      primary: 'rgba(0, 0, 0, 0.87)',
      secondary: 'rgba(0, 0, 0, 0.6)',
      disabled: 'rgba(0, 0, 0, 0.38)',
    },
  },
  typography: {
    // Use the Geist font family defined in layout.tsx
    // fontFamily: geistSans.style.fontFamily,
    fontFamily: 'var(--font-geist-sans), Arial, sans-serif', // Fallback stack
    h1: {
      fontWeight: 700,
    },
    h2: {
      fontWeight: 700,
    },
    h3: {
      fontWeight: 500,
    },
    // Define other typography variants as needed
  },
  // Optional: Add component overrides for a more custom look
  // components: {
  //   MuiButton: {
  //     styleOverrides: {
  //       root: {
  //         borderRadius: 8, // Example: Slightly rounder buttons
  //         textTransform: 'none', // Example: Keep button text case as is
  //       },
  //     },
  //   },
  //   MuiPaper: {
  //       styleOverrides: {
  //           root: {
  //               borderRadius: 8, // Example: Slightly rounder paper/cards
  //           }
  //       }
  //   }
  // },
});

export default theme; 