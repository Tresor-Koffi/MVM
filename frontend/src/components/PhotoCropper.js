import { useRef } from 'react';
import Cropper from 'react-cropper';
import 'cropperjs/dist/cropper.css';
import './PhotoCropper.css';

export default function PhotoCropper({ src, onDone, onCancel }) {
  const cropperRef = useRef(null);

  const handleCrop = () => {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    cropper.getCroppedCanvas({ width: 600, height: 800 }).toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      onDone(blob, url);
    }, 'image/jpeg', 0.85);
  };

  return (
    <div className="cropper-overlay">
      <div className="cropper-modal">
        <div className="cropper-header">
          <h3>Recadrer la photo (portrait 3:4)</h3>
          <button className="cropper-close" onClick={onCancel}>✕</button>
        </div>
        <div className="cropper-body">
          <Cropper
            ref={cropperRef}
            src={src}
            style={{ height: 420, width: '100%' }}
            aspectRatio={3 / 4}
            guides={true}
            viewMode={1}
            autoCropArea={0.9}
            responsive={true}
          />
        </div>
        <div className="cropper-footer">
          <button className="btn-secondary" onClick={onCancel}>Annuler</button>
          <button className="btn-primary" onClick={handleCrop}>Valider le recadrage</button>
        </div>
      </div>
    </div>
  );
}
