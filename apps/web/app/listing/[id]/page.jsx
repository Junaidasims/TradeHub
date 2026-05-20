"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getSocket } from '@/lib/socket';
import ListingCard from '@/components/ListingCard';
import { ChevronLeft, MessageSquare, ShoppingBag, Calendar, Repeat, Eye, Star, Edit, Trash2, RotateCcw, Check, Share2, Heart, Shield, MapPin, Map, X } from 'lucide-react';
import { calculateDistance, formatDistance } from '@/lib/geo';

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);
  const [related, setRelated] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        (err) => console.error(err)
      );
    }
  }, []);

  // Buy modal
  const [showBuyModal, setShowBuyModal] = useState(false);
  const [buyStep, setBuyStep] = useState('confirm'); // 'confirm' | 'messaging' | 'done'

  // Rent modal
  const [showRentModal, setShowRentModal] = useState(false);

  // Seller edit modal
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({ price: '', rentPrice: '', description: '', condition: '' });

  useEffect(() => {
    const fetch = async () => {
      try {
        const res = await api.get(`/listings/${id}`);
        setListing(res.data);
        setEditForm({ 
          price: res.data.price, 
          rentPrice: res.data.rentPrice || 0,
          description: res.data.description, 
          condition: res.data.condition 
        });
        const rel = await api.get(`/listings?category=${res.data.category}`);
        setRelated(rel.data.filter(l => l._id !== id).slice(0, 4));
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    if (id) fetch();
  }, [id]);

  const handleRelist = async () => {
    try {
      await api.patch(`/listings/${id}/relist`);
      setListing(prev => ({ ...prev, status: 'active' }));
      setShowEditModal(false);
    } catch (err) {
      console.error('Relist failed:', err);
    }
  };

  // Real-time status updates
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (data) => {
      if (data.listingId === id) setListing(prev => prev ? { ...prev, status: data.status } : prev);
    };
    socket.on('listing_updated', handler);
    return () => socket.off('listing_updated', handler);
  }, [id]);

  const startConversation = async () => {
    try {
      const res = await api.post('/conversations', { receiverId: listing.seller._id });
      return res.data._id;
    } catch (err) { return null; }
  };

  const handleMessage = async () => {
    if (!user) { router.push('/login'); return; }
    const convoId = await startConversation();
    if (convoId) router.push(`/messages?convo=${convoId}`);
    else alert('Failed to start conversation');
  };

  // === BUY FLOW ===
  const handleBuyClick = () => {
    if (!user) { router.push('/login'); return; }
    setShowBuyModal(true);
    setBuyStep('confirm');
  };

  const handleBuyConfirm = async () => {
    setBuyStep('processing');
    try {
      await api.post(`/listings/${id}/interest`);
      const convoId = await startConversation();
      if (convoId) {
        await api.post('/messages', {
          conversationId: convoId,
          text: `💰 I'd like to buy "${listing.title}". Let's finalize the deal!`,
          itemContext: id
        });
      }
      setBuyStep('messaging');
    } catch (err) {
      alert('Something went wrong');
      setShowBuyModal(false);
    }
  };

  const handleGoToMessages = async () => {
    const convoId = await startConversation();
    setShowBuyModal(false);
    if (convoId) router.push(`/messages?convo=${convoId}`);
  };

  // === RENT FLOW ===
  const handleRent = async () => {
    if (!user) { router.push('/login'); return; }
    
    try {
      await api.post('/rentals', { listingId: id });
      const Price = listing.rentPrice || listing.price;
      const successMsg = `Check notification and mark Yes\n\nI've submitted a rental request for "${listing.title}".`;
      setShowRentModal(false);
      const convoId = await startConversation();
      if (convoId) {
        await api.post('/messages', {
          conversationId: convoId,
          text: `📅 ${successMsg}`,
          itemContext: id
        });
        router.push(`/messages?convo=${convoId}`);
      }
    } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
  };

  // === SELLER CONTROLS ===

  const handleStatusChange = async (status) => {
    try {
      await api.patch(`/listings/${id}/status`, { status });
      setListing(prev => ({ ...prev, status }));
      if (status === 'sold') {
        const confirmDelete = window.confirm('This item is now sold. Do you want to delete it from listings?');
        if (confirmDelete) {
          await handleDelete(true);
        }
      }
    } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
  };

  const handleEditSave = async () => {
    try {
      const res = await api.put(`/listings/${id}`, {
        price: Number(editForm.price),
        rentPrice: Number(editForm.rentPrice),
        description: editForm.description,
        condition: editForm.condition
      });
      setListing(prev => ({ ...prev, ...res.data }));
      setShowEditModal(false);
    } catch (err) { alert(err.response?.data?.msg || 'Failed to update'); }
  };

  const handleDelete = async (skipConfirm = false) => {
    if (!skipConfirm && !window.confirm('Are you sure you want to delete this listing? This action cannot be undone.')) return;
    try {
      await api.delete(`/listings/${id}`);
      router.push('/listings');
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to delete listing');
    }
  };

  if (loading) return (
    <main className="min-h-screen bg-cream dark:bg-darkBg transition-colors duration-200">
      <Navbar />
      <div className="container mx-auto px-4 py-32 text-center">
        <div className="w-16 h-16 border-4 border-accent-teal border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="font-bold text-gray-500 dark:text-gray-400">Loading details...</p>
      </div>
    </main>
  );

  if (!listing) return (
    <main className="min-h-screen bg-cream dark:bg-darkBg transition-colors duration-200">
      <Navbar />
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-6 opacity-30">😕</div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Listing Not Found</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-8">The item you're looking for might have been removed.</p>
        <Link href="/listings" className="btn-neo-primary px-8 py-3 rounded-full">Back to Marketplace</Link>
      </div>
    </main>
  );

  const isOwner = user && user._id === listing.seller._id;

  return (
    <main className="min-h-screen bg-cream dark:bg-darkBg transition-colors duration-200 pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        <div className="flex items-center justify-between mb-8">
          <Link href="/listings" className="inline-flex items-center gap-2 font-bold text-sm text-gray-500 dark:text-gray-400 hover:text-accent-teal transition-colors">
            <ChevronLeft size={18} /> Back to Marketplace
          </Link>
          <div className="flex gap-2">
            <button className="p-2.5 rounded-full border border-gray-100 dark:border-darkBorder bg-white dark:bg-darkCard text-gray-500 hover:text-accent-teal transition-colors shadow-sm">
              <Share2 size={18} />
            </button>
            <button className="p-2.5 rounded-full border border-gray-100 dark:border-darkBorder bg-white dark:bg-darkCard text-gray-500 hover:text-red-500 transition-colors shadow-sm">
              <Heart size={18} />
            </button>
          </div>
        </div>

        {isOwner && listing.status === 'expired' && (
          <div className="bg-gray-900 dark:bg-slate-800 rounded-3xl p-8 mb-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-white/10">
            <div>
              <h2 className="text-xl font-bold text-white mb-1">Rental Period Ended</h2>
              <p className="text-sm text-gray-400">This item is currently hidden. Would you like to re-list it?</p>
            </div>
            <button 
              onClick={handleRelist}
              className="bg-accent-teal hover:bg-accent-teal/90 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-accent-teal/20"
            >
              Re-list Now
            </button>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16">
          {/* Left Column: Image Gallery */}
          <div className="space-y-4">
            <div className="card-neo bg-white dark:bg-darkCard p-0 overflow-hidden relative shadow-md rounded-[2rem]">
              <img src={listing.images?.[selectedImg] || 'https://via.placeholder.com/600x400'}
                alt={listing.title} className="w-full h-[30rem] object-cover hover:scale-105 transition-transform duration-700 cursor-zoom-in" />
              {listing.status !== 'active' && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-white font-bold uppercase text-4xl tracking-widest">{listing.status}</span>
                </div>
              )}
            </div>
            {listing.images?.length > 1 && (
              <div className="flex gap-4 overflow-x-auto p-1 hide-scrollbar">
                {listing.images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImg(i)}
                    className={`w-20 h-20 rounded-2xl overflow-hidden shrink-0 transition-all duration-300 border-2 
                      ${i === selectedImg ? 'border-accent-teal scale-105 shadow-md shadow-accent-teal/20' : 'border-transparent opacity-60 hover:opacity-100'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Details */}
          <div className="flex flex-col">
            <div className="mb-8">
              <div className="flex flex-wrap gap-2 mb-4">
                {listing.type?.map(t => (
                  <span key={t} className="px-3 py-1 bg-accent-teal/10 dark:bg-accent-teal/20 text-accent-teal text-[10px] font-bold uppercase tracking-wider rounded-md border border-accent-teal/20">
                    {t}
                  </span>
                ))}
                <span className={`px-3 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md border
                  ${listing.status === 'active' ? 'bg-green-50 dark:bg-green-500/10 text-green-600 dark:text-green-400 border-green-100 dark:border-green-500/20' : 
                    listing.status === 'sold' ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-100 dark:border-red-500/20' : 
                    'bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-100 dark:border-yellow-500/20'}`}>
                  {listing.status === 'rented' && listing.rentedUntil ? (
                      (() => {
                        const diff = new Date(listing.rentedUntil) - new Date();
                        if (diff <= 0) return 'rented';
                        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
                        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                        if (days > 0) return `Rented (Free in ${days}d ${hours}h)`;
                        return `Rented (Free in ${hours}h)`;
                      })()
                    ) : listing.status}
                </span>
              </div>
              
              <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-4">{listing.title}</h1>
              
              <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400 font-semibold mb-6">
                <span className="flex items-center gap-1.5"><Eye size={16} /> {listing.views} Views</span>
                <span className="flex items-center gap-1.5">&bull; {listing.condition}</span>
                <span className="flex items-center gap-1.5">&bull; {listing.category}</span>
              </div>

              <div className="p-6 bg-white dark:bg-darkCard rounded-[2rem] border border-gray-100 dark:border-darkBorder shadow-sm mb-8">
                <div className="flex flex-col gap-4">
                  {listing.type?.includes('sell') && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Buy Now Price</span>
                      <p className="text-4xl font-bold text-gray-900 dark:text-white">₹{listing.price.toLocaleString()}</p>
                    </div>
                  )}
                  {listing.type?.includes('rent') && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block mb-1">Rental Price ({listing.rentPeriod || 'Daily'})</span>
                      <p className="text-4xl font-bold text-accent-teal">₹{(listing.rentPrice || listing.price).toLocaleString()}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="mb-8">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-3">Description</h3>
              <p className="text-gray-600 dark:text-gray-400 leading-relaxed font-medium">
                {listing.description || 'No description provided for this item.'}
              </p>
            </div>

            {listing.tradePreference && (
              <div className="bg-yellow-50 dark:bg-yellow-500/5 rounded-2xl p-5 border border-yellow-100 dark:border-yellow-500/20 mb-8 flex items-start gap-4">
                <Repeat size={20} className="text-yellow-600 shrink-0 mt-1" />
                <div>
                  <span className="text-[10px] font-bold uppercase text-yellow-600 tracking-wider">Trading For</span>
                  <p className="font-semibold text-yellow-900 dark:text-yellow-500 mt-0.5">{listing.tradePreference}</p>
                </div>
              </div>
            )}
            
            {/* Location & Map Section */}
            <div className="mb-8">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                  <MapPin size={16} className="text-accent-teal" /> Location & Proximity
                </h3>
                {listing.location?.coordinates && userLocation && (
                  <span className="text-xs font-bold text-accent-teal uppercase italic bg-accent-teal/10 px-3 py-1 rounded-full">
                    {formatDistance(calculateDistance(
                      userLocation.lat,
                      userLocation.lng,
                      listing.location.coordinates[1],
                      listing.location.coordinates[0]
                    ))}
                  </span>
                )}
              </div>
              
              <div className="card-neo p-0 overflow-hidden rounded-[2rem] h-64 border-gray-100 dark:border-darkBorder shadow-sm relative group">
                {listing.location?.coordinates ? (
                  <>
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      style={{ border: 0 }}
                      src={`https://maps.google.com/maps?q=${encodeURIComponent(listing.address || `${listing.location.coordinates[1]},${listing.location.coordinates[0]}`)}&t=h&z=17&ie=UTF8&iwloc=&output=embed`}
                      allowFullScreen
                    ></iframe>
                    <div className="absolute bottom-4 right-4 z-50">
                       <a 
                         href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(listing.address || `${listing.location.coordinates[1]},${listing.location.coordinates[0]}`)}`}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="bg-white/90 backdrop-blur-md text-gray-900 px-4 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg border border-gray-200 flex items-center gap-2 hover:bg-white transition-all cursor-pointer"
                       >
                         <Map size={12} className="text-accent-teal" /> Open in Google Maps
                       </a>
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-gray-50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-gray-400 gap-3">
                    <Map size={32} className="opacity-20" />
                    <p className="text-xs font-bold uppercase tracking-widest">Map data unavailable</p>
                  </div>
                )}
                {/* Overlay to prevent accidental scrolling on map, but keep it below the button */}
                <div className="absolute inset-0 bg-transparent pointer-events-none group-hover:pointer-events-auto z-10"></div>
              </div>
              <p className="mt-3 text-[10px] font-bold text-gray-400 uppercase italic">
                📍 {listing.address || `Location captured at ${listing.location?.coordinates[1].toFixed(4)}, ${listing.location?.coordinates[0].toFixed(4)}`}
              </p>
            </div>

            {/* Seller Card */}
            <div className="bg-gray-50 dark:bg-slate-800/50 rounded-3xl p-6 flex items-center gap-5 border border-gray-100 dark:border-darkBorder mb-10 group cursor-pointer hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-accent-teal to-accent-cyan text-white flex items-center justify-center text-2xl font-bold shadow-lg shadow-accent-teal/10">
                {listing.seller?.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Verified Seller</p>
                <p className="font-bold text-gray-900 dark:text-white text-lg">{listing.seller?.name}</p>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-gray-500 font-semibold">{listing.seller?.college || 'MLRIT Student'}</span>
                  {listing.seller?.rating > 0 && (
                    <div className="flex items-center gap-1 px-2 py-0.5 bg-yellow-400/10 text-yellow-600 text-xs font-bold rounded-md">
                      <Star size={12} className="fill-current" />
                      <span>{listing.seller.rating}</span>
                    </div>
                  )}
                </div>
              </div>
              <ChevronRight className="text-gray-300 group-hover:text-accent-teal transition-colors" />
            </div>

            {/* ===== ACTIONS ===== */}
            <div className="mt-auto space-y-4">
              {!isOwner && listing.status === 'active' && (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {listing.type?.includes('sell') && (
                      <button onClick={handleBuyClick} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-100 transition-all shadow-xl">
                        <ShoppingBag size={20} /> Buy Item Now
                      </button>
                    )}
                    {listing.type?.includes('rent') && (
                      <button onClick={() => { if (!user) { router.push('/login'); return; } setShowRentModal(true); }}
                        className="bg-accent-teal hover:bg-accent-teal/90 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-100 transition-all shadow-xl shadow-accent-teal/20">
                        <Calendar size={20} /> Rent for a Period
                      </button>
                    )}
                  </div>
                  {listing.type?.includes('trade') && (
                    <button onClick={handleMessage} className="w-full bg-white dark:bg-slate-800 border border-gray-100 dark:border-darkBorder text-gray-800 dark:text-gray-200 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-all">
                      <Repeat size={20} /> Propose an Exchange
                    </button>
                  )}
                  <button onClick={handleMessage} className="w-full py-2 font-bold text-accent-teal hover:text-accent-teal/80 transition-colors flex items-center justify-center gap-2">
                    <MessageSquare size={18} /> Chat with {listing.seller?.name?.split(' ')[0]}
                  </button>
                </>
              )}

              {isOwner && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <button onClick={() => setShowEditModal(true)}
                    className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] transition-all">
                    <Edit size={18} /> Edit Listing
                  </button>
                  <button onClick={() => handleDelete()}
                    className="bg-red-50 dark:bg-red-500/10 text-red-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-red-100 dark:hover:bg-red-500/20 transition-all">
                    <Trash2 size={18} /> Delete Item
                  </button>
                  {listing.status === 'active' ? (
                    <button onClick={() => handleStatusChange('sold')}
                      className="sm:col-span-2 bg-green-500 hover:bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all shadow-lg shadow-green-500/20">
                      <Check size={20} /> Mark as Sold Successfully
                    </button>
                  ) : (
                    <button onClick={() => handleStatusChange('active')}
                      className="sm:col-span-2 bg-accent-teal hover:bg-accent-teal/90 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 transition-all">
                      <RotateCcw size={20} /> Reactivate for Marketplace
                    </button>
                  )}
                </div>
              )}

              {listing.status !== 'active' && !isOwner && (
                <div className="p-6 bg-red-50 dark:bg-red-500/5 rounded-3xl border border-red-100 dark:border-red-500/20 text-center">
                  <p className="font-bold text-red-600 uppercase tracking-widest text-sm">Not Available — {listing.status}</p>
                </div>
              )}
            </div>
            
            <div className="mt-10 p-6 bg-gray-50 dark:bg-slate-800/30 rounded-3xl border border-gray-100 dark:border-darkBorder">
              <div className="flex items-center gap-3 text-gray-500 dark:text-gray-400 mb-2">
                <Shield size={18} className="text-accent-teal" />
                <span className="font-bold text-xs uppercase tracking-wider">Campus Safety Guarantee</span>
              </div>
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Always meet in well-lit public areas on campus. Do not share personal bank details before inspecting the item in person.
              </p>
            </div>
          </div>
        </div>

        {/* Related Listings */}
        {related.length > 0 && (
          <section className="mt-24">
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">More from {listing.category}</h2>
              <Link href={`/listings?category=${listing.category}`} className="text-sm font-bold text-accent-teal hover:underline">View All &rarr;</Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
              {related.map(item => (
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
      </div>

      {/* ===== BUY MODAL ===== */}
      {showBuyModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300" onClick={() => setShowBuyModal(false)}>
          <div className="bg-white dark:bg-darkCard rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl relative" onClick={e => e.stopPropagation()}>
            {buyStep === 'confirm' && (
              <>
                <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-6">Confirm Interest</h2>
                <div className="flex items-center gap-5 mb-8 p-5 bg-gray-50 dark:bg-slate-800 rounded-3xl border border-gray-100 dark:border-darkBorder">
                  <img src={listing.images?.[0] || 'https://via.placeholder.com/150'} alt="" className="w-20 h-20 object-cover rounded-2xl shadow-sm" />
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white mb-1">{listing.title}</p>
                    <p className="text-accent-teal font-bold text-2xl">₹{listing.price.toLocaleString()}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 leading-relaxed font-medium">
                  We will notify the seller and open a secure chat. You can coordinate the handoff and final payment safely on campus.
                </p>
                <div className="flex gap-4">
                  <button onClick={() => setShowBuyModal(false)} className="flex-1 py-4 font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Cancel</button>
                  <button onClick={handleBuyConfirm} className="flex-[2] bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl font-bold shadow-xl hover:scale-[1.02] transition-all">
                    Start Deal Now
                  </button>
                </div>
              </>
            )}
            {buyStep === 'processing' && (
              <div className="text-center py-12">
                <div className="w-16 h-16 border-4 border-accent-teal border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
                <p className="font-bold text-gray-900 dark:text-white text-lg">Setting up your trade...</p>
              </div>
            )}
            {buyStep === 'messaging' && (
              <div className="text-center">
                <div className="w-20 h-20 bg-green-500/10 text-green-500 rounded-full flex items-center justify-center mx-auto mb-6 text-4xl">✓</div>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Interest Notified!</h2>
                <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">
                  We've alerted the seller. Head over to your messages to finalize the time and place for pickup.
                </p>
                <div className="bg-yellow-50 dark:bg-yellow-500/5 p-4 rounded-2xl mb-8 text-left flex gap-3">
                  <Shield size={18} className="text-yellow-600 shrink-0" />
                  <p className="text-[11px] font-bold text-yellow-700 dark:text-yellow-500 leading-tight uppercase tracking-wide">
                    Safety Tip: Inspect the item thoroughly before handing over any money.
                  </p>
                </div>
                <button onClick={handleGoToMessages}
                  className="w-full bg-accent-teal hover:bg-accent-teal/90 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-lg shadow-accent-teal/20">
                  <MessageSquare size={20} /> Open Messages to Chat
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== RENT MODAL ===== */}
      {showRentModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300" onClick={() => setShowRentModal(false)}>
          <div className="bg-white dark:bg-darkCard rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white mb-8 text-center">Rental Request</h2>
            
            <div className="bg-accent-teal/10 dark:bg-accent-teal/20 rounded-3xl p-10 text-center border border-accent-teal/20 mb-8">
              <span className="text-[10px] font-bold text-accent-teal uppercase tracking-[0.2em] block mb-2">Request Amount</span>
              <p className="text-5xl font-bold text-accent-teal">₹{(listing.rentPrice || listing.price).toLocaleString()}</p>
              <p className="text-[11px] font-bold text-gray-400 dark:text-gray-500 uppercase mt-2 tracking-widest">Base Duration: 24 Hours</p>
            </div>
            
            <p className="text-sm text-gray-500 dark:text-gray-400 text-center px-6 mb-10 leading-relaxed font-medium">
              The owner will receive a notification of your request. Once they approve, you'll be able to pick it up!
            </p>

            <div className="flex gap-4">
              <button onClick={() => setShowRentModal(false)} className="flex-1 py-4 font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Cancel</button>
              <button onClick={handleRent}
                className="flex-[2] bg-accent-teal hover:bg-accent-teal/90 text-white py-4 rounded-2xl font-bold shadow-xl shadow-accent-teal/20 transition-all hover:scale-[1.02]">
                Submit Rental Request
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===== SELLER EDIT MODAL ===== */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300" onClick={() => setShowEditModal(false)}>
          <div className="bg-white dark:bg-darkCard rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Edit Listing</h2>
              <button onClick={() => setShowEditModal(false)} className="p-2 bg-gray-50 dark:bg-slate-800 rounded-full hover:rotate-90 transition-all">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400">Sale Price (₹)</label>
                  <input type="number" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})}
                    className="input-neo w-full px-6 text-lg font-bold" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400">Rent Price (₹)</label>
                  <input type="number" value={editForm.rentPrice} onChange={e => setEditForm({...editForm, rentPrice: e.target.value})}
                    className="input-neo w-full px-6 text-lg font-bold" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400">Description</label>
                <textarea rows={4} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}
                  className="input-neo w-full px-6 py-4 resize-none font-medium" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400">Condition</label>
                <select value={editForm.condition} onChange={e => setEditForm({...editForm, condition: e.target.value})}
                  className="input-neo w-full px-6 bg-white dark:bg-slate-800 font-semibold">
                  <option value="New">New</option>
                  <option value="Like New">Like New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>
              <div className="flex gap-4 pt-4">
                <button onClick={() => setShowEditModal(false)} className="flex-1 py-4 font-bold text-gray-500 transition-colors">Cancel</button>
                <button onClick={handleEditSave} className="flex-[2] bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl font-bold shadow-xl">
                  Save All Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function ChevronRight(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m9 18 6-6-6-6" />
    </svg>
  )
}
