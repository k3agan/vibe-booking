import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box } from '@mui/material';
import Link from 'next/link'; // Use Next.js Link for navigation

export default function Header() {
  return (
    <AppBar position="static"> {/* Or position="sticky" for a sticky header */}
      <Toolbar>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
          <Link href="/" passHref style={{ textDecoration: 'none', color: 'inherit' }}>
            [Community Hall Name] {/* TODO: Replace with actual name/logo */}
          </Link>
        </Typography>

        {/* Placeholder for Navigation Links */}
        <Box>
          <Button color="inherit" component={Link} href="/hall-details">Hall Details</Button>
          <Button color="inherit" component={Link} href="/rates">Rates</Button>
          <Button color="inherit" component={Link} href="/availability">Availability</Button>
          <Button color="inherit" component={Link} href="/community">Community Impact</Button>
          <Button color="inherit" component={Link} href="/contact">Contact</Button>
          {/* TODO: Add more links (FAQ, Policies, etc.) as needed */}
        </Box>
      </Toolbar>
    </AppBar>
  );
} 