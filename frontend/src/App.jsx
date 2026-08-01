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
import AdminUsers from './pages/Admin/AdminUsers';
import AdminAuditLogs from './pages/Admin/AdminAuditLogs';
import AdminReports from './pages/Admin/AdminReports';
import SearchPage from './pages/Search/SearchPage';
import EventsPage from './pages/Events/EventsPage';
import EventDetailPage from './pages/Events/EventDetailPage';
import ProfilePage from './pages/Profile/ProfilePage';
import NotificationList from './pages/Notifications/NotificationList';
import AnnouncementList from './pages/Announcements/AnnouncementList';
import RecruitmentList from './pages/Recruitment/RecruitmentList';
import RecruitmentDetail from './pages/Recruitment/RecruitmentDetail';
import RecruitmentApplications from './pages/Recruitment/RecruitmentApplications';
import MyCertificates from './pages/Certificates/MyCertificates';

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
                        <Route path="/dashboard"                          element={<Dashboard />} />
                        <Route path="/profile"                            element={<ProfilePage />} />
                        <Route path="/search"                             element={<SearchPage />} />
                        <Route path="/clubs"                               element={<ClubList />} />
                        <Route path="/clubs/:id"                           element={<ClubDetail />} />
                        <Route path="/clubs/create"                        element={<CreateClub />} />
                        <Route path="/events"                              element={<EventsPage />} />
                        <Route path="/events/:id"                          element={<EventDetailPage />} />
                        <Route path="/notifications"                       element={<NotificationList />} />
                        <Route path="/announcements"                       element={<AnnouncementList />} />
                        <Route path="/clubs/:clubId/announcements"         element={<AnnouncementList />} />
                        <Route path="/recruitment"                        element={<RecruitmentList />} />
                        <Route path="/recruitment/:id"                    element={<RecruitmentDetail />} />
                        <Route path="/recruitment/:id/applications"        element={<RecruitmentApplications />} />
                        <Route path="/clubs/:clubId/recruitment"          element={<RecruitmentList />} />
                        <Route path="/clubs/:clubId/recruitment/:noticeId" element={<RecruitmentDetail />} />
                        <Route path="/clubs/:clubId/recruitment/:noticeId/applications" element={<RecruitmentApplications />} />
                        <Route path="/certificates text"                  element={<MyCertificates />} />
                        <Route path="/certificates"                       element={<MyCertificates />} />
                    </Route>

                    {/* Admin only */}
                    <Route element={<AdminRoute />}>
                        <Route path="/admin/clubs"      element={<AdminClubList />} />
                        <Route path="/admin/users"      element={<AdminUsers />} />
                        <Route path="/admin/audit-logs" element={<AdminAuditLogs />} />
                        <Route path="/admin/reports"    element={<AdminReports />} />
                    </Route>

                    {/* Fallback */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;