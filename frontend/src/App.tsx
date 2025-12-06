import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthProvider } from './hooks/useAuth';
import { ProtectedRoute } from './components/layout/ProtectedRoute';
import { Navbar } from './components/layout/Navbar';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Search } from './pages/Search';
import { CreateItinerary } from './pages/CreateItinerary';
import { ItineraryBuilder } from './pages/ItineraryBuilder';
import { AIItinerary } from './pages/AIItinerary';
import { Companions } from './pages/Companions';
import { Chat } from './pages/Chat';
import './App.css';
import { useEffect } from 'react';

function ItineraryRedirect() {
  const navigate = useNavigate();
  
  useEffect(() => {
    const stored = localStorage.getItem('planit_current_itinerary');
    if (stored) {
      try {
        const itinerary = JSON.parse(stored);
        const id = itinerary.itinerary_id || itinerary.id;
        if (id) {
          navigate(`/itineraries/${id}`, { replace: true });
          return;
        }
      } catch (e) {
        console.error('Error parsing itinerary:', e);
      }
    }
    navigate('/itineraries/create', { replace: true });
  }, [navigate]);
  
  return null;
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <Search />
                </ProtectedRoute>
              }
            />
            <Route
              path="/itineraries/create"
              element={
                <ProtectedRoute>
                  <CreateItinerary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/itineraries"
              element={
                <ProtectedRoute>
                  <ItineraryRedirect />
                </ProtectedRoute>
              }
            />
            <Route
              path="/itineraries/:id"
              element={
                <ProtectedRoute>
                  <ItineraryBuilder />
                </ProtectedRoute>
              }
            />
            <Route
              path="/ai"
              element={
                <ProtectedRoute>
                  <AIItinerary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/companions"
              element={
                <ProtectedRoute>
                  <Companions />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/chat/:id"
              element={
                <ProtectedRoute>
                  <Chat />
                </ProtectedRoute>
              }
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
      </div>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
