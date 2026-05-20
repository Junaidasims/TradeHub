"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn, Search, Menu, User as UserIcon, Plus, LogOut, MessageSquare, Bell, X, Sun, Moon, Package } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useTheme } from "@/context/ThemeContext";
import { useRouter, usePathname } from "next/navigation";
import { getSocket } from "@/lib/socket";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifs, setUnreadNotifs] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const socket = getSocket();
    if (!socket) return;

    const handleUnread = () => setUnreadMessages(prev => prev + 1);
    const handleNotif = () => setUnreadNotifs(prev => prev + 1);

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
      setMobileOpen(false);
    }
  };

  const navLinks = [
    { href: '/listings', label: 'Browse' },
    { href: '/wishlist', label: 'Wishlist' },
    { href: '/messages', label: 'Messages', badge: unreadMessages },
  ];

  const isActive = (href) => pathname === href || pathname?.startsWith(href + '/');

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 ${
      scrolled
        ? 'bg-white/80 dark:bg-[#0b0f1a]/90 backdrop-blur-xl shadow-lg shadow-black/5 border-b border-slate-200/60 dark:border-white/5'
        : 'bg-white/60 dark:bg-[#0b0f1a]/60 backdrop-blur-md border-b border-transparent'
    }`}>
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-teal-500/30 group-hover:shadow-teal-500/50 transition-shadow">
            <Package size={16} className="text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900 dark:text-white tracking-tight">
            Trade<span className="text-teal-500">Hub</span>
          </span>
        </Link>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map(({ href, label, badge }) => (
            <Link
              key={href}
              href={href}
              className={`relative flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
                isActive(href)
                  ? 'bg-teal-50 dark:bg-teal-500/10 text-teal-600 dark:text-teal-400'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
              }`}
            >
              {label}
              {badge > 0 && (
                <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {badge > 9 ? '9+' : badge}
                </span>
              )}
            </Link>
          ))}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Search */}
          <form onSubmit={handleSearch} className="hidden sm:flex items-center h-9 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/8 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-teal-500/40 focus-within:border-teal-500/40 transition-all">
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-1.5 text-sm w-36 focus:w-48 transition-all duration-300 outline-none bg-transparent text-slate-700 dark:text-slate-200 placeholder:text-slate-400 dark:placeholder:text-slate-600"
            />
            <button type="submit" className="px-2.5 text-slate-400 hover:text-teal-500 transition-colors">
              <Search size={15} />
            </button>
          </form>

          {/* Theme */}
          <button
            onClick={toggleTheme}
            className="w-9 h-9 rounded-xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 hover:border-teal-500/40 transition-all flex items-center justify-center"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
          </button>

          {user ? (
            <>
              {/* Post button */}
              <Link
                href="/create"
                className="hidden sm:flex items-center gap-1.5 h-9 px-4 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-semibold shadow-md shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-px transition-all"
              >
                <Plus size={15} />
                Post
              </Link>

              {/* Notifications */}
              <button
                onClick={() => { router.push('/notifications'); setUnreadNotifs(0); }}
                className="relative w-9 h-9 rounded-xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/5 text-slate-500 dark:text-slate-400 hover:text-teal-500 dark:hover:text-teal-400 hover:border-teal-500/40 transition-all flex items-center justify-center"
              >
                <Bell size={16} />
                {unreadNotifs > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadNotifs > 9 ? '9+' : unreadNotifs}
                  </span>
                )}
              </button>

              {/* Avatar / Dashboard */}
              <Link
                href="/dashboard"
                className="flex items-center gap-2 h-9 pl-1 pr-3 rounded-xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/5 hover:border-teal-500/40 hover:bg-teal-50 dark:hover:bg-teal-500/5 transition-all"
              >
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                  {user.name?.charAt(0)?.toUpperCase() || <UserIcon size={12} />}
                </div>
                <span className="hidden lg:block text-sm font-semibold text-slate-700 dark:text-slate-200 max-w-[100px] truncate">
                  {user.name}
                </span>
              </Link>

              {/* Logout */}
              <button
                onClick={logout}
                className="w-9 h-9 rounded-xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/5 text-slate-400 hover:text-red-500 hover:border-red-200 dark:hover:border-red-500/30 hover:bg-red-50 dark:hover:bg-red-500/5 transition-all flex items-center justify-center"
                aria-label="Logout"
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 h-9 px-5 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 text-white text-sm font-semibold shadow-md shadow-teal-500/25 hover:shadow-teal-500/40 hover:-translate-y-px transition-all"
            >
              <LogIn size={15} />
              Login
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden w-9 h-9 rounded-xl border border-slate-200 dark:border-white/8 bg-white dark:bg-white/5 text-slate-500 flex items-center justify-center"
            onClick={() => setMobileOpen(!mobileOpen)}
          >
            {mobileOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden border-t border-slate-200 dark:border-white/5 bg-white/95 dark:bg-[#0b0f1a]/95 backdrop-blur-xl p-4 space-y-1 absolute w-full shadow-2xl shadow-black/20">
          <form onSubmit={handleSearch} className="flex items-center mb-3 bg-slate-100 dark:bg-white/5 rounded-xl overflow-hidden border border-slate-200 dark:border-white/8">
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 px-4 py-2.5 text-sm outline-none bg-transparent text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
            />
            <button type="submit" className="px-3 text-slate-400"><Search size={16} /></button>
          </form>
          {navLinks.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-teal-500 transition-colors"
              onClick={() => setMobileOpen(false)}
            >
              {label}
            </Link>
          ))}
          {user && (
            <>
              <Link href="/create" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5" onClick={() => setMobileOpen(false)}>
                <Plus size={16} /> Post Item
              </Link>
              <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5" onClick={() => setMobileOpen(false)}>
                <UserIcon size={16} /> Dashboard
              </Link>
            </>
          )}
        </div>
      )}
    </header>
  );
}
