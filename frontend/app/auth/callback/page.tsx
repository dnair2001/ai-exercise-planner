"use client";

import { useEffect } from "react";

// This page is only visited if the OAuth callback is handled client-side.
// Since our backend redirect handles the cookie + redirect directly,
// this page serves as a fallback loader shown briefly during redirect.
export default function AuthCallbackPage() {
  useEffect(() => {
    // The backend already redirected us here with the cookie set.
    // The URL already points to /onboard or /dashboard.
    // This page should not be rendered in the normal flow.
    // If the user lands here somehow, redirect home.
    window.location.replace("/");
  }, []);

  return (
    <main className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500">Signing you in…</p>
      </div>
    </main>
  );
}
