import React from 'react';
import { Box, Container, Link, Typography } from '@mui/material';
import Image from 'next/image';
import { hallInfo } from '../data/hallInfo'; // Import hall data

function Copyright() {
  return (
    <Typography variant="body2" color="text.secondary" align="center">
      {'Copyright © '}
      <Link color="inherit" href="#"> {/* Replace # with actual link later */}
        {hallInfo.name} {/* Use hall name from data */}
      </Link>{' '}
      {new Date().getFullYear()}
      {'.'}
    </Typography>
  );
}

export default function Footer() {
  // Keep the original footer content for now
  // TODO: Refactor footer content using Material UI components for consistency
  return (
    <Box component="footer" sx={{ bgcolor: 'background.paper', py: 6 }}>
        <Container maxWidth="lg">
             {/* Original Footer Content - needs Image imports or refactoring */}
            <Box className="flex gap-[24px] flex-wrap items-center justify-center mb-4">
                <a
                  className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                  href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    aria-hidden
                    src="/file.svg"
                    alt="File icon"
                    width={16}
                    height={16}
                  />
                  Learn
                </a>
                <a
                  className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                  href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    aria-hidden
                    src="/window.svg"
                    alt="Window icon"
                    width={16}
                    height={16}
                  />
                  Examples
                </a>
                <a
                  className="flex items-center gap-2 hover:underline hover:underline-offset-4"
                  href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Image
                    aria-hidden
                    src="/globe.svg"
                    alt="Globe icon"
                    width={16}
                    height={16}
                  />
                  Go to nextjs.org →
                </a>
            </Box>
            <Copyright />
        </Container>
    </Box>
  );
} 