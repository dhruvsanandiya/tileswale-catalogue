import { redirect } from 'next/navigation';

/** Legacy route: redirect to new hierarchy (companies list). */
export default function CategoryRedirect() {
  redirect('/');
}
