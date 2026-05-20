"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Heart, Plus, X, Send, Check, Clock, AlertTriangle, Package, Trash2, MessageSquare, Filter, Sparkles, User } from 'lucide-react';

const CATEGORIES = ['Electronics', 'Books', 'Furniture', 'Clothing', 'Sports', 'Other'];
const URGENCY_STYLES = {
  low: { bg: 'bg-blue-100 dark:bg-blue-500/10', text: 'text-blue-700 dark:text-blue-400', label: 'Low Urgency' },
  medium: { bg: 'bg-yellow-100 dark:bg-yellow-500/10', text: 'text-yellow-700 dark:text-yellow-400', label: 'Medium' },
  high: { bg: 'bg-red-100 dark:bg-red-500/10', text: 'text-red-700 dark:text-red-400', label: 'Urgent' },
};

export default function WishlistPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showOfferModal, setShowOfferModal] = useState(null);
  const [offerMsg, setOfferMsg] = useState('');
  const [tab, setTab] = useState('community');
  const [filter, setFilter] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    title: '', description: '', category: 'Other', budget: '', urgency: 'medium'
  });

  const fetchRequests = async () => {
    setLoading(true);
    try {
      let url = '/wishlist';
      if (tab === 'mine') url = '/wishlist/mine';
      else if (filter) url = `/wishlist?category=${filter}`;
      const res = await api.get(url);
      setRequests(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, [tab, filter]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/wishlist', { ...form, budget: Number(form.budget) || 0 });
      setRequests(prev => [res.data, ...prev]);
      setShowCreate(false);
      setForm({ title: '', description: '', category: 'Other', budget: '', urgency: 'medium' });
    } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
  };

  const handleOffer = async (reqId) => {
    setSubmitting(true);
    try {
      const res = await api.post(`/wishlist/${reqId}/offer`, {
        message: offerMsg || 'I can help with this!'
      });
      setShowOfferModal(null);
      setOfferMsg('');
      if (res.data.conversationId) {
        router.push(`/messages?convo=${res.data.conversationId}`);
      }
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed');
    }
    finally { setSubmitting(false); }
  };

  const handleAcceptOffer = async (reqId, offerId) => {
    try {
      const res = await api.patch(`/wishlist/${reqId}/fulfill`, { offerId });
      setRequests(prev => prev.map(r => r._id === reqId ? res.data : r));
    } catch (err) { alert(err.response?.data?.msg || 'Failed'); }
  };

  const handleClose = async (reqId) => {
    try {
      await api.patch(`/wishlist/${reqId}/close`);
      setRequests(prev => prev.map(r => r._id === reqId ? { ...r, status: 'closed' } : r));
    } catch (err) { alert('Failed'); }
  };

  const handleDelete = async (reqId) => {
    if (!confirm('Delete this request?')) return;
    try {
      await api.delete(`/wishlist/${reqId}`);
      setRequests(prev => prev.filter(r => r._id !== reqId));
    } catch (err) { alert('Failed'); }
  };

  return (
    <main className="min-h-screen bg-cream dark:bg-darkBg transition-colors duration-200 pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
          <div className="text-center md:text-left">
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">Community Wishlist</h1>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Post what you need — someone on campus might have it!</p>
          </div>
          {user && (
            <button onClick={() => setShowCreate(true)}
              className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-8 py-4 rounded-2xl font-bold flex items-center gap-3 shadow-xl hover:scale-[1.02] active:scale-100 transition-all">
              <Plus size={20} /> Create a Request
            </button>
          )}
        </div>

        {/* Filters & Tabs Bar */}
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6 mb-10 p-2 bg-white dark:bg-darkCard rounded-3xl shadow-sm border border-gray-100 dark:border-darkBorder">
          <div className="flex gap-1 p-1 bg-gray-50 dark:bg-slate-800/50 rounded-2xl w-full lg:w-fit">
            <button onClick={() => setTab('community')}
              className={`flex-1 lg:flex-none px-8 py-2.5 rounded-xl font-bold text-sm transition-all
                ${tab === 'community' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}>
              Community Needs
            </button>
            {user && (
              <button onClick={() => setTab('mine')}
                className={`flex-1 lg:flex-none px-8 py-2.5 rounded-xl font-bold text-sm transition-all
                  ${tab === 'mine' ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600'}`}>
                My Requests
              </button>
            )}
          </div>

          {tab === 'community' && (
            <div className="flex items-center gap-3 overflow-x-auto w-full lg:w-auto pb-2 lg:pb-0 px-2 hide-scrollbar">
              <Filter size={16} className="text-gray-400 shrink-0" />
              <button onClick={() => setFilter('')}
                className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border
                  ${!filter ? 'bg-accent-teal text-white border-accent-teal' : 'bg-transparent text-gray-400 border-gray-100 dark:border-darkBorder'}`}>
                All
              </button>
              {CATEGORIES.map(c => (
                <button key={c} onClick={() => setFilter(c)}
                  className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider transition-all border whitespace-nowrap
                    ${filter === c ? 'bg-accent-teal text-white border-accent-teal' : 'bg-transparent text-gray-400 border-gray-100 dark:border-darkBorder'}`}>
                  {c}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1,2,3,4].map(i => <div key={i} className="h-64 bg-white dark:bg-darkCard animate-pulse rounded-[2rem] border border-gray-100 dark:border-darkBorder" />)}
          </div>
        ) : requests.length === 0 ? (
          <div className="bg-white dark:bg-darkCard rounded-[3rem] p-24 text-center shadow-sm border border-gray-100 dark:border-darkBorder max-w-4xl mx-auto">
            <div className="w-24 h-24 bg-gray-50 dark:bg-slate-800 rounded-[2rem] flex items-center justify-center text-gray-300 mx-auto mb-8">
              <Sparkles size={48} />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {tab === 'mine' ? "You haven't posted any requests" : "No requests found"}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 font-medium max-w-sm mx-auto mb-10">
              Be the first to share what you're looking for or adjust your filters.
            </p>
            {user && <button onClick={() => setShowCreate(true)} className="btn-neo-primary px-10 py-4">Create Your First Request</button>}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {requests.map(req => {
              const urg = URGENCY_STYLES[req.urgency] || URGENCY_STYLES.medium;
              const isOwner = user && user._id === req.user?._id;
              const alreadyOffered = req.offers?.some(o => o.user?._id === user?._id || o.user === user?._id);

              return (
                <div key={req._id} className={`group bg-white dark:bg-darkCard rounded-[2rem] p-8 shadow-sm border border-gray-50 dark:border-darkBorder transition-all hover:shadow-xl hover:scale-[1.01] ${req.status !== 'open' ? 'opacity-70' : ''}`}>
                  <div className="flex justify-between items-start mb-6">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-accent-teal to-accent-cyan text-white rounded-2xl flex items-center justify-center font-bold text-lg shadow-lg shadow-accent-teal/10">
                        {req.user?.name?.charAt(0)}
                      </div>
                      <div>
                        <span className="font-bold text-gray-900 dark:text-white block leading-none mb-1">{req.user?.name}</span>
                        <span className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{req.user?.college || 'Student'}</span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-[0.1em] ${urg.bg} ${urg.text} border border-current/10`}>
                        {urg.label}
                      </span>
                      <span className="text-[10px] text-gray-400 font-semibold">{new Date(req.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 group-hover:text-accent-teal transition-colors">{req.title}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-medium leading-relaxed line-clamp-3">{req.description || 'No additional details provided.'}</p>
                  </div>

                  <div className="flex items-center gap-3 mb-8">
                    <span className="px-3 py-1 bg-gray-50 dark:bg-slate-800 text-gray-400 text-[10px] font-bold uppercase tracking-wider rounded-lg border border-gray-100 dark:border-darkBorder">{req.category}</span>
                    {req.budget > 0 && (
                      <span className="text-accent-teal font-bold text-lg">Budget: ₹{req.budget}</span>
                    )}
                  </div>

                  {/* Offers & Status Feedbacks */}
                  <div className="space-y-4">
                    {req.status === 'open' && req.offers?.length > 0 && (
                      <div className="bg-accent-teal/5 dark:bg-accent-teal/10 rounded-2xl p-4 border border-accent-teal/10">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-accent-teal mb-3 flex items-center gap-2">
                          <Check size={14} /> {req.offers.length} Community Member{req.offers.length > 1 ? 's' : ''} Can Help
                        </p>
                        {isOwner && (
                          <div className="space-y-2">
                            {req.offers.map((offer, i) => (
                              <div key={i} className="flex items-center justify-between gap-4 bg-white dark:bg-slate-800/50 p-3 rounded-xl border border-gray-100 dark:border-darkBorder transition-all hover:border-accent-teal/50">
                                <div className="flex items-center gap-2 min-w-0">
                                  <div className="w-6 h-6 rounded-lg bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold text-gray-500">{offer.user?.name?.charAt(0)}</div>
                                  <p className="text-xs font-medium text-gray-600 dark:text-gray-300 truncate">{offer.message}</p>
                                </div>
                                <button onClick={() => handleAcceptOffer(req._id, offer._id)}
                                  className="px-4 py-1.5 bg-accent-teal text-white rounded-lg font-bold text-[10px] uppercase shadow-sm shadow-accent-teal/10 hover:scale-105 transition-all">
                                  Accept
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}

                    {req.status === 'fulfilled' && (
                      <div className="bg-green-50 dark:bg-green-500/10 rounded-2xl p-4 flex items-center gap-4 border border-green-100 dark:border-green-500/20">
                        <div className="w-10 h-10 rounded-xl bg-green-500 text-white flex items-center justify-center">
                          <Check size={20} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-green-700 dark:text-green-400 uppercase tracking-widest">Request Fulfilled</p>
                          <p className="text-xs text-green-600 dark:text-green-500 font-medium">Helping hand from {req.fulfilledBy?.name || 'Anonymous'}</p>
                        </div>
                      </div>
                    )}

                    {/* Action Row */}
                    <div className="pt-2 flex flex-wrap gap-3">
                      {!isOwner && user && req.status === 'open' && !alreadyOffered && (
                        <button onClick={() => { setShowOfferModal(req._id); setOfferMsg(''); }}
                          className="flex-1 bg-accent-teal hover:bg-accent-teal/90 text-white py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3 shadow-lg shadow-accent-teal/10 transition-all">
                          <Package size={18} /> I Can Help with This
                        </button>
                      )}
                      {alreadyOffered && req.status === 'open' && !isOwner && (
                        <div className="flex-1 bg-white dark:bg-slate-800 border-2 border-accent-teal/30 text-accent-teal py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-3">
                          <MessageSquare size={18} /> Offer Sent &bull; Check Messages
                        </div>
                      )}
                      {isOwner && req.status === 'open' && (
                        <div className="flex gap-3 w-full">
                          <button onClick={() => handleClose(req._id)}
                            className="flex-1 bg-gray-50 dark:bg-slate-800 hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all">
                            <X size={18} /> Close Request
                          </button>
                          <button onClick={() => handleDelete(req._id)}
                            className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-500/10 text-red-500 hover:bg-red-100 transition-all">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Request Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300" onClick={() => setShowCreate(false)}>
          <div className="bg-white dark:bg-darkCard rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">New Request</h2>
              <button onClick={() => setShowCreate(false)} className="p-2 bg-gray-50 dark:bg-slate-800 rounded-full hover:rotate-90 transition-all">
                <X size={20} className="text-gray-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400">What do you need?</label>
                <input type="text" required value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  className="input-neo w-full px-6 py-4 font-bold" placeholder="e.g. Scientific Calculator, Chemistry Notes" />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400">Additional Details</label>
                <textarea rows={3} value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  className="input-neo w-full px-6 py-4 resize-none font-medium" placeholder="Describe the specifics..." />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400">Category</label>
                  <select value={form.category} onChange={e => setForm({...form, category: e.target.value})}
                    className="input-neo w-full px-6 bg-white dark:bg-slate-800 font-semibold">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400">Max Budget (₹)</label>
                  <input type="number" value={form.budget} onChange={e => setForm({...form, budget: e.target.value})}
                    className="input-neo w-full px-6" placeholder="Optional" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400">How urgent is it?</label>
                <div className="flex gap-2 p-1.5 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                  {['low', 'medium', 'high'].map(u => (
                    <button key={u} type="button" onClick={() => setForm({...form, urgency: u})}
                      className={`flex-1 py-3 font-bold text-[10px] uppercase tracking-wider rounded-xl transition-all
                        ${form.urgency === u 
                          ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' 
                          : 'text-gray-400 hover:text-gray-600'}`}>
                      {u === 'high' ? 'Urgent' : u === 'medium' ? 'Normal' : 'Low'}
                    </button>
                  ))}
                </div>
              </div>
              <button type="submit" className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-5 rounded-[1.5rem] font-bold text-lg flex items-center justify-center gap-3 shadow-xl hover:scale-[1.01] active:scale-100 transition-all mt-4">
                <Plus size={20} /> Publish Request
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Offer Modal */}
      {showOfferModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-300" onClick={() => setShowOfferModal(null)}>
          <div className="bg-white dark:bg-darkCard rounded-[2.5rem] p-10 w-full max-w-lg shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-accent-teal/10 text-accent-teal rounded-full flex items-center justify-center mx-auto mb-4">
                <Package size={36} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Offer to Help</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Send a quick message to start the conversation.</p>
            </div>
            
            <textarea rows={4} value={offerMsg} onChange={e => setOfferMsg(e.target.value)}
              className="input-neo w-full px-6 py-4 resize-none mb-8 font-medium" placeholder="Hi! I have this item and I'm happy to help you out..." />
            
            <div className="flex gap-4">
              <button onClick={() => setShowOfferModal(null)} className="flex-1 py-4 font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">Cancel</button>
              <button onClick={() => handleOffer(showOfferModal)} disabled={submitting}
                className="flex-[2] bg-accent-teal hover:bg-accent-teal/90 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-3 shadow-xl shadow-accent-teal/10 transition-all hover:scale-[1.02]">
                {submitting ? <Loader2 size={20} className="animate-spin" /> : <Send size={18} />}
                {submitting ? 'Sending...' : 'Send Offer & Chat'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}

function Loader2(props) {
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
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
