import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Sentinel - Autonomous DeFi Strategy Agent',
  description: 'AI-powered DeFi trading strategies on Uniswap. Create, deploy, and manage automated trading strategies with natural language.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}