import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminRoute';
import LoadingSpinner from './components/ui/LoadingSpinner';

import ErrorBoundary from './components/ui/ErrorBoundary';

// Lazy loaded page components
const Login = lazy(() => import('./pages/Login/Login'));
const Register = lazy(() => import('./pages/Register/Register'));
const Dashboard = lazy(() => import('./pages/Dashboard/Dashboard'));
const ClubList = lazy(() => import('./pages/Clubs/ClubList'));
const ClubDetail = lazy(() => import('./pages/Clubs/ClubDetail'));
const CreateClub = lazy(() => import('./pages/Clubs/CreateClub'));
const AdminClubList = lazy(() => import('./pages/Admin/AdminClubList'));
const AdminUsers = lazy(() => import('./pages/Admin/AdminUsers'));
const AdminAuditLogs = lazy(() => import('./pages/Admin/AdminAuditLogs'));
const AdminReports = lazy(() => import('./pages/Admin/AdminReports'));
const SearchPage = lazy(() => import('./pages/Search/SearchPage'));
const EventsPage = lazy(() => import('./pages/Events/EventsPage'));
const EventDetailPage = lazy(() => import('./pages/Events/EventDetailPage'));
const ProfilePage = lazy(() => import('./pages/Profile/ProfilePage'));
const NotificationList = lazy(() => import('./pages/Notifications/NotificationList'));
const AnnouncementList = lazy(() => import('./pages/Announcements/AnnouncementList'));
const RecruitmentList = lazy(() => import('./pages/Recruitment/RecruitmentList'));
const RecruitmentDetail = lazy(() => import('./pages/Recruitment/RecruitmentDetail'));
const RecruitmentApplications = lazy(() => import('./pages/Recruitment/RecruitmentApplications'));

const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <ErrorBoundary>
                    <Suspense fallback={
                    <div className="min-h-screen flex items-center justify-center bg-[#fbf9f4]">
                        <LoadingSpinner />
                    </div>
                }>
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
                </Suspense>
                </ErrorBoundary>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;