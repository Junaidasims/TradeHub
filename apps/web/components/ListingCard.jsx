"use client";

import { Heart, Clock, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import api from "@/lib/api";
import { useState } from "react";
import { calculateDistance, formatDistance } from "@/lib/geo";

export default function ListingCard({ id, title, price, rentPrice, category, type, condition, isRental, image, status, rentedUntil, views, seller, itemLocation, userLocation }) {
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
    <div className="card-neo card-shine flex flex-col h-full group cursor-pointer" onClick={() => router.push(`/listing/${id}`)}>
      <div className="aspect-[4/3] rounded-xl bg-gray-100 dark:bg-slate-800 mb-4 relative overflow-hidden shadow-sm">
        {image ? (
          <img 
            src={image} 
            alt={title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-4xl group-hover:scale-110 transition-transform duration-500 bg-gray-100 dark:bg-slate-800 opacity-50">
             {category === "Books" ? "📚" : category === "Electronics" ? "💻" : "📦"}
          </div>
        )}
        <div className="absolute top-3 left-3 flex gap-2">
           <span className={cn(
             "px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md text-white shadow-sm backdrop-blur-md",
             displayType?.toLowerCase() === "rent" ? "bg-accent-teal/90" : "bg-orange-500/90"
           )}>
             {displayType}
           </span>
           {isMultiType && (
             <span className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md bg-gray-900/90 text-white shadow-sm backdrop-blur-md">+ {type.length - 1}</span>
           )}
        </div>

        {isRented && (
          <div className="absolute inset-x-0 bottom-0 bg-gray-900/90 backdrop-blur-sm text-white py-2 text-center font-bold uppercase text-[10px] tracking-widest animate-pulse">
            {timeLeft || 'RENTED'}
          </div>
        )}

        {isExpired && isOwner && (
          <div className="absolute inset-0 bg-gray-900/70 backdrop-blur-sm flex flex-col items-center justify-center p-4">
             <span className="text-white font-bold uppercase mb-4 tracking-tight">Rental Ended</span>
             <button 
               onClick={handleRelist}
               className="btn-neo-primary px-4 py-2 text-xs font-bold shadow-md hover:scale-105"
             >
               Re-list Now
             </button>
          </div>
        )}
      </div>
      
      <div className="flex-1">
        <div className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2">{category} &bull; {condition}</div>
        <h3 className="text-lg font-bold mb-2 leading-tight text-gray-900 dark:text-white group-hover:text-accent-teal dark:group-hover:text-accent-cyan transition-colors line-clamp-2">{title}</h3>
      </div>

      <div className="mt-4 flex flex-col pt-4 border-t border-gray-100 dark:border-darkBorder">
        <div className="flex items-end justify-between mb-2">
          <div className="flex flex-col gap-1">
            {type?.includes('sell') && (
              <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white leading-none">
                ₹{price.toLocaleString()} <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase ml-1">Sell</span>
              </span>
            )}
            {type?.includes('rent') && (
              <span className="text-lg font-bold tracking-tight text-accent-teal leading-none">
                ₹{(rentPrice || price).toLocaleString()} <span className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase ml-1">Rent/Day</span>
              </span>
            )}
            {!type?.includes('sell') && !type?.includes('rent') && (
               <span className="text-lg font-bold tracking-tight text-gray-900 dark:text-white">Trade Only</span>
            )}
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 flex items-center gap-1">
               <span className="text-[10px]">👁</span> {views || 0}
            </span>
            <button 
              onClick={(e) => { e.stopPropagation(); /* Add wishlist logic here */ }}
              className="w-8 h-8 rounded-full border border-gray-200 dark:border-darkBorder flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 dark:hover:border-red-500/30 transition-colors shadow-sm"
            >
              <Heart size={14} />
            </button>
          </div>
        </div>
        {seller && (
          <div className="mt-1 flex items-center justify-between">
            <div className="text-[10px] font-medium text-gray-400 dark:text-gray-500 truncate max-w-[60%]">
              By {seller.name || 'Unknown'}
            </div>
            {itemLocation?.coordinates && userLocation && (
              <div className="flex items-center gap-1 text-[10px] font-bold text-accent-teal uppercase italic">
                <MapPin size={10} />
                {formatDistance(calculateDistance(
                  userLocation.lat,
                  userLocation.lng,
                  itemLocation.coordinates[1],
                  itemLocation.coordinates[0]
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
