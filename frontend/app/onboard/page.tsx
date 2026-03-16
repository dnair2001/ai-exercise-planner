"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, User } from "@/lib/api";
import GoalForm from "@/components/GoalForm";

export default function OnboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .getMe()
      .then((u) => {
        setUser(u);
        setLoading(false);
      })
      .catch(() => {
        router.replace("/");
      });
  }, [router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen py-12 px-4">
      <div className="max-w-xl mx-auto mb-10 text-center">
        <h1 className="text-3xl font-bold mb-2">
          Welcome, {user?.name?.split(" ")[0]}! 👋
        </h1>
        <p className="text-gray-500">
          Let&apos;s build your personalized workout plan. This takes about 60 seconds.
        </p>
      </div>
      <GoalForm />
    </main>
  );
}
