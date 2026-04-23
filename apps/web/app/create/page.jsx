"use client";

import { useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { useAuth } from '@/context/AuthContext';
import api from '@/lib/api';
import { Upload, X, ImagePlus, Loader2, Check } from 'lucide-react';

const CATEGORIES = ['Electronics', 'Books', 'Furniture', 'Clothing', 'Sports', 'Other'];
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'];

export default function CreateListingPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: '', description: '', category: 'Electronics', condition: 'Good',
    type: [], price: '', rentPrice: '', rentPeriod: 'daily', tradePreference: ''
  });

  // Image upload state
  const [uploadedImages, setUploadedImages] = useState([]); // [{ url, preview, uploading, error }]
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

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
        images: successfulUrls
      };
      const res = await api.post('/listings', payload);
      router.push(`/listing/${res.data._id}`);
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to create listing');
    } finally { setLoading(false); }
  };

  return (
    <main className="min-h-screen bg-cream">
      <Navbar />
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <h1 className="text-4xl font-black uppercase italic tracking-tighter mb-8">Post New Item</h1>

        <form onSubmit={handleSubmit} className="card-neo bg-white p-8 space-y-6">
          {/* Title */}
          <div>
            <label className="block text-xs font-black uppercase mb-2 text-gray-500">Title *</label>
            <input type="text" required value={form.title} onChange={(e) => setForm({...form, title: e.target.value})}
              className="input-neo w-full px-4 py-3" placeholder="What are you selling?" />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-black uppercase mb-2 text-gray-500">Description</label>
            <textarea rows={4} value={form.description} onChange={(e) => setForm({...form, description: e.target.value})}
              className="input-neo w-full px-4 py-3 resize-none" placeholder="Describe your item..." />
          </div>

          {/* Category + Condition */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-black uppercase mb-2 text-gray-500">Category *</label>
              <select value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}
                className="input-neo w-full px-4 py-3 bg-white">
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-black uppercase mb-2 text-gray-500">Condition *</label>
              <select value={form.condition} onChange={(e) => setForm({...form, condition: e.target.value})}
                className="input-neo w-full px-4 py-3 bg-white">
                {CONDITIONS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {/* Listing Type */}
          <div>
            <label className="block text-xs font-black uppercase mb-2 text-gray-500">Listing Type * (select one or more)</label>
            <div className="flex gap-3">
              {['sell', 'rent', 'trade'].map(t => (
                <button key={t} type="button" onClick={() => toggleType(t)}
                  className={`flex-1 py-3 font-black uppercase border-2 border-black text-sm transition-all
                    ${form.type.includes(t) ? 'bg-accent-teal text-white shadow-none' : 'bg-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]'}`}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional: Price logic */}
          {(form.type.includes('sell') || form.type.includes('rent')) && (
            <div className="space-y-4">
              {form.type.includes('sell') && (
                <div>
                  <label className="block text-xs font-black uppercase mb-2 text-gray-500">Sale Price (₹) *</label>
                  <input type="number" required value={form.price} onChange={(e) => setForm({...form, price: e.target.value})}
                    className="input-neo w-full px-4 py-3" placeholder="Enter amount for selling" />
                </div>
              )}
              
              {form.type.includes('rent') && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black uppercase mb-2 text-gray-500">Rent Price (₹) *</label>
                    <input type="number" required value={form.rentPrice} onChange={(e) => setForm({...form, rentPrice: e.target.value})}
                      className="input-neo w-full px-4 py-3" placeholder="0" />
                  </div>
                  <div>
                    <label className="block text-xs font-black uppercase mb-2 text-gray-500">Rent Period</label>
                    <select value={form.rentPeriod} onChange={(e) => setForm({...form, rentPeriod: e.target.value})}
                      className="input-neo w-full px-4 py-3 bg-white">
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
              <label className="block text-xs font-black uppercase mb-2 text-gray-500">What do you want in return?</label>
              <input type="text" value={form.tradePreference} onChange={(e) => setForm({...form, tradePreference: e.target.value})}
                className="input-neo w-full px-4 py-3" placeholder="e.g., A laptop, textbook, guitar..." />
            </div>
          )}

          {/* Image Upload */}
          <div>
            <label className="block text-xs font-black uppercase mb-2 text-gray-500 flex items-center gap-1">
              <ImagePlus size={12} /> Photos (up to 5)
            </label>

            {/* Drop Zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => uploadedImages.length < 5 && fileInputRef.current?.click()}
              className="relative border-4 border-dashed transition-all cursor-pointer"
              style={{
                borderColor: isDragging ? '#0F9D9D' : '#000',
                backgroundColor: isDragging ? '#f0fafa' : '#f9f9f9',
                minHeight: uploadedImages.length === 0 ? '130px' : 'auto',
                padding: '12px'
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleFileInput}
                id="post-image-upload-input"
              />

              {uploadedImages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-4 pointer-events-none">
                  <ImagePlus size={32} className="mb-2" style={{ color: '#0F9D9D' }} />
                  <p className="font-black uppercase text-sm">Drop images here</p>
                  <p className="text-[10px] font-bold text-gray-400 mt-1">or click to browse — JPG, PNG, WEBP up to 8MB</p>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-2">
                  {uploadedImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square border-2 border-black overflow-hidden bg-gray-100">
                      <img
                        src={img.preview}
                        alt={`Preview ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {/* Upload overlay */}
                      {img.uploading && (
                        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                          <Loader2 size={18} className="text-white animate-spin" />
                        </div>
                      )}
                      {/* Error overlay */}
                      {img.error && (
                        <div className="absolute inset-0 bg-red-500 bg-opacity-70 flex items-center justify-center">
                          <span className="text-white text-[9px] font-black">FAILED</span>
                        </div>
                      )}
                      {/* Success tick */}
                      {!img.uploading && !img.error && img.url && (
                        <div className="absolute top-1 left-1 bg-accent-teal rounded-full p-0.5">
                          <Check size={9} className="text-white" />
                        </div>
                      )}
                      {/* Remove button */}
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                        className="absolute top-1 right-1 bg-black text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                      >
                        <X size={9} />
                      </button>
                    </div>
                  ))}

                  {/* Add more cell */}
                  {uploadedImages.length < 5 && (
                    <div className="aspect-square border-2 border-dashed border-gray-400 flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors pointer-events-none">
                      <Upload size={16} className="text-gray-400" />
                    </div>
                  )}
                </div>
              )}
            </div>

            <p className="text-[10px] font-bold text-gray-400 mt-1 italic">
              {uploadedImages.length === 0
                ? 'Adding photos makes your listing stand out.'
                : `${uploadedImages.filter(i => i.url).length}/${uploadedImages.length} uploaded${anyUploading ? ' — uploading…' : ''}`}
            </p>
          </div>

          <button type="submit" disabled={loading || anyUploading}
            className="btn-neo bg-black text-white w-full py-4 uppercase font-black text-lg flex items-center justify-center gap-2 disabled:opacity-50">
            <Upload size={20} />
            {anyUploading ? 'Uploading Images…' : loading ? 'Posting...' : 'Post Listing'}
          </button>
        </form>
      </div>
    </main>
  );
}
