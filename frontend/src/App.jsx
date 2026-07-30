import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './routes/ProtectedRoute';
import AdminRoute from './routes/AdminROute';

import AppLayout from './components/layout/AppLayout';
import Login from './pages/Login/Login';
import Register from './pages/Register/Register';
import Dashboard from './pages/Dashboard/Dashboard';

import ClubList from './pages/Clubs/ClubList';
import ClubDetail from './pages/Clubs/ClubDetail';
import ClubMembers from './pages/Clubs/ClubMembers';

import EventList from './pages/Events/EventList';
import EventDetail from './pages/Events/EventDetail';
import EventAttendance from './pages/Events/EventAttendance';

import AnnouncementList from './pages/Announcements/AnnouncementList';

import RecruitmentList from './pages/Recruitment/RecruitmentList';
import RecruitmentDetail from './pages/Recruitment/RecruitmentDetail';
import RecruitmentApplications from './pages/Recruitment/RecruitmentApplications';

import MyCertificates from './pages/Certificates/MyCertificates';
import NotificationList from './pages/Notifications/NotificationList';

import AdminClubs from './pages/Admin/AdminClubs';
import AdminUsers from './pages/Admin/AdminUsers';
import AdminReports from './pages/Admin/AdminReports';
import AdminAuditLogs from './pages/Admin/AdminAuditLogs';

const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <Routes>
                    {/* Public Routes */}
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />

                    {/* Authenticated Protected Routes inside AppLayout */}
                    <Route
                        element={
                            <ProtectedRoute>
                                <AppLayout />
                            </ProtectedRoute>
                        }
                    >
                        <Route path="/dashboard" element={<Dashboard />} />

                        {/* Clubs */}
                        <Route path="/clubs" element={<ClubList />} />
                        <Route path="/clubs/:clubId" element={<ClubDetail />} />
                        <Route path="/clubs/:clubId/members" element={<ClubMembers />} />

                        {/* Events */}
                        <Route path="/clubs/:clubId/events" element={<EventList />} />
                        <Route path="/clubs/:clubId/events/:eventId" element={<EventDetail />} />
                        <Route path="/clubs/:clubId/events/:eventId/attendance" element={<EventAttendance />} />

                        {/* Announcements */}
                        <Route path="/clubs/:clubId/announcements" element={<AnnouncementList />} />

                        {/* Recruitment */}
                        <Route path="/clubs/:clubId/recruitment" element={<RecruitmentList />} />
                        <Route path="/clubs/:clubId/recruitment/:noticeId" element={<RecruitmentDetail />} />
                        <Route path="/clubs/:clubId/recruitment/:noticeId/applications" element={<RecruitmentApplications />} />

                        {/* Certificates & Notifications */}
                        <Route path="/certificates" element={<MyCertificates />} />
                        <Route path="/notifications" element={<NotificationList />} />

                        {/* Admin Routes */}
                        <Route
                            path="/admin/clubs"
                            element={
                                <AdminRoute>
                                    <AdminClubs />
                                </AdminRoute>
                            }
                        />
                        <Route
                            path="/admin/users"
                            element={
                                <AdminRoute>
                                    <AdminUsers />
                                </AdminRoute>
                            }
                        />
                        <Route
                            path="/admin/reports"
                            element={
                                <AdminRoute>
                                    <AdminReports />
                                </AdminRoute>
                            }
                        />
                        <Route
                            path="/admin/audit-logs"
                            element={
                                <AdminRoute>
                                    <AdminAuditLogs />
                                </AdminRoute>
                            }
                        />
                    </Route>

                    {/* Catch all redirect */}
                    <Route path="*" element={<Navigate to="/dashboard" replace />} />
                </Routes>
            </AuthProvider>
        </BrowserRouter>
    );
};

export default App;