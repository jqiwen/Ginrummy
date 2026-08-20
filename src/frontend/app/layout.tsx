import './globals.css';
import { Metadata } from 'next';
import ClientProvider from '@shared-store/ClientProvider'


export const metadata: Metadata = {
  title: 'Gin Rummy Dozenal',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="h-full w-full">
      <ClientProvider>
          {children}
        </ClientProvider>
      </body>
    </html>
  );
}