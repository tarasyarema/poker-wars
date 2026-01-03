import { useState, useEffect, useCallback } from 'react';

interface ResponsiveState {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}

export function useResponsive(): ResponsiveState {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [windowWidth, setWindowWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close sidebar when switching to desktop
  useEffect(() => {
    if (windowWidth >= 1024) {
      setSidebarOpen(false);
    }
  }, [windowWidth]);

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  const closeSidebar = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  return {
    isMobile: windowWidth < 640,
    isTablet: windowWidth >= 640 && windowWidth < 1024,
    isDesktop: windowWidth >= 1024,
    sidebarOpen,
    toggleSidebar,
    closeSidebar,
  };
}
