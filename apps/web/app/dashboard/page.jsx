"use client";

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import Link from 'next/link';
import { Package, Calendar, Repeat, Star, Edit, Trash2, CheckCircle, User, RotateCcw, X, Save } from 'lucide-react';

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
    return <main className="min-h-screen bg-cream"><Navbar /><div className="container mx-auto px-4 py-20 text-center font-black uppercase italic">Please log in</div></main>;
  }

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="container mx-auto px-4 py-8">
        {/* Profile Header */}
        <div className="card-neo bg-white p-8 mb-8 flex items-center gap-6">
          <div className="w-20 h-20 bg-accent-teal text-white border-4 border-black flex items-center justify-center text-4xl font-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            {user.name?.charAt(0) || <User size={32} />}
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">{user.name}</h1>
            <p className="text-sm text-gray-500 font-bold">{user.email}</p>
            {user.college && <p className="text-xs text-accent-teal font-black uppercase mt-1">{user.college}</p>}
            {user.rating > 0 && (
              <div className="flex items-center gap-1 mt-1">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                <span className="text-sm font-black">{user.rating} ({user.totalRatings} reviews)</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`px-6 py-3 font-black uppercase text-xs border-2 border-black whitespace-nowrap transition-all
                ${tab === i ? 'bg-black text-white shadow-none' : 'bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'}`}>
              {t}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 animate-pulse border-2 border-black" />)}</div>
        ) : (
          <>
            {/* ===== MY LISTINGS ===== */}
            {tab === 0 && (
              listings.length === 0 ? (
                <div className="card-neo bg-white p-16 text-center">
                  <div className="text-5xl mb-4">📦</div>
                  <h3 className="text-xl font-black uppercase italic mb-2">No listings yet</h3>
                  <Link href="/create" className="btn-neo bg-accent-teal text-white px-6 py-3 uppercase font-black inline-block mt-4">Post Your First Item</Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {listings.map(l => (
                    <div key={l._id} className="card-neo bg-white p-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                      <Link href={`/listing/${l._id}`} className="shrink-0 hover:opacity-80 transition-opacity">
                        <img src={l.images?.[0] || 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=100'} alt={l.title}
                          className="w-20 h-20 object-cover border-2 border-black" />
                      </Link>
                      <div className="flex-1 min-w-0">
                        <Link href={`/listing/${l._id}`} className="font-black uppercase text-sm hover:text-accent-teal truncate block transition-colors">{l.title}</Link>
                        <div className="flex flex-col">
                          {l.type?.includes('sell') && <p className="text-accent-teal font-black text-lg leading-tight">₹{l.price} <span className="text-[10px] font-bold text-gray-400 uppercase">(Sell)</span></p>}
                          {l.type?.includes('rent') && <p className="text-accent-teal font-black text-lg leading-tight">₹{l.rentPrice || l.price} <span className="text-[10px] font-bold text-gray-400 uppercase">(Rent)</span></p>}
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-[9px] font-black uppercase px-2 py-0.5 border border-black inline-block
                            ${l.status === 'active' ? 'bg-green-100' : l.status === 'sold' ? 'bg-red-100' : 'bg-yellow-100'}`}>{l.status}</span>
                          <span className="text-[9px] text-gray-400 font-bold">{l.condition} • {l.category}</span>
                        </div>
                      </div>
                      {/* Action buttons */}
                      <div className="flex gap-2 shrink-0 flex-wrap">
                        <button onClick={() => openEditModal(l)} title="Edit Price / Details"
                          className="p-2 border-2 border-black bg-blue-50 hover:bg-blue-100 transition-colors flex items-center gap-1 text-xs font-bold">
                          <Edit size={14} />
                        </button>
                        {l.status === 'active' ? (
                          <button onClick={() => handleStatusChange(l._id, 'sold')} title="Mark as Sold"
                            className="p-2 border-2 border-black bg-green-50 hover:bg-green-100 transition-colors flex items-center gap-1 text-xs font-bold">
                            <CheckCircle size={14} className="text-green-600" />
                          </button>
                        ) : (
                          <button onClick={() => handleStatusChange(l._id, 'active')} title="Reactivate"
                            className="p-2 border-2 border-black bg-accent-teal/10 hover:bg-accent-teal/20 transition-colors">
                            <RotateCcw size={14} className="text-accent-teal" />
                          </button>
                        )}
                        <button onClick={() => handleDelete(l._id)} title="Delete"
                          className="p-2 border-2 border-black bg-red-50 hover:bg-red-100 transition-colors">
                          <Trash2 size={14} className="text-red-500" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ===== MY RENTALS ===== */}
            {tab === 1 && (
              <div className="space-y-6">
                <h3 className="font-black uppercase text-sm text-gray-500">Items I'm Renting</h3>
                {rentals.asRenter?.length === 0 ? <p className="text-sm text-gray-400 font-bold">None</p> : (rentals.asRenter || []).map(r => (
                    <div key={r._id} className="card-neo bg-white p-4 flex items-center gap-4">
                      <Calendar size={20} className="text-accent-teal shrink-0" />
                      <div className="flex-1">
                        <Link href={`/listing/${r.listing?._id}`} className="font-black text-sm hover:text-accent-teal block">
                          {r.listing?.title || 'Item'}
                        </Link>
                        <p className="text-xs text-gray-500">{new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()}</p>
                      </div>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 border border-black ${r.status === 'active' ? 'bg-green-100' : 'bg-gray-100'}`}>{r.status}</span>
                    <span className="font-black text-accent-teal">₹{r.totalCost}</span>
                  </div>
                ))}
                <h3 className="font-black uppercase text-sm text-gray-500 mt-8">Items I've Rented Out</h3>
                {rentals.asOwner?.length === 0 ? <p className="text-sm text-gray-400 font-bold">None</p> : (rentals.asOwner || []).map(r => (
                  <div key={r._id} className="card-neo bg-white p-4 flex items-center gap-4">
                    <Calendar size={20} className="text-blue-500 shrink-0" />
                    <div className="flex-1">
                      <Link href={`/listing/${r.listing?._id}`} className="font-black text-sm hover:text-accent-teal block">
                        {r.listing?.title || 'Item'}
                      </Link>
                      <p className="text-xs text-gray-500">Renter: {r.renter?.name} • {new Date(r.startDate).toLocaleDateString()} → {new Date(r.endDate).toLocaleDateString()}</p>
                    </div>
                    <span className="font-black text-accent-teal">₹{r.totalCost}</span>
                  </div>
                ))}
              </div>
            )}

            {/* ===== MY TRADES ===== */}
            {tab === 2 && (
              trades.length === 0 ? (
                <div className="card-neo bg-white p-16 text-center">
                  <div className="text-5xl mb-4">🔄</div>
                  <h3 className="text-xl font-black uppercase italic">No trade proposals</h3>
                </div>
              ) : (
                <div className="space-y-4">
                  {trades.map(t => (
                    <div key={t._id} className="card-neo bg-white p-4 flex items-center gap-4">
                      <Repeat size={20} className="text-accent-teal shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                           <Link href={`/listing/${t.listing?._id}`} className="font-black text-sm hover:text-accent-teal">
                             {t.listing?.title}
                           </Link>
                           <span className="text-gray-400">↔</span>
                           <Link href={`/listing/${t.offeredListing?._id}`} className="font-black text-sm hover:text-accent-teal">
                             {t.offeredListing?.title}
                           </Link>
                        </div>
                        <p className="text-xs text-gray-500">
                          {t.proposer?._id === user._id ? 'You proposed' : `From ${t.proposer?.name}`}
                        </p>
                      </div>
                      <span className={`text-[9px] font-black uppercase px-2 py-0.5 border border-black
                        ${t.status === 'accepted' ? 'bg-green-100' : t.status === 'declined' ? 'bg-red-100' : 'bg-yellow-100'}`}>
                        {t.status}
                      </span>
                      {t.status === 'pending' && t.receiver?._id === user._id && (
                        <div className="flex gap-1">
                          <button onClick={async () => { await api.patch(`/trades/${t._id}`, { status: 'accepted' }); setTrades(prev => prev.map(p => p._id === t._id ? {...p, status:'accepted'} : p)); }}
                            className="px-3 py-1 bg-green-500 text-white text-[9px] font-black uppercase border border-black">Accept</button>
                          <button onClick={async () => { await api.patch(`/trades/${t._id}`, { status: 'declined' }); setTrades(prev => prev.map(p => p._id === t._id ? {...p, status:'declined'} : p)); }}
                            className="px-3 py-1 bg-red-500 text-white text-[9px] font-black uppercase border border-black">Decline</button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )
            )}

            {/* ===== REVIEWS ===== */}
            {tab === 3 && (
              reviews.length === 0 ? (
                <div className="card-neo bg-white p-16 text-center">
                  <div className="text-5xl mb-4">⭐</div>
                  <h3 className="text-xl font-black uppercase italic">No reviews yet</h3>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviews.map(r => (
                    <div key={r._id} className="card-neo bg-white p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-black text-sm">{r.reviewer?.name}</span>
                        <div className="flex">
                          {[1,2,3,4,5].map(s => <Star key={s} size={12} className={s <= r.rating ? 'text-yellow-500 fill-yellow-500' : 'text-gray-300'} />)}
                        </div>
                        <span className="text-[9px] text-gray-400 font-bold ml-auto">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      {r.comment && <p className="text-sm text-gray-600">{r.comment}</p>}
                    </div>
                  ))}
                </div>
              )
            )}
          </>
        )}
      </div>

      {/* ===== EDIT MODAL ===== */}
      {editModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setEditModal(null)}>
          <div className="card-neo bg-white p-8 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-black uppercase italic">Edit Listing</h2>
              <button onClick={() => setEditModal(null)} className="p-1"><X size={20} /></button>
            </div>

            <div className="flex items-center gap-3 mb-6 p-3 bg-cream border-2 border-black">
              <img src={editModal.images?.[0] || ''} alt="" className="w-12 h-12 object-cover border border-black" />
              <p className="font-black text-sm uppercase truncate">{editModal.title}</p>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-black uppercase mb-1 text-gray-500">Sale Price (₹)</label>
                  <input type="number" value={editForm.price} onChange={e => setEditForm({...editForm, price: e.target.value})}
                    className="input-neo w-full px-4 py-3 text-xl font-black" />
                </div>
                <div>
                  <label className="block text-xs font-black uppercase mb-1 text-gray-500">Rent Price (₹)</label>
                  <input type="number" value={editForm.rentPrice} onChange={e => setEditForm({...editForm, rentPrice: e.target.value})}
                    className="input-neo w-full px-4 py-3 text-xl font-black" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-black uppercase mb-1 text-gray-500">Description</label>
                <textarea rows={3} value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})}
                  className="input-neo w-full px-4 py-3 resize-none text-sm" />
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
              <div className="flex gap-3">
                <button onClick={() => setEditModal(null)} className="btn-neo bg-white flex-1 py-3 uppercase font-black text-sm">Cancel</button>
                <button onClick={handleEditSave} className="btn-neo bg-black text-white flex-1 py-3 uppercase font-black text-sm flex items-center justify-center gap-2">
                  <Save size={16} /> Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
