import React, { useState, useRef, useEffect, useCallback } from 'react';
import { CropRegion } from '../types';

interface CropOverlayProps {
  containerWidth: number;
  containerHeight: number;
  onCropChange: (region: CropRegion) => void;
}

const MIN_SIZE = 50;

export const CropOverlay: React.FC<CropOverlayProps> = ({ containerWidth, containerHeight, onCropChange }) => {
  // Initial centered box
  const [box, setBox] = useState<CropRegion>({
    x: 50,
    y: containerHeight - 150,
    width: containerWidth - 100,
    height: 120,
  });
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // Sync initial box if container changes significantly
  useEffect(() => {
    setBox(prev => {
        // Ensure box is within bounds if container shrinks
        const newWidth = Math.min(prev.width, containerWidth);
        const newHeight = Math.min(prev.height, containerHeight);
        return {
            x: Math.min(prev.x, containerWidth - newWidth),
            y: Math.min(prev.y, containerHeight - newHeight),
            width: newWidth,
            height: newHeight
        };
    });
  }, [containerWidth, containerHeight]);

  // Report changes to parent
  useEffect(() => {
    onCropChange(box);
  }, [box, onCropChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    const rect = (e.target as HTMLElement).getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;

    // Check if clicking resize handle (bottom-right 20px)
    const isHandle = 
        clientX > rect.right - 20 && 
        clientY > rect.bottom - 20;

    if (isHandle) {
        setIsResizing(true);
    } else {
        setIsDragging(true);
        setDragOffset({
            x: clientX - rect.left,
            y: clientY - rect.top
        });
    }
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging && !isResizing) return;
    
    // Parent container is usually relative, but the mouse is global.
    // We assume the parent is the nearest positioned ancestor.
    // However, since we are tracking state, we need to convert mouse delta.
    
    // Easier approach: Use the container element ref from props if passed, 
    // but here we just rely on the fact that `box.x` is relative to `containerWidth`.
    // We need the offset of the container itself to calculate absolute position.
    
    // NOTE: This implementation assumes the mouse movement matches pixel 1:1. 
    // For a robust implementation we usually need container ref.
    // Let's rely on `movementX/Y`.
    
    if (isDragging) {
        setBox(prev => {
            let newX = prev.x + e.movementX;
            let newY = prev.y + e.movementY;

            // Constrain
            newX = Math.max(0, Math.min(newX, containerWidth - prev.width));
            newY = Math.max(0, Math.min(newY, containerHeight - prev.height));

            return { ...prev, x: newX, y: newY };
        });
    }

    if (isResizing) {
        setBox(prev => {
            let newW = prev.width + e.movementX;
            let newH = prev.height + e.movementY;

            // Constrain
            newW = Math.max(MIN_SIZE, Math.min(newW, containerWidth - prev.x));
            newH = Math.max(MIN_SIZE, Math.min(newH, containerHeight - prev.y));

            return { ...prev, width: newW, height: newH };
        });
    }
  }, [isDragging, isResizing, containerWidth, containerHeight]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setIsResizing(false);
  }, []);

  useEffect(() => {
    if (isDragging || isResizing) {
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    } else {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

  return (
    <div
      className="absolute border-2 border-emerald-400 bg-emerald-500/10 cursor-move group hover:border-emerald-300 transition-colors"
      style={{
        left: box.x,
        top: box.y,
        width: box.width,
        height: box.height,
        zIndex: 20
      }}
      onMouseDown={handleMouseDown}
    >
        {/* Label */}
        <div className="absolute -top-6 left-0 bg-emerald-600 text-white text-xs px-2 py-1 rounded-t opacity-75">
            Dialogue Target
        </div>

        {/* Resize Handle */}
        <div 
            className="absolute bottom-0 right-0 w-6 h-6 bg-emerald-500 cursor-nwse-resize opacity-0 group-hover:opacity-100 flex items-center justify-center rounded-tl"
            style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
        >
        </div>
    </div>
  );
};