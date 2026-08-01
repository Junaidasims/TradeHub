"use client";

import React from 'react';
import { Tag, Star } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function ItemCard({ id, name, category, condition, type, pricePerDay, ownerID, images, currentState }) {
  const router = useRouter();
  const getConditionColor = (cond) => {
    switch (cond?.toLowerCase()) {
      case 'pendingtrade': return 'bg-yellow-500';
      case 'available': return 'bg-accent-teal';
      default: return 'bg-gray-400';
    }
  };

  const getStatusBadge = (status) => {
    switch (status?.toLowerCase()) {
      case 'available': return 'bg-green-500';
      case 'pendingtrade': return 'bg-yellow-500';
      case 'rented': return 'bg-blue-500';
      case 'traded': return 'bg-purple-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <div 
      onClick={() => id && router.push(`/listing/${id}`)}
      className="card-neo bg-white overflow-hidden group cursor-pointer hover:border-accent-teal transition-all active:translate-x-1 active:translate-y-1"
    >
      <div className="h-48 bg-gray-200 relative">
        {images && images.length > 0 ? (
          <img src={images[0]} alt={name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold uppercase italic">No Image</div>
        )}
        <div className="absolute top-4 right-4">
           <span className={`px-3 py-1 border-2 border-black text-white text-xs font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${getConditionColor(condition)}`}>
             {condition}
           </span>
        </div>
        <div className="absolute bottom-4 left-4 flex gap-2">
           <span className="px-3 py-1 border-2 border-black bg-white text-black text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
             {type}
           </span>
           <span className={`px-3 py-1 border-2 border-black text-white text-[10px] font-black uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] ${getStatusBadge(currentState)}`}>
             {currentState}
           </span>
        </div>
      </div>
      
      <div className="p-6">
        <div className="flex justify-between items-start mb-2">
          <h3 className="text-xl font-black uppercase tracking-tight group-hover:text-accent-teal transition-colors line-clamp-1">{name}</h3>
          {(type === 'Rent' || type === 'Sell') && pricePerDay && (
            <span className="text-lg font-black text-accent-teal">
              ₹{pricePerDay}{type === 'Rent' && <small className="text-[10px] text-gray-500">/day</small>}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 text-xs font-bold text-gray-600 mb-4 uppercase italic">
          <Tag size={14} className="text-accent-teal" />
          {category}
        </div>

        <div className="border-t-2 border-black pt-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 rounded-full border-2 border-black bg-cream flex items-center justify-center font-black text-xs uppercase">
               {ownerID?.username?.[0] || '?'}
             </div>
             <div>
               <p className="text-[10px] font-black uppercase leading-none">{ownerID?.username || 'Unknown'}</p>
               <div className="flex items-center gap-1 text-[10px] text-accent-teal font-black">
                 <Star size={10} fill="currentColor" />
                 {ownerID?.reputationScore || 0}
               </div>
             </div>
          </div>
          <div className="text-[10px] font-black uppercase italic text-gray-400 group-hover:text-black">View Details →</div>
        </div>
      </div>
    </div>
  );
}
