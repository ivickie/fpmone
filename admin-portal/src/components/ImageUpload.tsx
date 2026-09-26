import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { api } from '../services/api';

interface ImageUploadProps {
  label?: string;
  value?: string;
  onChange: (url: string) => void;
  entityType: 'event' | 'feed' | 'highlight' | 'testimony' | 'profile' | 'church-asset';
  entityId?: string;
  branchId?: string;
  helperText?: string;
  placeholder?: string;
}

export const ImageUpload: React.FC<ImageUploadProps> = ({
  label = 'Upload Image',
  value,
  onChange,
  entityType,
  entityId,
  branchId,
  helperText,
  placeholder
}) => {
  const displayHelper = placeholder || helperText || 'Supported formats: JPEG, PNG, WEBP (Max 10MB)';
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [localPreview, setLocalPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset image error whenever value changes
  useEffect(() => {
    setImageError(false);
  }, [value]);

  // Clean up object URL when component unmounts or preview changes
  useEffect(() => {
    return () => {
      if (localPreview && localPreview.startsWith('blob:')) {
        URL.revokeObjectURL(localPreview);
      }
    };
  }, [localPreview]);

  const resolveUrl = (url?: string): string => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
      return url;
    }
    if (url.startsWith('/')) {
      const host = typeof window !== 'undefined' && window.location.hostname ? window.location.hostname : 'localhost';
      return `http://${host}:5000${url}`;
    }
    return url;
  };

  const handleFileSelect = async (file: File) => {
    setError(null);
    setImageError(false);

    // Client-side validations
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file format. Please upload JPEG, PNG, or WEBP.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError(`File size (${(file.size / (1024 * 1024)).toFixed(1)}MB) exceeds 10MB limit.`);
      return;
    }

    // Set immediate local preview for smooth user feedback
    const preview = URL.createObjectURL(file);
    setLocalPreview(preview);

    try {
      setIsUploading(true);
      const res = await api.uploadMedia(file, entityType, entityId, branchId);
      if (res.media?.publicUrl) {
        onChange(res.media.publicUrl);
        setLocalPreview(null);
      } else {
        throw new Error('Upload succeeded but no public URL was returned.');
      }
    } catch (err: any) {
      setError(err.message || 'Upload failed. Please try again.');
      setLocalPreview(null);
    } finally {
      setIsUploading(false);
    }
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const displaySrc = localPreview || resolveUrl(value);

  return (
    <div className="space-y-1.5">
      {label && <label className="block text-sm font-medium text-slate-700">{label}</label>}

      {displaySrc && !imageError ? (
        <div className="relative rounded-lg border border-slate-200 overflow-hidden group bg-slate-50 flex items-center justify-center h-48">
          <img
            src={displaySrc}
            alt="Preview"
            className="w-full h-full object-cover"
            onError={() => {
              console.warn('Image failed to load:', displaySrc);
              setImageError(true);
            }}
          />
          {isUploading && (
            <div className="absolute inset-0 bg-black/50 backdrop-blur-xs flex flex-col items-center justify-center text-white">
              <Loader2 className="w-7 h-7 animate-spin mb-2 text-indigo-400" />
              <p className="text-xs font-semibold">Attaching image...</p>
            </div>
          )}
          {!isUploading && (
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="px-3 py-1.5 bg-white text-slate-800 text-xs font-medium rounded shadow hover:bg-slate-100 transition-colors"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() => {
                  onChange('');
                  setLocalPreview(null);
                  setImageError(false);
                }}
                className="p-1.5 bg-red-600 text-white rounded shadow hover:bg-red-700 transition-colors"
                title="Remove image"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      ) : displaySrc && imageError ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center">
            <ImageIcon className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-800">Image Attached</p>
            <p className="text-[10px] text-slate-500 max-w-xs truncate mt-0.5">{value}</p>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Replace
            </button>
            <button
              type="button"
              onClick={() => {
                onChange('');
                setLocalPreview(null);
                setImageError(false);
              }}
              className="px-2.5 py-1 bg-red-50 border border-red-200 rounded text-xs font-medium text-red-600 hover:bg-red-100 transition"
            >
              Remove
            </button>
          </div>
        </div>
      ) : (
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center ${
            isDragging
              ? 'border-indigo-500 bg-indigo-50/50'
              : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50'
          } ${isUploading ? 'opacity-70 cursor-not-allowed' : ''}`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center py-2">
              <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
              <p className="text-sm font-medium text-slate-700">Uploading media...</p>
              <p className="text-xs text-slate-400 mt-1">Processing and optimizing image</p>
            </div>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mb-2">
                <Upload className="w-5 h-5" />
              </div>
              <p className="text-sm font-medium text-slate-700">
                Click to upload <span className="font-normal text-slate-500">or drag and drop</span>
              </p>
              <p className="text-xs text-slate-400 mt-1">{displayHelper}</p>
            </>
          )}
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            handleFileSelect(e.target.files[0]);
          }
        }}
      />

      {error && (
        <div className="flex items-center gap-1.5 text-xs text-red-600 mt-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
