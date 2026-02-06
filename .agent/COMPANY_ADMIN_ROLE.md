# Company Admin Role - Implementation Summary

## Overview
Successfully implemented the **Company Admin** role (`company_admin`) in RecruitPro. This role allows users to post and manage their own jobs while being separate from the global System Admin.

## Key Differences Between Roles

### Admin (System Admin)
- **Full System Access**: Sees ALL jobs posted by anyone
- **User Management**: Can manage all users, recruiters, and candidates
- **Global Analytics**: Views system-wide statistics
- **Job Management**: Can create, edit, and delete ANY job

### Company Admin
- **Limited Job Access**: Only sees jobs THEY posted
- **Application Tracking**: Views only applications for their jobs
- **Company Analytics**: Stats specific to their job postings
- **Job Management**: Can only create, edit, and delete THEIR OWN jobs

### Recruiter
- **Job Viewing**: Sees all jobs (unchanged)
- **Candidate Management**: Manages candidates and interviews
- **No Job Posting**: Cannot create jobs

### Candidate
- **Job Browsing**: Views available jobs
- **Application Submission**: Applies to jobs
- **No Management**: Cannot post or manage jobs

## Changes Made

### Backend Changes

#### 1. Job Routes (`server/routes/jobRoutes.js`)
- Added `company_admin` to authorized roles for:
  - `POST /api/jobs` - Create job
  - `PUT /api/jobs/:id` - Update job
  - `DELETE /api/jobs/:id` - Delete job

#### 2. Job Controller (`server/controllers/jobController.js`)
- **`getJobs()`**: Filters jobs by `postedBy` for company_admin
- **`updateJob()`**: Added ownership check - company_admin can only update their jobs
- **`deleteJob()`**: Added ownership check - company_admin can only delete their jobs

#### 3. User Controller (`server/controllers/userController.js`)
- **`getUserStats()`**: Added `companyAdmins` count
- **`updateUserRole()`**: Added `company_admin` to valid roles

### Frontend Changes

#### 1. New Component: `CompanyAdminDashboard.jsx`
- Streamlined dashboard showing only company admin's jobs
- Tabs: My Jobs, Applications, Analytics
- Job posting capability
- Application tracking for their jobs only

#### 2. App Routing (`client/src/App.jsx`)
- Added `/company-admin` route
- Protected with `company_admin` role
- Auto-redirect on login

#### 3. Layout Navigation (`client/src/components/Layout.jsx`)
- Added "Company Dashboard" menu item
- Visible only to `company_admin` users
- Added `company_admin` to shared routes (Messages, Evaluations, Profile)

## How to Use

### Creating a Company Admin User

Since there's no separate signup for company_admin, the System Admin must manually change a user's role:

#### Option 1: Via Admin Dashboard (Recommended)
1. Login as System Admin
2. Navigate to Admin Dashboard
3. Go to Users section
4. Find the user you want to promote
5. Change their role to `company_admin`

#### Option 2: Via Database
```javascript
// In MongoDB shell or Compass
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { role: "company_admin" } }
)
```

#### Option 3: Via API (for testing)
```bash
# Update user role via API
curl -X PUT http://localhost:5000/api/users/{userId}/role \
  -H "Authorization: Bearer {admin_token}" \
  -H "Content-Type: application/json" \
  -d '{"role": "company_admin"}'
```

### Testing the Implementation

1. **Create a Company Admin**:
   - Use one of the methods above to set a user's role to `company_admin`

2. **Login as Company Admin**:
   - User will be redirected to `/company-admin`
   - Should see "Company Dashboard" in navigation

3. **Post a Job**:
   - Click "Post Job" button
   - Fill out job details
   - Submit

4. **Verify Job Visibility**:
   - Company Admin should see only their posted jobs
   - Login as System Admin - should see ALL jobs including company admin's
   - Login as Recruiter - should see all jobs

5. **Test Ownership Protection**:
   - Company Admin should NOT be able to edit/delete jobs posted by others
   - System Admin CAN edit/delete any job

## Database Schema
No schema changes required. The `role` field in the User model already supports any string value. The Job model's `postedBy` field tracks job ownership.

## Security Features
- ✅ Role-based access control via middleware
- ✅ Ownership validation on update/delete operations
- ✅ Frontend route protection
- ✅ Backend API authorization

## Future Enhancements (Optional)
- Add company profile/branding for company_admin
- Multi-company support (company_id field)
- Company admin can invite team members
- Company-specific analytics dashboard
- Bulk job posting capabilities
