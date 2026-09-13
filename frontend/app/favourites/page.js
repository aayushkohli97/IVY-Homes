'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/providers';
import Navbar from '@/components/Navbar';
import PropertyCard from '@/components/PropertyCard';
import { fetchFavourites, fetchListing } from '@/lib/api';
import { useFav } from '@/lib/providers';

export default function FavouritesPage() {
  const { user }          = useAuth();
  const { favIds }        = useFav();
  const router            = useRouter();

  const [listings, setListings] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
  }, [user, router]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    setError('');

    fetchFavourites()
      .then(async (data) => {
        const favList = data.data || data || [];
        // Fetch full listing details for each favourite
        const details = await Promise.allSettled(
          favList.map(f => fetchListing(f.listing_id || f.id).catch(() => null))
        );
        const resolved = details
          .filter(r => r.status === 'fulfilled' && r.value)
          .map(r => r.value.data || r.value);
        setListings(resolved);
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [user, favIds]);

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main className="favourites-page">
        {/* Header */}
        <div className="page-header" style={{ padding: '32px 0 24px' }}>
          <h1>❤️ Saved Listings</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 6 }}>
            {listings.length > 0
              ? `You have ${listings.length} saved propert${listings.length === 1 ? 'y' : 'ies'}.`
              : 'Your saved listings appear here.'}
          </p>
        </div>

        {loading && (
          <div className="loading-wrap"><div className="spinner" /></div>
        )}

        {error && (
          <div className="login-error" style={{ marginBottom: 20 }}>{error}</div>
        )}

        {!loading && listings.length === 0 && !error && (
          <div className="empty-state">
            <span style={{ fontSize: 64 }}>🏡</span>
            <h3>No saved listings yet</h3>
            <p>Tap the ❤️ icon on any listing to save it here.</p>
            <button className="btn btn-primary" onClick={() => router.push('/listings')}>
              Browse Listings
            </button>
          </div>
        )}

        {!loading && listings.length > 0 && (
          <div className="listings-grid">
            {listings.map(l => (
              <PropertyCard key={l.listing_id} listing={l} />
            ))}
          </div>
        )}
      </main>
    </>
  );
}
