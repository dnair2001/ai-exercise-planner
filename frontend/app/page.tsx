"use client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export default function LandingPage() {
  const handleGetStarted = () => {
    window.location.href = `${API_URL}/api/auth/google`;
  };

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-20 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="mb-6 inline-flex items-center gap-2 bg-purple-50 text-purple-700 px-4 py-2 rounded-full text-sm font-medium">
            <span>🤖</span>
            <span>Powered by Claude AI</span>
          </div>

          <h1 className="text-5xl md:text-6xl font-bold mb-6 leading-tight">
            Your Personal
            <span className="block bg-gradient-to-r from-[#667eea] to-[#764ba2] bg-clip-text text-transparent">
              AI Fitness Coach
            </span>
          </h1>

          <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            Tell us your goals. Claude creates a personalized day-by-day workout
            plan — automatically added to your Google Calendar with reminders.
          </p>

          <button onClick={handleGetStarted} className="btn-brand text-lg px-10 py-4">
            Get Started with Google →
          </button>

          <p className="mt-4 text-sm text-gray-400">
            Free to use • No credit card required
          </p>
        </div>
      </section>

      {/* Features */}
      <section className="bg-white border-t border-gray-100 py-16 px-4">
        <div className="max-w-4xl mx-auto grid md:grid-cols-3 gap-8">
          {[
            {
              icon: "🧠",
              title: "AI-Personalized Plans",
              desc: "Claude analyzes your goals, fitness level, and schedule to create a realistic, progressive plan just for you.",
            },
            {
              icon: "📅",
              title: "Auto-Added to Calendar",
              desc: "Every workout is automatically added to your Google Calendar with 30-minute reminders so you never miss a session.",
            },
            {
              icon: "📧",
              title: "Instant Confirmation",
              desc: "Receive a beautiful email summary of your full plan the moment it's ready to go.",
            },
          ].map((f) => (
            <div key={f.title} className="text-center">
              <div className="text-4xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-gray-400 border-t border-gray-100">
        Exercise Planner — Built with Next.js, FastAPI &amp; Claude
      </footer>
    </main>
  );
}
