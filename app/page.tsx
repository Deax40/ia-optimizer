import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          Optimiseur Perf + SEO
        </h1>
        <p className="text-lg text-gray-600 mb-8">
          Système d'optimisation automatique pour Next.js 14
        </p>
        <Link
          href="/admin/connections"
          className="inline-block bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors"
        >
          Accéder au Panel d'Administration
        </Link>
      </div>
    </div>
  );
}
