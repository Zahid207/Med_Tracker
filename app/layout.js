import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/layout/Sidebar";
import SessionWraper from "@/components/providers/SessionWraper";
import ChatBot from "@/components/modals/ChatBot";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "MedTracker",
  description: "The best simple and minimalist invoice tracker",
  icons: {
    icon: "/favicon.png",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body>
        <SessionWraper>
          <Sidebar>
            {children} <ChatBot />
          </Sidebar>
        </SessionWraper>
      </body>
    </html>
  );
}
