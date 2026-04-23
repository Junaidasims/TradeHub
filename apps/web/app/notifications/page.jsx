"use client";

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Bell, Check, CheckCheck, MessageSquare, Repeat, Calendar, Star, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

const ICONS = {
  message: MessageSquare,
  trade_proposal: Repeat,
  trade_accepted: Check,
  trade_declined: Bell,
  rental_confirmed: Calendar,
  rental_request: Calendar,
  review: Star
};

export default function NotificationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);

  useEffect(() => {
    const fetchNotifs = async () => {
      try {
        const res = await api.get('/notifications');
        setNotifications(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    if (user) fetchNotifs();
  }, [user]);

  // Real-time notifications
  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;
    const handler = (notif) => setNotifications(prev => [notif, ...prev]);
    socket.on('new_notification', handler);
    return () => socket.off('new_notification', handler);
  }, []);

  const markAllRead = async () => {
    try {
      await api.patch('/notifications/read-all');
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) { console.error(err); }
  };

  const handleClick = async (notif) => {
    if (!notif.read) {
      await api.patch(`/notifications/${notif._id}/read`);
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
    }
    if (notif.link) router.push(notif.link);
  };

  const handleApprove = async (e, notif) => {
    e.stopPropagation();
    if (!notif.data?.rentalId) return;
    setProcessingId(notif._id);
    try {
      await api.patch(`/rentals/${notif.data.rentalId}/approve`);
      // Mark notif as read and remove action buttons by changing type or state
      await api.patch(`/notifications/${notif._id}/read`);
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true, type: 'rental_confirmed', message: 'Approved: ' + n.message } : n));
      alert('Rental approved!');
    } catch (err) { alert(err.response?.data?.msg || 'Approval failed'); }
    finally { setProcessingId(null); }
  };

  const handleReject = async (e, notif) => {
    e.stopPropagation();
    if (!notif.data?.rentalId) return;
    setProcessingId(notif._id);
    try {
      await api.patch(`/rentals/${notif.data.rentalId}/reject`);
      await api.patch(`/notifications/${notif._id}/read`);
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true, type: 'trade_declined', message: 'Rejected: ' + n.message } : n));
      alert('Rental rejected');
    } catch (err) { alert(err.response?.data?.msg || 'Rejection failed'); }
    finally { setProcessingId(null); }
  };

  if (!user) return <main className="min-h-screen bg-cream"><Navbar /><div className="py-20 text-center font-black uppercase italic">Please log in</div></main>;

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-black uppercase italic tracking-tighter flex items-center gap-3">
            <Bell size={28} className="text-accent-teal" /> Notifications
          </h1>
          {notifications.some(n => !n.read) && (
            <button onClick={markAllRead} className="btn-neo bg-white px-4 py-2 text-xs uppercase font-black flex items-center gap-1">
              <CheckCheck size={14} /> Mark All Read
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 bg-gray-100 animate-pulse border-2 border-black" />)}</div>
        ) : notifications.length === 0 ? (
          <div className="card-neo bg-white p-16 text-center">
            <div className="text-5xl mb-4">🔔</div>
            <h3 className="text-xl font-black uppercase italic">No notifications</h3>
            <p className="text-sm text-gray-500 font-bold mt-2">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {notifications.map(n => {
              const Icon = ICONS[n.type] || Bell;
              const isProcessing = processingId === n._id;
              
              return (
                <div key={n._id} onClick={() => handleClick(n)}
                  className={`w-full text-left card-neo p-4 flex flex-col sm:flex-row sm:items-center gap-4 transition-all cursor-pointer
                    ${n.read ? 'bg-white opacity-70' : 'bg-white border-l-4 border-l-accent-teal shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]'}`}>
                  
                  <div className="flex items-center gap-4 flex-1">
                    <Icon size={18} className="text-accent-teal shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-bold">{n.message}</p>
                      <p className="text-[9px] text-gray-400 font-bold mt-1 lowercase tracking-widest">{new Date(n.createdAt).toLocaleString()}</p>
                    </div>
                  </div>

                  {n.type === 'rental_request' && !n.read && (
                    <div className="flex gap-2 mt-2 sm:mt-0">
                      <button 
                        disabled={isProcessing}
                        onClick={(e) => handleApprove(e, n)}
                        className="btn-neo bg-green-500 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-1 hover:scale-105 active:scale-95 transition-all">
                        <Check size={12} /> Yes
                      </button>
                      <button 
                        disabled={isProcessing}
                        onClick={(e) => handleReject(e, n)}
                        className="btn-neo bg-red-500 text-white px-4 py-2 text-[10px] font-black uppercase flex items-center gap-1 hover:scale-105 active:scale-95 transition-all">
                        <X size={12} /> No
                      </button>
                    </div>
                  )}

                  {!n.read && n.type !== 'rental_request' && <div className="hidden sm:block w-2 h-2 bg-accent-teal rounded-full shrink-0" />}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
