'use client';
import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { getStoredUser, clearAuth, fetchFavourites, addFavourite, removeFavourite } from '@/lib/api';

const AuthContext    = createContext(null);
const FavContext     = createContext(null);

export function AppProviders({ children }) {
  const [user, setUser]         = useState(null);
  const [hydrated, setHydrated] = useState(false);
  const [favIds, setFavIds]     = useState(new Set());
  const timerRef = useRef(null);

  // Hydrate session from localStorage
  useEffect(() => {
    const stored = getStoredUser();
    setUser(stored || null);
    setHydrated(true);
  }, []);

  // Load favourites when user is known
  useEffect(() => {
    if (!user) { setFavIds(new Set()); return; }
    fetchFavourites()
      .then(data => {
        const ids = (data.data || data || []).map(f => f.listing_id || f.id);
        setFavIds(new Set(ids));
      })
      .catch(() => {});
  }, [user]);

  const login = useCallback((userData) => setUser(userData), []);

  const logout = useCallback(() => {
    clearAuth();
    setUser(null);
    setFavIds(new Set());
    window.location.href = '/login';
  }, []);

  const toggleFav = useCallback(async (listing_id) => {
    const isFav = favIds.has(listing_id);
    // Optimistic update
    setFavIds(prev => {
      const next = new Set(prev);
      if (isFav) next.delete(listing_id);
      else        next.add(listing_id);
      return next;
    });
    try {
      if (isFav) await removeFavourite(listing_id);
      else       await addFavourite(listing_id);
    } catch {
      // revert
      setFavIds(prev => {
        const next = new Set(prev);
        if (isFav) next.add(listing_id);
        else       next.delete(listing_id);
        return next;
      });
    }
  }, [favIds]);

  if (!hydrated) return null; // prevent flash

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <FavContext.Provider value={{ favIds, toggleFav }}>
        {children}
      </FavContext.Provider>
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
export const useFav  = () => useContext(FavContext);
