import React from 'react';
import { AlertTriangle, AlertCircle, X, Loader2 } from 'lucide-react';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmVariant?: 'danger' | 'warning' | 'info';
  isLoading?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onClose?: () => void;
  onCancel?: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  confirmLabel,
  cancelText,
  cancelLabel,
  variant,
  confirmVariant,
  isLoading,
  loading,
  onConfirm,
  onClose,
  onCancel
}) => {
  const finalConfirmText = confirmLabel || confirmText || 'Confirm';
  const finalCancelText = cancelLabel || cancelText || 'Cancel';
  const finalVariant = confirmVariant || variant || 'danger';
  const finalLoading = loading !== undefined ? loading : (isLoading || false);
  const handleClose = () => {
    if (onCancel) onCancel();
    else if (onClose) onClose();
  };
  if (!isOpen) return null;

  const getIcon = () => {
    switch (finalVariant) {
      case 'danger':
        return <AlertCircle className="w-6 h-6 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
      default:
        return <AlertCircle className="w-6 h-6 text-indigo-600" />;
    }
  };

  const getButtonClass = () => {
    switch (finalVariant) {
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white';
      case 'warning':
        return 'bg-amber-600 hover:bg-amber-700 text-white';
      default:
        return 'bg-indigo-600 hover:bg-indigo-700 text-white';
    }
  };

  const getBgClass = () => {
    switch (finalVariant) {
      case 'danger':
        return 'bg-red-100';
      case 'warning':
        return 'bg-amber-100';
      default:
        return 'bg-indigo-100';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 space-y-4 animate-scale-in">
        <div className="flex items-start gap-3">
          <div className={`p-2.5 rounded-full ${getBgClass()} flex-shrink-0`}>
            {getIcon()}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{message}</p>
          </div>
          <button
            onClick={handleClose}
            disabled={finalLoading}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClose}
            disabled={finalLoading}
            className="px-4 py-2 text-sm font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            {finalCancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={finalLoading}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors flex items-center gap-2 shadow-sm cursor-pointer ${getButtonClass()}`}
          >
            {finalLoading && <Loader2 className="w-4 h-4 animate-spin" />}
            {finalConfirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
