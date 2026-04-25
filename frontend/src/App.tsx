import React from 'react'
import Navbar from './components_prj/Navbar'

const App = () => {
  return (
    <div className="w-screen h-screen bg-neutral-200 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 flex flex-col items-center justify-between">  
      <Navbar />
      <div>
        <div className="left">this is left side 1</div>
        <div className="right">that is right side 2</div>
      </div>
    </div>
  )
}

export default App
