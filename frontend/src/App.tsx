import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Dashboard from './Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'
import Contacts from './pages/Contacts'
import ProtectedRoute from './ProtectedRoute'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
  path="/dashboard"
  element={
    <ProtectedRoute>
      <Dashboard />
    </ProtectedRoute>
  }
/>
        <Route path="*" element={<Navigate to="/login" replace />} />
        <Route
  path="/contacts"
  element={
    <ProtectedRoute>
      <Contacts />
    </ProtectedRoute>
  }
/>
      </Routes>
    </BrowserRouter>
  )
}

export default App