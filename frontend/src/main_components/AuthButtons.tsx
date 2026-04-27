import { SignInButton, SignOutButton, SignUpButton, UserButton, useUser, useAuth } from '@clerk/clerk-react';

import { LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';


export default function AuthButtons() {
    const { isSignedIn, isLoaded, user } = useUser();

    if (!isLoaded) return null;

    if (isSignedIn) {
        return (
            <div className="flex items-center  ">
                <div  className="bg-transparent  border-none p-0 flex items-center gap-1">


                    <UserButton
                        appearance={{
                            elements: {
                                userButtonAvatarBox: "w-9 h-9 border-2 border-indigo-500/30",
                                userButtonPopoverCard: "bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800",
                            }

                        }}
                    />

                    <span className="text-sm font-medium text-black dark:text-white py-1 px-2 border border-dashed ">
                        {user?.username || user?.firstName || "User"}
                    </span >
                </div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-3">
            <SignInButton mode="modal">
                <Button
                    variant="outline"
                    className="flex items-center gap-2 p-4 cursor-pointer text-sm font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
                >
                    <LogIn className="w-4 h-4" />
                    Sign In
                </Button>
            </SignInButton>
            <SignUpButton mode="modal">
                <Button
                    className="flex items-center gap-2 p-4 text-sm font-semibold cursor-pointer bg-linear-to-t from-indigo-500 to-purple-600 text-white rounded-lg shadow-lg shadow-indigo-500/25 transition-all border-none border-b border-neutral-200 hover:shadow-indigo-500/40 hover:from-indigo-600 hover:to-purple-700"
                >
                    <UserPlus className="w-4 h-4" />
                    Get Started
                </Button>
            </SignUpButton>
        </div>
    );
}
