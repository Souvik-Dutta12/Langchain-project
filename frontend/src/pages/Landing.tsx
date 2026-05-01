import React from 'react'
import Navbar from '@/main_components/Navbar';
import { motion } from 'motion/react';

const Landing = () => {
    return (
        <div className="min-h-screen my-auto border-red-500 bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-50 selection:bg-indigo-500/30">
            <Navbar />

            <main className="pt-[8vh]">
                {/* Hero Section */}
                <section className="relative h-[92vh] flex flex-col items-center justify-center overflow-hidden px-6">
                    {/* Background Decorative Elements */}
                    <div className="absolute top-1/4 -left-20 w-96 h-96 bg-indigo-500/20 rounded-full blur-[120px]" />
                    <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-[120px]" />

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="text-center max-w-4xl z-10"
                    >
                        <h1 className="text-6xl md:text-8xl font-black tracking-tight mb-8">
                            Design with <br />
                            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 animate-gradient-x">
                                Infinite Purpose.
                            </span>
                        </h1>
                        <p className="text-xl text-neutral-500 dark:text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Experience the next generation of creative interfaces. Built with precision,
                            animated with emotion, and powered by Omnis.
                        </p>

                        <div className="flex items-center justify-center gap-4">
                            <motion.button
                                whileHover={{ scale: 1.05 }}
                                whileTap={{ scale: 0.95 }}
                                className="px-8 py-4 bg-neutral-900 dark:bg-white text-white dark:text-black font-bold rounded-2xl shadow-xl transition-all"
                            >
                                Get Started
                            </motion.button>
                            <motion.button
                                whileHover={{ bg: "rgba(0,0,0,0.05)" }}
                                className="px-8 py-4 border border-neutral-200 dark:border-neutral-800 font-bold rounded-2xl transition-all"
                            >
                                View Gallery
                            </motion.button>
                        </div>
                    </motion.div>
                </section>

                {/* Spacer for scrolling effect */}
                <section className="h-screen bg-neutral-100 dark:bg-neutral-900/50 flex items-center justify-center">
                    <h2 className="text-4xl font-light italic text-neutral-400">Scroll down to see the glass effect...</h2>
                </section>
            </main>
        </div>
    )
}

export default Landing
