/**
 * Layout component with navigation bar.
 * Renders different nav links for admins vs users.
 */

import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FiLogOut, FiAward, FiList, FiBarChart2, FiHome, FiGift, FiPackage, FiCamera, FiUser, FiMail } from 'react-icons/fi';

export default function Layout() {
    const { user, logout } = useAuth();
    const location = useLocation();
    const isAdmin = user?.role === 'adm';

    const isActive = (path) => location.pathname === path ? 'nav-link active' : 'nav-link';

    return (
        <div className="app-layout">
            <header className="mobile-header">
                <div className="sidebar-header">
                    <span className="logo-emoji">🥚</span>
                    <h1 className="logo-text">Egg Hunt</h1>
                </div>
                <div className="user-info">
                    <span className="user-avatar">{user?.username?.[0]?.toUpperCase() || '?'}</span>
                    <button className="logout-btn mobile-logout" onClick={logout} title="Logout">
                        <FiLogOut />
                    </button>
                </div>
            </header>

            <nav className="sidebar">
                <div className="sidebar-header desktop-only">
                    <span className="logo-emoji">🥚</span>
                    <h1 className="logo-text">Egg Hunt</h1>
                </div>

                <div className="nav-section">
                    {isAdmin ? (
                        <>
                            <span className="nav-label desktop-only">Admin</span>
                            <Link to="/admin" className={isActive('/admin')}><FiHome /> <span className="nav-text">Dashboard</span></Link>
                            <Link to="/admin/eggs" className={isActive('/admin/eggs')}><FiPackage /> <span className="nav-text">Eggs</span></Link>
                            <Link to="/admin/redemptions" className={isActive('/admin/redemptions')}><FiBarChart2 /> <span className="nav-text">Redemptions</span></Link>
                            <Link to="/admin/prizes" className={isActive('/admin/prizes')}><FiGift /> <span className="nav-text">Prizes</span></Link>
                            <Link to="/admin/email" className={isActive('/admin/email')}><FiMail /> <span className="nav-text">Email</span></Link>
                            <hr className="nav-divider desktop-only" />
                        </>
                    ) : null}

                    {!isAdmin && (
                        <>
                            <span className="nav-label desktop-only">Menu</span>
                            <Link to="/dashboard" className={isActive('/dashboard')}><FiHome /> <span className="nav-text">Home</span></Link>
                            <Link to="/scan" className={isActive('/scan')}><FiCamera /> <span className="nav-text">Scan</span></Link>
                            <Link to="/leaderboard" className={isActive('/leaderboard')}><FiBarChart2 /> <span className="nav-text">Leaderboard</span></Link>
                            <Link to="/prizes" className={isActive('/prizes')}><FiAward /> <span className="nav-text">Prizes</span></Link>
                            <Link to="/history" className={isActive('/history')}><FiList /> <span className="nav-text">History</span></Link>
                        </>
                    )}
                    <Link to="/account" className={isActive('/account')}><FiUser /> <span className="nav-text">Account</span></Link>
                </div>

                <div className="sidebar-footer desktop-only">
                    <div className="user-info">
                        <span className="user-avatar">{user?.username?.[0]?.toUpperCase()}</span>
                        <div className="user-details">
                            <span className="username">{user?.username}</span>
                            <span className="user-role">{isAdmin ? 'Admin' : `${user?.total_points} pts`}</span>
                        </div>
                    </div>
                    <button className="logout-btn" onClick={logout} title="Logout">
                        <FiLogOut />
                    </button>
                </div>
            </nav>

            <main className="main-content">
                <Outlet />
            </main>
        </div>
    );
}
