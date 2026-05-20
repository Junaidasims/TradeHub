"use client";

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import ListingCard from '@/components/ListingCard';
import { Search, Sliders, Star } from 'lucide-react';

const CATEGORIES = ['Electronics', 'Books', 'Furniture', 'Clothing', 'Sports', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];
const TYPES = ['sell', 'rent', 'trade'];

export default function ListingsPage() {
  const searchParams = useSearchParams();
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    category: searchParams.get('category') || '',
    type: searchParams.get('type') || '',
    condition: '',
    minPrice: '',
    maxPrice: '',
    sort: 'newest',
    search: searchParams.get('search') || ''
  });
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  const fetchListings = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
      const res = await api.get(`/listings?${params.toString()}`);
      setListings(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchListings(); }, [filters]);

  // Listen for real-time listing status updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handleUpdate = (data) => {
      setListings(prev => prev.map(l => l._id === data.listingId ? { ...l, status: data.status } : l));
    };
    socket.on('listing_updated', handleUpdate);
    return () => socket.off('listing_updated', handleUpdate);
  }, []);

  const Skeleton = () => (
    <div className="card-neo bg-white dark:bg-darkCard border-gray-100 dark:border-darkBorder overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-200 dark:bg-slate-700 rounded-xl mb-4" />
      <div className="space-y-3">
        <div className="h-3 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
        <div className="h-4 bg-gray-200 dark:bg-slate-700 rounded w-2/3" />
        <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/4 mt-4" />
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-cream dark:bg-darkBg transition-colors duration-200">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Filters Sidebar */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="card-neo bg-white dark:bg-darkCard border-gray-100 dark:border-darkBorder p-6 sticky top-24 space-y-6 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <Sliders size={18} className="text-accent-teal dark:text-accent-teal" />
                <h2 className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Filters</h2>
              </div>

              {/* Search */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-gray-500 dark:text-gray-400">Search</label>
                <div className="relative">
                  <input type="text" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})}
                    placeholder="Keywords..." className="input-neo w-full pl-9 py-2 text-sm" />
                  <Search size={14} className="absolute left-3 top-3 text-gray-400 dark:text-gray-500" />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-gray-500 dark:text-gray-400">Category</label>
                <select value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})}
                  className="input-neo w-full px-3 py-2 text-sm bg-white dark:bg-slate-800">
                  <option value="">All Categories</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-gray-500 dark:text-gray-400">Type</label>
                <div className="flex gap-2 bg-gray-50 dark:bg-slate-800/50 p-1 rounded-xl">
                  {TYPES.map(t => (
                    <button key={t} onClick={() => setFilters({...filters, type: filters.type === t ? '' : t})}
                      className={`flex-1 py-1.5 text-[11px] font-semibold rounded-lg capitalize transition-all
                        ${filters.type === t ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-gray-500 dark:text-gray-400">Condition</label>
                <select value={filters.condition} onChange={(e) => setFilters({...filters, condition: e.target.value})}
                  className="input-neo w-full px-3 py-2 text-sm bg-white dark:bg-slate-800">
                  <option value="">Any Condition</option>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Price Range */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-gray-500 dark:text-gray-400">Min ₹</label>
                  <input type="number" value={filters.minPrice} onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                    className="input-neo w-full px-3 py-2 text-sm" placeholder="0" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-gray-500 dark:text-gray-400">Max ₹</label>
                  <input type="number" value={filters.maxPrice} onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                    className="input-neo w-full px-3 py-2 text-sm" placeholder="Any" />
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider mb-1.5 text-gray-500 dark:text-gray-400">Sort By</label>
                <select value={filters.sort} onChange={(e) => setFilters({...filters, sort: e.target.value})}
                  className="input-neo w-full px-3 py-2 text-sm bg-white dark:bg-slate-800">
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="popular">Most Popular</option>
                </select>
              </div>
            </div>
          </aside>

          {/* Results Grid */}
          <div className="flex-1">
            <div className="flex justify-between items-center mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
                {loading ? 'Searching...' : `${listings.length} Results Found`}
              </h1>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} />)}
              </div>
            ) : listings.length === 0 ? (
              <div className="card-neo bg-white dark:bg-darkCard p-16 text-center shadow-sm">
                <div className="text-5xl mb-4">🔍</div>
                <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">No listings found</h3>
                <p className="text-gray-500 dark:text-gray-400 font-medium text-sm mb-6">Try adjusting your filters or be the first to post!</p>
                <Link href="/create" className="btn-neo-primary px-6 py-2">Post an Item</Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {listings.map(item => (
                  <ListingCard 
                    key={item._id}
                    id={item._id}
                    title={item.title}
                    price={item.price}
                    rentPrice={item.rentPrice}
                    category={item.category}
                    type={item.type}
                    condition={item.condition}
                    image={item.images?.[0]}
                    status={item.status}
                    rentedUntil={item.rentedUntil}
                    views={item.views}
                    seller={item.seller}
                    itemLocation={item.location}
                    userLocation={userLocation}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
