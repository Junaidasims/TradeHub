"use client";

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { getSocket } from '@/lib/socket';
import { Bell, Check, CheckCheck, MessageSquare, Repeat, Calendar, Star, X, Loader2, Info } from 'lucide-react';
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
      await api.patch(`/notifications/${notif._id}/read`);
      setNotifications(prev => prev.map(n => n._id === notif._id ? { ...n, read: true, type: 'rental_confirmed', message: 'Approved: ' + n.message } : n));
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
    } catch (err) { alert(err.response?.data?.msg || 'Rejection failed'); }
    finally { setProcessingId(null); }
  };

  if (!user) return (
    <main className="min-h-screen bg-cream dark:bg-darkBg">
      <Navbar />
      <div className="py-20 text-center text-gray-500 dark:text-gray-400 font-bold">Please log in to view notifications</div>
    </main>
  );

  return (
    <main className="min-h-screen bg-cream dark:bg-darkBg transition-colors duration-200 pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="flex justify-between items-center mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-1">Notifications</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Stay updated on your deals and messages</p>
          </div>
          {notifications.some(n => !n.read) && (
            <button onClick={markAllRead} className="px-4 py-2 bg-white dark:bg-slate-800 text-accent-teal rounded-xl text-xs font-bold border border-gray-100 dark:border-darkBorder shadow-sm hover:shadow-md transition-all flex items-center gap-2">
              <CheckCheck size={16} /> Mark All Read
            </button>
          )}
        </div>

        {loading ? (
          <div className="space-y-4">
            {[1,2,3,4].map(i => <div key={i} className="h-20 bg-white dark:bg-darkCard animate-pulse rounded-2xl border border-gray-100 dark:border-darkBorder" />)}
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-white dark:bg-darkCard rounded-[2.5rem] p-20 text-center shadow-sm border border-gray-100 dark:border-darkBorder">
            <div className="w-16 h-16 bg-gray-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-gray-300 mx-auto mb-6">
              <Bell size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">You're all caught up!</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">New notifications will appear here as they arrive.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map(n => {
              const Icon = ICONS[n.type] || Bell;
              const isProcessing = processingId === n._id;
              
              return (
                <div key={n._id} onClick={() => handleClick(n)}
                  className={`group relative p-5 rounded-2xl border transition-all cursor-pointer flex items-start gap-4
                    ${n.read 
                      ? 'bg-white/50 dark:bg-slate-800/30 border-gray-50 dark:border-darkBorder opacity-60' 
                      : 'bg-white dark:bg-darkCard border-accent-teal/20 dark:border-accent-teal/30 shadow-sm hover:shadow-md'}`}>
                  
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 transition-colors
                    ${n.read ? 'bg-gray-100 dark:bg-slate-700 text-gray-400' : 'bg-accent-teal/10 text-accent-teal'}`}>
                    <Icon size={22} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start gap-2">
                      <p className={`text-sm font-semibold leading-relaxed mb-1 ${n.read ? 'text-gray-600 dark:text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                        {n.message}
                      </p>
                      {!n.read && <div className="w-2 h-2 bg-accent-teal rounded-full shrink-0 mt-1.5" />}
                    </div>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{new Date(n.createdAt).toLocaleString()}</p>

                    {n.type === 'rental_request' && !n.read && (
                      <div className="flex gap-3 mt-4">
                        <button 
                          disabled={isProcessing}
                          onClick={(e) => handleApprove(e, n)}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white py-2.5 rounded-xl text-xs font-bold transition-all shadow-lg shadow-green-500/20 flex items-center justify-center gap-2">
                          {isProcessing ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                        </button>
                        <button 
                          disabled={isProcessing}
                          onClick={(e) => handleReject(e, n)}
                          className="flex-1 bg-white dark:bg-slate-800 border border-gray-100 dark:border-darkBorder text-gray-500 hover:bg-red-50 hover:text-red-500 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2">
                          <X size={14} /> Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className="mt-12 p-6 bg-blue-50 dark:bg-blue-500/5 rounded-3xl border border-blue-100 dark:border-blue-500/10 flex gap-4">
          <Info size={20} className="text-blue-500 shrink-0" />
          <p className="text-xs text-blue-600 dark:text-blue-400 font-medium leading-relaxed">
            Real-time notifications are enabled. You'll see new deal requests and messages immediately without refreshing the page.
          </p>
        </div>
      </div>
    </main>
  );
}
