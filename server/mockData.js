// Mock data for testing without MongoDB
export const mockInterviews = [
    {
        _id: '1',
        candidate: { name: 'Sarah Johnson', email: 'sarah.j@example.com' },
        recruiter: { name: 'Alex Chen', email: 'alex.c@example.com' },
        admin: { name: 'Super Admin', email: 'admin@recruitpro.com' },
        role: 'Senior ML Engineer',
        date: 'Oct 23, 2025',
        time: '2 PM',
        duration: '60 minutes',
        type: 'Technical Round',
        meetingLink: 'https://proctor.recruitpro.com/meeting/secure-123',
        proctorId: 'secure-123',
        status: 'scheduled',
        scheduledBy: 'AI',
        isProctored: true,
        notificationsSent: true,
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

export const mockAssignments = [
    {
        _id: '1',
        jobTitle: 'Senior ML Engineer',
        department: 'Engineering',
        candidatesFound: 12,
        status: 'analyzing',
        matchScore: 95,
        recruiter: null,
        aiRecommendation: 'Alex Chen',
        aiReason: 'Specializes in ML/AI roles with 95% success rate in similar positions',
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '2',
        jobTitle: 'Full Stack Developer',
        department: 'Product',
        candidatesFound: 8,
        status: 'matched',
        matchScore: 92,
        recruiter: 'Maria Garcia',
        aiRecommendation: 'Maria Garcia',
        aiReason: 'Expert in full-stack technical assessments with strong candidate pipeline',
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '3',
        jobTitle: 'DevOps Engineer',
        department: 'Infrastructure',
        candidatesFound: 15,
        status: 'assigned',
        matchScore: 88,
        recruiter: 'James Wilson',
        aiRecommendation: 'James Wilson',
        aiReason: 'Infrastructure specialist with extensive DevOps hiring experience',
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '4',
        jobTitle: 'Data Scientist',
        department: 'Analytics',
        candidatesFound: 6,
        status: 'no_match',
        matchScore: 45,
        recruiter: null,
        aiRecommendation: null,
        aiReason: 'No recruiter available with sufficient data science expertise',
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    }
];

export const mockQueue = [
    {
        _id: '1',
        candidate: 'Sarah Johnson',
        candidateEmail: 'sarah.j@example.com',
        role: 'Senior ML Engineer',
        recruiter: 'Alex Chen',
        recruiterEmail: 'alex.c@example.com',
        status: 'checking_recruiter',
        step: 1,
        recruiterAvailable: null,
        candidateAvailable: null,
        proposedSlots: [],
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '2',
        candidate: 'Michael Brown',
        candidateEmail: 'michael.b@example.com',
        role: 'Full Stack Developer',
        recruiter: 'Maria Garcia',
        recruiterEmail: 'maria.g@example.com',
        status: 'checking_candidate',
        step: 2,
        recruiterAvailable: true,
        candidateAvailable: null,
        proposedSlots: ['Oct 24, 10 AM', 'Oct 24, 2 PM', 'Oct 25, 11 AM'],
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    },
    {
        _id: '3',
        candidate: 'Emma Davis',
        candidateEmail: 'emma.d@example.com',
        role: 'DevOps Engineer',
        recruiter: 'James Wilson',
        recruiterEmail: 'james.w@example.com',
        status: 'matched',
        step: 3,
        recruiterAvailable: true,
        candidateAvailable: true,
        proposedSlots: ['Oct 25, 11 AM'],
        timestamp: new Date(),
        createdAt: new Date(),
        updatedAt: new Date()
    }
];
