'use client';

import { useState, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Camera, MapPin, Check, Upload, X, ImagePlus, Loader2, Sparkles, AlertCircle, Edit3 } from 'lucide-react';

export default function CreateListing() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    condition: 'Good',
    type: 'trade',
    price: '',
    rentPrice: '',
    rentPeriod: 'daily',
    lng: 0,
    lat: 0,
    address: '',
    images: []
  });

  // Image upload state
  const [uploadedImages, setUploadedImages] = useState([]); // [{ url, preview, uploading, error }]
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const router = useRouter();

  // AI Auto-Fill state
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuccess, setAiSuccess] = useState(false);
  const [aiError, setAiError] = useState('');
  const aiFileInputRef = useRef(null);

  // Location state
  const [locationStatus, setLocationStatus] = useState('idle'); // 'idle' | 'loading' | 'captured' | 'denied' | 'manual'
  const [manualAddress, setManualAddress] = useState('');

  const analyzeWithAI = async (file) => {
    if (!file) return;
    setAiLoading(true);
    setAiError('');
    setAiSuccess(false);

    // Also add the image to the upload zone as a preview
    const preview = URL.createObjectURL(file);
    const startIndex = uploadedImages.length;
    if (uploadedImages.length < 5) {
      setUploadedImages(prev => [...prev, { preview, url: null, uploading: true, error: null }]);
      // Upload to server normally in parallel
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
      
      // Strict normalization for backend enum compatibility
      const conditionMap = {
        'new': 'New',
        'like new': 'Like New',
        'good': 'Good',
        'fair': 'Fair',
        'poor': 'Fair' // Fallback for unsupported 'poor'
      };
      const normalizedCondition = conditionMap[condition?.toLowerCase()] || 'Good';

      setFormData(prev => ({
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

  const handleLocation = () => {
    if (!navigator.geolocation) {
      setLocationStatus('denied');
      return;
    }
    setLocationStatus('loading');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setFormData(prev => ({ ...prev, lat, lng }));
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          if (data?.display_name) {
            setFormData(prev => ({ ...prev, address: data.display_name }));
          }
        } catch (err) {
          console.error('Reverse geocoding failed:', err);
        }
        setLocationStatus('captured');
      },
      (err) => {
        console.warn('Geolocation denied or failed:', err.message);
        setLocationStatus('denied');
      },
      { timeout: 10000 }
    );
  };

  // Geocode a manually entered address to get lat/lng
  const handleManualAddressGeocode = async () => {
    const addr = manualAddress.trim();
    if (!addr) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(addr)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const results = await res.json();
      if (results && results.length > 0) {
        const { lat, lon, display_name } = results[0];
        setFormData(prev => ({
          ...prev,
          lat: parseFloat(lat),
          lng: parseFloat(lon),
          address: display_name
        }));
        setLocationStatus('captured');
      } else {
        // Still save the address text even without coordinates
        setFormData(prev => ({ ...prev, address: addr }));
        setLocationStatus('captured');
      }
    } catch (err) {
      // Save address text without coordinates as fallback
      setFormData(prev => ({ ...prev, address: addr }));
      setLocationStatus('captured');
    }
  };

  const categoryImages = {
    'Electronics': 'https://images.unsplash.com/photo-1498049794561-7780e7231661',
    'Books': 'https://images.unsplash.com/photo-1544640808-32ca72ac7f67',
    'Lab Equipment': 'https://images.unsplash.com/photo-1532094349884-543bc11b234d',
    'Furniture': 'https://images.unsplash.com/photo-1524758631624-e2822e304c36',
    'Clothing': 'https://images.unsplash.com/photo-1523381210434-271e8be1f52b',
    'Appliances': 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a'
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

    toProcess.forEach((file, i) => {
      uploadFile(file, startIndex + i);
    });
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Check if any uploads are still in progress
    if (uploadedImages.some(img => img.uploading)) {
      alert('Please wait for all images to finish uploading.');
      return;
    }

    const successfulUrls = uploadedImages.filter(img => img.url).map(img => img.url);
    const finalImages = successfulUrls.length > 0
      ? successfulUrls
      : [categoryImages[formData.category] || 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3'];

    try {
      await api.post('/listings', {
        ...formData,
        type: [formData.type], // Send as array
        price: Number(formData.price) || 0,
        rentPrice: Number(formData.rentPrice) || 0,
        images: finalImages
      });
      router.push('/dashboard');
    } catch (err) {
      console.error('Submission failed:', err);
      alert(err.response?.data?.msg || 'Failed to create listing. Please check all fields.');
    }
  };

  const anyUploading = uploadedImages.some(img => img.uploading);

  return (
    <main className="min-h-screen bg-cream pb-20">
      <Navbar />
      <div className="container mx-auto px-4 py-12 flex justify-center">
        <div className="card-neo bg-white p-10 w-full max-w-2xl">
          <h1 className="text-4xl font-black uppercase tracking-tighter mb-8 italic">List a New <span className="text-accent-teal underline">Item</span></h1>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-6">

              {/* AI Auto-Fill Button */}
              <div>
                <input
                  ref={aiFileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  id="ai-image-input"
                  onChange={(e) => { if (e.target.files?.[0]) analyzeWithAI(e.target.files[0]); e.target.value = ''; }}
                />
                <label className="block font-black uppercase text-sm mb-2 italic flex items-center gap-2">
                  <Sparkles size={14} className="text-purple-500" /> AI Smart Listing
                </label>
                <button
                  type="button"
                  onClick={() => aiFileInputRef.current?.click()}
                  disabled={aiLoading}
                  className="w-full py-3 px-4 flex items-center justify-center gap-2 font-black uppercase text-sm transition-all"
                  style={{
                    background: aiSuccess
                      ? 'linear-gradient(135deg, #10b981, #059669)'
                      : aiLoading
                      ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                      : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                    color: '#fff',
                    border: '3px solid #000',
                    boxShadow: aiLoading || aiSuccess ? '2px 2px 0 #000' : '5px 5px 0 #000',
                    transform: aiLoading || aiSuccess ? 'translate(3px, 3px)' : 'none',
                    cursor: aiLoading ? 'not-allowed' : 'pointer'
                  }}
                >
                  {aiLoading ? (
                    <><Loader2 size={16} className="animate-spin" /> Analyzing Image…</>
                  ) : aiSuccess ? (
                    <><Check size={16} /> Fields Auto-Filled!</>
                  ) : (
                    <><Sparkles size={16} /> Generate Details with AI</>
                  )}
                </button>
                {aiError && (
                  <div className="mt-2 p-3 bg-red-50 border-2 border-red-400 rounded-lg">
                    <p className="text-red-700 text-[11px] font-bold leading-snug">{aiError}</p>
                    {aiError.includes('API key') || aiError.includes('unavailable') || aiError.includes('not configured') ? (
                      <a
                        href="https://aistudio.google.com/app/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[10px] font-black text-red-600 underline mt-1 block"
                      >
                        → Get a free API key at aistudio.google.com
                      </a>
                    ) : null}
                  </div>
                )}
                {!aiError && (
                  <p className="text-[10px] font-bold text-gray-400 mt-1 italic">
                    📸 Upload a photo — AI fills in the title, description & price for you!
                  </p>
                )}
              </div>

              <div>
                <label className="block font-black uppercase text-sm mb-2 italic">Item Title</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="input-neo w-full px-4 py-3"
                  placeholder="e.g. Morris Mano Digital Logic"
                  required
                />
              </div>

              <div>
                <label className="block font-black uppercase text-sm mb-2 italic">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="input-neo w-full px-4 py-3 resize-none"
                  rows={3}
                  placeholder="Describe your item…"
                />
              </div>

              <div>
                <label className="block font-black uppercase text-sm mb-2 italic">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({...formData, category: e.target.value})}
                  className="input-neo w-full px-4 py-3 appearance-none bg-white"
                  required
                >
                  <option value="">Select Category</option>
                  <option value="Electronics">Electronics</option>
                  <option value="Books">Books</option>
                  <option value="Lab Equipment">Lab Equipment</option>
                  <option value="Furniture">Furniture</option>
                  <option value="Clothing">Clothing</option>
                  <option value="Appliances">Appliances</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block font-black uppercase text-sm mb-2 italic">Condition</label>
                  <select
                    value={formData.condition}
                    onChange={(e) => setFormData({...formData, condition: e.target.value})}
                    className="input-neo w-full px-4 py-3 appearance-none bg-white font-black"
                  >
                    <option value="New">New</option>
                    <option value="Like New">Like New</option>
                    <option value="Good">Good</option>
                    <option value="Fair">Fair</option>
                  </select>
                </div>
                <div>
                  <label className="block font-black uppercase text-sm mb-2 italic">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="input-neo w-full px-4 py-3 appearance-none bg-white font-black"
                  >
                    <option value="trade">TRADE</option>
                    <option value="rent">RENT</option>
                    <option value="sell">SELL</option>
                    <option value="share">SHARE</option>
                  </select>
                </div>
              </div>

              {(formData.type === 'rent' || formData.type === 'sell') && (
                <div>
                  <label className="block font-black uppercase text-sm mb-2 italic">
                    {formData.type === 'sell' ? 'Sale Price (₹)' : 'Value/Rent (₹)'}
                  </label>
                  <input
                    type="number"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: e.target.value})}
                    className="input-neo w-full px-4 py-3"
                    placeholder="0.00"
                    required
                  />
                </div>
              )}
            </div>

            <div className="space-y-6">
              {/* Image Upload Zone */}
              <div>
                <label className="block font-black uppercase text-sm mb-2 italic flex items-center gap-2">
                  <Camera size={14} /> Photos <span className="text-gray-400 font-normal normal-case">(up to 5)</span>
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
                    minHeight: uploadedImages.length === 0 ? '140px' : 'auto',
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
                    id="image-upload-input"
                  />

                  {uploadedImages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full py-4 pointer-events-none">
                      <ImagePlus size={36} className="mb-2" style={{ color: '#0F9D9D' }} />
                      <p className="font-black uppercase text-sm">Drop images here</p>
                      <p className="text-[10px] font-bold text-gray-400 mt-1">or click to browse — JPG, PNG, WEBP up to 8MB</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-2">
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
                              <Loader2 size={20} className="text-white animate-spin" />
                            </div>
                          )}
                          {/* Error overlay */}
                          {img.error && (
                            <div className="absolute inset-0 bg-red-500 bg-opacity-70 flex items-center justify-center">
                              <span className="text-white text-[9px] font-black text-center px-1">FAILED</span>
                            </div>
                          )}
                          {/* Success tick */}
                          {!img.uploading && !img.error && img.url && (
                            <div className="absolute top-1 left-1 bg-accent-teal rounded-full p-0.5">
                              <Check size={10} className="text-white" />
                            </div>
                          )}
                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                            className="absolute top-1 right-1 bg-black text-white rounded-full p-0.5 hover:bg-red-600 transition-colors"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}

                      {/* Add more cell */}
                      {uploadedImages.length < 5 && (
                        <div className="aspect-square border-2 border-dashed border-gray-400 flex items-center justify-center bg-gray-50 hover:bg-gray-100 transition-colors pointer-events-none">
                          <Upload size={18} className="text-gray-400" />
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-[10px] font-bold text-gray-400 mt-2 italic">
                  {uploadedImages.length === 0
                    ? 'If no photo is uploaded, a category image will be used.'
                    : `${uploadedImages.filter(i => i.url).length}/${uploadedImages.length} uploaded${anyUploading ? ' — uploading…' : ''}`}
                </p>
              </div>

              {/* Location */}
              <div className="p-6 border-4 border-dashed border-black bg-gray-50 flex flex-col items-center justify-center text-center">
                <div className="mb-4">
                  <MapPin size={32} className="text-accent-teal" />
                </div>
                <h3 className="font-black uppercase mb-1">Item Location</h3>
                <p className="text-[10px] font-bold text-gray-500 mb-4 italic">
                  Capture address for distance calculation
                </p>

                {/* GPS Button — not shown once manual mode is active */}
                {locationStatus !== 'manual' && (
                  <button
                    type="button"
                    onClick={handleLocation}
                    disabled={locationStatus === 'loading'}
                    className={`btn-neo px-6 py-2 text-xs flex items-center gap-2 mb-3 ${
                      locationStatus === 'captured'
                        ? 'bg-accent-teal text-white'
                        : locationStatus === 'denied'
                        ? 'bg-red-500 text-white'
                        : locationStatus === 'loading'
                        ? 'bg-gray-300 text-gray-600 cursor-not-allowed'
                        : 'bg-black text-white'
                    }`}
                  >
                    {locationStatus === 'captured' && <><Check size={14} /> CAPTURED</>}
                    {locationStatus === 'loading' && <><Loader2 size={14} className="animate-spin" /> DETECTING…</>}
                    {locationStatus === 'denied' && <><AlertCircle size={14} /> GPS BLOCKED</>}
                    {locationStatus === 'idle' && 'CAPTURE GPS'}
                  </button>
                )}

                {/* Denied: show manual entry option */}
                {locationStatus === 'denied' && locationStatus !== 'manual' && (
                  <div className="w-full text-center mt-1">
                    <p className="text-[10px] font-bold text-red-500 italic mb-2">
                      Location access was denied. You can enter your address manually instead.
                    </p>
                    <button
                      type="button"
                      onClick={() => setLocationStatus('manual')}
                      className="btn-neo px-5 py-2 text-xs bg-white text-black flex items-center gap-2 mx-auto"
                    >
                      <Edit3 size={13} /> ENTER MANUALLY
                    </button>
                  </div>
                )}

                {/* Manual entry mode */}
                {locationStatus === 'manual' && (
                  <div className="w-full mt-1 space-y-2">
                    <p className="text-[10px] font-bold text-gray-500 italic">Type your address or area:</p>
                    <input
                      type="text"
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleManualAddressGeocode())}
                      placeholder="e.g. FAST NUCES Karachi, Block 5"
                      className="input-neo w-full px-4 py-2 text-xs"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={handleManualAddressGeocode}
                        disabled={!manualAddress.trim()}
                        className="btn-neo flex-1 py-2 text-xs bg-accent-teal text-white disabled:opacity-50"
                      >
                        <Check size={13} className="inline mr-1" /> SAVE ADDRESS
                      </button>
                      <button
                        type="button"
                        onClick={() => { setLocationStatus('idle'); setManualAddress(''); }}
                        className="btn-neo px-4 py-2 text-xs bg-white text-black"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  </div>
                )}

                {/* Re-capture option after captured */}
                {locationStatus === 'captured' && (
                  <button
                    type="button"
                    onClick={() => { setLocationStatus('idle'); setManualAddress(''); setFormData(prev => ({ ...prev, lat: 0, lng: 0, address: '' })); }}
                    className="text-[10px] font-bold text-gray-400 hover:text-gray-600 underline mt-1"
                  >
                    Change location
                  </button>
                )}
              </div>

              {formData.address && (
                <div className="mt-2">
                  <label className="block font-black uppercase text-[10px] mb-1 italic text-gray-500">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="input-neo w-full px-4 py-2 text-xs font-bold leading-tight"
                    rows={3}
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={anyUploading}
                className="btn-neo w-full bg-accent-teal text-white py-6 text-2xl font-black uppercase italic shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {anyUploading ? 'Uploading…' : 'Publish Listing'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </main>
  );
}
