"use client";

import { useEffect, useState, useRef } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { Package, Calendar, Repeat, Star, Edit, Trash2, CheckCircle, User, RotateCcw, X, Save, Settings } from 'lucide-react';

const TABS = ['My Listings', 'My Rentals', 'My Trades', 'Reviews'];

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState(0);
  const [listings, setListings] = useState([]);
  const [rentals, setRentals] = useState({ asRenter: [], asOwner: [] });
  const [trades, setTrades] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);

  // Edit modal
  const [editModal, setEditModal] = useState(null); // listing object or null
  const [editForm, setEditForm] = useState({ price: '', rentPrice: '', description: '', condition: '' });

  useEffect(() => {
    if (!user) return;
    const fetchData = async () => {
      setLoading(true);
      try {
        if (tab === 0) {
          const res = await api.get('/users/me/listings');
          setListings(res.data);
        } else if (tab === 1) {
          const res = await api.get('/users/me/rentals');
          setRentals(res.data);
        } else if (tab === 2) {
          const res = await api.get('/users/me/trades');
          setTrades(res.data);
        } else if (tab === 3) {
          const res = await api.get(`/reviews/user/${user._id}`);
          setReviews(res.data);
        }
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, [tab, user]);


  const handleDelete = async (id) => {
    if (!confirm('Delete this listing permanently?')) return;
    try {
      await api.delete(`/listings/${id}`);
      setListings(prev => prev.filter(l => l._id !== id));
    } catch (err) { alert('Failed to delete'); }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await api.patch(`/listings/${id}/status`, { status });
      setListings(prev => prev.map(l => l._id === id ? { ...l, status } : l));
    } catch (err) { alert('Failed to update'); }
  };


  const openEditModal = (listing) => {
    setEditModal(listing);
    setEditForm({ 
      price: listing.price, 
      rentPrice: listing.rentPrice || 0,
      description: listing.description || '', 
      condition: listing.condition 
    });
  };

  const handleEditSave = async () => {
    try {
      const res = await api.put(`/listings/${editModal._id}`, {
        price: Number(editForm.price),
        rentPrice: Number(editForm.rentPrice),
        description: editForm.description,
        condition: editForm.condition
      });
      setListings(prev => prev.map(l => l._id === editModal._id ? { ...l, ...res.data } : l));
      setEditModal(null);
    } catch (err) { alert(err.response?.data?.msg || 'Failed to update'); }
  };

  if (!user) {
    return (
      <main className="min-h-screen bg-[var(--background)]">
        <Navbar />
        <div className="container mx-auto px-4 py-20 text-center">
          <p className="text-lg font-semibold text-slate-500">Please log in to access your dashboard</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[var(--background)] pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        
        {/* Profile Header */}
        <div className="relative overflow-hidden card p-8 mb-8 flex flex-col md:flex-row items-center gap-8">
          {/* Background accent */}
          <div className="absolute inset-0 bg-gradient-to-br from-teal-500/5 via-transparent to-cyan-500/5 pointer-events-none" />
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-400 to-cyan-500 text-white flex items-center justify-center text-3xl font-bold shadow-xl shadow-teal-500/30 shrink-0 relative">
            {user.name?.charAt(0)?.toUpperCase() || <User size={36} />}
            <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-emerald-400 rounded-full border-2 border-white dark:border-slate-900 shadow-sm" />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">{user.name}</h1>
            <p className="text-slate-500 text-sm font-medium">{user.email}</p>
            <div className="flex flex-wrap justify-center md:justify-start gap-4 mt-4">
              {user.rating > 0 && (
                <div className="flex items-center gap-1.5 px-3 py-1 bg-yellow-50 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 text-xs font-bold rounded-full">
                  <Star size={14} className="fill-current" />
                  <span>{user.rating} ({user.totalRatings} Reviews)</span>
                </div>
              )}
            </div>
          </div>
          <button className="p-3 rounded-2xl border border-gray-100 dark:border-darkBorder hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors text-gray-500 dark:text-gray-400">
            <Settings size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-2xl mb-8 w-fit overflow-x-auto max-w-full border border-slate-200 dark:border-white/5">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-5 py-2 rounded-xl font-semibold text-sm transition-all whitespace-nowrap
                ${tab === i
                  ? 'bg-white dark:bg-slate-800 text-gray-900 dark:text-white shadow-sm border border-slate-200/60 dark:border-white/8'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-white/50 dark:hover:bg-white/5'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-4">
            {[1,2,3].map(i => <div key={i} className="h-28 bg-white dark:bg-darkCard animate-pulse rounded-2xl border border-gray-100 dark:border-darkBorder" />)}
          </div>
        ) : (
          <div className="min-h-[400px]">
            {/* ===== MY LISTINGS ===== */}
            {tab === 0 && (
              listings.length === 0 ? (
                <div className="card-neo bg-white dark:bg-darkCard p-20 text-center shadow-sm">
                  <div className="text-6xl mb-6 opacity-20">📦</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">You haven't listed anything yet</h3>
                  <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto">Start selling or renting out items to the community.</p>
                  <Link href="/create" className="btn-neo-primary px-8 py-3 rounded-full">Post Your First Item</Link>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {listings.map(l => (
                    <div key={l._id} className="card-neo bg-white dark:bg-darkCard p-4 flex flex-col sm:flex-row items-center gap-6 shadow-sm border border-gray-50 dark:border-darkBorder transition-all hover:shadow-md">
                      <Link href={`/listing/${l._id}`} className="shrink-0 overflow-hidden rounded-xl border border-gray-100 dark:border-darkBorder">
                        <img src={l.images?.[0] || 'https://via.placeholder.com/150'} alt={l.title}
                          className="w-24 h-24 object-cover hover:scale-110 transition-transform" />
                      </Link>
                      <div className="flex-1 min-w-0 text-center sm:text-left">
                        <Link href={`/listing/${l._id}`} className="font-bold text-gray-900 dark:text-white hover:text-accent-teal transition-colors truncate block text-lg">{l.title}</Link>
                        <div className="flex items-center justify-center sm:justify-start gap-3 mt-1">
                          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md
                            ${l.status === 'active' ? 'bg-green-100 dark:bg-green-500/10 text-green-600 dark:text-green-400' : 
                              l.status === 'sold' ? 'bg-red-100 dark:bg-red-500/10 text-red-600 dark:text-red-400' : 
                              'bg-yellow-100 dark:bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'}`}>{l.status}</span>
                          <span className="text-xs font-semibold text-gray-400 dark:text-gray-500">{l.category} &bull; {l.condition}</span>
                        </div>
                        <div className="mt-3 flex gap-4 justify-center sm:justify-start">
                          {l.type?.includes('sell') && (
                            <div>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Sell Price</span>
                              <span className="text-lg font-bold text-gray-900 dark:text-white leading-none">₹{l.price}</span>
                            </div>
                          )}
                          {l.type?.includes('rent') && (
                            <div>
                              <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest block mb-0.5">Rent/Day</span>
                              <span className="text-lg font-bold text-accent-teal leading-none">₹{l.rentPrice || l.price}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {/* Action buttons */}
                      <div className="flex gap-2 shrink-0">
                        <button onClick={() => openEditModal(l)} 
                          className="p-3 rounded-xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-colors shadow-sm">
                          <Edit size={18} />
                        </button>
                        {l.status === 'active' ? (
                          <button onClick={() => handleStatusChange(l._id, 'sold')}
                            className="p-3 rounded-xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 transition-colors shadow-sm">
                            <CheckCircle size={18} />
                          </button>
                        ) : (
                          <button onClick={() => handleStatusChange(l._id, 'active')}
                            className="p-3 rounded-xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-accent-teal/5 dark:hover:bg-accent-teal/10 hover:text-accent-teal transition-colors shadow-sm">
                            <RotateCcw size={18} />
                          </button>
                        )}
                        <button onClick={() => handleDelete(l._id)}
                          className="p-3 rounded-xl border border-gray-100 dark:border-darkBorder bg-white dark:bg-slate-800 text-gray-600 dark:text-gray-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 transition-colors shadow-sm">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ===== MY RENTALS ===== */}
            {tab === 1 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <h3 className="font-bold text-sm text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Items I'm Renting</h3>
                  {rentals.asRenter?.length === 0 ? (
                    <div className="p-10 border-2 border-dashed border-gray-100 dark:border-darkBorder rounded-3xl text-center text-gray-400 text-sm font-medium">No active rentals</div>
                  ) : (rentals.asRenter || []).map(r => (
                    <div key={r._id} className="card-neo bg-white dark:bg-darkCard p-5 flex items-center gap-5 shadow-sm mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-accent-teal/10 text-accent-teal flex items-center justify-center shrink-0">
                        <Calendar size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/listing/${r.listing?._id}`} className="font-bold text-gray-900 dark:text-white hover:text-accent-teal transition-colors truncate block">
                          {r.listing?.title || 'Item'}
                        </Link>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                          {r.startDate ? new Date(r.startDate).toLocaleDateString() : 'N/A'} &rarr; {r.endDate ? new Date(r.endDate).toLocaleDateString() : 'N/A'}
                        </p>
                        {r.status === 'active' && (
                          <div className="mt-2" />
                        )}
                      </div>
                      <div className="text-right flex flex-col justify-between items-end">
                        <span className="font-bold text-gray-900 dark:text-white block">₹{r.totalCost}</span>
                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded mt-2 ${r.status === 'active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div>
                  <h3 className="font-bold text-sm text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-4">Items Rented Out</h3>
                  {rentals.asOwner?.length === 0 ? (
                    <div className="p-10 border-2 border-dashed border-gray-100 dark:border-darkBorder rounded-3xl text-center text-gray-400 text-sm font-medium">No one has rented your items yet</div>
                  ) : (rentals.asOwner || []).map(r => (
                    <div key={r._id} className="card-neo bg-white dark:bg-darkCard p-5 flex items-center gap-5 shadow-sm mb-4">
                      <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-500/10 text-blue-500 flex items-center justify-center shrink-0">
                        <Calendar size={24} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/listing/${r.listing?._id}`} className="font-bold text-gray-900 dark:text-white hover:text-accent-teal transition-colors truncate block">
                          {r.listing?.title || 'Item'}
                        </Link>
                        <p className="text-xs text-gray-500 font-medium mt-1">
                          Renter: <span className="text-gray-900 dark:text-gray-200">{r.renter?.name || 'User'}</span> &bull; {r.startDate ? new Date(r.startDate).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <div className="text-right flex flex-col justify-between items-end">
                        <span className="font-bold text-gray-900 dark:text-white block">₹{r.totalCost}</span>
                        <span className="text-[10px] font-bold text-green-500 uppercase mt-2">Paid</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ===== MY TRADES ===== */}
            {tab === 2 && (
              trades.length === 0 ? (
                <div className="card-neo bg-white dark:bg-darkCard p-20 text-center shadow-sm">
                  <div className="text-6xl mb-6 opacity-20">🔄</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No active trades</h3>
                  <p className="text-gray-500 dark:text-gray-400">Trade proposals from other users will appear here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {trades.map(t => (
                    <div key={t._id} className="card-neo bg-white dark:bg-darkCard p-5 flex flex-col md:flex-row items-center gap-6 shadow-sm">
                      <div className="w-12 h-12 rounded-full bg-accent-teal/10 text-accent-teal flex items-center justify-center shrink-0">
                        <Repeat size={24} />
                      </div>
                      <div className="flex-1 text-center md:text-left">
                        <div className="flex flex-col md:flex-row items-center gap-3">
                           <Link href={`/listing/${t.listing?._id}`} className="font-bold text-gray-900 dark:text-white hover:text-accent-teal transition-colors">
                             {t.listing?.title}
                           </Link>
                           <span className="text-gray-400 flex items-center justify-center bg-gray-50 dark:bg-slate-800 w-8 h-8 rounded-full">↔</span>
                           <Link href={`/listing/${t.offeredListing?._id}`} className="font-bold text-gray-900 dark:text-white hover:text-accent-teal transition-colors">
                             {t.offeredListing?.title}
                           </Link>
                        </div>
                        <p className="text-xs text-gray-500 font-medium mt-2">
                          {t.proposer?._id === user._id ? 'You proposed this trade' : `Proposed by ${t.proposer?.name}`}
                        </p>
                      </div>
                      <div className="flex flex-col items-center md:items-end gap-3">
                        <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full
                          ${t.status === 'accepted' ? 'bg-green-100 text-green-600' : 
                            t.status === 'declined' ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
                          {t.status}
                        </span>
                        {t.status === 'pending' && t.receiver?._id === user._id && (
                          <div className="flex gap-2">
                            <button onClick={async () => { await api.patch(`/trades/${t._id}`, { status: 'accepted' }); setTrades(prev => prev.map(p => p._id === t._id ? {...p, status:'accepted'} : p)); }}
                              className="px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors">Accept</button>
                            <button onClick={async () => { await api.patch(`/trades/${t._id}`, { status: 'declined' }); setTrades(prev => prev.map(p => p._id === t._id ? {...p, status:'declined'} : p)); }}
                              className="px-4 py-1.5 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded-lg shadow-sm transition-colors">Decline</button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ===== REVIEWS ===== */}
            {tab === 3 && (
              reviews.length === 0 ? (
                <div className="card-neo bg-white dark:bg-darkCard p-20 text-center shadow-sm">
                  <div className="text-6xl mb-6 opacity-20">⭐</div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">No reviews yet</h3>
                  <p className="text-gray-500 dark:text-gray-400">Feedback from your trading partners will be shown here.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {reviews.map(r => (
                    <div key={r._id} className="card-neo bg-white dark:bg-darkCard p-6 shadow-sm border border-gray-50 dark:border-darkBorder">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-gray-100 dark:bg-slate-800 text-gray-500 flex items-center justify-center font-bold">
                            {r.reviewer?.name?.charAt(0)}
                          </div>
                          <div>
                            <span className="font-bold text-gray-900 dark:text-white block leading-none mb-1">{r.reviewer?.name}</span>
                            <span className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{new Date(r.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map(s => (
                            <Star key={s} size={14} className={s <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-200 dark:text-slate-700'} />
                          ))}
                        </div>
                      </div>
                      {r.comment && <p className="text-sm text-gray-600 dark:text-gray-400 font-medium leading-relaxed italic">"{r.comment}"</p>}
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* ===== EDIT MODAL ===== */}
      {editModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 transition-all duration-300" onClick={() => setEditModal(null)}>
          <div className="bg-white dark:bg-darkCard rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl border border-white/20 relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Edit Listing</h2>
              <button onClick={() => setEditModal(null)} className="p-2 bg-gray-100 dark:bg-slate-800 rounded-full hover:rotate-90 transition-all duration-300">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="flex items-center gap-4 mb-8 p-4 bg-gray-50 dark:bg-slate-800/50 rounded-2xl border border-gray-100 dark:border-darkBorder">
              <img src={editModal.images?.[0] || 'https://via.placeholder.com/150'} alt="" className="w-16 h-16 object-cover rounded-xl shadow-sm" />
              <p className="font-bold text-gray-900 dark:text-white text-lg truncate">{editModal.title}</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400">Sale Price (₹)</label>
                  <input type="number" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})}
                    className="input-neo text-xl font-bold px-6" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400">Rent Price (₹)</label>
                  <input type="number" value={editForm.rentPrice} onChange={e => setEditForm({...editForm, rentPrice: e.target.value})}
                    className="input-neo text-xl font-bold px-6" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400">Description</label>
                <textarea rows={3} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}
                  className="input-neo w-full px-6 py-4 resize-none text-sm font-medium" placeholder="Tell more about the item..." />
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
                <button onClick={() => setEditModal(null)} className="flex-1 py-4 font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Cancel</button>
                <button onClick={handleEditSave} className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 flex-[2] py-4 rounded-2xl font-bold flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-100 transition-all shadow-xl">
                  <Save size={20} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
