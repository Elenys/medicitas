import { redirect } from 'next/navigation';

// El proxy redirige según el rol; esto solo cubre el caso sin sesión.
export default function HomePage() {
  redirect('/login');
}
