/**
 * Resizes a video frame to a target width while maintaining aspect ratio.
 * Returns a base64 string (without prefix) of the JPEG image.
 */
export const resizeImageToBase64 = (
  video: HTMLVideoElement, 
  maxWidth: number = 800
): string => {
  const scale = Math.min(1, maxWidth / video.videoWidth);
  const width = video.videoWidth * scale;
  const height = video.videoHeight * scale;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) return '';
  
  // Use 'medium' quality for context images to speed up transfer/analysis
  ctx.drawImage(video, 0, 0, width, height);
  return canvas.toDataURL('image/jpeg', 0.7).split(',')[1];
};

/**
 * Calculates the percentage of pixels that differ between two contexts.
 * Helps ignore video noise or tiny animations (like a blinking cursor).
 */
export const getPixelDiff = (
  ctxNew: CanvasRenderingContext2D, 
  ctxOld: CanvasRenderingContext2D | null, 
  width: number, 
  height: number
): number => {
  if (!ctxOld) return 1.0; // 100% diff if no previous frame

  const imgNew = ctxNew.getImageData(0, 0, width, height);
  const imgOld = ctxOld.getImageData(0, 0, width, height);
  const dataNew = imgNew.data;
  const dataOld = imgOld.data;
  
  let diffCount = 0;
  const threshold = 35; // Pixel difference tolerance (0-255) to ignore compression artifacts

  // Check every 4th pixel to speed up performance
  for (let i = 0; i < dataNew.length; i += 16) {
    if (Math.abs(dataNew[i] - dataOld[i]) > threshold ||         // R
        Math.abs(dataNew[i+1] - dataOld[i+1]) > threshold ||     // G
        Math.abs(dataNew[i+2] - dataOld[i+2]) > threshold) {     // B
      diffCount++;
    }
  }

  // Multiply by 4 because we skipped pixels
  return (diffCount * 4) / (width * height);
};