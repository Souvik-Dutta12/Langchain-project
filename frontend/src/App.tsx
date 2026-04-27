import { BrowserRouter, Routes, Route } from 'react-router-dom'
import React from 'react'
import { Show, SignInButton, SignUpButton, UserButton, SignIn, SignUp } from '@clerk/react'
import { ProtectedRoute } from '@/main_components/ProtectedRoute'
import Navbar from './main_components/Navbar'
import Landing from './pages/Landing'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />

        {/* <Route path="/dashboard" element={
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        } />
        <Route path="/books/:id" element={
          <ProtectedRoute><BookChat /></ProtectedRoute>
        } />
        <Route path="/books/:id/report" element={
          <ProtectedRoute><ReportBuilder /></ProtectedRoute>
        } />
        <Route path="/books/:id/quiz" element={
          <ProtectedRoute><QuizView /></ProtectedRoute>
        } />
        <Route path="/books/:id/summary" element={
          <ProtectedRoute><Summary /></ProtectedRoute>
        } /> */}
      </Routes>
    </BrowserRouter>
  )
}

export default App
