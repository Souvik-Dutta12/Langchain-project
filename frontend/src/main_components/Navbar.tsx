import React, { useEffect } from 'react'
import AuthButtons from './AuthButtons'
import { useAuth } from '@clerk/clerk-react'


const Navbar = () => {
  const { isSignedIn,sessionId,getToken,isLoaded } = useAuth()
  
  const testBackend = async () => {

    const token = await getToken();

    const res = await fetch("http://localhost:3000/api/debug-auth", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

  };

   return (
   <div className="w-screen h-[7vh] bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 flex items-center justify-between px-4 shadow-neutral-300 shadow-lg/30 border-b border-red-300">
      <AuthButtons />
    </div>
    // else return <></>
   )
}

export default Navbar
