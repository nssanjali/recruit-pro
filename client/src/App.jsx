import { Routes, Route, Navigate, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Layout } from "./components/Layout";
import { CandidateDashboard } from "./components/CandidateDashboard";
import { RecruiterDashboard } from "./components/RecruiterDashboard";
import { RecruiterProfile } from "./components/RecruiterProfile";
import { ProfileSettings } from "./components/ProfileSettings";
import { AdminDashboard } from "./components/AdminDashboard";
import { SuperAdminDashboard } from "./components/SuperAdminDashboard";
import { CompanyAdminDashboard } from "./components/CompanyAdminDashboard";
import { InterviewScheduling } from "./components/InterviewScheduling";
import { RecruiterAssignment } from "./components/RecruiterAssignment";
import { JobCandidates } from "./components/JobCandidates";
import { CommunicationCenter } from "./components/CommunicationCenter";
import { AuthPage } from "./components/AuthPage";
import { AuthSuccess } from "./components/AuthSuccess";
import { CompanySignup } from "./components/CompanySignup";
import { JobDetails } from "./components/JobDetails";
import { JobPosting } from "./components/JobPosting";
import { CompanyJobOverview } from "./components/CompanyJobOverview";
import { JobFormBuilderPage } from "./components/JobFormBuilderPage";
import { AnalyticsDashboard } from "./components/AnalyticsDashboard";
import { ApplicationReview } from "./components/ApplicationReview";
import { RecruiterCalendar } from "./components/RecruiterCalendar";
import { CandidateCalendar } from "./components/CandidateCalendar";
import { AdminCalendar } from "./components/AdminCalendar";
import ProtectedRoute from "./components/ProtectedRoute";
import { Toaster } from "./components/ui";
import { getCurrentUser } from "./lib/api";

const roleToPath = (role) => {
  if (role === 'company_admin') return '/company-admin';
  if (role === 'super_admin') return '/super-admin';
  return `/${role}`;
};

export default function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUser = async () => {
      const userData = await getCurrentUser();
      if (userData) {
        setUser(userData);
      } else {
        setUser(null);
      }
      setLoading(false);
    };

    fetchUser();
  }, [location.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f8fafc]">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-[#4285f4]/20 border-t-[#4285f4] animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 bg-[#8b5cf6] rounded-full"></div>
          </div>
        </div>
      </div>
    );
  }

  // Helper to determine active page from pathname
  const getActivePage = () => {
    const path = location.pathname.split('/')[1];
    return path || 'candidate';
  };

  return (
    <>
      <Routes>
        {/* Public Routes */}
        <Route path="/login" element={!user ? <AuthPage /> : <Navigate to={roleToPath(user.role)} replace />} />
        <Route path="/company-signup" element={!user ? <CompanySignup onSwitchToLogin={() => window.location.href = '/login'} /> : <Navigate to="/company-admin" replace />} />
        <Route path="/auth/success" element={<AuthSuccess />} />

        {/* Protected Routes */}
        <Route element={<ProtectedRoute allowedRoles={['candidate', 'recruiter', 'admin', 'company_admin', 'super_admin']} user={user} />}>
          <Route path="/" element={
            <Layout user={user} onLogout={handleLogout} activePage={getActivePage()}>
              <Navigate to={user ? roleToPath(user.role) : '/login'} replace />
            </Layout>
          } />

          {/* Candidate Routes */}
          <Route element={<ProtectedRoute allowedRoles={['candidate']} user={user} />}>
            <Route path="/candidate" element={
              <Layout user={user} onLogout={handleLogout} activePage="candidate">
                <CandidateDashboard user={user} />
              </Layout>
            } />
            <Route path="/candidate-calendar" element={
              <Layout user={user} onLogout={handleLogout} activePage="candidate-calendar">
                <CandidateCalendar />
              </Layout>
            } />
          </Route>

          {/* Recruiter Routes */}
          <Route element={<ProtectedRoute allowedRoles={['recruiter']} user={user} />}>
            <Route path="/recruiter" element={
              <Layout user={user} onLogout={handleLogout} activePage="recruiter">
                <RecruiterDashboard user={user} />
              </Layout>
            } />
            <Route path="/calendar" element={
              <Layout user={user} onLogout={handleLogout} activePage="calendar">
                <RecruiterCalendar />
              </Layout>
            } />
            <Route path="/scheduling" element={
              <Layout user={user} onLogout={handleLogout} activePage="scheduling">
                <InterviewScheduling />
              </Layout>
            } />
            <Route path="/assignment" element={
              <Layout user={user} onLogout={handleLogout} activePage="assignment">
                <RecruiterAssignment />
              </Layout>
            } />
          </Route>

          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['admin']} user={user} />}>
            <Route path="/admin" element={
              <Layout user={user} onLogout={handleLogout} activePage="admin">
                <AdminDashboard user={user} />
              </Layout>
            } />
          </Route>

          {/* Super Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['super_admin']} user={user} />}>
            <Route path="/super-admin" element={
              <Layout user={user} onLogout={handleLogout} activePage="super-admin">
                <SuperAdminDashboard user={user} />
              </Layout>
            } />
          </Route>

          {/* Company Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['company_admin']} user={user} />}>
            <Route path="/company-admin" element={
              <Layout user={user} onLogout={handleLogout} activePage="company-admin">
                <CompanyAdminDashboard user={user} />
              </Layout>
            } />
            <Route path="/post-job" element={
              <Layout user={user} onLogout={handleLogout} activePage="company-admin">
                <JobPosting />
              </Layout>
            } />

            <Route path="/company-admin/jobs/:id" element={
              <Layout user={user} onLogout={handleLogout} activePage="company-admin">
                <CompanyJobOverview />
              </Layout>
            } />
            <Route path="/build-form" element={<JobFormBuilderPage />} />
            <Route path="/build-form/:id" element={<JobFormBuilderPage />} />
            <Route path="/analytics" element={
              <Layout user={user} onLogout={handleLogout} activePage="analytics">
                <AnalyticsDashboard />
              </Layout>
            } />
            <Route path="/admin-calendar" element={
              <Layout user={user} onLogout={handleLogout} activePage="admin-calendar">
                <AdminCalendar />
              </Layout>
            } />
          </Route>

          {/* Shared Recruiter & Company Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['recruiter', 'company_admin', 'admin', 'super_admin']} user={user} />}>
            <Route path="/jobs/:id/candidates" element={
              <Layout user={user} onLogout={handleLogout} activePage="recruiter">
                <JobCandidates />
              </Layout>
            } />
            <Route path="/applications/:id/review" element={
              <Layout user={user} onLogout={handleLogout} activePage="recruiter">
                <ApplicationReview />
              </Layout>
            } />
          </Route>

          {/* Shared Protected Routes */}
          <Route path="/communication" element={
            <Layout user={user} onLogout={handleLogout} activePage="communication">
              <CommunicationCenter />
            </Layout>
          } />
          <Route path="/profile" element={
            <Layout user={user} onLogout={handleLogout} activePage="profile">
              {user?.role === 'recruiter' ? (
                <RecruiterProfile user={user} />
              ) : (
                <ProfileSettings user={user} onUpdate={(updatedUser) => setUser(updatedUser)} />
              )}
            </Layout>
          } />
          <Route path="/jobs/:id" element={
            <Layout user={user} onLogout={handleLogout} activePage="candidate">
              <JobDetails user={user} />
            </Layout>
          } />

        </Route>

        {/* 404 Redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <Toaster />
    </>
  );
}
