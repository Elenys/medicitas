import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <p className="text-primary-dark text-6xl font-bold">404</p>
      <h1 className="text-2xl font-bold">La página no existe</h1>
      <p className="text-content-muted">Verifique la dirección o vuelva al inicio.</p>
      <Link
        href="/"
        className="bg-primary-dark hover:bg-primary-darker rounded-lg px-5 py-3 font-medium text-white"
      >
        Ir al inicio
      </Link>
    </main>
  );
}
