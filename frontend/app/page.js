'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/providers';

export default function HomePage() {
  const { user } = useAuth();
  const router   = useRouter();

  useEffect(() => {
    if (user) router.replace('/listings');
    else      router.replace('/login');
  }, [user, router]);

  return (
    <div className="loading-wrap" style={{ minHeight: '100vh' }}>
      <div className="spinner" />
    </div>
  );
}
