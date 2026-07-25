'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FiX, FiCheck, FiZoomIn, FiZoomOut, FiRotateCw, FiMove, FiRefreshCw } from 'react-icons/fi';

interface PhotoCropModalProps {
  isOpen: boolean;
  imageFile: File | null;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
}

export default function PhotoCropModal({
  isOpen,
  imageFile,
  onClose,
  onCropComplete,
}: PhotoCropModalProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  useEffect(() => {
    if (imageFile) {
      const url = URL.createObjectURL(imageFile);
      setImageSrc(url);
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });

      const img = new Image();
      img.src = url;
      img.onload = () => {
        imageRef.current = img;
        drawPreview(img, 1, 0, { x: 0, y: 0 });
      };

      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [imageFile]);

  useEffect(() => {
    if (imageRef.current) {
      drawPreview(imageRef.current, zoom, rotation, pan);
    }
  }, [zoom, rotation, pan]);

  const drawPreview = (
    img: HTMLImageElement,
    currentZoom: number,
    currentRotation: number,
    currentPan: { x: number; y: number }
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Target dimensions: 300 x 400 (3:4 Portrait Ratio for ID Photo)
    canvas.width = 300;
    canvas.height = 400;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    // Move to center
    ctx.translate(canvas.width / 2 + currentPan.x, canvas.height / 2 + currentPan.y);

    // Apply rotation
    ctx.rotate((currentRotation * Math.PI) / 180);

    // Apply scale (fit base scale then zoom)
    const baseScale = Math.max(canvas.width / img.width, canvas.height / img.height);
    const finalScale = baseScale * currentZoom;
    ctx.scale(finalScale, finalScale);

    // Draw image centered
    ctx.drawImage(img, -img.width / 2, -img.height / 2);
    ctx.restore();
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setPan({
      x: e.touches[0].clientX - dragStart.x,
      y: e.touches[0].clientY - dragStart.y,
    });
  };

  const resetAdjustments = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  const handleSaveCrop = () => {
    const canvas = canvasRef.current;
    if (!canvas || !imageFile) return;

    setIsProcessing(true);

    canvas.toBlob((blob) => {
      if (blob) {
        const fileName = `cropped-${imageFile.name.replace(/\.[^/.]+$/, '')}.jpg`;
        const croppedFile = new File([blob], fileName, { type: 'image/jpeg' });
        onCropComplete(croppedFile);
        onClose();
      }
      setIsProcessing(false);
    }, 'image/jpeg', 0.95);
  };

  if (!isOpen || !imageFile) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal Container */}
      <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200 z-10 flex flex-col">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="text-base font-bold text-slate-900">Adjust Student Photo</h2>
            <p className="text-xs text-slate-500">Drag to position, use controls to zoom and rotate</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Modal Body / Canvas Area */}
        <div className="p-6 flex flex-col items-center gap-5 bg-slate-950/5">
          {/* Canvas Wrapper with Portrait Overlay Frame */}
          <div
            className="relative w-[225px] h-[300px] rounded-2xl overflow-hidden shadow-md border-2 border-sky-500/80 bg-slate-900 cursor-move group select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleMouseUp}
          >
            <canvas
              ref={canvasRef}
              className="w-full h-full object-cover"
            />

            {/* Guide overlay */}
            <div className="absolute inset-0 pointer-events-none border border-white/40 border-dashed rounded-xl flex items-center justify-center">
              <div className="text-[10px] font-bold uppercase tracking-widest text-white/70 bg-black/40 px-2 py-0.5 rounded-full flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <FiMove size={12} /> Drag to Pan
              </div>
            </div>
          </div>

          {/* Adjustment Controls */}
          <div className="w-full space-y-4 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
            {/* Zoom Slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs font-semibold text-slate-700">
                <span className="flex items-center gap-1">
                  <FiZoomIn className="text-sky-600" /> Zoom Level
                </span>
                <span className="text-slate-500 font-mono">{zoom.toFixed(1)}x</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <FiZoomOut size={16} />
                </button>
                <input
                  type="range"
                  min="1"
                  max="3.5"
                  step="0.1"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-sky-600"
                />
                <button
                  type="button"
                  onClick={() => setZoom((z) => Math.min(3.5, z + 0.2))}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <FiZoomIn size={16} />
                </button>
              </div>
            </div>

            {/* Rotation & Reset Buttons */}
            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => setRotation((r) => (r + 90) % 360)}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              >
                <FiRotateCw size={14} /> Rotate 90°
              </button>

              <button
                type="button"
                onClick={resetAdjustments}
                className="px-3 py-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 text-xs font-medium rounded-xl transition-colors flex items-center gap-1"
              >
                <FiRefreshCw size={12} /> Reset Position
              </button>
            </div>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end gap-2.5 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveCrop}
            disabled={isProcessing}
            className="px-5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 active:scale-[0.98] rounded-xl shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
          >
            {isProcessing ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <FiCheck size={16} /> Apply & Save Photo
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
