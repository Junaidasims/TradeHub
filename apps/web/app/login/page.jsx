"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { LogIn, Eye, EyeOff, Loader2, Lock, Mail } from 'lucide-react';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', form);
      await login(res.data.token, res.data.user);
      router.push('/listings');
    } catch (err) {
      setError(err.response?.data?.msg || 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-cream dark:bg-darkBg transition-colors duration-200">
      <Navbar />
      <div className="flex items-center justify-center py-20 px-4">
        <div className="bg-white dark:bg-darkCard p-10 w-full max-w-md rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-darkBorder relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-accent-teal/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/5 rounded-full -ml-16 -mb-16 blur-2xl"></div>

          <div className="relative z-10">
            <div className="text-center mb-10">
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">Welcome Back</h1>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Log in to your TradeHub account</p>
            </div>

            {error && (
              <div className="bg-red-50 dark:bg-red-500/10 border border-red-100 dark:border-red-500/20 p-4 rounded-2xl mb-8 flex items-center gap-3 text-red-600 dark:text-red-400 text-xs font-bold uppercase tracking-wider">
                <span className="w-5 h-5 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center">!</span>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-gray-400 dark:text-gray-500 ml-1">Email Address</label>
                <div className="relative">
                  <Mail size={18} className="absolute left-4 top-4 text-gray-400" />
                  <input type="email" required value={form.email} onChange={(e) => setForm({...form, email: e.target.value})}
                    className="input-neo w-full pl-12 pr-4 py-4 rounded-2xl" placeholder="name@college.edu" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.2em] mb-2 text-gray-400 dark:text-gray-500 ml-1">Password</label>
                <div className="relative">
                  <Lock size={18} className="absolute left-4 top-4 text-gray-400" />
                  <input type={showPw ? 'text' : 'password'} required value={form.password}
                    onChange={(e) => setForm({...form, password: e.target.value})}
                    className="input-neo w-full pl-12 pr-12 py-4 rounded-2xl" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowPw(!showPw)} className="absolute right-4 top-4 text-gray-400 hover:text-gray-600 transition-colors">
                    {showPw ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>
              
              <div className="flex justify-end">
                {/* Forgot Password removed */}
              </div>

              <button type="submit" disabled={loading}
                className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-4 rounded-2xl font-bold text-lg flex items-center justify-center gap-3 shadow-xl hover:scale-[1.01] active:scale-100 disabled:opacity-50 transition-all mt-4">
                {loading ? <Loader2 size={24} className="animate-spin" /> : <LogIn size={20} />}
                {loading ? 'Authenticating...' : 'Sign In to TradeHub'}
              </button>
            </form>
            
            <p className="text-center mt-10 text-sm font-medium text-gray-500 dark:text-gray-400">
              New to TradeHub? <Link href="/register" className="text-accent-teal font-bold hover:underline">Create an Account</Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
