"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";

type Step = 1 | 2 | 3;

interface FormData {
  goals: string;
  fitnessLevel: string;
  needs: string;
  duration_days: number;
  start_date: string;
  workout_time: string;
  timezone: string;
}

const TIMEZONES = [
  { value: "America/New_York",      label: "Eastern Time (ET)" },
  { value: "America/Chicago",       label: "Central Time (CT)" },
  { value: "America/Denver",        label: "Mountain Time (MT)" },
  { value: "America/Los_Angeles",   label: "Pacific Time (PT)" },
  { value: "America/Phoenix",       label: "Arizona (MST)" },
  { value: "America/Anchorage",     label: "Alaska (AKT)" },
  { value: "Pacific/Honolulu",      label: "Hawaii (HST)" },
  { value: "America/Toronto",       label: "Toronto (ET)" },
  { value: "America/Vancouver",     label: "Vancouver (PT)" },
  { value: "America/Sao_Paulo",     label: "São Paulo (BRT)" },
  { value: "Europe/London",         label: "London (GMT/BST)" },
  { value: "Europe/Paris",          label: "Paris (CET/CEST)" },
  { value: "Europe/Berlin",         label: "Berlin (CET/CEST)" },
  { value: "Europe/Madrid",         label: "Madrid (CET/CEST)" },
  { value: "Europe/Rome",           label: "Rome (CET/CEST)" },
  { value: "Europe/Amsterdam",      label: "Amsterdam (CET/CEST)" },
  { value: "Asia/Dubai",            label: "Dubai (GST)" },
  { value: "Asia/Kolkata",          label: "India (IST)" },
  { value: "Asia/Singapore",        label: "Singapore (SGT)" },
  { value: "Asia/Shanghai",         label: "China (CST)" },
  { value: "Asia/Tokyo",            label: "Tokyo (JST)" },
  { value: "Asia/Seoul",            label: "Seoul (KST)" },
  { value: "Australia/Perth",       label: "Perth (AWST)" },
  { value: "Australia/Brisbane",    label: "Brisbane (AEST)" },
  { value: "Australia/Sydney",      label: "Sydney (AEST/AEDT)" },
  { value: "Pacific/Auckland",      label: "Auckland (NZST/NZDT)" },
];

const FITNESS_LEVELS = [
  { value: "beginner", label: "Beginner", desc: "New to working out or returning after a long break" },
  { value: "intermediate", label: "Intermediate", desc: "Working out 1–3× per week for 6+ months" },
  { value: "advanced", label: "Advanced", desc: "Consistent training for 2+ years" },
];

interface StatusEvent {
  type: "chunk" | "status" | "warning" | "error" | "done" | "complete";
  text?: string;
  message?: string;
  plan_id?: number;
}

export default function GoalForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState<FormData>({
    goals: "",
    fitnessLevel: "beginner",
    needs: "",
    duration_days: 30,
    start_date: new Date().toISOString().split("T")[0],
    workout_time: "07:00",
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York",
  });
  const [generating, setGenerating] = useState(false);
  const [statusMessages, setStatusMessages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const addStatus = (msg: string) =>
    setStatusMessages((prev) => [...prev, msg]);

  const handleSubmit = async () => {
    setGenerating(true);
    setError(null);
    setStatusMessages(["Generating your personalized plan with Claude AI…"]);

    const needs = `Fitness level: ${form.fitnessLevel}. ${form.needs}`.trim();

    try {
      const response = await api.createPlanStream({
        goals: form.goals,
        needs,
        duration_days: form.duration_days,
        start_date: form.start_date,
        workout_time: form.workout_time,
        timezone: form.timezone,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Failed to start plan generation" }));
        throw new Error(err.detail || "Failed to start plan generation");
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event: StatusEvent = JSON.parse(raw);
            if (event.type === "status" && event.message) {
              addStatus(event.message);
            } else if (event.type === "warning" && event.message) {
              addStatus(`⚠️ ${event.message}`);
            } else if (event.type === "error" && event.message) {
              throw new Error(event.message);
            } else if (event.type === "complete" && event.plan_id) {
              addStatus("✅ All done! Redirecting to your dashboard…");
              setTimeout(() => router.push("/dashboard"), 1500);
              return;
            }
          } catch (parseErr) {
            // ignore parse errors for chunk events (they contain raw text)
          }
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setGenerating(false);
    }
  };

  if (generating) {
    return (
      <div className="max-w-lg mx-auto text-center py-12">
        <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mx-auto mb-6" />
        <h2 className="text-xl font-semibold mb-4">Building Your Plan…</h2>
        <div className="space-y-2 text-left bg-gray-50 rounded-xl p-4 max-h-64 overflow-y-auto">
          {statusMessages.map((msg, i) => (
            <p key={i} className="text-sm text-gray-600 flex gap-2">
              <span className="text-green-500 shrink-0">✓</span>
              <span>{msg}</span>
            </p>
          ))}
        </div>
        {error && (
          <p className="mt-4 text-red-500 text-sm">{error}</p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-8">
        {([1, 2, 3] as Step[]).map((s) => (
          <div key={s} className="flex-1 flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                s === step
                  ? "bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white"
                  : s < step
                  ? "bg-purple-100 text-purple-600"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {s < step ? "✓" : s}
            </div>
            {s < 3 && <div className={`flex-1 h-0.5 ${s < step ? "bg-purple-200" : "bg-gray-100"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Goals */}
      {step === 1 && (
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold">What are your fitness goals?</h2>
          <p className="text-gray-500 text-sm">Be as specific as possible — Claude uses this to personalize your plan.</p>
          <textarea
            className="w-full border border-gray-200 rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 h-32"
            placeholder="e.g. Lose 15 lbs in 3 months, build visible abs, run a 5K without stopping, improve upper body strength…"
            value={form.goals}
            onChange={(e) => setForm({ ...form, goals: e.target.value })}
          />
          <button
            onClick={() => setStep(2)}
            disabled={!form.goals.trim()}
            className="btn-brand w-full disabled:opacity-40"
          >
            Next →
          </button>
        </div>
      )}

      {/* Step 2: Fitness level & needs */}
      {step === 2 && (
        <div className="card space-y-4">
          <h2 className="text-xl font-semibold">Your fitness background</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Current fitness level</label>
            <div className="space-y-2">
              {FITNESS_LEVELS.map((level) => (
                <button
                  key={level.value}
                  onClick={() => setForm({ ...form, fitnessLevel: level.value })}
                  className={`w-full text-left p-4 rounded-xl border transition-colors ${
                    form.fitnessLevel === level.value
                      ? "border-purple-400 bg-purple-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="font-medium">{level.label}</span>
                  <span className="block text-xs text-gray-400 mt-0.5">{level.desc}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Any constraints or preferences? <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-xl p-4 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-purple-300 h-24"
              placeholder="e.g. No gym equipment, bad knees, prefer morning workouts, only 30 min per day…"
              value={form.needs}
              onChange={(e) => setForm({ ...form, needs: e.target.value })}
            />
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(1)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl hover:bg-gray-50">
              ← Back
            </button>
            <button onClick={() => setStep(3)} className="flex-1 btn-brand">
              Next →
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Duration & start date */}
      {step === 3 && (
        <div className="card space-y-5">
          <h2 className="text-xl font-semibold">Plan duration &amp; start date</h2>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Duration: <span className="text-purple-600 font-bold">{form.duration_days} days</span>
            </label>
            <input
              type="range"
              min={7}
              max={90}
              step={7}
              value={form.duration_days}
              onChange={(e) => setForm({ ...form, duration_days: Number(e.target.value) })}
              className="w-full accent-purple-600"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>1 week</span>
              <span>4 weeks</span>
              <span>8 weeks</span>
              <span>13 weeks</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start date</label>
            <input
              type="date"
              value={form.start_date}
              min={new Date().toISOString().split("T")[0]}
              onChange={(e) => setForm({ ...form, start_date: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Daily workout time</label>
            <input
              type="time"
              value={form.workout_time}
              onChange={(e) => setForm({ ...form, workout_time: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
            <select
              value={form.timezone}
              onChange={(e) => setForm({ ...form, timezone: e.target.value })}
              className="w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-purple-300 bg-white"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>{tz.label}</option>
              ))}
            </select>
          </div>

          <div className="bg-purple-50 rounded-xl p-4 text-sm text-purple-700 space-y-1">
            <p>📅 <strong>{form.duration_days}</strong> workouts added to Google Calendar</p>
            <p>⏰ Scheduled daily at <strong>{form.workout_time}</strong></p>
            <p>🔔 30-minute reminders set for each session</p>
            <p>📧 Confirmation email sent when ready</p>
          </div>

          <div className="flex gap-3">
            <button onClick={() => setStep(2)} className="flex-1 border border-gray-200 text-gray-600 py-3 rounded-xl hover:bg-gray-50">
              ← Back
            </button>
            <button onClick={handleSubmit} className="flex-1 btn-brand">
              Generate My Plan ✨
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
