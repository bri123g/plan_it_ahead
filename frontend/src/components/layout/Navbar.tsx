import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuthHook';
import { Button } from '../ui/button';

export function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="border-b bg-white">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="text-2xl font-bold text-primary">
          Plan It Ahead
        </Link>
        
        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link to="/search" className="text-sm hover:text-primary">Search</Link>
              <Link to="/itineraries" className="text-sm hover:text-primary">My Itineraries</Link>
              <Link to="/ai" className="text-sm hover:text-primary">AI Planner</Link>
              <Link to="/companions" className="text-sm hover:text-primary">Companions</Link>
              <Link to="/chat" className="text-sm hover:text-primary">Chat</Link>
              <span className="text-sm text-gray-600">{user.name}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </>
          ) : (
            <>
              <Link to="/login">
                <Button variant="ghost" size="sm">Login</Button>
              </Link>
              <Link to="/register">
                <Button size="sm">Sign Up</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}

