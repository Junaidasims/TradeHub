'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { MapPin, Star, ShieldCheck, ArrowLeft, Send } from 'lucide-react';

export default function ItemDetail() {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const { user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    const fetchItem = async () => {
      try {
        const res = await api.get(`/items/${id}`);
        setItem(res.data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchItem();
  }, [id]);

  const handleRequest = async () => {
    if (!user || !item) return router.push('/login');
    try {
      if (item.type === 'Rent') {
        // 1. Create Rental request
        const rentalRes = await api.post('/rentals', { listingId: id });
        const rentalId = rentalRes.data._id;

        // 2. Get or create conversation with owner
        const ownerId = item.ownerID?._id || item.ownerID;
        const convoRes = await api.post('/conversations', { receiverId: ownerId });
        const convoId = convoRes.data._id;

        // 3. Send interactive offer message
        await api.post('/messages', {
          conversationId: convoId,
          text: `[rental-offer:${rentalId}]`
        });

        // 4. Redirect to chat
        router.push(`/messages?convo=${convoId}`);
      } else {
        alert('Trade flow not yet fully implemented with interactive cards.');
      }
    } catch (err) {
      alert(err.response?.data?.msg || 'Request failed');
    }
  };

  if (!item) return <div className="min-h-screen bg-cream flex items-center justify-center font-black uppercase italic">Scanning Item...</div>;

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="container mx-auto px-4 py-12">
        <button onClick={() => router.back()} className="mb-8 flex items-center gap-2 font-black uppercase text-sm hover:text-accent-teal transition-colors">
          <ArrowLeft size={16} /> Back to Browse
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          {/* Image Gallery */}
          <div className="space-y-6">
            <div className="card-neo bg-white aspect-square overflow-hidden bg-gray-100">
               {item.images && item.images.length > 0 ? (
                 <img src={item.images[0]} alt={item.name} className="w-full h-full object-cover" />
               ) : (
                 <div className="w-full h-full flex items-center justify-center text-gray-300 text-6xl uppercase font-black italic">No Image</div>
               )}
            </div>
            <div className="flex gap-4">
              {[1,2,3].map(i => (
                <div key={i} className="card-neo bg-white w-24 h-24 bg-gray-50 border-gray-200 opacity-50"></div>
              ))}
            </div>
          </div>

          {/* Details */}
          <div className="space-y-10">
            <header>
              <div className="flex items-center gap-4 mb-4">
                <span className="px-3 py-1 bg-accent-teal text-white text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">{item.category}</span>
                <span className="px-3 py-1 bg-white text-black text-xs font-black uppercase border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] uppercase italic">{item.condition}</span>
              </div>
              <h1 className="text-6xl font-black uppercase tracking-tighter mb-4 italic leading-none">{item.name}</h1>
              {item.type === 'Rent' ? (
                <p className="text-4xl font-black text-accent-teal">₹{item.pricePerDay}<span className="text-lg text-gray-500 uppercase italic">/day</span></p>
              ) : (
                <p className="text-4xl font-black text-accent-cyan italic">FOR TRADE</p>
              )}
            </header>

            <div className="card-neo bg-white p-8 space-y-6">
              <h3 className="text-xl font-black uppercase italic">Owner Information</h3>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-accent-teal text-white border-2 border-black flex items-center justify-center text-2xl font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    {item.ownerID?.username?.[0] || '?'}
                  </div>
                  <div>
                    <h4 className="text-xl font-black uppercase tracking-tight">{item.ownerID?.username}</h4>
                    <div className="flex items-center gap-1 text-accent-teal font-black text-sm">
                       <Star size={16} fill="currentColor" />
                       {item.ownerID?.reputationScore} REPUTATION
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center gap-1 text-xs font-bold text-gray-500 uppercase italic mb-1">
                    <MapPin size={14} /> 1.2 KM AWAY
                  </div>
                  <div className="flex items-center gap-1 text-xs font-bold text-green-600 uppercase italic">
                    <ShieldCheck size={14} /> VERIFIED STUDENT
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-6">
              <button 
                onClick={handleRequest}
                disabled={item.currentState !== 'Available'}
                className="flex-1 btn-neo bg-black text-white py-6 text-2xl font-black uppercase italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {item.currentState === 'Available' ? 'REQUEST NOW' : 'NOT AVAILABLE'}
              </button>
              <button className="btn-neo bg-white p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
                <Send size={32} />
              </button>
            </div>
            
            <p className="font-bold text-gray-600 italic leading-relaxed">
              &quot;This item is available for {item.type?.toLowerCase()}. Please contact me for pickup at the Main Canteen area during evening hours. Item is in {item.condition} condition.&quot;
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
