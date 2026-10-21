export function AppFooter() {
  const version = process.env.NEXT_PUBLIC_APP_VERSION ?? '1.0.0';
  return (
    <footer className="border-border text-content-muted border-t px-4 py-4 text-center text-xs">
      MediCitas v{version} · Soporte: soporte@medicitas.com
    </footer>
  );
}
