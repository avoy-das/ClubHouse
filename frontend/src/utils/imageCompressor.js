/**
 * Utility to compress and resize image files client-side before upload.
 * Preserves aspect ratio, reduces payload size, and keeps page load snappy.
 *
 * @param {File} file - Original file input
 * @param {Object} options - Compression options { maxWidth, maxHeight, quality, mimeType }
 * @returns {Promise<File>} Compressed File object (or original file if uncompressed/failed)
 */
export const compressImage = (file, options = {}) => {
    const {
        maxWidth = 1200,
        maxHeight = 1200,
        quality = 0.82,
        mimeType = 'image/webp',
    } = options;

    if (!file || !file.type.startsWith('image/')) {
        return Promise.resolve(file);
    }

    return new Promise((resolve) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Calculate proportional scaling maintaining exact aspect ratio
                if (width > maxWidth || height > maxHeight) {
                    const widthRatio = maxWidth / width;
                    const heightRatio = maxHeight / height;
                    const scaleFactor = Math.min(widthRatio, heightRatio);

                    width = Math.round(width * scaleFactor);
                    height = Math.round(height * scaleFactor);
                }

                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = 'high';
                ctx.drawImage(img, 0, 0, width, height);

                const outputType = (mimeType === 'image/webp' && canUseWebp()) ? 'image/webp' : 'image/jpeg';
                const extension = outputType === 'image/webp' ? '.webp' : '.jpg';
                const newFileName = file.name.replace(/\.[^/.]+$/, '') + extension;

                canvas.toBlob(
                    (blob) => {
                        if (!blob || blob.size >= file.size) {
                            // If compression didn't shrink size, keep original file
                            resolve(file);
                            return;
                        }

                        const compressedFile = new File([blob], newFileName, {
                            type: outputType,
                            lastModified: Date.now(),
                        });
                        resolve(compressedFile);
                    },
                    outputType,
                    quality
                );
            };

            img.onerror = () => resolve(file);
            img.src = e.target.result;
        };

        reader.onerror = () => resolve(file);
        reader.readAsDataURL(file);
    });
};

function canUseWebp() {
    const elem = document.createElement('canvas');
    if (elem.getContext && elem.getContext('2d')) {
        return elem.toDataURL('image/webp').indexOf('data:image/webp') === 0;
    }
    return false;
}

export default compressImage;
