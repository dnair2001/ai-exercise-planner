import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Exercise Planner — AI-Powered Workouts",
  description:
    "Get a personalized workout plan powered by Claude AI, synced to your Google Calendar.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900 antialiased">
        {children}
      </body>
    </html>
  );
}
