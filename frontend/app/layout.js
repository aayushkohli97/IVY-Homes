import { Outfit, Inter } from 'next/font/google';
import './globals.css';
import { AppProviders } from '@/lib/providers';

const inter  = Inter({ subsets: ['latin'], variable: '--font-inter' });
const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit', weight: ['400','600','700','800'] });

export const metadata = {
  title: 'Ivy Homes – Find Your Dream Home in Hyderabad',
  description: 'Browse 4,400+ verified property listings, rentals and projects in Hyderabad. Filter by locality, bedrooms, price and more.',
  keywords: 'Hyderabad real estate, apartments for sale, rent Hyderabad, property listings, Madhapur',
  openGraph: {
    title: 'Ivy Homes',
    description: 'Premium real estate listings in Hyderabad',
    type: 'website',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${outfit.variable}`}>
      <body>
        <AppProviders>
          {children}
        </AppProviders>
      </body>
    </html>
  );
}
