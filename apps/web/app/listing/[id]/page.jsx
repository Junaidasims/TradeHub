"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { getSocket } from '@/lib/socket';
import ListingCard from '@/components/ListingCard';
import { ChevronLeft, MessageSquare, ShoppingBag, Calendar, Repeat, Eye, Star, Edit, Trash2, RotateCcw, Check } from 'lucide-react';

export default function ListingDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedImg, setSelectedImg] = useState(0);
  const [related, setRelated] = useState([]);

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
      // 1. Notify the seller of interest
      await api.post(`/listings/${id}/interest`);
      // 2. Start a conversation
      const convoId = await startConversation();
      // 3. Send automated "interested in buying" message via API
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
      
      const price = listing.rentPrice || listing.price;
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
      
      // Post-sale deletion prompt
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
    <main className="min-h-screen bg-cream"><Navbar />
      <div className="container mx-auto px-4 py-20 text-center font-black uppercase italic text-xl animate-pulse">Loading...</div>
    </main>
  );
  if (!listing) return (
    <main className="min-h-screen bg-cream"><Navbar />
      <div className="container mx-auto px-4 py-20 text-center">
        <div className="text-6xl mb-4">😕</div>
        <h2 className="text-2xl font-black uppercase italic">Listing not found</h2>
      </div>
    </main>
  );

  const isOwner = user && user._id === listing.seller._id;

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        <Link href="/listings" className="inline-flex items-center gap-1 font-black uppercase text-xs hover:text-accent-teal mb-6">
          <ChevronLeft size={16} /> Back to Browse
        </Link>

        {isOwner && listing.status === 'expired' && (
          <div className="card-neo bg-black text-white p-6 mb-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-black uppercase italic tracking-tighter">Rental Period Ended</h2>
              <p className="text-sm font-bold text-gray-400">This item is currently hidden from other users. Would you like to re-list it with the same details?</p>
            </div>
            <button 
              onClick={handleRelist}
              className="btn-neo bg-accent-teal text-white px-8 py-3 font-black uppercase shadow-[4px_4px_0px_0px_rgba(212,255,63,1)] hover:shadow-none"
            >
              Confirm Re-list
            </button>
          </div>
        )}
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Image Gallery */}
          <div>
            <div className="card-neo bg-white overflow-hidden mb-4 relative">
              <img src={listing.images?.[selectedImg] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600'}
                alt={listing.title} className="w-full h-96 object-cover" />
              {listing.status !== 'active' && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-black uppercase text-3xl tracking-wider">{listing.status}</span>
                </div>
              )}
            </div>
            {listing.images?.length > 1 && (
              <div className="flex gap-2 overflow-x-auto">
                {listing.images.map((img, i) => (
                  <button key={i} onClick={() => setSelectedImg(i)}
                    className={`w-20 h-20 border-2 overflow-hidden shrink-0 ${i === selectedImg ? 'border-accent-teal shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]' : 'border-black'}`}>
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Details */}
          <div className="space-y-6">
            <div>
              <div className="flex gap-2 mb-3 flex-wrap">
                {listing.type?.map(t => (
                  <span key={t} className="px-3 py-1 bg-accent-teal text-white text-[10px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{t}</span>
                ))}
                <span className={`px-3 py-1 text-[10px] font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]
                  ${listing.status === 'active' ? 'bg-green-100' : listing.status === 'sold' ? 'bg-red-100' : 'bg-yellow-100'}`}>
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
              <div className="mt-4 space-y-2">
                {listing.type?.includes('sell') && (
                  <p className="text-3xl font-black text-accent-teal">
                    ₹{listing.price} <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">(Buy Now)</span>
                  </p>
                )}
                {listing.type?.includes('rent') && (
                  <p className="text-3xl font-black text-accent-teal">
                    ₹{listing.rentPrice || listing.price} <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">({listing.rentPeriod === 'daily' ? 'Per Day' : listing.rentPeriod === 'weekly' ? 'Per Week' : 'Per Month'})</span>
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 text-sm text-gray-500 font-bold">
              <span className="flex items-center gap-1"><Eye size={14} /> {listing.views} views</span>
              <span>{listing.condition}</span>
              <span>{listing.category}</span>
            </div>

            <p className="text-gray-700 leading-relaxed">{listing.description || 'No description provided.'}</p>

            {listing.tradePreference && (
              <div className="bg-yellow-50 border-2 border-black p-4">
                <span className="text-xs font-black uppercase text-gray-500">Looking to trade for:</span>
                <p className="font-bold mt-1">{listing.tradePreference}</p>
              </div>
            )}

            {/* Seller Card */}
            <div className="card-neo bg-white p-6 flex items-center gap-4">
              <div className="w-14 h-14 bg-accent-teal text-white border-2 border-black flex items-center justify-center text-2xl font-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                {listing.seller?.name?.charAt(0) || '?'}
              </div>
              <div className="flex-1">
                <p className="font-black uppercase">{listing.seller?.name}</p>
                <p className="text-xs text-gray-500 font-bold">{listing.seller?.college || 'Student'}</p>
                {listing.seller?.rating > 0 && (
                  <div className="flex items-center gap-1 mt-1">
                    <Star size={12} className="text-yellow-500 fill-yellow-500" />
                    <span className="text-xs font-black">{listing.seller.rating}</span>
                  </div>
                )}
              </div>
            </div>

            {/* ===== BUYER ACTIONS ===== */}
            {!isOwner && listing.status === 'active' && (
              <div className="space-y-3">
                {listing.type?.includes('sell') && (
                  <button onClick={handleBuyClick} className="btn-neo bg-black text-white w-full py-4 uppercase font-black flex items-center justify-center gap-2">
                    <ShoppingBag size={20} /> Buy Now — ₹{listing.price}
                  </button>
                )}
                {listing.type?.includes('rent') && (
                  <button onClick={() => { if (!user) { router.push('/login'); return; } setShowRentModal(true); }}
                    className="btn-neo bg-accent-teal text-white w-full py-4 uppercase font-black flex items-center justify-center gap-2">
                    <Calendar size={20} /> Rent This Item
                  </button>
                )}
                {listing.type?.includes('trade') && (
                  <button onClick={handleMessage} className="btn-neo bg-white w-full py-4 uppercase font-black flex items-center justify-center gap-2">
                    <Repeat size={20} /> Propose Trade
                  </button>
                )}
                <button onClick={handleMessage} className="btn-neo bg-white w-full py-3 uppercase font-black text-sm flex items-center justify-center gap-2 text-accent-teal">
                  <MessageSquare size={18} /> Message Seller
                </button>
              </div>
            )}

            {/* ===== SELLER CONTROLS ===== */}
            {isOwner && (
              <div className="space-y-3">
                <div className="card-neo bg-blue-50 p-4 text-center">
                  <p className="text-xs font-black uppercase text-gray-500 mb-1">You own this listing</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setShowEditModal(true)}
                      className="btn-neo bg-white py-3 uppercase font-black text-sm flex items-center justify-center gap-2">
                      <Edit size={16} /> Edit
                    </button>
                    <button onClick={handleDelete}
                      className="btn-neo bg-red-50 text-red-500 py-3 uppercase font-black text-sm flex items-center justify-center gap-2">
                      <Trash2 size={16} /> Delete
                    </button>
                  {listing.status === 'active' ? (
                    <button onClick={() => handleStatusChange('sold')}
                      className="btn-neo bg-green-500 text-white py-3 uppercase font-black text-sm flex items-center justify-center gap-2">
                      <Check size={16} /> Mark as Sold
                    </button>
                  ) : (
                    <button onClick={() => handleStatusChange('active')}
                      className="btn-neo bg-accent-teal text-white py-3 uppercase font-black text-sm flex items-center justify-center gap-2">
                      <RotateCcw size={16} /> Reactivate
                    </button>
                  )}
                </div>

              </div>
            )}

            {/* Status message for non-active, non-owner */}
            {listing.status !== 'active' && !isOwner && (
              <div className="card-neo bg-red-50 p-6 text-center">
                <p className="font-black uppercase text-red-600">This item is no longer available ({listing.status})</p>
              </div>
            )}
          </div>
        </div>

        {/* Related Listings */}
        {related.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-black uppercase italic tracking-tighter mb-6">More in {listing.category}</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowBuyModal(false)}>
          <div className="card-neo bg-white p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            {buyStep === 'confirm' && (
              <>
                <h2 className="text-2xl font-black uppercase italic mb-4">Confirm Purchase</h2>
                <div className="flex items-center gap-4 mb-6 p-4 bg-cream border-2 border-black">
                  <img src={listing.images?.[0] || ''} alt="" className="w-16 h-16 object-cover border border-black" />
                  <div>
                    <p className="font-black text-sm uppercase">{listing.title}</p>
                    <p className="text-accent-teal font-black text-xl">₹{listing.price}</p>
                  </div>
                </div>
                <p className="text-sm text-gray-600 mb-6">
                  This will open a conversation with the seller so you can coordinate pickup/payment.
                  Once you both agree, you can finalize the deal.
                </p>
                <div className="flex gap-3">
                  <button onClick={() => setShowBuyModal(false)} className="btn-neo bg-white flex-1 py-3 uppercase font-black text-sm">Cancel</button>
                  <button onClick={handleBuyConfirm} className="btn-neo bg-black text-white flex-1 py-3 uppercase font-black text-sm">
                    Proceed to Buy
                  </button>
                </div>
              </>
            )}
            {buyStep === 'processing' && (
              <div className="text-center py-8">
                <div className="text-4xl animate-bounce mb-4">⏳</div>
                <p className="font-black uppercase italic">Setting up your deal...</p>
              </div>
            )}
            {buyStep === 'messaging' && (
              <>
                <div className="text-center mb-6">
                  <div className="text-4xl mb-4">✅</div>
                  <h2 className="text-2xl font-black uppercase italic mb-2">Interest Registered!</h2>
                  <p className="text-sm text-gray-600">
                    We've messaged the seller that you want to buy this item. Chat with them to arrange pickup and payment.
                  </p>
                </div>
                <div className="bg-yellow-50 border-2 border-yellow-400 p-4 mb-6 text-center">
                  <p className="text-xs font-black uppercase text-yellow-700">
                    ⚠️ Only finalize after you've received the item
                  </p>
                </div>
                <div className="space-y-3">
                  <button onClick={handleGoToMessages}
                    className="btn-neo bg-accent-teal text-white w-full py-4 uppercase font-black text-sm flex items-center justify-center gap-2">
                    <MessageSquare size={16} /> Chat with Seller to Finalize
                  </button>
                </div>
              </>
            )}
            {buyStep === 'done' && (
              <div className="text-center py-4">
                <div className="text-6xl mb-4">🎉</div>
                <h2 className="text-2xl font-black uppercase italic mb-2">Deal Complete!</h2>
                <p className="text-sm text-gray-600 mb-6">The listing has been marked as sold. Congratulations!</p>
                <button onClick={() => { setShowBuyModal(false); router.push('/listings'); }}
                  className="btn-neo bg-accent-teal text-white w-full py-3 uppercase font-black text-sm">
                  Browse More Items
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== RENT MODAL ===== */}
      {showRentModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowRentModal(false)}>
          <div className="card-neo bg-white p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black uppercase italic mb-6">Rent "{listing.title}"</h2>
            <div className="space-y-4">
              <div className="bg-accent-teal/10 border-2 border-accent-teal p-6 text-center">
                <span className="text-xs font-black uppercase text-gray-500">Rental Price</span>
                <p className="text-4xl font-black text-accent-teal">₹{listing.rentPrice || listing.price}</p>
                <p className="text-[10px] font-bold text-gray-400 uppercase mt-1">Flat Rate / Request Fee</p>
              </div>
              
              <p className="text-sm text-gray-600 text-center px-4">
                This will send a request to the owner. The item will be locked only after they approve.
              </p>

              <div className="flex gap-3 pt-4">
                <button onClick={() => setShowRentModal(false)} className="btn-neo bg-white flex-1 py-3 uppercase font-black text-sm">Cancel</button>
                <button onClick={handleRent}
                  className="btn-neo bg-accent-teal text-white flex-1 py-3 uppercase font-black text-sm">Confirm Request</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SELLER EDIT MODAL ===== */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEditModal(false)}>
          <div className="card-neo bg-white p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h2 className="text-2xl font-black uppercase italic mb-6">Edit Listing</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase mb-1 text-gray-500">Sale Price (₹)</label>
                  <input type="number" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})}
                    className="input-neo w-full px-4 py-3" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1 text-gray-500">Rent Price (₹)</label>
                  <input type="number" value={editForm.rentPrice} onChange={e => setEditForm({...editForm, rentPrice: e.target.value})}
                    className="input-neo w-full px-4 py-3" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1 text-gray-500">Description</label>
                <textarea rows={4} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}
                  className="input-neo w-full px-4 py-3 resize-none" />
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1 text-gray-500">Condition</label>
                <select value={editForm.condition} onChange={e => setEditForm({...editForm, condition: e.target.value})}
                  className="input-neo w-full px-4 py-3 bg-white">
                  <option value="New">New</option>
                  <option value="Like New">Like New</option>
                  <option value="Good">Good</option>
                  <option value="Fair">Fair</option>
                </select>
              </div>
              <div className="flex gap-3 mt-2">
                <button onClick={() => setShowEditModal(false)} className="btn-neo bg-white flex-1 py-3 uppercase font-black text-sm">Cancel</button>
                <button onClick={handleEditSave} className="btn-neo bg-black text-white flex-1 py-3 uppercase font-black text-sm">Save Changes</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
