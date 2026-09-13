'use client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useFav } from '@/lib/providers';
import { formatPrice, normaliseSqft } from '@/lib/api';

function BedIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M2 22V12a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v10M2 17h20M6 10V8a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2"/>
    </svg>
  );
}
function BathIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M9 6 C9 4.34 10.34 3 12 3 C13.66 3 15 4.34 15 6 V10 H9 Z"/>
      <rect x="3" y="10" width="18" height="2" rx="1"/>
      <path d="M5 12v5a6 6 0 0 0 12 0v-5"/>
    </svg>
  );
}
function AreaIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M3 9h18M9 3v18"/>
    </svg>
  );
}
function HeartIcon({ filled }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2" fill={filled ? 'currentColor' : 'none'}>
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3" y="3" width="18" height="18" rx="2"/>
      <path d="M9 3v18M3 9h18M3 15h18"/>
    </svg>
  );
}

export default function PropertyCard({ listing }) {
  const { favIds, toggleFav } = useFav();
  const router = useRouter();

  const isFav = favIds.has(listing.listing_id);
  const area  = normaliseSqft(listing.carpet_area || listing.super_built_up_area);
  const price = formatPrice(listing.price);

  function handleFav(e) {
    e.preventDefault();
    e.stopPropagation();
    toggleFav(listing);
  }

  return (
    <article
      className="property-card animate-in"
      onClick={() => router.push(`/listing/${listing.listing_id}`)}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && router.push(`/listing/${listing.listing_id}`)}
      aria-label={`${listing.apartment_name} in ${listing.locality} – ${price}`}
    >
      {/* Image area */}
      <div className="property-card__img-wrap">
        <div className="property-card__img-placeholder">
          <BuildingIcon />
          <span style={{ textTransform: 'capitalize' }}>{listing.property_type}</span>
        </div>

        {/* Fav button */}
        <button
          id={`fav-${listing.listing_id}`}
          className={`property-card__fav-btn${isFav ? ' active' : ''}`}
          onClick={handleFav}
          aria-label={isFav ? 'Remove from saved' : 'Save listing'}
          style={{ color: isFav ? '#ec4899' : 'var(--text-secondary)' }}
        >
          <HeartIcon filled={isFav} />
        </button>

        {/* Verified badge */}
        {listing.is_verified && (
          <span className="property-card__verified">
            <span className="badge badge-green">✓ Verified</span>
          </span>
        )}

        {/* Gradient overlay at bottom */}
        <div style={{
          position: 'absolute', bottom: 0, left: 0, right: 0, height: 60,
          background: 'linear-gradient(to top, rgba(7,13,26,0.7), transparent)',
        }} />
      </div>

      {/* Body */}
      <div className="property-card__body">
        <div className="property-card__price">{price}</div>
        <div className="property-card__title">{listing.apartment_name}</div>
        <div className="property-card__locality">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
          </svg>
          <span style={{ textTransform: 'capitalize' }}>{listing.locality}</span>
          <span style={{ marginLeft: 'auto' }}>
            <span className={`badge ${listing.is_live ? 'badge-cyan' : 'badge-red'}`}>
              {listing.is_live ? 'Live' : 'Offline'}
            </span>
          </span>
        </div>

        {/* Meta row */}
        <div className="property-card__meta">
          <span className="property-card__meta-item">
            <BedIcon /> {listing.bedroom} BHK
          </span>
          <span className="property-card__meta-item">
            <BathIcon /> {listing.bathroom}
          </span>
          {area > 0 && (
            <span className="property-card__meta-item">
              <AreaIcon /> {area.toLocaleString('en-IN')} sqft
            </span>
          )}
          <span className="property-card__meta-item" style={{ marginLeft: 'auto' }}>
            <span style={{
              fontSize: 11,
              padding: '2px 8px',
              background: 'rgba(255,255,255,0.05)',
              borderRadius: 999,
              textTransform: 'capitalize',
            }}>
              {listing.furnishing?.replace('-', ' ') || '—'}
            </span>
          </span>
        </div>
      </div>
    </article>
  );
}
