'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useFav } from '@/lib/providers';
import Navbar from '@/components/Navbar';
import { fetchRentalsPage, formatPrice } from '@/lib/api';

const LIMIT = 50;

function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill={filled ? 'currentColor' : 'none'}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

function RentalCard({ r }) {
  const { favIds, toggleFav } = useFav();
  const router = useRouter();
  
  const isFav = favIds.has(r.listing_id);

  function handleFav(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleFav(r);
  }

  return (
    <article 
      className="glass-card rental-card animate-in" 
      style={{ padding: 20, position: 'relative' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div className="rental-card__rent">
            <span style={{
              fontFamily: 'Outfit',
              fontSize: 24, fontWeight: 700,
              background: 'linear-gradient(90deg,#00d4ff,#8b5cf6)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text'
            }}>
              ₹{r.price.toLocaleString('en-IN')}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 400 }}>/month</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, marginTop: 4 }}>{r.apartment_name}</div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 2, textTransform: 'capitalize' }}>
            📍 {r.locality}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span className={`badge ${r.is_live ? 'badge-cyan' : 'badge-red'}`}>
            {r.is_live ? 'Live' : 'Offline'}
          </span>
          <button onClick={handleFav} className="btn btn-ghost" style={{ padding: 8, color: isFav ? '#ec4899' : 'var(--text-secondary)' }}>
            <HeartIcon filled={isFav} />
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 14, fontSize: 13, color: 'var(--text-secondary)' }}>
        <span>🛏 {r.bedroom} BHK</span>
        <span>🚿 {r.bathroom} Bath</span>
        {r.carpet_area && <span>📐 {r.carpet_area.toLocaleString()} sqft</span>}
        <span>🪑 {r.furnishing?.replace(/-/g,' ')}</span>
      </div>

      <div style={{ display: 'flex', gap: 20, marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--glass-border)', fontSize: 12 }}>
        <span style={{ color: 'var(--text-muted)' }}>
          Deposit: <strong style={{ color: 'var(--text-secondary)' }}>₹{r.deposit?.toLocaleString('en-IN') || '—'}</strong>
        </span>
        {r.maintenance && (
          <span style={{ color: 'var(--text-muted)' }}>
            Maintenance: <strong style={{ color: 'var(--text-secondary)' }}>₹{r.maintenance.toLocaleString('en-IN')}/mo</strong>
          </span>
        )}
        <span style={{ color: 'var(--text-muted)', marginLeft: 'auto', textTransform: 'capitalize' }}>
          by {r.posted_by}
        </span>
      </div>

      {r.listing_url && (
        <a
          href={r.listing_url}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost"
          style={{ marginTop: 12, fontSize: 12, padding: '7px 12px' }}
        >
          View on {r.website} ↗
        </a>
      )}
    </article>
  );
}

export default function RentalsPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [rentals, setRentals] = useState([]);
  const [offset,  setOffset]  = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [bedroomFilter, setBedroom] = useState('');
  const [localityFilter, setLocality] = useState('');

  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  const fetchPage = useCallback(async (off, reset = false) => {
    if (loading) return;
    setLoading(true);
    
    let currentOffset = off;
    let accumulated = [];
    let serverHasMore = true;

    try {
      let loops = 0;
      while (loops < 4 && serverHasMore) {
        const data = await fetchRentalsPage({ offset: currentOffset, limit: LIMIT });
        let results = data.results || data.data || [];

        // Defensive client-side filter
        if (bedroomFilter)  results = results.filter(r => String(r.bedroom) === bedroomFilter);
        if (localityFilter) results = results.filter(r => r.locality?.toLowerCase() === localityFilter.toLowerCase());

        accumulated = [...accumulated, ...results];
        serverHasMore = (data.results || data.data || []).length === LIMIT;
        currentOffset += LIMIT;
        loops++;
        
        if (accumulated.length > 0) break;
      }

      if (reset) setRentals(accumulated);
      else       setRentals(prev => {
        const existing = new Set(prev.map(r => r.listing_id));
        return [...prev, ...accumulated.filter(r => !existing.has(r.listing_id))];
      });

      setHasMore(serverHasMore);
      setOffset(currentOffset);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, bedroomFilter, localityFilter]);

  useEffect(() => {
    setRentals([]);
    setOffset(0);
    setHasMore(true);
    fetchPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bedroomFilter, localityFilter]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting && hasMore && !loading) fetchPage(offset); },
      { rootMargin: '200px' }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, loading, offset, fetchPage]);

  if (!user) return null;

  return (
    <>
      <Navbar />
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>
            🔑 <span className="gradient-text">Rental Listings</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {rentals.length} rentals loaded · Hyderabad
          </p>
        </div>

        {/* Quick filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <select
            id="rental-bedroom-select"
            className="select"
            style={{ width: 160 }}
            value={bedroomFilter}
            onChange={e => setBedroom(e.target.value)}
          >
            <option value="">Any BHK</option>
            {['1','2','3','4','5'].map(b => <option key={b} value={b}>{b} BHK</option>)}
          </select>
          <select
            id="rental-locality-select"
            className="select"
            style={{ width: 200 }}
            value={localityFilter}
            onChange={e => setLocality(e.target.value)}
          >
            <option value="">All Localities</option>
            {['madhapur','gachibowli','kondapur','kukatpally','banjara hills','jubilee hills','manikonda','miyapur','nallagandla','kompally'].map(l => (
              <option key={l} value={l}>{l.charAt(0).toUpperCase()+l.slice(1)}</option>
            ))}
          </select>
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))', gap: 18 }}>
          {rentals.map(r => <RentalCard key={r.listing_id} r={r} />)}
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={`sk-${i}`} className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="skeleton" style={{ height: 28, width: '50%' }} />
              <div className="skeleton" style={{ height: 18, width: '70%' }} />
              <div className="skeleton" style={{ height: 14, width: '60%' }} />
            </div>
          ))}
        </div>

        <div ref={sentinelRef} className="sentinel" />
        {!hasMore && rentals.length > 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: 13 }}>
            ✓ All {rentals.length} rentals loaded
          </p>
        )}
      </main>
    </>
  );
}
