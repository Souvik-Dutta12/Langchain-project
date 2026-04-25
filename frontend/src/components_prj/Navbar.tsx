import React from 'react'

const Navbar = () => {
  return (
    <div className="w-screen h-[7vh] bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 flex items-center justify-between px-4 shadow-neutral-300 shadow-lg/30 border-b border-red-300">
      <div classname="flex gap-3">
        <div>Logo   </div>
        Ebook Mafia
        </div>
      <div>Profile</div>
    </div>
  )
}

export default Navbar
