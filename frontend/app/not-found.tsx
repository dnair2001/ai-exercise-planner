import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center text-center px-4">
      <div>
        <div className="text-6xl mb-4">🔍</div>
        <h1 className="text-3xl font-bold mb-2">Page not found</h1>
        <p className="text-gray-500 mb-6">The page you&apos;re looking for doesn&apos;t exist.</p>
        <Link href="/" className="btn-brand inline-block">
          Go home
        </Link>
      </div>
    </main>
  );
}
