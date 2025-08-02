import { redirect } from 'next/navigation'

export default function HomePage() {
  // This will be handled by middleware, but let's add a fallback redirect
  redirect('/auth/login')
}