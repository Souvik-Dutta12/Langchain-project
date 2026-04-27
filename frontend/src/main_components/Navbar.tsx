import React, { useEffect } from 'react';
import AuthButtons from './AuthButtons';
import { useAuth } from '@clerk/clerk-react';
import ThemeToggle from './ThemeToggle';
import { motion, useScroll, useTransform } from 'motion/react';

const Navbar = () => {
  const { isSignedIn, sessionId, getToken, isLoaded } = useAuth();
  const { scrollY } = useScroll();

  const backgroundColor = useTransform(
    scrollY,
    [0, 50],
    ['rgba(255, 255, 255, 0)', 'rgba(255, 255, 255, 0.8)']
  );

  const darkBackgroundColor = useTransform(
    scrollY,
    [0, 50],
    ['rgba(0, 0, 0, 0)', 'rgba(10, 10, 10, 0.8)']
  );

  const testBackend = async () => {
    if (!isSignedIn) return;
    const token = await getToken();
    try {
      const res = await fetch("/api/debug-auth", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await res.json();
      
    } catch (err) {
      console.error('Test backend error:', err);
    }
  };

  useEffect(() => {
    if (isSignedIn) {
      testBackend();
    }
  }, [isSignedIn]);

  return (
    <motion.nav
      style={{
        backgroundColor: document.documentElement.classList.contains('dark') ? darkBackgroundColor : backgroundColor
      }}
      className="fixed top-0 left-0 right-0 z-50 h-[8vh] flex items-center justify-between px-6 md:px-12 backdrop-blur-md border-b border-white/10 dark:border-white/5 transition-all duration-300"
    >
      <div className="flex items-center gap-8">
        {/* Logo Section */}
        <motion.div
          className="flex items-center gap-3 cursor-pointer group"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          whileHover={{ scale: 1.05 }}
        >
          <div className="relative w-10 h-10 flex items-center justify-center">
            <motion.svg
              viewBox="0 0 100 100"
              className="w-full h-full fill-none"
              animate={{ rotate: 360 }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
            >
              <defs>
                <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#6366f1" />
                  <stop offset="100%" stopColor="#a855f7" />
                </linearGradient>
              </defs>
              <circle
                cx="50" cy="50" r="45"
                stroke="url(#logoGradient)"
                strokeWidth="2"
                strokeDasharray="10 20"
                className="opacity-40"
              />
            </motion.svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <motion.div
                animate={{
                  scale: [1, 1.2, 1],
                  rotate: [0, 90, 0]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="w-6 h-6 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-lg shadow-lg shadow-indigo-500/50 rotate-45"
              />
            </div>
          </div>
          <span className="text-2xl font-bold tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            Omnis
          </span>
        </motion.div>

        {/* Navigation Links (Desktop) */}
        <div className="hidden md:flex items-center gap-6">
          {['Features', 'Marketplace', 'Resources'].map((item) => (
            <motion.a
              key={item}
              href={`#${item.toLowerCase()}`}
              className="text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors relative group"
              whileHover={{ y: -1 }}
            >
              {item}
              <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-indigo-500 transition-all group-hover:w-full" />
            </motion.a>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <div className="h-6 w-px bg-neutral-300 dark:bg-neutral-800 mx-2" />
        <AuthButtons />
      </div>
    </motion.nav>
  );
};

export default Navbar;
