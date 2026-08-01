'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import {
  ShoppingBag, CheckCircle, XCircle, Clock,
  ArrowUpRight, ArrowDownLeft, Receipt
} from 'lucide-react';

const statusConfig = {
  paid:    { label: 'Paid',    bg: 'bg-green-50 dark:bg-green-500/10',   text: 'text-green-600 dark:text-green-400',   border: 'border-green-100 dark:border-green-500/20',   icon: CheckCircle },
  created: { label: 'Pending', bg: 'bg-yellow-50 dark:bg-yellow-500/10', text: 'text-yellow-600 dark:text-yellow-400',  border: 'border-yellow-100 dark:border-yellow-500/20',  icon: Clock },
  failed:  { label: 'Failed',  bg: 'bg-red-50 dark:bg-red-500/10',       text: 'text-red-600 dark:text-red-400',        border: 'border-red-100 dark:border-red-500/20',        icon: XCircle },
};

function PaymentRow({ p, userId }) {
  const isBuyer  = String(p.buyer?._id)  === String(userId);
  const isSeller = String(p.seller?._id) === String(userId);
  const cfg = statusConfig[p.status] || statusConfig.created;
  const StatusIcon = cfg.icon;

  // Human-readable sentence
  const sentence = isBuyer
    ? <>You paid <span className="font-bold text-gray-900 dark:text-white">₹{(p.amount / 100).toLocaleString()}</span> to <span className="font-bold text-gray-900 dark:text-white">{p.seller?.name}</span> for</>
    : <>You received <span className="font-bold text-gray-900 dark:text-white">₹{(p.amount / 100).toLocaleString()}</span> from <span className="font-bold text-gray-900 dark:text-white">{p.buyer?.name}</span> for</>;

  return (
    <div className="bg-white dark:bg-darkCard rounded-2xl border border-gray-100 dark:border-darkBorder p-5 flex items-center gap-4 hover:shadow-md transition-shadow">

      {/* Direction icon */}
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
        isBuyer
          ? 'bg-red-50 dark:bg-red-500/10'
          : 'bg-green-50 dark:bg-green-500/10'
      }`}>
        {isBuyer
          ? <ArrowUpRight size={20} className="text-red-500" />
          : <ArrowDownLeft size={20} className="text-green-500" />
        }
      </div>

      {/* Item image */}
      <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0 bg-gray-100 dark:bg-slate-800 border border-gray-100 dark:border-darkBorder">
        {p.listing?.images?.[0] ? (
          <img src={p.listing.images[0]} alt={p.listing?.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ShoppingBag size={18} className="text-gray-300 dark:text-gray-600" />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-gray-500 dark:text-gray-400 leading-snug">
          {sentence}{' '}
          <Link
            href={`/listing/${p.listing?._id}`}
            className="font-bold text-accent-teal hover:underline truncate"
          >
            {p.listing?.title || 'Deleted listing'}
          </Link>
        </p>
        <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">
          {new Date(p.createdAt).toLocaleDateString('en-IN', {
            day: 'numeric', month: 'short', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
          })}
        </p>
      </div>

      {/* Status badge + amount */}
      <div className="text-right shrink-0 flex flex-col items-end gap-1.5">
        <p className={`text-lg font-bold ${isBuyer ? 'text-red-500' : 'text-green-500'}`}>
          {isBuyer ? '−' : '+'}₹{(p.amount / 100).toLocaleString()}
        </p>
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-lg border ${cfg.bg} ${cfg.text} ${cfg.border}`}>
          <StatusIcon size={10} /> {cfg.label}
        </span>
      </div>
    </div>
  );
}

export default function TransactionsPage() {
  const { user, loading: authLoading } = useAuth();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' | 'sent' | 'received'

  useEffect(() => {
    if (!user) return;
    api.get('/payments/my')
      .then(res => setPayments(res.data))
      .catch(err => console.error(err))
      .finally(() => setLoading(false));
  }, [user]);

  if (authLoading) return null;

  if (!user) return (
    <main className="min-h-screen bg-cream dark:bg-darkBg">
      <Navbar />
      <div className="container mx-auto px-4 py-20 text-center">
        <p className="font-bold text-gray-500 dark:text-gray-400">Please <Link href="/login" className="text-accent-teal hover:underline">log in</Link> to view transactions.</p>
      </div>
    </main>
  );

  const filtered = payments.filter(p => {
    if (filter === 'sent')     return String(p.buyer?._id)  === String(user._id);
    if (filter === 'received') return String(p.seller?._id) === String(user._id);
    return true;
  });

  // Only show paid sell transactions (as per your requirement)
  const sellOnly = filtered.filter(p => p.purpose === 'sell');

  const tabs = [
    { key: 'all',      label: 'All',      count: payments.filter(p => p.purpose === 'sell').length },
    { key: 'sent',     label: 'Sent',     count: payments.filter(p => p.purpose === 'sell' && String(p.buyer?._id)  === String(user._id)).length },
    { key: 'received', label: 'Received', count: payments.filter(p => p.purpose === 'sell' && String(p.seller?._id) === String(user._id)).length },
  ];

  return (
    <main className="min-h-screen bg-cream dark:bg-darkBg transition-colors duration-200 pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-10 max-w-3xl">

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-2xl bg-accent-teal/10 dark:bg-accent-teal/20 flex items-center justify-center">
            <Receipt size={20} className="text-accent-teal" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white tracking-tight">Transactions</h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">All payments sent and received on TradeHub</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 bg-white dark:bg-darkCard rounded-2xl p-1.5 border border-gray-100 dark:border-darkBorder w-fit shadow-sm">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                filter === tab.key
                  ? 'bg-accent-teal text-white shadow-md shadow-accent-teal/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
              }`}
            >
              {tab.label}
              {tab.count > 0 && (
                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                  filter === tab.key ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-slate-700 text-gray-500 dark:text-gray-400'
                }`}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white dark:bg-darkCard rounded-2xl border border-gray-100 dark:border-darkBorder p-5 h-20 animate-pulse" />
            ))}
          </div>
        ) : sellOnly.length === 0 ? (
          <div className="py-24 text-center bg-white dark:bg-darkCard rounded-3xl border border-gray-100 dark:border-darkBorder">
            <div className="w-16 h-16 bg-gray-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">💳</div>
            <p className="font-bold text-gray-500 dark:text-gray-400 mb-1">No transactions yet</p>
            <p className="text-sm text-gray-400 dark:text-gray-500 mb-6">
              {filter === 'sent' ? "You haven't bought anything yet." : filter === 'received' ? "You haven't received any payments yet." : "No payments have been made."}
            </p>
            <Link href="/listings" className="inline-block px-6 py-2.5 bg-accent-teal text-white rounded-xl text-sm font-bold hover:bg-accent-teal/90 transition-colors">
              Browse Listings
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {sellOnly.map(p => (
              <PaymentRow key={p._id} p={p} userId={user._id} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
