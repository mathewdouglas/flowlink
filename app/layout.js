import "./globals.css";
import Providers from "./providers";

export const metadata = {
  title: "FlowLink",
  description: "Unified view of all your connected systems",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
