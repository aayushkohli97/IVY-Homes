'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/providers';
import Navbar from '@/components/Navbar';
import { fetchProjectsPage, normaliseProjectPrice, formatPrice } from '@/lib/api';

const LIMIT = 50;

const STATUS_BADGE = {
  'ready to move':     'badge-green',
  'under construction':'badge-yellow',
  'new launch':        'badge-purple',
};

function ProjectCard({ p }) {
  // Convert prices from Crores/Lakhs to rupees (defensive normalisation)
  const priceMin = normaliseProjectPrice(p.price_min);
  const priceMax = normaliseProjectPrice(p.price_max);
  const priceLabel = priceMin > 0
    ? `${formatPrice(priceMin)} – ${formatPrice(priceMax)}`
    : '—';

  return (
    <article className="glass-card project-card animate-in">
      {/* Status badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <span className={`badge ${STATUS_BADGE[p.project_status] || 'badge-cyan'}`} style={{ textTransform: 'capitalize' }}>
          {p.project_status}
        </span>
        {p.rera_number && (
          <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'monospace' }}>
            RERA: {p.rera_number.split('/').pop()}
          </span>
        )}
      </div>

      <div className="project-card__name">{p.apartment_name}</div>
      <div className="project-card__dev">by {p.developer_name} · <span style={{ textTransform: 'capitalize' }}>{p.locality}</span></div>

      <div className="project-card__price gradient-text">{priceLabel}</div>

      {/* Stats row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 14, fontSize: 12, color: 'var(--text-secondary)' }}>
        {p.total_units  && <span>🏗️ {p.total_units.toLocaleString()} units</span>}
        {p.total_towers && <span>🏢 {p.total_towers} towers</span>}
        {p.total_floors && <span>⬆️ {p.total_floors} floors</span>}
        {p.min_area_sqft && <span>📐 {p.min_area_sqft}–{p.max_area_sqft} sqft</span>}
      </div>

      {/* Dates */}
      <div style={{ display: 'flex', gap: 20, fontSize: 12, color: 'var(--text-muted)', marginBottom: 14 }}>
        {p.launch_date     && <span>Launch: {new Date(p.launch_date).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</span>}
        {p.possession_date && <span>Possession: {new Date(p.possession_date).toLocaleDateString('en-IN',{month:'short',year:'numeric'})}</span>}
      </div>

      {/* Amenities */}
      {p.amenities?.length > 0 && (
        <div className="amenities-list">
          {p.amenities.filter(a => !a.startsWith('note') && !a.toLowerCase().startsWith('note for')).slice(0, 6).map(a => (
            <span key={a} className="amenity-tag">{a}</span>
          ))}
          {p.amenities.filter(a => !a.startsWith('note')).length > 6 && (
            <span className="amenity-tag">+{p.amenities.filter(a=>!a.startsWith('note')).length - 6} more</span>
          )}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--glass-border)', fontSize: 12, color: 'var(--text-muted)' }}>
        <span>{p.total_listings} listing{p.total_listings !== 1 ? 's' : ''}</span>
        <span style={{ fontFamily: 'monospace' }}>{p.project_id}</span>
      </div>
    </article>
  );
}

export default function ProjectsPage() {
  const { user } = useAuth();
  const router   = useRouter();

  const [projects, setProjects] = useState([]);
  const [offset,   setOffset]   = useState(0);
  const [hasMore,  setHasMore]  = useState(true);
  const [loading,  setLoading]  = useState(false);
  const [statusFilter, setStatus] = useState('');
  const [localityFilter, setLocality] = useState('');

  const sentinelRef = useRef(null);

  useEffect(() => {
    if (!user) router.replace('/login');
  }, [user, router]);

  const fetchPage = useCallback(async (off, reset = false) => {
    if (loading) return;
    setLoading(true);
    try {
      const data = await fetchProjectsPage({ offset: off, limit: LIMIT });
      let results = data.results || data.data || [];

      // Defensive client-side filter
      if (statusFilter)   results = results.filter(p => p.project_status === statusFilter);
      if (localityFilter) results = results.filter(p => p.locality?.toLowerCase() === localityFilter.toLowerCase());

      if (reset) setProjects(results);
      else       setProjects(prev => [...prev, ...results]);

      setHasMore((data.results || data.data || []).length === LIMIT);
      setOffset(off + LIMIT);
    } catch {
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  }, [loading, statusFilter, localityFilter]);

  useEffect(() => {
    setProjects([]);
    setOffset(0);
    setHasMore(true);
    fetchPage(0, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, localityFilter]);

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
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 32, fontWeight: 800, marginBottom: 6 }}>
            🏗️ <span className="gradient-text">New Projects</span>
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>
            {projects.length} projects loaded · Hyderabad
          </p>
        </div>

        {/* Filters */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          <select
            id="project-status-select"
            className="select"
            style={{ width: 200 }}
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="ready to move">Ready to Move</option>
            <option value="under construction">Under Construction</option>
            <option value="new launch">New Launch</option>
          </select>
          <select
            id="project-locality-select"
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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 20 }}>
          {projects.map(p => <ProjectCard key={p.project_id} p={p} />)}
          {loading && Array.from({ length: 4 }).map((_, i) => (
            <div key={`sk-${i}`} className="glass-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="skeleton" style={{ height: 22, width: '40%' }} />
              <div className="skeleton" style={{ height: 24, width: '70%' }} />
              <div className="skeleton" style={{ height: 18, width: '50%' }} />
              <div className="skeleton" style={{ height: 14, width: '60%' }} />
            </div>
          ))}
        </div>

        <div ref={sentinelRef} className="sentinel" />
        {!hasMore && projects.length > 0 && (
          <p style={{ textAlign: 'center', color: 'var(--text-muted)', padding: 24, fontSize: 13 }}>
            ✓ All {projects.length} projects loaded
          </p>
        )}
      </main>
    </>
  );
}
