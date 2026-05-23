'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Loader2 } from 'lucide-react';
import { useI18n } from '@/lib/i18n/context';

interface DocumentPreviewModalProps {
  preview: { url: string; name: string; mime: string };
  onClose: () => void;
}

export function DocumentPreviewModal({ preview, onClose }: DocumentPreviewModalProps) {
  const { t } = useI18n();
  const [mounted, setMounted] = useState(false);
  const [frameLoading, setFrameLoading] = useState(true);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    setFrameLoading(true);
  }, [preview.url]);

  if (!mounted) return null;

  const isPdf = preview.mime === 'application/pdf' || preview.name.toLowerCase().endsWith('.pdf');
  const isImage = preview.mime.startsWith('image/');

  return createPortal(
    <div className="doc-preview-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="doc-preview-panel" onClick={(e) => e.stopPropagation()}>
        <div className="doc-preview-header">
          <span className="doc-preview-title">{preview.name}</span>
          <button
            type="button"
            onClick={onClose}
            className="doc-preview-close"
            aria-label={t('documents.closePreview')}
          >
            <X size={20} />
          </button>
        </div>
        <div className="doc-preview-body relative">
          {frameLoading && (isPdf || isImage) && (
            <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
              <Loader2 size={32} className="animate-spin text-arc-2" />
            </div>
          )}
          {isImage ? (
            <img
              src={preview.url}
              alt={preview.name}
              className="doc-preview-image"
              onLoad={() => setFrameLoading(false)}
              onError={() => setFrameLoading(false)}
            />
          ) : isPdf ? (
            <iframe
              src={preview.url}
              title={preview.name}
              className="doc-preview-frame"
              onLoad={() => setFrameLoading(false)}
            />
          ) : (
            <iframe
              src={preview.url}
              title={preview.name}
              className="doc-preview-frame"
              onLoad={() => setFrameLoading(false)}
            />
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
