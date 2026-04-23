"use client";

import { useEffect, useState } from 'react';
import Navbar from "@/components/Navbar";
import Link from 'next/link';
import api from '@/lib/api';
import ListingCard from '@/components/ListingCard';
import { ArrowRight, Package, MessageSquare, Repeat, TrendingUp, Users, ShoppingBag } from 'lucide-react';

const CATEGORIES = [
  { name: 'Electronics', icon: '💻', color: 'bg-blue-100' },
  { name: 'Books', icon: '📚', color: 'bg-green-100' },
  { name: 'Furniture', icon: '🪑', color: 'bg-yellow-100' },
  { name: 'Clothing', icon: '👕', color: 'bg-pink-100' },
  { name: 'Sports', icon: '⚽', color: 'bg-orange-100' },
  { name: 'Other', icon: '📦', color: 'bg-purple-100' },
];

export default function HomePage() {
  const [featured, setFeatured] = useState([]);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await api.get('/listings?sort=newest');
        setFeatured(res.data.slice(0, 8));
      } catch (err) { console.error(err); }
    };
    fetchFeatured();
  }, []);

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />

      {/* Hero */}
      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none mb-6">
          Campus<br />
          <span className="text-accent-teal">Marketplace</span>
        </h1>
        <p className="text-lg font-bold text-gray-600 max-w-xl mx-auto mb-10">
          Buy, sell, rent, and trade with fellow students. Fast, safe, and local.
        </p>
        <div className="flex gap-4 justify-center flex-wrap">
          <Link href="/listings" className="btn-neo bg-black text-white px-8 py-4 text-lg uppercase font-black flex items-center gap-2">
            Browse Items <ArrowRight size={20} />
          </Link>
          <Link href="/create" className="btn-neo bg-accent-teal text-white px-8 py-4 text-lg uppercase font-black flex items-center gap-2">
            Post Item <Package size={20} />
          </Link>
        </div>
      </section>

      {/* How It Works */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-black uppercase italic tracking-tighter text-center mb-12">How It Works</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          {[
            { icon: <ShoppingBag size={32} />, title: 'List', desc: 'Post your item with photos and details' },
            { icon: <MessageSquare size={32} />, title: 'Connect', desc: 'Chat with buyers and negotiate in real-time' },
            { icon: <Repeat size={32} />, title: 'Exchange', desc: 'Complete the trade safely on campus' },
          ].map((step, i) => (
            <div key={i} className="card-neo bg-white p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-accent-teal text-white border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center">
                {step.icon}
              </div>
              <h3 className="text-xl font-black uppercase italic mb-2">{step.title}</h3>
              <p className="text-sm font-bold text-gray-500">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categories */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-4xl font-black uppercase italic tracking-tighter text-center mb-12">Categories</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 max-w-5xl mx-auto">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat.name}
              href={`/listings?category=${cat.name}`}
              className="card-neo bg-white p-6 text-center hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-none transition-all"
            >
              <div className="text-4xl mb-2">{cat.icon}</div>
              <p className="font-black uppercase text-xs">{cat.name}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Listings */}
      {featured.length > 0 && (
        <section className="container mx-auto px-4 py-16">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter flex items-center gap-3">
              <TrendingUp size={32} className="text-accent-teal" /> Latest Listings
            </h2>
            <Link href="/listings" className="btn-neo bg-black text-white px-4 py-2 text-xs uppercase font-black">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {featured.map((item) => (
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
        </section>
      )}

      {/* Stats */}
      <section className="container mx-auto px-4 py-16">
        <div className="card-neo bg-black text-white p-12 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          <div>
            <div className="text-5xl font-black text-accent-teal">500+</div>
            <div className="text-sm font-bold uppercase mt-2 opacity-60">Students Trading</div>
          </div>
          <div>
            <div className="text-5xl font-black text-accent-teal">1000+</div>
            <div className="text-sm font-bold uppercase mt-2 opacity-60">Items Listed</div>
          </div>
          <div>
            <div className="text-5xl font-black text-accent-teal">300+</div>
            <div className="text-sm font-bold uppercase mt-2 opacity-60">Trades Completed</div>
          </div>
        </div>
      </section>
    </main>
  );
}
