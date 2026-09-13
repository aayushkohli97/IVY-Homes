'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/lib/providers';

const NAV_ITEMS = [
  { href: '/listings',  label: 'Buy',       icon: '🏠' },
  { href: '/rentals',   label: 'Rent',       icon: '🔑' },
  { href: '/projects',  label: 'Projects',   icon: '🏗️' },
  { href: '/favourites',label: 'Saved',      icon: '❤️' },
  { href: '/insights',  label: 'Insights',   icon: '📊' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router   = useRouter();

  if (!user) return null;

  return (
    <nav className="navbar">
      <div className="navbar__inner">
        {/* Logo */}
        <Link href="/listings" className="navbar__logo">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <path d="M14 3L26 12V25H18V18H10V25H2V12L14 3Z" stroke="url(#g)" strokeWidth="1.8" fill="none" strokeLinejoin="round"/>
            <defs>
              <linearGradient id="g" x1="0" y1="0" x2="28" y2="28" gradientUnits="userSpaceOnUse">
                <stop stopColor="#00d4ff"/>
                <stop offset="1" stopColor="#8b5cf6"/>
              </linearGradient>
            </defs>
          </svg>
          Ivy Homes
        </Link>

        {/* Nav links */}
        <div className="navbar__nav">
          {NAV_ITEMS.map(item => (
            <Link
              key={item.href}
              href={item.href}
              className={`nav-link${pathname.startsWith(item.href) ? ' active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </div>

        {/* Actions */}
        <div className="navbar__actions">
          <div className="user-chip">
            <span style={{ fontSize: 16 }}>👤</span>
            <span>{user.email || user.name || 'User'}</span>
          </div>
          <button className="btn btn-ghost" onClick={logout} style={{ fontSize: 13, padding: '8px 14px' }}>
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
