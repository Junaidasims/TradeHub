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
    <div className="card-neo bg-white overflow-hidden animate-pulse">
      <div className="h-48 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-1/3" />
        <div className="h-4 bg-gray-200 rounded w-2/3" />
        <div className="h-5 bg-gray-200 rounded w-1/4" />
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">

          {/* Filters Sidebar */}
          <aside className="w-full lg:w-72 shrink-0">
            <div className="card-neo bg-white p-6 sticky top-24 space-y-6">
              <div className="flex items-center gap-2 mb-2">
                <Sliders size={18} className="text-accent-teal" />
                <h2 className="text-xl font-black uppercase italic">Filters</h2>
              </div>

              {/* Search */}
              <div>
                <label className="block text-[10px] font-black uppercase mb-1 text-gray-500">Search</label>
                <div className="relative">
                  <input type="text" value={filters.search} onChange={(e) => setFilters({...filters, search: e.target.value})}
                    placeholder="Keywords..." className="input-neo w-full px-3 py-2 text-sm pr-8" />
                  <Search size={14} className="absolute right-3 top-2.5 text-gray-400" />
                </div>
              </div>

              {/* Category */}
              <div>
                <label className="block text-[10px] font-black uppercase mb-1 text-gray-500">Category</label>
                <select value={filters.category} onChange={(e) => setFilters({...filters, category: e.target.value})}
                  className="input-neo w-full px-3 py-2 text-sm bg-white">
                  <option value="">All</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-[10px] font-black uppercase mb-1 text-gray-500">Type</label>
                <div className="flex gap-2">
                  {TYPES.map(t => (
                    <button key={t} onClick={() => setFilters({...filters, type: filters.type === t ? '' : t})}
                      className={`flex-1 py-1.5 text-[9px] font-black border-2 border-black uppercase transition-all
                        ${filters.type === t ? 'bg-accent-teal text-white shadow-none' : 'bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              {/* Condition */}
              <div>
                <label className="block text-[10px] font-black uppercase mb-1 text-gray-500">Condition</label>
                <select value={filters.condition} onChange={(e) => setFilters({...filters, condition: e.target.value})}
                  className="input-neo w-full px-3 py-2 text-sm bg-white">
                  <option value="">All</option>
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Price Range */}
              <div className="flex gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase mb-1 text-gray-500">Min ₹</label>
                  <input type="number" value={filters.minPrice} onChange={(e) => setFilters({...filters, minPrice: e.target.value})}
                    className="input-neo w-full px-3 py-2 text-sm" placeholder="0" />
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-black uppercase mb-1 text-gray-500">Max ₹</label>
                  <input type="number" value={filters.maxPrice} onChange={(e) => setFilters({...filters, maxPrice: e.target.value})}
                    className="input-neo w-full px-3 py-2 text-sm" placeholder="∞" />
                </div>
              </div>

              {/* Sort */}
              <div>
                <label className="block text-[10px] font-black uppercase mb-1 text-gray-500">Sort By</label>
                <select value={filters.sort} onChange={(e) => setFilters({...filters, sort: e.target.value})}
                  className="input-neo w-full px-3 py-2 text-sm bg-white">
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
              <h1 className="text-3xl font-black uppercase italic tracking-tighter">
                {loading ? 'Loading...' : `${listings.length} Results`}
              </h1>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {[1,2,3,4,5,6].map(i => <Skeleton key={i} />)}
              </div>
            ) : listings.length === 0 ? (
              <div className="card-neo bg-white p-16 text-center">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-2xl font-black uppercase italic mb-2">No listings found</h3>
                <p className="text-gray-500 font-bold text-sm mb-6">Try adjusting your filters or be the first to post!</p>
                <Link href="/create" className="btn-neo bg-accent-teal text-white px-6 py-3 uppercase font-black">Post an Item</Link>
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
