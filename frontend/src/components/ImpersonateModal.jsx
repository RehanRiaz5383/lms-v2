import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { Button } from './ui/button';
import { cn } from '../utils/cn';
import { storage } from '../utils/storage';

const ImpersonateModal = ({ isOpen, onClose, userId, userName }) => {
  const iframeRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [impersonationToken, setImpersonationToken] = useState(null); // { token, user }
  const adminSessionRef = useRef(null); // Store admin's session to restore later

  // Get the base URL for the application
  const getAppBaseUrl = () => {
    // Get current origin (e.g., http://localhost:5173)
    const origin = window.location.origin;
    return origin;
  };

  // Save admin session and fetch impersonation token when modal opens
  useEffect(() => {
    if (!isOpen || !userId) return;

    // Save admin's current session before opening modal
    adminSessionRef.current = {
      token: storage.getToken(),
      user: storage.getUser(),
    };

    const fetchImpersonationToken = async () => {
      try {
        setLoading(true);
        setError(null);

        const { apiService } = await import('../services/api');
        const { API_ENDPOINTS } = await import('../config/api');
        
        const endpoint = API_ENDPOINTS.users.impersonate.replace(':id', userId);
        const response = await apiService.post(endpoint);
        
        if (response.data?.data?.token && response.data?.data?.user) {
          setImpersonationToken({
            token: response.data.data.token,
            user: response.data.data.user,
          });
        } else {
          setError('Failed to generate impersonation token');
        }
      } catch (err) {
        console.error('Error fetching impersonation token:', err);
        setError(err.response?.data?.error || 'Failed to generate impersonation token');
      } finally {
        setLoading(false);
      }
    };

    fetchImpersonationToken();
  }, [isOpen, userId]);

  // Restore admin session when modal closes
  useEffect(() => {
    if (!isOpen && adminSessionRef.current) {
      // Restore admin's session
      const { token, user } = adminSessionRef.current;
      if (token && user) {
        storage.setToken(token);
        storage.setUser(user);
        
        // Dispatch restore session to update Redux store
        const { store } = require('../store/store');
        const { restoreSession } = require('../store/slices/authSlice');
        store.dispatch(restoreSession());
      }
      
      // Clear the iframe's storage by sending a message
      if (iframeRef.current?.contentWindow) {
        try {
          iframeRef.current.contentWindow.postMessage({
            type: 'CLEAR_IMPERSONATION',
          }, '*');
        } catch (err) {
          console.error('Error clearing iframe storage:', err);
        }
      }
      
      // Reset state
      setImpersonationToken(null);
      setError(null);
      setLoading(true);
    }
  }, [isOpen]);

  // Auto-login in iframe when token is ready
  useEffect(() => {
    if (!isOpen || !impersonationToken || !iframeRef.current) return;

    const iframe = iframeRef.current;
    const iframeWindow = iframe.contentWindow;

    // Wait for iframe to load
    const handleIframeLoad = () => {
      try {
        // Send token and user data to iframe for auto-login
        iframeWindow.postMessage({
          type: 'IMPERSONATE_LOGIN',
          token: impersonationToken.token,
          user: impersonationToken.user,
        }, '*');
      } catch (err) {
        console.error('Error sending token to iframe:', err);
        setError('Failed to initialize impersonation session');
      }
    };

    iframe.addEventListener('load', handleIframeLoad);

    // If iframe is already loaded
    if (iframe.contentDocument?.readyState === 'complete') {
      handleIframeLoad();
    }

    return () => {
      iframe.removeEventListener('load', handleIframeLoad);
    };
  }, [isOpen, impersonationToken]);

  if (!isOpen) return null;

  const appBaseUrl = getAppBaseUrl();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="relative w-full h-full max-w-[95vw] max-h-[95vh] bg-background rounded-lg shadow-xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <div>
              <h2 className="text-lg font-semibold">Login as {userName}</h2>
              <p className="text-xs text-blue-100">Impersonation Mode - Viewing as this user</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Clear iframe storage before closing
              if (iframeRef.current?.contentWindow) {
                try {
                  iframeRef.current.contentWindow.postMessage({
                    type: 'CLEAR_IMPERSONATION',
                  }, '*');
                } catch (err) {
                  console.error('Error clearing iframe storage:', err);
                }
              }
              onClose();
            }}
            className="text-white hover:bg-white/20"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 relative overflow-hidden">
          {loading && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Generating impersonation token...</p>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-background z-10">
              <div className="text-center p-6">
                <div className="text-destructive mb-2">
                  <X className="h-12 w-12 mx-auto" />
                </div>
                <h3 className="text-lg font-semibold mb-2">Error</h3>
                <p className="text-sm text-muted-foreground mb-4">{error}</p>
                <Button 
                  onClick={() => {
                    // Clear iframe storage before closing
                    if (iframeRef.current?.contentWindow) {
                      try {
                        iframeRef.current.contentWindow.postMessage({
                          type: 'CLEAR_IMPERSONATION',
                        }, '*');
                      } catch (err) {
                        console.error('Error clearing iframe storage:', err);
                      }
                    }
                    onClose();
                  }} 
                  variant="outline"
                >
                  Close
                </Button>
              </div>
            </div>
          )}

          {!loading && !error && impersonationToken && (
            <iframe
              ref={iframeRef}
              src={appBaseUrl}
              className="w-full h-full border-0"
              title="Impersonation View"
              allow="clipboard-read; clipboard-write"
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ImpersonateModal;

