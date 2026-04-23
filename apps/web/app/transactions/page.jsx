'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { Clock, CheckCircle, XCircle, ArrowRightLeft, CreditCard } from 'lucide-react';

export default function TransactionsPage() {
  const { user, loading } = useAuth();
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    if (user) {
      const fetchTransactions = async () => {
        try {
          const res = await api.get('/transactions/my');
          setTransactions(res.data);
        } catch (err) {
          console.error(err);
        }
      };
      fetchTransactions();
    }
  }, [user]);

  const handleAction = async (id, action) => {
    try {
      await api.put(`/transactions/${id}/${action}`);
      window.location.reload();
    } catch {
      alert('Action failed');
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!user) return <div>Auth required</div>;

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <h1 className="text-5xl font-black uppercase italic tracking-tighter mb-12">My <span className="text-accent-teal">Transactions</span></h1>

        <div className="space-y-8">
          {transactions.map((tx) => (
            <div key={tx._id} className="card-neo bg-white p-8 grid grid-cols-1 md:grid-cols-4 gap-8 items-center">
              <div className="flex flex-col gap-2">
                <span className={`w-fit px-3 py-1 border-2 border-black text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${
                  tx.status === 'Completed' ? 'bg-green-400 text-white' : 
                  tx.status === 'Accepted' ? 'bg-accent-teal text-white' : 
                  tx.status === 'Rejected' ? 'bg-red-400 text-white' : 'bg-yellow-400'
                }`}>
                  {tx.status}
                </span>
                <h3 className="text-xl font-black uppercase italic group-hover:text-accent-teal transition-colors">
                    {tx.itemID?.name}
                </h3>
                <div className="flex items-center gap-2 text-xs font-bold text-gray-500 uppercase italic">
                   {tx.type === 'Rent' ? <CreditCard size={14} /> : <ArrowRightLeft size={14} />}
                   {tx.type}
                </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 border-2 border-black bg-cream flex items-center justify-center font-black">
                   {tx.ownerID?.username?.[0] || '?'}
                 </div>
                 <div>
                   <p className="text-[10px] font-black uppercase text-gray-500">Counterparty</p>
                   <p className="text-sm font-black uppercase tracking-tight">
                     {tx.requesterID?._id === user._id ? tx.ownerID?.username : tx.requesterID?.username}
                   </p>
                 </div>
              </div>

              <div className="flex items-center gap-2 font-black text-gray-400 uppercase italic text-xs">
                <Clock size={16} />
                {new Date(tx.createdAt).toLocaleDateString()}
              </div>

              <div className="flex gap-2 justify-end">
                {tx.status === 'Pending' && tx.ownerID?._id === (user?.id || user?._id) && (
                  <>
                    <button onClick={() => handleAction(tx._id, 'accept')} className="btn-neo p-3 bg-accent-teal text-white shadow-none">
                      <CheckCircle size={20} />
                    </button>
                    <button onClick={() => handleAction(tx._id, 'reject')} className="btn-neo p-3 bg-red-400 text-white shadow-none">
                      <XCircle size={20} />
                    </button>
                  </>
                )}
                {tx.status === 'Accepted' && (
                  <button onClick={() => handleAction(tx._id, 'complete')} className="btn-neo bg-black text-white px-6 py-2 text-xs font-black uppercase italic">
                    Mark Complete
                  </button>
                )}
              </div>
            </div>
          ))}

          {transactions.length === 0 && (
            <div className="py-20 text-center font-black uppercase italic text-gray-400 text-2xl">
              No transactions yet. Start trading!
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
