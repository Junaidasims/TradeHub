"use client";

import { useEffect, useState } from 'react';
import Navbar from "@/components/Navbar";
import Link from 'next/link';
import api from '@/lib/api';
import ListingCard from '@/components/ListingCard';
import { ArrowRight, Package, MessageSquare, Repeat, TrendingUp, ShoppingBag, ShieldCheck, Zap, Users, Sparkles } from 'lucide-react';

const CATEGORIES = [
  { name: 'Electronics', icon: '💻', color: 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
  { name: 'Books', icon: '📚', color: 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
  { name: 'Furniture', icon: '🪑', color: 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400' },
  { name: 'Clothing', icon: '👕', color: 'bg-pink-100 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' },
  { name: 'Sports', icon: '⚽', color: 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
  { name: 'Other', icon: '📦', color: 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
];

export default function HomePage() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        const res = await api.get('/listings?sort=newest');
        setFeatured(res.data.slice(0, 8));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchFeatured();
  }, []);

  return (
    <main className="min-h-screen mesh-gradient transition-colors duration-500 overflow-x-hidden">
      <Navbar />

      {/* Hero Section with Animated Background */}
      <section className="relative pt-24 pb-32 overflow-hidden">
        {/* Decorative Background Elements */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent-teal/10 dark:bg-accent-teal/5 rounded-full blur-[120px] animate-pulse"></div>
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent-cyan/10 dark:bg-accent-cyan/5 rounded-full blur-[120px] animate-pulse delay-700"></div>
        </div>

        <div className="container mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/50 dark:bg-white/5 border border-gray-100 dark:border-white/10 backdrop-blur-md mb-8 animate-fade-in">
             <Sparkles size={14} className="text-accent-teal" />
             <span className="text-[11px] font-bold uppercase tracking-widest text-gray-600 dark:text-gray-400">The Ultimate Campus Marketplace</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-bold tracking-tight leading-[1.1] mb-8 text-gray-900 dark:text-white max-w-5xl mx-auto reveal-up">
            Trade Smarter,<br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-teal via-accent-cyan to-indigo-500 animate-gradient-x">Live Better.</span>
          </h1>
          
          <p className="text-lg md:text-xl font-medium text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed reveal-up [animation-delay:200ms]">
            TradeHub is the premium destination for university students to buy, sell, rent, and trade items safely within the campus community.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-5 justify-center items-center">
            <Link href="/listings" className="group bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-10 py-5 rounded-[2rem] text-lg font-bold flex items-center gap-3 hover:scale-105 active:scale-100 transition-all shadow-2xl shadow-gray-900/20 dark:shadow-white/10">
              Start Browsing <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/create" className="bg-white/80 dark:bg-white/5 backdrop-blur-md text-gray-900 dark:text-white px-10 py-5 rounded-[2rem] text-lg font-bold flex items-center gap-3 border border-gray-100 dark:border-white/10 hover:bg-white dark:hover:bg-white/10 transition-all shadow-sm">
              List Your Item <Package size={20} />
            </Link>
          </div>

        </div>
      </section>

      {/* Categories Grid */}
      <section className="container mx-auto px-4 py-24 border-t border-gray-50 dark:border-white/5">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
          <div className="text-left">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-3">Browse Categories</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Everything you need for campus life, organized.</p>
          </div>
          <Link href="/listings" className="text-accent-teal font-bold hover:underline underline-offset-8">Explore all categories &rarr;</Link>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
          {CATEGORIES.map((cat, index) => (
            <Link
              key={cat.name}
              href={`/listings?category=${cat.name}`}
              className="group bg-white dark:bg-darkCard rounded-[2.5rem] p-8 border border-gray-100 dark:border-darkBorder shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-300 text-center reveal-up"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className={`w-16 h-16 rounded-3xl flex items-center justify-center text-3xl mb-6 mx-auto group-hover:scale-110 transition-transform ${cat.color}`}>
                {cat.icon}
              </div>
              <p className="font-bold text-gray-900 dark:text-white transition-colors">{cat.name}</p>
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1 opacity-0 group-hover:opacity-100 transition-opacity">View All</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Features Showcase */}
      <section className="bg-gray-50/50 dark:bg-slate-900/20 py-32 border-y border-gray-50 dark:border-white/5">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center mb-20">
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">Designed for Campus Life</h2>
            <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed text-lg">We've built TradeHub to be the safest and fastest way for students to exchange value without the hassles of traditional marketplaces.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
            <div className="bg-white dark:bg-darkCard p-10 rounded-[3rem] border border-gray-100 dark:border-darkBorder shadow-sm hover:shadow-xl transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-accent-teal/10 text-accent-teal flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform">
                <ShieldCheck size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Verified Community</h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">Exclusive to students with verified college credentials. Trade with confidence among your peers.</p>
            </div>
            
            <div className="bg-white dark:bg-darkCard p-10 rounded-[3rem] border border-gray-100 dark:border-darkBorder shadow-sm hover:shadow-xl transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-accent-cyan/10 text-accent-cyan flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform">
                <Zap size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">AI-Powered Tools</h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">From auto-filled listings to smart chat replies, our AI handles the heavy lifting so you don't have to.</p>
            </div>
            
            <div className="bg-white dark:bg-darkCard p-10 rounded-[3rem] border border-gray-100 dark:border-darkBorder shadow-sm hover:shadow-xl transition-all group">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center mb-8 group-hover:rotate-12 transition-transform">
                <Users size={28} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Rental Ecosystem</h3>
              <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">Why buy when you can rent? Save money by borrowing items for a fraction of the cost.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Featured/Latest Listings */}
      <section className="container mx-auto px-4 py-32">
        <div className="flex flex-col md:flex-row justify-between items-end gap-6 mb-16">
          <div className="text-left">
            <div className="flex items-center gap-2 mb-2">
               <TrendingUp size={20} className="text-accent-teal" />
               <span className="text-[10px] font-bold uppercase tracking-widest text-accent-teal">New on Campus</span>
            </div>
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white">Explore Latest Drops</h2>
          </div>
          <Link href="/listings" className="bg-white dark:bg-slate-800 text-gray-900 dark:text-white border border-gray-100 dark:border-darkBorder px-6 py-3 rounded-2xl font-bold text-sm shadow-sm hover:shadow-md transition-all">View Full Marketplace</Link>
        </div>
        
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {[1,2,3,4].map(i => <div key={i} className="h-[26rem] bg-white dark:bg-darkCard animate-pulse rounded-[2.5rem] border border-gray-100 dark:border-darkBorder" />)}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
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
        )}
      </section>

      {/* Stats Counter Section */}
      <section className="container mx-auto px-4 py-16 mb-32">
        <div className="bg-gray-900 dark:bg-slate-800 rounded-[3.5rem] p-16 md:p-24 relative overflow-hidden">
          {/* Background Pattern */}
          <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
          
          <div className="relative z-10 grid grid-cols-1 md:grid-cols-3 gap-16 text-center">
            <div className="space-y-4">
              <p className="text-5xl md:text-6xl font-bold text-white tracking-tighter">500+</p>
              <p className="text-accent-teal font-bold uppercase tracking-widest text-xs">Active Students</p>
              <p className="text-gray-400 text-sm font-medium">Building a trusted community daily</p>
            </div>
            <div className="space-y-4">
              <p className="text-5xl md:text-6xl font-bold text-white tracking-tighter">1,200+</p>
              <p className="text-accent-cyan font-bold uppercase tracking-widest text-xs">Items Exchanged</p>
              <p className="text-gray-400 text-sm font-medium">Saving students thousands in costs</p>
            </div>
            <div className="space-y-4">
              <p className="text-5xl md:text-6xl font-bold text-white tracking-tighter">100%</p>
              <p className="text-indigo-400 font-bold uppercase tracking-widest text-xs">Safe & Secure</p>
              <p className="text-gray-400 text-sm font-medium">Verified student accounts and secure deals</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / CTA */}
      <footer className="bg-white dark:bg-darkCard border-t border-gray-50 dark:border-darkBorder pt-20 pb-10">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-10 mb-20">
            <div className="text-center md:text-left">
              <Link href="/" className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-4 block">TradeHub</Link>
              <p className="text-gray-500 dark:text-gray-400 max-w-sm font-medium">The most trusted student marketplace for the modern university experience.</p>
            </div>
            <div className="flex flex-wrap justify-center gap-8 text-sm font-bold text-gray-400 uppercase tracking-widest">
               <Link href="/listings" className="hover:text-accent-teal transition-colors">Marketplace</Link>
               <Link href="/wishlist" className="hover:text-accent-teal transition-colors">Wishlist</Link>
               <Link href="/dashboard" className="hover:text-accent-teal transition-colors">Account</Link>
               <Link href="#" className="hover:text-accent-teal transition-colors">Support</Link>
            </div>
          </div>
          <div className="pt-10 border-t border-gray-50 dark:border-darkBorder flex flex-col md:flex-row justify-between items-center gap-4">
             <p className="text-xs text-gray-400 font-medium">© 2026 TradeHub Campus. All rights reserved.</p>
             <div className="flex gap-6 text-xs text-gray-400 font-bold uppercase tracking-widest">
                <Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy Policy</Link>
                <Link href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms of Service</Link>
             </div>
          </div>
        </div>
      </footer>
    </main>
  );
}
