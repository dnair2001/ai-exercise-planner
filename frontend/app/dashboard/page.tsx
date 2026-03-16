"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { api, Plan, User } from "@/lib/api";
import PlanView from "@/components/PlanView";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.getMe(), api.getCurrentPlan()])
      .then(([u, p]) => {
        setUser(u);
        setPlan(p);
        setLoading(false);
      })
      .catch((err) => {
        if (err.message?.includes("401") || err.message?.includes("Not authenticated")) {
          router.replace("/");
        } else if (err.message?.includes("404") || err.message?.includes("No active plan")) {
          // User is authenticated but has no plan — fetch user separately
          api
            .getMe()
            .then((u) => {
              setUser(u);
              setLoading(false);
            })
            .catch(() => router.replace("/"));
        } else {
          setError(err.message || "Failed to load dashboard");
          setLoading(false);
        }
      });
  }, [router]);

  const handleLogout = async () => {
    await api.logout();
    router.push("/");
  };

  const handleDeletePlan = async () => {
    if (!plan) return;
    if (!confirm("Delete this workout plan? This will also remove all Google Calendar events.")) return;
    await api.deletePlan(plan.id);
    setPlan(null);
  };

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <span className="font-bold text-lg bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
            💪 Exercise Planner
          </span>
          <div className="flex items-center gap-3">
            {user?.picture && (
              <Image
                src={user.picture}
                alt={user.name}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <span className="text-sm text-gray-600 hidden sm:block">{user?.name}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {error && (
          <div className="bg-red-50 text-red-600 rounded-xl p-4 mb-6 text-sm">
            {error}
          </div>
        )}

        {!plan || !plan.plan_json ? (
          /* No plan yet */
          <div className="text-center py-20">
            <div className="text-6xl mb-4">🏋️</div>
            <h2 className="text-2xl font-bold mb-3">No workout plan yet</h2>
            <p className="text-gray-500 mb-8">
              Create your first personalized plan powered by Claude AI.
            </p>
            <button
              onClick={() => router.push("/onboard")}
              className="btn-brand"
            >
              Create My Plan →
            </button>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold">Your Workout Plan</h1>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => router.push("/onboard")}
                  className="text-sm text-purple-600 hover:underline"
                >
                  + New Plan
                </button>
                <button
                  onClick={handleDeletePlan}
                  className="text-sm text-red-400 hover:text-red-600 hover:underline"
                >
                  Delete plan
                </button>
              </div>
            </div>
            <PlanView
              plan={plan.plan_json}
              startDate={plan.start_date}
            />
          </div>
        )}
      </div>
    </main>
  );
}
