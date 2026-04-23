'use client';

import { useState, useRef, useCallback } from 'react';
import Navbar from '@/components/Navbar';
import api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { Camera, MapPin, Check, Upload, X, ImagePlus, Loader2 } from 'lucide-react';

export default function CreateListing() {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    condition: 'good',
    type: 'Trade',
    pricePerDay: '',
    lng: 0,
    lat: 0,
    images: []
  });

  // Image upload state
  const [uploadedImages, setUploadedImages] = useState([]); // [{ url, preview, uploading, error }]
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const router = useRouter();

  const handleLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setFormData({ ...formData, lng: pos.coords.longitude, lat: pos.coords.latitude });
    });
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
      await api.post('/items/create', {
        ...formData,
        images: finalImages,
        pricePerDay: (formData.type === 'Rent' || formData.type === 'Sell') ? parseInt(formData.pricePerDay) : undefined,
        geoPosition: { type: 'Point', coordinates: [formData.lng, formData.lat] }
      });
      router.push('/dashboard');
    } catch (err) {
      alert(err.response?.data?.msg || 'Failed to create listing');
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
              <div>
                <label className="block font-black uppercase text-sm mb-2 italic">Item Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="input-neo w-full px-4 py-3"
                  placeholder="e.g. Morris Mano Digital logic"
                  required
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
                    className="input-neo w-full px-4 py-3 appearance-none bg-white"
                  >
                    <option value="new">New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
                <div>
                  <label className="block font-black uppercase text-sm mb-2 italic">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="input-neo w-full px-4 py-3 appearance-none bg-white font-black"
                  >
                    <option value="Trade">TRADE</option>
                    <option value="Rent">RENT</option>
                    <option value="Sell">SELL</option>
                    <option value="Share">SHARE</option>
                  </select>
                </div>
              </div>

              {(formData.type === 'Rent' || formData.type === 'Sell') && (
                <div>
                  <label className="block font-black uppercase text-sm mb-2 italic">
                    {formData.type === 'Rent' ? 'Price (₹ per day)' : 'Sale Price (₹)'}
                  </label>
                  <input
                    type="number"
                    value={formData.pricePerDay}
                    onChange={(e) => setFormData({...formData, pricePerDay: e.target.value})}
                    className="input-neo w-full px-4 py-3"
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
                <h3 className="font-black uppercase mb-1">Set Location</h3>
                <p className="text-[10px] font-bold text-gray-500 mb-4 italic">Auto-capture location for matching</p>
                <button type="button" onClick={handleLocation} className={`btn-neo px-6 py-2 text-xs flex items-center gap-2 ${formData.lng !== 0 ? 'bg-accent-teal text-white' : 'bg-black text-white'}`}>
                  {formData.lng !== 0 ? <><Check size={14} /> CAPTURED</> : 'CAPTURE GPS'}
                </button>
              </div>

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
