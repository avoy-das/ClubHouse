import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';

import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';
import ClubList from './pages/Clubs/ClubList';
import ClubDetail from './pages/Clubs/ClubDetail';
import CreateClub from './pages/Clubs/CreateClub';
import AdminClubList from './pages/Admin/AdminClubList';
import SearchPage from './pages/Search/SearchPage';
import EventsPage from './pages/Events/EventsPage';
import EventDetailPage from './pages/Events/EventDetailPage';

const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Public */}
                    <Route path="/login"    element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Protected */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/dashboard"      element={<Dashboard />} />
                        <Route path="/search"         element={<SearchPage />} />
                        <Route path="/clubs"           element={<ClubList />} />
                        <Route path="/clubs/:id"       element={<ClubDetail />} />
                        <Route path="/clubs/create"    element={<CreateClub />} />
                        <Route path="/events"          element={<EventsPage />} />
                        <Route path="/events/:id"      element={<EventDetailPage />} />
                    </Route>

                    {/* Admin only */}
                    <Route element={<AdminRoute />}>
                        <Route path="/admin/clubs" element={<AdminClubList />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;