import Image from "next/image";
import { Container, Typography, Button, Box } from '@mui/material';

export default function Home() {
  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Container maxWidth="md" sx={{ mt: 4, mb: 4, textAlign: 'center' }}>
          <Typography variant="h2" component="h1" gutterBottom>
            Welcome to [Community Hall Name]
          </Typography>
          <Typography variant="h5" component="p" color="text.secondary" paragraph>
            Your perfect space for events, supporting local charities with every booking.
          </Typography>
          <Box sx={{ mt: 4 }}>
            <Button variant="contained" size="large" sx={{ mr: 2 }}>
              Check Availability
            </Button>
            <Button variant="outlined" size="large" sx={{ mr: 2 }}>
              Explore the Space
            </Button>
             <Button variant="outlined" size="large">
              View Rates
            </Button>
          </Box>
          {/* TODO: Add Hero Image/Video Slideshow */}
          <Box
            sx={{
              mt: 6,
              height: 400, // Placeholder height
              bgcolor: 'grey.300', // Placeholder background
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 2,
            }}
          >
            <Typography variant="h6" color="text.secondary">
              [Hero Image / Video Slideshow Placeholder]
            </Typography>
          </Box>
          {/* TODO: Optional: Section highlighting upcoming public events or spotlighting a supported charity */}
        </Container>
      </main>
      {/* Footer can be moved to layout.tsx or kept here for now */}
      {/*
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
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
      </footer>
      */}
    </div>
  );
}
