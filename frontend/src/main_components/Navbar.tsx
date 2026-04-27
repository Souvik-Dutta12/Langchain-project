import React, { useEffect } from 'react';
import AuthButtons from './AuthButtons';
import { useAuth } from '@clerk/clerk-react';
import ThemeToggle from './ThemeToggle';
import { motion, useScroll, useTransform } from 'motion/react';
import Logo from './Logo';

const Navbar = () => {
  const { isSignedIn, sessionId, getToken, isLoaded } = useAuth();
  const { scrollY } = useScroll();



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
      
      className="fixed top-10 left-[15%] z-50 h-[8vh] w-[70%] flex  items-center justify-between px-6 md:px-12 backdrop-blur-md border border-white/30 dark:border-white/5 transition-all duration-300 rounded-lg shadow-xl shadow-black/5" 
    >
      <div className="flex items-center gap-12 ">
        {/* Logo Section */}
        <motion.div
          className="flex items-center gap-3 cursor-pointer group"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          
        >
          <div className="relative w-10 h-10 flex items-center justify-center">
           
          
          </div>
          <span className="text-3xl font-bold tracking-tighter bg-clip-text text-transparent bg-linear-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
            Omnis
          </span>
        </motion.div>

        {/* Navigation Links (Desktop) */}
        <div className="hidden md:flex items-center gap-6 ml-[30%]">
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
