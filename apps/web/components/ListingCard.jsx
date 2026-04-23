"use client";

import { Heart, Clock } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { useState } from "react";

export default function ListingCard({ id, title, price, rentPrice, category, type, condition, isRental, image, status, rentedUntil, views, seller }) {
  const router = useRouter();
  const { user } = useAuth();
  const [currentStatus, setCurrentStatus] = useState(status);

  const displayType = Array.isArray(type) ? type[0] : (type || 'sell');
  const isOwner = user && (seller?._id === user._id || seller === user._id);
  const isMultiType = Array.isArray(type) && type.length > 1;
  const isRented = currentStatus === 'rented';
  const isExpired = currentStatus === 'expired';

  const getRemainingTime = () => {
    if (!rentedUntil) return null;
    const diff = new Date(rentedUntil) - new Date();
    if (diff <= 0) return null;
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `Free in ${days}d ${hours}h`;
    if (hours > 0) return `Free in ${hours}h ${minutes}m`;
    return `Free in ${minutes}m`;
  };

  const timeLeft = getRemainingTime();

  const handleRelist = async (e) => {
    e.stopPropagation();
    try {
      await api.patch(`/listings/${id}/relist`);
      setCurrentStatus('active');
    } catch (err) {
      console.error('Relist failed:', err);
    }
  };

  return (
    <div className="card-neo flex flex-col h-full group">
      <div className="aspect-[4/3] border-2 border-black bg-white mb-4 relative overflow-hidden">
        {image ? (
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-500 bg-gray-100">
             {category === "Books" ? "📚" : category === "Electronics" ? "💻" : "📦"}
          </div>
        )}
        <div className="absolute top-2 left-2 flex gap-1">
           <span className={cn(
             "badge-neo text-white",
             displayType?.toLowerCase() === "rent" ? "bg-accent-teal" : "bg-accent-orange"
           )}>
             {displayType}
           </span>
           {isMultiType && (
             <span className="badge-neo bg-black text-white">+ {type.length - 1}</span>
           )}
        </div>

        {isRented && (
          <div className="absolute inset-x-0 bottom-0 bg-black/80 text-white py-2 text-center font-black uppercase text-[10px] tracking-widest italic animate-pulse">
            {timeLeft || 'RENTED'}
          </div>
        )}

        {isExpired && isOwner && (
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center p-4">
             <span className="text-white font-black uppercase mb-4 tracking-tighter italic">Rental Ended</span>
             <button 
               onClick={handleRelist}
               className="btn-neo bg-accent-teal text-white px-4 py-2 text-xs font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-none"
             >
               Re-list Now
             </button>
          </div>
        )}
      </div>
      <div className="flex-1">
        <div className="text-xs font-bold text-gray-500 uppercase mb-1">{category} | {condition}</div>
        <h3 className="text-xl font-black mb-2 leading-tight group-hover:text-accent-teal transition-colors truncate">{title}</h3>
      </div>

      <div className="mt-4 flex flex-col pt-4 border-t-2 border-black">
        <div className="flex items-center justify-between mb-2">
          <div className="flex flex-col">
            {type?.includes('sell') && (
              <span className="text-xl font-black italic tracking-tighter leading-none">
                ₹{price.toLocaleString()} <span className="text-[8px] font-bold text-gray-400 uppercase">Sell</span>
              </span>
            )}
            {type?.includes('rent') && (
              <span className="text-xl font-black italic tracking-tighter leading-none mt-1">
                ₹{(rentPrice || price).toLocaleString()} <span className="text-[8px] font-bold text-gray-400 uppercase">Rent</span>
              </span>
            )}
            {!type?.includes('sell') && !type?.includes('rent') && (
               <span className="text-xl font-black italic tracking-tighter">TRADE</span>
            )}
          </div>
        <div className="flex gap-2">
          <div className="text-xl font-black italic tracking-tighter leading-none mt-1">
             <span className="text-[10px] text-gray-400 font-bold">👁 {views || 0}</span>
          </div>
          <button className="w-8 h-8 border-2 border-black flex items-center justify-center hover:bg-black hover:text-white transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none">
            <Heart size={16} />
          </button>
          <button 
            className="btn-neo-primary py-1 px-3 text-sm"
            onClick={() => {
              router.push(`/listing/${id}`);
            }}
          >
            Details
          </button>
        </div>
      </div>
      {seller && (
        <div className="mt-2 text-[9px] font-bold text-gray-400 uppercase italic">
          by {seller.name || 'Unknown'}
        </div>
      )}
    </div>
  </div>
);
}
