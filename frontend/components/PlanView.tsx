"use client";

import { WorkoutDay, WorkoutPlan } from "@/lib/api";

interface PlanViewProps {
  plan: WorkoutPlan;
  startDate: string;
}

function getTodayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function formatDate(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function DayCard({ day, isToday, isPast }: { day: WorkoutDay; isToday: boolean; isPast: boolean }) {
  const borderClass = isToday
    ? "border-purple-400 ring-2 ring-purple-200"
    : isPast
    ? "border-gray-200 opacity-60"
    : "border-gray-200";

  return (
    <div className={`card border-2 ${borderClass} transition-all`}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            {isToday && (
              <span className="bg-purple-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                TODAY
              </span>
            )}
            <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
              Day {day.day} — {formatDate(day.date)}
            </span>
          </div>
          <h3 className="font-semibold text-lg mt-1">{day.title}</h3>
        </div>
        <span className="text-sm text-gray-400 shrink-0">{day.duration_minutes} min</span>
      </div>

      {day.exercises.length > 0 && (
        <div className="space-y-1.5 mb-3">
          {day.exercises.map((ex, i) => (
            <div key={i} className="flex gap-2 text-sm">
              <span className="text-purple-400 shrink-0">•</span>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{ex.name}</span>
                  {ex.sets && ex.reps && (
                    <span className="text-gray-400">
                      — {ex.sets} × {ex.reps}
                    </span>
                  )}
                  {ex.youtube_search_query && (
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(ex.youtube_search_query)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-red-500 hover:text-red-600 font-medium flex items-center gap-0.5"
                    >
                      ▶ Watch
                    </a>
                  )}
                </div>
                {ex.notes && (
                  <p className="text-xs text-gray-400 mt-0.5">{ex.notes}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {day.notes && (
        <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2 leading-relaxed">
          💡 {day.notes}
        </p>
      )}
    </div>
  );
}

export default function PlanView({ plan, startDate }: PlanViewProps) {
  const today = getTodayISO();
  const todayIndex = plan.days.findIndex((d) => d.date === today);

  return (
    <div>
      {/* Plan header */}
      <div className="card mb-6 bg-gradient-to-br from-[#667eea] to-[#764ba2] text-white border-0">
        <h2 className="text-2xl font-bold mb-2">{plan.plan_title}</h2>
        <p className="opacity-90 text-sm leading-relaxed">{plan.summary}</p>
        <div className="mt-4 flex gap-4 text-sm opacity-80">
          <span>📅 {plan.days.length} days</span>
          <span>🗓 Starts {formatDate(startDate)}</span>
        </div>
      </div>

      {/* Today's workout highlight */}
      {todayIndex >= 0 && (
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Today&apos;s Workout
          </h3>
          <DayCard day={plan.days[todayIndex]} isToday={true} isPast={false} />
        </div>
      )}

      {/* Full plan */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">
          Full Schedule
        </h3>
        <a
          href="https://calendar.google.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-purple-600 hover:underline"
        >
          Open Google Calendar →
        </a>
      </div>

      <div className="space-y-3">
        {plan.days.map((day) => {
          const isToday = day.date === today;
          const isPast = day.date < today;
          return (
            <DayCard key={day.day} day={day} isToday={isToday} isPast={isPast} />
          );
        })}
      </div>
    </div>
  );
}
