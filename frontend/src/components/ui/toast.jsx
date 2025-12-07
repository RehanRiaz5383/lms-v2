import * as React from "react";
import { cn } from "../../utils/cn";
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from "lucide-react";

const ToastContext = React.createContext();

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = React.useState([]);
  const [uploadProgress, setUploadProgress] = React.useState(null);

  const showToast = React.useCallback((message, type = "info", duration = 3000) => {
    const id = Date.now();
    const toast = { id, message, type };
    
    setToasts((prev) => [...prev, toast]);

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const removeToast = React.useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const success = React.useCallback((message, duration) => {
    showToast(message, "success", duration);
  }, [showToast]);

  const error = React.useCallback((message, duration) => {
    showToast(message, "error", duration);
  }, [showToast]);

  const info = React.useCallback((message, duration) => {
    showToast(message, "info", duration);
  }, [showToast]);

  const warning = React.useCallback((message, duration) => {
    showToast(message, "warning", duration);
  }, [showToast]);

  const showUploadProgress = React.useCallback((uploadId, fileName) => {
    setUploadProgress({ id: uploadId, fileName, progress: 0 });
  }, []);

  const updateUploadProgress = React.useCallback((uploadId, progress) => {
    setUploadProgress((prev) => 
      prev && prev.id === uploadId ? { ...prev, progress } : prev
    );
  }, []);

  const completeUploadProgress = React.useCallback((uploadId) => {
    setUploadProgress((prev) => 
      prev && prev.id === uploadId ? null : prev
    );
  }, []);

  return (
    <ToastContext.Provider value={{ 
      showToast, 
      success, 
      error, 
      info, 
      warning,
      showUploadProgress,
      updateUploadProgress,
      completeUploadProgress,
    }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-md">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
      {/* Upload Progress Bar - Footer (Bottom Center) */}
      {uploadProgress && (
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border shadow-lg">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="h-2 w-2 bg-blue-500 rounded-full animate-pulse flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    Uploading: {uploadProgress.fileName}
                  </p>
                  <div className="w-full bg-muted rounded-full h-1.5 mt-1">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress.progress}%` }}
                    />
                  </div>
                </div>
              </div>
              <span className="text-sm font-medium text-foreground flex-shrink-0">
                {uploadProgress.progress}%
              </span>
            </div>
          </div>
        </div>
      )}
    </ToastContext.Provider>
  );
};

const Toast = ({ message, type, onClose }) => {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info,
  };

  const styles = {
    success: "bg-green-500 text-white border-green-600",
    error: "bg-destructive text-destructive-foreground border-destructive",
    warning: "bg-yellow-500 text-white border-yellow-600",
    info: "bg-blue-500 text-white border-blue-600",
  };

  const Icon = icons[type] || Info;

  return (
    <div
      className={cn(
        "flex items-center gap-3 p-4 rounded-lg border shadow-lg animate-in slide-in-from-right",
        styles[type]
      )}
    >
      <Icon className="h-5 w-5 flex-shrink-0" />
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:opacity-70 transition-opacity"
        aria-label="Close toast"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};

