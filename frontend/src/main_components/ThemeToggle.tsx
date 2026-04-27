import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '@/components/ui/button';

export default function ThemeToggle() {
    const [theme, setTheme] = useState(() => {
        if (typeof window !== 'undefined') {
            return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
        }
        return 'light';
    });

    useEffect(() => {
        if (theme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <Button
            variant="outline"
            onClick={toggleTheme}
            className="flex items-center gap-2 p-2 cursor-pointer text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
            aria-label="Toggle theme"
        >
            <div className="relative w-6 h-6 flex items-center justify-center overflow-hidden">
                <motion.div
                    initial={false}
                    animate={{
                        y: theme === 'dark' ? 30 : 0,
                        opacity: theme === 'dark' ? 0 : 1,
                        rotate: theme === 'dark' ? 90 : 0
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="absolute"
                >
                    <Sun className="w-5 h-5 text-amber-500" />
                </motion.div>
                <motion.div
                    initial={false}
                    animate={{
                        y: theme === 'light' ? -30 : 0,
                        opacity: theme === 'light' ? 0 : 1,
                        rotate: theme === 'light' ? -90 : 0
                    }}
                    transition={{ type: "spring", stiffness: 300, damping: 20 }}
                    className="absolute"
                >
                    <Moon className="w-5 h-5 text-indigo-400" />
                </motion.div>
            </div>
        </Button>
    );
}
