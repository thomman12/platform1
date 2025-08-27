import './globals.css';
import LayoutWrapper from './components/LayoutWrapper';

export const metadata = {
  title: 'Platform1',
  description: 'Your educational platform',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
