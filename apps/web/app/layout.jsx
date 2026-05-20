import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata = {
  title: "TradeHub | MLRIT Campus Marketplace",
  description: "Exclusive peer-to-peer trading and rental platform for MLRIT students.",
};

import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { Toaster } from "react-hot-toast";
import TradeBot from "@/components/TradeBot";

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${inter.variable} font-sans antialiased`}>
        <ThemeProvider>
          <AuthProvider>
            {children}
            <TradeBot />
            <Toaster position="bottom-left" />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}


