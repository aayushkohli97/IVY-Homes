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
  const [priceError, setPriceError] = useState('');
  const [searchText, setSearchText] = useState('');
  
  const loadingRef = useRef(false);

  const handlePriceMinChange = (val) => {
    if (val !== '' && Number(val) < 0) {
      setPriceError('Enter valid number');
    } else if (priceMax !== '' && Number(priceMax) < 0) {
      setPriceError('Enter valid number');
    } else {
      setPriceError('');
    }
    setPriceMin(val);
  };

  const handlePriceMaxChange = (val) => {
    if (val !== '' && Number(val) < 0) {
      setPriceError('Enter valid number');
    } else if (priceMin !== '' && Number(priceMin) < 0) {
      setPriceError('Enter valid number');
    } else {
      setPriceError('');
    }
    setPriceMax(val);
  };

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
    // Unconditionally filter out corrupted listings (negative or zero price)
    let out = data.filter(l => l.price > 0);
    
    if (bedroom)    out = out.filter(l => String(l.bedroom) === bedroom);
    if (furnishing) out = out.filter(l => l.furnishing === furnishing);
    if (locality)   out = out.filter(l => l.locality?.toLowerCase() === locality.toLowerCase());
    if (priceMin && Number(priceMin) >= 0)   out = out.filter(l => l.price >= Number(priceMin));
    if (priceMax && Number(priceMax) >= 0)   out = out.filter(l => l.price <= Number(priceMax));
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
    if (loadingRef.current) return;
    loadingRef.current = true;
    setLoading(true);
    
    let currentOffset = off;
    let accumulated = [];
    let serverHasMore = true;
    let currentTotal = null;

    try {
      // Fetch up to 4 pages at once if client-side filter is stripping everything out
      let loops = 0;
      while (loops < 4 && serverHasMore) {
        const data = await fetchListingsPage({ offset: currentOffset, limit: LIMIT, locality, bedroom, furnishing });
        const results = data.results || data.data || [];
        const filtered = applyClientFilter(results);

        accumulated = [...accumulated, ...filtered];
        serverHasMore = results.length === LIMIT;
        currentOffset += LIMIT;
        currentTotal = data.total || null;
        loops++;
        
        if (accumulated.length > 0) break;
      }

      if (reset) {
        setListings(accumulated);
        setTotal(currentTotal);
      } else {
        setListings(prev => [...prev, ...accumulated]);
      }

      setHasMore(serverHasMore);
      setOffset(currentOffset);
    } catch {
      setHasMore(false);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [locality, bedroom, furnishing, applyClientFilter]);

  // Handle explicit search button click
  const handleSearch = () => {
    setListings([]);
    setOffset(0);
    setHasMore(true);
    fetchPage(0, true);
  };

  // Initial load ONLY on mount
  useEffect(() => {
    handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Intersection observer for infinite scroll
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting && hasMore && !loadingRef.current) fetchPage(offset); },
      { rootMargin: '200px' }
    );
    obs.observe(sentinel);
    return () => obs.disconnect();
  }, [hasMore, offset, fetchPage]);

  function resetFilters() {
    setLocality(''); setBedroom(''); setFurnishing('');
    setPriceMin(''); setPriceMax(''); setSearchText(''); setPriceError('');
  }

  if (!user) return null;

  return (
    <>
      <Navbar />
      <div className="listings-layout">
        {/* ── Sidebar ── */}
        <aside className="filters-sidebar glass-card">
          <h3>Filters</h3>

          {/* Search Text */}
          <div className="filter-group">
            <label htmlFor="search-input">Text Search</label>
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
            {priceError && (
              <div
                className="price-alert"
                style={{
                  color: '#ff4d4d',
                  backgroundColor: 'rgba(255, 77, 77, 0.1)',
                  border: '1px solid rgba(255, 77, 77, 0.3)',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 600,
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                ⚠️ {priceError}
              </div>
            )}
            <div className="price-range-inputs">
              <input
                id="price-min"
                className="input"
                type="number"
                min="0"
                placeholder="Min"
                value={priceMin}
                onChange={e => handlePriceMinChange(e.target.value)}
                style={{ padding: '10px 12px' }}
              />
              <span>–</span>
              <input
                id="price-max"
                className="input"
                type="number"
                min="0"
                placeholder="Max"
                value={priceMax}
                onChange={e => handlePriceMaxChange(e.target.value)}
                style={{ padding: '10px 12px' }}
              />
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 8 }}>
            <button
              className="btn btn-primary w-full"
              onClick={handleSearch}
              disabled={!!priceError || loading}
              style={{ justifyContent: 'center', fontSize: 16, padding: '12px', opacity: priceError ? 0.5 : 1, cursor: priceError ? 'not-allowed' : 'pointer' }}
            >
              🔍 Search
            </button>
            <button
              id="reset-filters-btn"
              className="btn btn-ghost w-full"
              onClick={resetFilters}
              style={{ justifyContent: 'center' }}
            >
              Reset Filters
            </button>
          </div>
        </aside>

        {/* ── Grid ── */}
        <section style={{ position: 'relative' }}>
          {/* Header */}
          <div className="listings-header">
            <p className="listings-count">
              Showing <strong>{listings.length}</strong>
              {total ? ` of ${total.toLocaleString()}` : ''} listings
            </p>
          </div>

          {/* Main Loader for new searches */}
          {loading && listings.length === 0 && (
            <div style={{ padding: '60px 0', display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" style={{ width: 48, height: 48, borderWidth: 4 }}></div>
            </div>
          )}

          {/* Cards */}
          {listings.length === 0 && !loading && !hasMore && (
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
          </div>

          {/* Small loader at bottom for infinite scroll
          {loading && listings.length > 0 && (
            <div style={{ padding: '24px', display: 'flex', justifyContent: 'center' }}>
              <div className="spinner" style={{ width: 24, height: 24, borderWidth: 3 }}></div>
            </div>
          )} */}

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
