import './globals.css';

export const metadata = {
  title: 'Robochat',
  description: 'Robochat на Next.js + Vercel MongoDB'
};

export default function RootLayout({ children }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
