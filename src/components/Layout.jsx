import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Menu, X, ShieldCheck, UserCircle, LogOut } from 'lucide-react';
import { useState } from 'react';
import Footer from './Footer.jsx';
import { useApp } from '../context/AppContext.jsx';

export default function Layout({ children }) {
  const [open, setOpen] = useState(false);
  const { currentUser, logout, isAdmin } = useApp();
  const navigate = useNavigate();

  const closeMenu = () => setOpen(false);

  const handleLogout = async () => {
    try {
      await logout();
      closeMenu();
      navigate('/', { replace: true });
    } catch (error) {
      console.error('Unable to log out:', error);
      window.alert('We could not log you out. Please try again.');
    }
  };

  return (
    <div>
      <header className="nav-wrap">
        <nav className="nav container" aria-label="Primary navigation">
          <Link className="brand" to="/" onClick={closeMenu}>
            <span className="brand-mark"><ShieldCheck /></span>
            TheBarnInsider
          </Link>

          <button
            type="button"
            className="mobile-toggle"
            onClick={() => setOpen((value) => !value)}
            aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={open}
          >
            {open ? <X /> : <Menu />}
          </button>

          <div className={`nav-links ${open ? 'open' : ''}`}>
            <NavLink to="/reviews" onClick={closeMenu}>Browse Reviews</NavLink>
            <NavLink to="/employers" onClick={closeMenu}>For Employers</NavLink>
            <NavLink to="/about" onClick={closeMenu}>About</NavLink>
            <NavLink to="/contact" onClick={closeMenu}>Contact</NavLink>

            {currentUser ? (
              <>
                <NavLink to={isAdmin ? '/admin' : '/account'} onClick={closeMenu}>
                  <UserCircle />
                  {isAdmin ? 'Admin' : 'My Account'}
                </NavLink>
                <button type="button" className="text-button" onClick={handleLogout}>
                  <LogOut />
                  Log out
                </button>
              </>
            ) : (
              <NavLink to="/login" onClick={closeMenu}>Log in</NavLink>
            )}

            <Link
              className="btn btn-dark"
              to={currentUser ? '/submit-review' : '/signup?next=/submit-review'}
              onClick={closeMenu}
            >
              Share your experience
            </Link>
          </div>
        </nav>
      </header>
      <main>{children}</main>
      <Footer />
    </div>
  );
}
