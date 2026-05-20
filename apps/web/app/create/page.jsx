"use client";

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Upload, X, ImagePlus, Loader2, Check, Sparkles, AlertCircle } from 'lucide-react';

const CATEGORIES = ['Electronics', 'Books', 'Furniture', 'Clothing', 'Sports', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];

export default function CreateListingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Electronics', condition: 'Good',
    type: [], price: '', rentPrice: '', rentPeriod: 'daily', tradePreference: '',
    lat: 0, lng: 0, address: ''
  });

  // Image upload state
  const [uploadedImages, setUploadedImages] = useState([]); // [{ url, preview, uploading, error }]
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // AI Auto-Fill state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);
  const [aiError, setAiError] = useState('');
  const aiFileInputRef = useRef(null);

  const analyzeWithAI = async (file) => {
    if (!file) return;
    setAiLoading(true);
    setAiError('');
    setAiSuccess(false);

    // Add the image to the upload zone as a preview in parallel
    const preview = URL.createObjectURL(file);
    const startIndex = uploadedImages.length;
    if (uploadedImages.length < 5) {
      setUploadedImages(prev => [...prev, { preview, url: null, uploading: true, error: null }]);
      const data = new FormData();
      data.append('image', file);
      api.post('/upload', data, { headers: { 'Content-Type': 'multipart/form-data' } })
        .then(res => {
          setUploadedImages(prev => {
            const updated = [...prev];
            updated[startIndex] = { ...updated[startIndex], url: res.data.url, uploading: false, error: null };
            return updated;
          });
        })
        .catch(() => {
          setUploadedImages(prev => {
            const updated = [...prev];
            updated[startIndex] = { ...updated[startIndex], uploading: false, error: 'Upload failed' };
            return updated;
          });
        });
    }

    // Send to AI for analysis
    try {
      const formPayload = new FormData();
      formPayload.append('image', file);
      const res = await api.post('/ai/analyze-image', formPayload, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { title, description, category, condition, suggestedPrice } = res.data;
      
      const conditionMap = {
        'new': 'New',
        'like new': 'Like New',
        'good': 'Good',
        'fair': 'Fair',
        'poor': 'Fair'
      };
      const normalizedCondition = conditionMap[condition?.toLowerCase()] || 'Good';

      setForm(prev => ({
        ...prev,
        title: title || prev.title,
        description: description || prev.description,
        category: category || prev.category,
        condition: normalizedCondition,
        price: suggestedPrice || prev.price,
        rentPrice: suggestedPrice || prev.rentPrice
      }));
      setAiSuccess(true);
      setTimeout(() => setAiSuccess(false), 4000);
    } catch (err) {
      setAiError(err.response?.data?.msg || 'AI analysis failed. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const toggleType = (t) => {
    setForm(prev => ({
      ...prev,
      type: prev.type.includes(t) ? prev.type.filter(x => x !== t) : [...prev.type, t]
    }));
  };

  const uploadFile = async (file, index) => {
    const data = new FormData();
    data.append('image', file);
    try {
      const res = await api.post('/upload', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setUploadedImages(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], url: res.data.url, uploading: false, error: null };
        return updated;
      });
    } catch (err) {
      setUploadedImages(prev => {
        const updated = [...prev];
        updated[index] = { ...updated[index], uploading: false, error: 'Upload failed' };
        return updated;
      });
    }
  };

  const processFiles = useCallback((files) => {
    const imageFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    const remaining = 5 - uploadedImages.length;
    const toProcess = imageFiles.slice(0, remaining);
    const startIndex = uploadedImages.length;

    const newEntries = toProcess.map(file => ({
      preview: URL.createObjectURL(file),
      url: null,
      uploading: true,
      error: null
    }));

    setUploadedImages(prev => [...prev, ...newEntries]);
    toProcess.forEach((file, i) => uploadFile(file, startIndex + i));
  }, [uploadedImages]);

  const handleFileInput = (e) => {
    processFiles(e.target.files);
    e.target.value = '';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFiles(e.dataTransfer.files);
  };

  const removeImage = (index) => {
    setUploadedImages(prev => {
      const updated = [...prev];
      if (updated[index].preview) URL.revokeObjectURL(updated[index].preview);
      updated.splice(index, 1);
      return updated;
    });
  };

  const handleLocation = () => {
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setForm(prev => ({ ...prev, lat, lng }));
      
      try {
        const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`);
        const data = await res.json();
        if (data && data.display_name) {
          setForm(prev => ({ ...prev, address: data.display_name }));
        }
      } catch (err) {
        console.error('Reverse geocoding failed:', err);
      }
    });
  };

  const anyUploading = uploadedImages.some(img => img.uploading);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) { router.push('/login'); return; }
    if (form.type.length === 0) { alert('Select at least one listing type'); return; }
    if (anyUploading) { alert('Please wait for all images to finish uploading.'); return; }

    setLoading(true);
    try {
      const successfulUrls = uploadedImages.filter(img => img.url).map(img => img.url);
      const payload = {
        ...form,
        price: Number(form.price) || 0,
        rentPrice: Number(form.rentPrice) || 0,
        images: successfulUrls,
        lat: form.lat,
        lng: form.lng,
        address: form.address
      };
      const res = await api.post('/listings', payload);
      router.push(`/listing/${res.data._id}`);
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to create listing');
    } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-cream dark:bg-darkBg transition-colors duration-200 pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-3xl">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white mb-2">Create New Listing</h1>
          <p className="text-gray-500 dark:text-gray-400 font-medium">Turn your unused items into cash or trades.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          
          {/* AI Magic Section */}
          <div className="card-neo bg-gradient-to-br from-indigo-600 to-purple-600 p-8 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl group-hover:scale-110 transition-transform duration-700"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white shrink-0">
                <Sparkles size={32} />
              </div>
              <div className="flex-1 text-center md:text-left">
                <h2 className="text-xl font-bold text-white mb-1">AI Smart Listing</h2>
                <p className="text-indigo-100 text-sm font-medium mb-4">Upload a photo and let our AI fill in the details for you!</p>
                <input
                  ref={aiFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) analyzeWithAI(e.target.files[0]); e.target.value = ''; }}
                />
                <button
                  type="button"
                  onClick={() => aiFileInputRef.current?.click()}
                  disabled={aiLoading}
                  className="px-8 py-3 bg-white text-indigo-600 rounded-2xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-100 transition-all disabled:opacity-50 flex items-center gap-2 mx-auto md:mx-0"
                >
                  {aiLoading ? (
                    <><Loader2 size={18} className="animate-spin" /> Analyzing Image...</>
                  ) : aiSuccess ? (
                    <><Check size={18} /> Details Generated!</>
                  ) : (
                    <>Generate Details with AI</>
                  )}
                </button>
              </div>
            </div>
            {aiError && (
              <div className="mt-4 flex items-center gap-2 text-red-100 bg-red-500/20 px-4 py-2 rounded-xl text-xs font-bold border border-red-500/30">
                <AlertCircle size={14} /> {aiError}
              </div>
            )}
          </div>

          <div className="card-neo bg-white dark:bg-darkCard p-8 md:p-10 shadow-sm space-y-8 border border-gray-100 dark:border-darkBorder">
            
            {/* Title */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-3 text-gray-400 dark:text-gray-500">Listing Title</label>
              <input type="text" required value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
                className="input-neo w-full px-6 py-4 text-lg font-bold" placeholder="e.g. MacBook Pro 2021" />
            </div>

            {/* Description */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-3 text-gray-400 dark:text-gray-500">Item Description</label>
              <textarea rows={4} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
                className="input-neo w-full px-6 py-4 resize-none font-medium" placeholder="Describe the condition, key features, and why you're selling it..." />
            </div>

            {/* Category + Condition */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-3 text-gray-400 dark:text-gray-500">Category</label>
                <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}
                  className="input-neo w-full px-6 py-4 bg-white dark:bg-slate-800 font-semibold appearance-none">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-3 text-gray-400 dark:text-gray-500">Condition</label>
                <select value={form.condition} onChange={(e) => setForm({...form, condition: e.target.value})}
                  className="input-neo w-full px-6 py-4 bg-white dark:bg-slate-800 font-semibold appearance-none">
                  {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>

            {/* Listing Type */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-3 text-gray-400 dark:text-gray-500">Listing Type (Select Multiple)</label>
              <div className="flex gap-3 p-1.5 bg-gray-50 dark:bg-slate-800/50 rounded-2xl">
                {['sell', 'rent', 'trade'].map(t => (
                  <button key={t} type="button" onClick={() => toggleType(t)}
                    className={`flex-1 py-3.5 font-bold uppercase text-[11px] tracking-wider rounded-xl transition-all
                      ${form.type.includes(t) 
                        ? 'bg-white dark:bg-slate-700 text-gray-900 dark:text-white shadow-sm' 
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>

            {/* Conditional Pricing */}
            {(form.type.includes('sell') || form.type.includes('rent')) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-gray-50 dark:bg-slate-800/30 rounded-3xl border border-gray-100 dark:border-darkBorder transition-all duration-500">
                {form.type.includes('sell') && (
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400 dark:text-gray-500">Sale Price (₹)</label>
                    <input type="number" required value={form.price} onChange={(e) => setForm({...form, price: e.target.value})}
                      className="input-neo w-full px-6 py-3 font-bold text-xl" placeholder="0" />
                  </div>
                )}
                
                {form.type.includes('rent') && (
                  <div className="flex-1 space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400 dark:text-gray-500">Rent Price (₹)</label>
                      <input type="number" required value={form.rentPrice} onChange={(e) => setForm({...form, rentPrice: e.target.value})}
                        className="input-neo w-full px-6 py-3 font-bold text-xl" placeholder="0" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold uppercase tracking-widest mb-2 text-gray-400 dark:text-gray-500">Per Period</label>
                      <select value={form.rentPeriod} onChange={(e) => setForm({...form, rentPeriod: e.target.value})}
                        className="input-neo w-full px-6 bg-white dark:bg-slate-800 font-semibold">
                        <option value="daily">Per Day</option>
                        <option value="weekly">Per Week</option>
                        <option value="monthly">Per Month</option>
                      </select>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Conditional: Trade Preference */}
            {form.type.includes('trade') && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-widest mb-3 text-gray-400 dark:text-gray-500">What are you looking for?</label>
                <input type="text" value={form.tradePreference} onChange={(e) => setForm({...form, tradePreference: e.target.value})}
                  className="input-neo w-full px-6 py-4 font-semibold" placeholder="e.g. iPad Pro, Calculus Textbook, etc." />
              </div>
            )}

            {/* Location Section */}
            <div className="p-6 bg-gray-50 dark:bg-slate-800/30 rounded-3xl border border-gray-100 dark:border-darkBorder">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="font-bold text-gray-900 dark:text-white">Item Location</h3>
                  <p className="text-[10px] text-gray-500 font-medium">Capture address for distance calculation</p>
                </div>
                <button 
                  type="button" 
                  onClick={handleLocation}
                  className={`px-4 py-2 rounded-xl text-[10px] font-bold uppercase tracking-wider transition-all
                    ${form.lat !== 0 ? 'bg-accent-teal text-white shadow-lg shadow-accent-teal/20' : 'bg-gray-200 dark:bg-slate-700 text-gray-500'}`}
                >
                  {form.lat !== 0 ? <><Check size={12} className="inline mr-1" /> Captured</> : 'Capture GPS'}
                </button>
              </div>
              {form.address && (
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({...form, address: e.target.value})}
                  className="input-neo w-full px-4 py-3 text-xs font-medium bg-white dark:bg-slate-800 resize-none"
                  rows={2}
                />
              )}
            </div>

            {/* Image Upload Zone */}
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-widest mb-3 text-gray-400 dark:text-gray-500">Photos (Up to 5)</label>
              
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => uploadedImages.length < 5 && fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-[2rem] transition-all cursor-pointer p-8 flex flex-col items-center justify-center
                  ${isDragging ? 'border-accent-teal bg-accent-teal/5' : 'border-gray-200 dark:border-darkBorder bg-gray-50 dark:bg-slate-800/30 hover:bg-gray-100 dark:hover:bg-slate-800/50'}`}
              >
                <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleFileInput} />

                {uploadedImages.length === 0 ? (
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-2xl bg-white dark:bg-slate-800 shadow-sm border border-gray-100 dark:border-darkBorder flex items-center justify-center text-accent-teal mx-auto mb-4">
                      <ImagePlus size={32} />
                    </div>
                    <p className="font-bold text-gray-900 dark:text-white">Drag photos here</p>
                    <p className="text-xs text-gray-400 font-medium mt-1">PNG, JPG, or WEBP up to 8MB</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-4 w-full">
                    {uploadedImages.map((img, idx) => (
                      <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-gray-200 dark:border-darkBorder bg-white shadow-sm">
                        <img src={img.preview} alt="" className="w-full h-full object-cover" />
                        {img.uploading && (
                          <div className="absolute inset-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm flex items-center justify-center">
                            <Loader2 size={24} className="text-accent-teal animate-spin" />
                          </div>
                        )}
                        {img.error && (
                          <div className="absolute inset-0 bg-red-500/90 backdrop-blur-sm flex items-center justify-center">
                            <span className="text-white text-[10px] font-bold">RETRY</span>
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                          className="absolute top-1.5 right-1.5 bg-gray-900/80 text-white rounded-full p-1 hover:bg-red-500 transition-colors shadow-lg"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                    {uploadedImages.length < 5 && (
                      <div className="aspect-square rounded-2xl border-2 border-dashed border-gray-200 dark:border-darkBorder flex items-center justify-center text-gray-400 hover:text-accent-teal hover:border-accent-teal transition-all">
                        <Upload size={20} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <button type="submit" disabled={loading || anyUploading}
              className="w-full bg-gray-900 dark:bg-white text-white dark:text-gray-900 py-5 rounded-[1.5rem] font-bold text-lg flex items-center justify-center gap-3 shadow-2xl hover:scale-[1.01] active:scale-100 disabled:opacity-50 transition-all">
              {anyUploading ? (
                <><Loader2 size={24} className="animate-spin" /> Uploading Photos...</>
              ) : loading ? (
                <><Loader2 size={24} className="animate-spin" /> Posting Your Listing...</>
              ) : (
                <><Upload size={24} /> Create Marketplace Listing</>
              )}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
