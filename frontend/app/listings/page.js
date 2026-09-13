'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/providers';
import Navbar from '@/components/Navbar';
import PropertyCard from '@/components/PropertyCard';
import { fetchListingsPage } from '@/lib/api';

const LOCALITIES = [
  '', 'madhapur', 'gachibowli', 'kondapur', 'kukatpally', 'banjara hills',
  'jubilee hills', 'manikonda', 'miyapur', 'nallagandla', 'kompally',
  'hitech city', 'ameerpet', 'begumpet',
];
const BEDROOMS    = ['', '1', '2', '3', '4', '5'];
const FURNISHING  = ['', 'fully-furnished', 'semi-furnished', 'unfurnished'];

const LIMIT = 50;

export default function ListingsPage() {
  const { user } = useAuth();
  const router   = useRouter();

  // Filters (UI state)
  const [locality,   setLocality]   = useState('');
  const [bedroom,    setBedroom]    = useState('');
  const [furnishing, setFurnishing] = useState('');
  const [priceMin,   setPriceMin]   = useState('');
  const [priceMax,   setPriceMax]   = useState('');
  const [searchText, setSearchText] = useState('');

  // Data state
  const [listings, setListings] = useState([]);
  const [offset,   setOffset]   = useState(0);
  const [hasMore,  setHasMore]  = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [total,    setTotal]    = useState(null);

  const sentinelRef = useRef(null);
  const filtersRef  = useRef({ locality, bedroom, furnishing });

  // Redirect if not logged in
  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  // Defensive client-side filter
  const applyClientFilter = useCallback((data) => {
    let out = data;
    if (bedroom)    out = out.filter(l => String(l.bedroom) === bedroom);
    if (furnishing) out = out.filter(l => l.furnishing === furnishing);
    if (locality)   out = out.filter(l => l.locality?.toLowerCase() === locality.toLowerCase());
    if (priceMin)   out = out.filter(l => l.price >= Number(priceMin));
    if (priceMax)   out = out.filter(l => l.price <= Number(priceMax));
    if (searchText) {
      const q = searchText.toLowerCase();
      out = out.filter(l =>
        l.apartment_name?.toLowerCase().includes(q) ||
        l.locality?.toLowerCase().includes(q) ||
        l.listing_id?.toLowerCase().includes(q)
      );
    }
    return out;
  }, [bedroom, furnishing, locality, priceMin, priceMax, searchText]);

  // Fetch a page
  const fetchPage = useCallback(async (off, reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await fetchListingsPage({ offset: off, limit: LIMIT, locality, bedroom, furnishing });
      const results = data.results || data.data || [];
      const filtered = applyClientFilter(results);

      if (reset) {
        setListings(filtered);
        setTotal(data.total || null);
      } else {
        setListings(prev => [...prev, ...filtered]);
      }

      setHasMore(results.length === LIMIT);
      setOffset(off + LIMIT);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, locality, bedroom, furnishing, applyClientFilter]);

  // Initial / filter-change load
  useEffect(() => {
    setListings([]);
    setOffset(0);
    setHasMore(true);
    fetchPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locality, bedroom, furnishing, priceMin, priceMax, searchText]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loading) fetchPage(offset); },
      { rootMargin: '200px' }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, loading, offset, fetchPage]);

  function resetFilters() {
    setLocality(''); setBedroom(''); setFurnishing('');
    setPriceMin(''); setPriceMax(''); setSearchText('');
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <div className="listings-layout">
        {/* ── Sidebar ── */}
        <aside className="filters-sidebar glass-card">
          <h3>Filters</h3>

          {/* Search */}
          <div className="filter-group">
            <label htmlFor="search-input">Search</label>
            <input
              id="search-input"
              className="input"
              placeholder="Apartment, locality…"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
            />
          </div>

          {/* Locality */}
          <div className="filter-group">
            <label htmlFor="locality-select">Locality</label>
            <select
              id="locality-select"
              className="select"
              value={locality}
              onChange={e => setLocality(e.target.value)}
            >
              <option value="">All Localities</option>
              {LOCALITIES.filter(Boolean).map(l => (
                <option key={l} value={l} style={{ textTransform: 'capitalize' }}>{l.charAt(0).toUpperCase()+l.slice(1)}</option>
              ))}
            </select>
          </div>

          {/* Bedrooms */}
          <div className="filter-group">
            <label htmlFor="bedroom-select">Bedrooms</label>
            <select
              id="bedroom-select"
              className="select"
              value={bedroom}
              onChange={e => setBedroom(e.target.value)}
            >
              <option value="">Any</option>
              {BEDROOMS.filter(Boolean).map(b => (
                <option key={b} value={b}>{b} BHK</option>
              ))}
            </select>
          </div>

          {/* Furnishing */}
          <div className="filter-group">
            <label htmlFor="furnishing-select">Furnishing</label>
            <select
              id="furnishing-select"
              className="select"
              value={furnishing}
              onChange={e => setFurnishing(e.target.value)}
            >
              <option value="">Any</option>
              {FURNISHING.filter(Boolean).map(f => (
                <option key={f} value={f} style={{ textTransform: 'capitalize' }}>{f.replace('-', ' ')}</option>
              ))}
            </select>
          </div>

          {/* Price range */}
          <div className="filter-group">
            <label>Price Range (₹)</label>
            <div className="price-range-inputs">
              <input
                id="price-min"
                className="input"
                type="number"
                placeholder="Min"
                value={priceMin}
                onChange={e => setPriceMin(e.target.value)}
                style={{ padding: '10px 12px' }}
              />
              <span>–</span>
              <input
                id="price-max"
                className="input"
                type="number"
                placeholder="Max"
                value={priceMax}
                onChange={e => setPriceMax(e.target.value)}
                style={{ padding: '10px 12px' }}
              />
            </div>
          </div>

          <button
            id="reset-filters-btn"
            className="btn btn-ghost w-full"
            onClick={resetFilters}
            style={{ justifyContent: 'center' }}
          >
            Reset Filters
          </button>
        </aside>

        {/* ── Grid ── */}
        <section>
          {/* Header */}
          <div className="listings-header">
            <p className="listings-count">
              Showing <strong>{listings.length}</strong>
              {total ? ` of ${total.toLocaleString()}` : ''} listings
            </p>
          </div>

          {/* Cards */}
          {listings.length === 0 && !loading && (
            <div className="empty-state" style={{ gridColumn: '1/-1' }}>
              <span style={{ fontSize: 48 }}>🏚️</span>
              <h3>No listings found</h3>
              <p>Try adjusting your filters.</p>
              <button className="btn btn-ghost" onClick={resetFilters}>Clear Filters</button>
            </div>
          )}

          <div className="listings-grid">
            {listings.map(l => (
              <PropertyCard key={l.listing_id} listing={l} />
            ))}

            {/* Skeleton cards while loading */}
            {loading && Array.from({ length: 6 }).map((_, i) => (
              <div key={`sk-${i}`} className="property-card" style={{ overflow: 'hidden' }}>
                <div className="skeleton" style={{ height: 190 }} />
                <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div className="skeleton" style={{ height: 26, width: '60%' }} />
                  <div className="skeleton" style={{ height: 16, width: '80%' }} />
                  <div className="skeleton" style={{ height: 14, width: '50%' }} />
                </div>
              </div>
            ))}
          </div>

          {/* Infinite scroll sentinel */}
          <div ref={sentinelRef} className="sentinel" />

          {!hasMore && listings.length > 0 && (
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: '24px', fontSize: 13 }}>
              ✓ All {listings.length} listings loaded
            </p>
          )}
        </section>
      </div>
    </>
  );
}
