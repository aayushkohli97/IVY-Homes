'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/providers';
import { useFav } from '@/lib/providers';
import Navbar from '@/components/Navbar';
import { fetchListing, formatPrice, normaliseSqft } from '@/lib/api';

function StatBox({ label, value }) {
  return (
    <div className="detail-stat">
      <div className="detail-stat__label">{label}</div>
      <div className="detail-stat__value">{value ?? '—'}</div>
    </div>
  );
}

function HeartIcon({ filled }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill={filled ? 'currentColor' : 'none'}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}

export default function ListingDetailPage() {
  const { id }  = useParams();
  const router  = useRouter();
  const { user } = useAuth();
  const { favIds, toggleFav } = useFav();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!user) { router.replace('/login'); return; }
  }, [user, router]);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetchListing(id)
      .then(data => setListing(data.data || data))
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (!user) return null;

  if (loading) return (
    <>
      <Navbar />
      <div className="loading-wrap" style={{ minHeight: '60vh' }}><div className="spinner" /></div>
    </>
  );

  if (error || !listing) return (
    <>
      <Navbar />
      <div className="empty-state">
        <span style={{ fontSize: 48 }}>⚠️</span>
        <h3>Listing not found</h3>
        <p>{error || 'This listing may have been removed.'}</p>
        <button className="btn btn-ghost" onClick={() => router.back()}>← Go Back</button>
      </div>
    </>
  );

  const isFav  = favIds.has(listing.listing_id);
  const area   = normaliseSqft(listing.carpet_area);
  const sbuArea = normaliseSqft(listing.super_built_up_area);
  const price  = formatPrice(listing.price);
  const ppsqft = area > 0 ? Math.round(listing.price / area) : null;

  // Parse IST timestamp (strip Z-absence, treat as IST)
  const posted = listing.posted_at
    ? new Date(listing.posted_at + (listing.posted_at.endsWith('Z') ? '' : '+05:30'))
    : null;

  return (
    <>
      <Navbar />
      <main className="detail-page">

        {/* Back */}
        <button
          id="back-btn"
          className="btn btn-ghost"
          onClick={() => router.back()}
          style={{ marginBottom: 20, fontSize: 13 }}
        >
          ← Back to listings
        </button>

        {/* Hero Image */}
        <div className="detail-hero">
          <div style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.3">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
              <path d="M3 9h18M9 3v18"/>
            </svg>
            <p style={{ marginTop: 8, fontSize: 14 }}>{listing.apartment_name}</p>
          </div>

          {/* Price overlay */}
          <div style={{
            position: 'absolute', bottom: 20, left: 24,
            background: 'rgba(7,13,26,0.8)', backdropFilter: 'blur(12px)',
            borderRadius: 12, padding: '12px 20px',
            border: '1px solid rgba(255,255,255,0.1)',
          }}>
            <div style={{ fontFamily: 'Outfit', fontSize: 32, fontWeight: 800, background: 'linear-gradient(90deg, #00d4ff, #8b5cf6)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {price}
            </div>
            {ppsqft && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>₹{ppsqft.toLocaleString('en-IN')}/sqft</div>}
          </div>

          {/* Top badges */}
          <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: 8 }}>
            {listing.is_verified && <span className="badge badge-green">✓ Verified</span>}
            <span className={`badge ${listing.is_live ? 'badge-cyan' : 'badge-red'}`}>
              {listing.is_live ? '● Live' : '○ Offline'}
            </span>
          </div>
        </div>

        {/* Content grid */}
        <div className="detail-grid">
          {/* Left column */}
          <div>
            {/* Title + actions */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
              <div>
                <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 6 }}>{listing.apartment_name}</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: 15 }}>
                  📍 <span style={{ textTransform: 'capitalize' }}>{listing.locality}</span>
                  {listing.floor && ` · Floor ${listing.floor}/${listing.total_floors}`}
                </p>
              </div>
              <button
                id={`fav-btn-detail-${listing.listing_id}`}
                className={`btn ${isFav ? 'btn-danger' : 'btn-ghost'}`}
                onClick={() => toggleFav(listing.listing_id)}
                style={{ flexShrink: 0, color: isFav ? '#ec4899' : undefined }}
              >
                <HeartIcon filled={isFav} />
                {isFav ? 'Saved' : 'Save'}
              </button>
            </div>

            {/* Quick stats */}
            <div className="detail-section">
              <h2>Property Details</h2>
              <div className="detail-stat-grid">
                <StatBox label="Bedrooms"       value={`${listing.bedroom} BHK`} />
                <StatBox label="Bathrooms"      value={listing.bathroom} />
                <StatBox label="Balconies"      value={listing.balcony} />
                <StatBox label="Parking"        value={listing.covered_parking ? `${listing.covered_parking} covered` : 'None'} />
                <StatBox label="Carpet Area"    value={area > 0 ? `${area.toLocaleString('en-IN')} sqft` : '—'} />
                <StatBox label="Built-up Area"  value={sbuArea > 0 ? `${sbuArea.toLocaleString('en-IN')} sqft` : '—'} />
                <StatBox label="Furnishing"     value={listing.furnishing?.replace(/-/g, ' ')} />
                <StatBox label="Facing"         value={listing.facing_direction} />
                <StatBox label="Property Type"  value={listing.property_type} />
                <StatBox label="Posted"         value={posted ? posted.toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }) : '—'} />
              </div>
            </div>

            {/* Description */}
            {listing.description && (
              <div className="detail-section">
                <h2>Description</h2>
                <p style={{ color: 'var(--text-secondary)', lineHeight: 1.7, fontSize: 14 }}>
                  {listing.description}
                </p>
              </div>
            )}

            {/* IDs */}
            <div className="detail-section">
              <h2>Listing Info</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Listing ID', listing.listing_id],
                  ['Website', listing.website],
                  ['Project ID', listing.project_id],
                  ['City ID', listing.city_id],
                ].map(([k, v]) => v && (
                  <div key={k} style={{ display: 'flex', gap: 12, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: 110 }}>{k}</span>
                    <span style={{ fontFamily: 'monospace', color: 'var(--text-secondary)' }}>{v}</span>
                  </div>
                ))}
                {listing.listing_url && (
                  <a
                    href={listing.listing_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-ghost"
                    style={{ marginTop: 8, width: 'fit-content', fontSize: 13 }}
                  >
                    View on {listing.website} ↗
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Right sidebar */}
          <div>
            {/* Contact card */}
            <div className="glass-card" style={{ padding: 24, marginBottom: 20 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Contact Seller</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ fontSize: 15, fontWeight: 600 }}>{listing.posted_by_name}</div>
                <span className={`badge ${listing.posted_by === 'owner' ? 'badge-green' : 'badge-purple'}`} style={{ width: 'fit-content' }}>
                  {listing.posted_by === 'owner' ? '🏠 Owner' : '🤝 Agent'}
                </span>
                {listing.posted_by_contact && (
                  <a
                    id={`call-btn-${listing.listing_id}`}
                    href={`tel:${listing.posted_by_contact}`}
                    className="btn btn-primary"
                    style={{ justifyContent: 'center' }}
                  >
                    📞 Call {listing.posted_by_contact}
                  </a>
                )}
              </div>
            </div>

            {/* Location */}
            {listing.latitude && listing.longitude && (
              <div className="glass-card" style={{ padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Location</h3>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  <span style={{ textTransform: 'capitalize' }}>{listing.locality}</span>, Hyderabad
                </div>
                <div style={{ display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                  <span>Lat: {listing.latitude}</span>
                  <span>·</span>
                  <span>Lng: {listing.longitude}</span>
                </div>
                <a
                  id={`map-btn-${listing.listing_id}`}
                  href={`https://maps.google.com/?q=${listing.latitude},${listing.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-ghost"
                  style={{ marginTop: 12, fontSize: 13, width: '100%', justifyContent: 'center' }}
                >
                  🗺️ View on Google Maps
                </a>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
