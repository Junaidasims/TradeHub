"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn, Search, Menu, User as UserIcon, Plus, LogOut, MessageSquare, Bell, X } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUnread = () => {
      setUnreadMessages(prev => prev + 1);
    };
    const handleNotif = (notif) => {
      setUnreadNotifs(prev => prev + 1);
      if (notif?.type === 'rental_request') {
        alert(notif.message);
      }
    };

    socket.on('unread_count_updated', handleUnread);
    socket.on('new_notification', handleNotif);

    return () => {
      socket.off('unread_count_updated', handleUnread);
      socket.off('new_notification', handleNotif);
    };
  }, [user]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/listings?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <nav className="sticky top-0 z-50 w-full bg-cream border-b-2 border-black py-3">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-black tracking-tighter flex items-center gap-2">
          <div className="w-8 h-8 bg-accent-teal border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center text-white">
            T
          </div>
          TRADEHUB
          <span className="text-[10px] bg-black text-white px-1 ml-1 uppercase">Campus</span>
        </Link>

        <div className="hidden md:flex items-center gap-6 font-bold uppercase text-sm">
          <Link href="/listings" className="hover:text-accent-teal transition-colors">Browse</Link>
          <Link href="/wishlist" className="hover:text-accent-teal transition-colors">Wishlist</Link>
          <Link href="/messages" className="hover:text-accent-teal transition-colors relative">
            Messages
            {unreadMessages > 0 && (
              <span className="absolute -top-2 -right-4 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center border border-black">
                {unreadMessages}
              </span>
            )}
          </Link>
        </div>

        <div className="flex items-center gap-3">
          {/* Search */}
          <form onSubmit={handleSearch} className="hidden sm:flex items-center border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-sm w-40 focus:w-56 transition-all outline-none bg-white"
            />
            <button type="submit" className="px-2 py-1.5 bg-black text-white">
              <Search size={16} />
            </button>
          </form>

          {user ? (
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/create")}
                className="hidden sm:flex btn-neo bg-black text-white py-2 px-4 text-sm gap-2"
              >
                <Plus size={18} /> POST
              </button>

              {/* Notifications Bell */}
              <button
                onClick={() => router.push("/notifications")}
                className="relative p-2 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
              >
                <Bell size={18} />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center border border-black">
                    {unreadNotifs}
                  </span>
                )}
              </button>

              {/* Messages */}
              <button
                onClick={() => { setUnreadMessages(0); router.push("/messages"); }}
                className="relative p-2 border-2 border-black bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none transition-all"
              >
                <MessageSquare size={18} />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center border border-black">
                    {unreadMessages}
                  </span>
                )}
              </button>

              <Link href="/dashboard" className="flex items-center gap-2 font-black border-2 border-black px-3 py-1 bg-accent-teal text-white shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                <UserIcon size={18} />
                <span className="hidden lg:inline">{user.name || user.username}</span>
              </Link>
              <button onClick={logout} className="p-2 border-2 border-black bg-white hover:bg-red-50 transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:shadow-none">
                <LogOut size={18} className="text-red-500" />
              </button>
            </div>
          ) : (
            <Link href="/login" className="btn-neo bg-accent-teal text-white text-sm py-2 px-6 flex items-center gap-2 font-black uppercase">
              <LogIn size={18} /> Login
            </Link>
          )}

          <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t-2 border-black bg-cream p-4 space-y-4 font-bold uppercase text-sm">
          <Link href="/listings" className="block hover:text-accent-teal" onClick={() => setMobileOpen(false)}>Browse</Link>
          <Link href="/messages" className="block hover:text-accent-teal" onClick={() => setMobileOpen(false)}>Messages</Link>
          {user && <Link href="/create" className="block hover:text-accent-teal" onClick={() => setMobileOpen(false)}>Post Item</Link>}
          {user && <Link href="/dashboard" className="block hover:text-accent-teal" onClick={() => setMobileOpen(false)}>Dashboard</Link>}
        </div>
      )}
    </nav>
  );
}
