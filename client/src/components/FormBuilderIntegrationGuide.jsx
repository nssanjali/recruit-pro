/**
 * INTEGRATION GUIDE: Custom Job Application Forms
 * 
 * This file demonstrates how to integrate the custom form builder
 * into your job posting and application flow.
 */

// ============================================================================
// EXAMPLE 1: Adding Form Builder to Job Posting Flow
// ============================================================================

import { useState } from 'react';
import { JobFormBuilder } from './JobFormBuilder';
import { createJob } from '../lib/api';

export function JobPostingWithFormBuilder() {
    const [step, setStep] = useState(1); // 1: Basic Info, 2: Form Builder, 3: Review
    const [jobData, setJobData] = useState({
        title: '',
        company: '',
        location: '',
        // ... other job fields
    });
    const [formConfig, setFormConfig] = useState(null);

    const handleFormConfigSave = (config) => {
        setFormConfig(config);
        setStep(3); // Move to review step
    };

    const handleFinalSubmit = async () => {
        const completeJobData = {
            ...jobData,
            applicationFormConfig: formConfig
        };

        const response = await createJob(completeJobData);
        // Handle success
    };

    return (
        <div>
            {step === 1 && (
                <div>
                    {/* Basic job info form */}
                    <button onClick={() => setStep(2)}>Next: Configure Application Form</button>
                </div>
            )}

            {step === 2 && (
                <JobFormBuilder
                    initialFields={formConfig?.customFields || []}
                    onSave={handleFormConfigSave}
                />
            )}

            {step === 3 && (
                <div>
                    {/* Review and submit */}
                    <button onClick={handleFinalSubmit}>Publish Job</button>
                </div>
            )}
        </div>
    );
}

// ============================================================================
// EXAMPLE 2: Rendering Application Form for Candidates
// ============================================================================

import { DynamicJobApplication } from './DynamicJobApplication';
import { useAuth } from '../hooks/useAuth';

export function JobApplicationPage({ jobId }) {
    const { user } = useAuth();
    const [job, setJob] = useState(null);

    useEffect(() => {
        // Fetch job details including form config
        fetch(`/api/jobs/${jobId}`)
            .then(res => res.json())
            .then(data => setJob(data));
    }, [jobId]);

    const handleSubmit = async (submissionData) => {
        const response = await fetch('/api/applications', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jobId,
                candidateId: user._id,
                formData: submissionData.formData
            })
        });

        if (response.ok) {
            // Navigate to success page
        }
    };

    if (!job) return <div>Loading...</div>;

    return (
        <DynamicJobApplication
            jobId={jobId}
            formConfig={job.applicationFormConfig}
            userProfile={user}
            onSubmit={handleSubmit}
        />
    );
}

// ============================================================================
// EXAMPLE 3: Backend API Endpoint for Creating Jobs
// ============================================================================

/*
// server/controllers/jobController.js

export const createJob = async (req, res) => {
    try {
        const {
            title,
            company,
            location,
            salary,
            description,
            requirements,
            applicationFormConfig, // <-- Custom form config
            ...otherFields
        } = req.body;

        const job = await Job.create({
            title,
            company,
            location,
            salary,
            description,
            requirements,
            applicationFormConfig, // Stored as JSON
            postedBy: req.user._id,
            ...otherFields
        });

        res.status(201).json({
            success: true,
            data: job
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error creating job',
            error: error.message
        });
    }
};
*/

// ============================================================================
// EXAMPLE 4: Backend API Endpoint for Submitting Applications
// ============================================================================

/*
// server/controllers/applicationController.js

export const submitApplication = async (req, res) => {
    try {
        const { jobId, candidateId, formData } = req.body;

        // Validate that all required fields are filled
        const job = await Job.findById(jobId);
        const formConfig = job.applicationFormConfig;
        
        // Validation logic here...

        const application = await Application.create({
            jobId,
            candidateId,
            formData, // Dynamic form responses stored as JSON
            status: 'pending'
        });

        res.status(201).json({
            success: true,
            data: application
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error submitting application',
            error: error.message
        });
    }
};
*/

// ============================================================================
// EXAMPLE 5: Viewing Application Responses (Company Admin)
// ============================================================================

export function ApplicationViewer({ applicationId }) {
    const [application, setApplication] = useState(null);

    useEffect(() => {
        fetch(`/api/applications/${applicationId}`)
            .then(res => res.json())
            .then(data => setApplication(data));
    }, [applicationId]);

    if (!application) return <div>Loading...</div>;

    return (
        <div className="space-y-6">
            <h2>Application from {application.formData.mandatory_fullName}</h2>

            {/* Render all form responses */}
            {Object.entries(application.formData).map(([fieldId, value]) => (
                <div key={fieldId} className="border-b pb-4">
                    <p className="font-bold">{fieldId}</p>
                    <p>{typeof value === 'object' ? JSON.stringify(value) : value}</p>
                </div>
            ))}
        </div>
    );
}

// ============================================================================
// DATA STRUCTURE EXAMPLES
// ============================================================================

/*
// Example Job Document in MongoDB:
{
    _id: ObjectId("..."),
    title: "Senior Frontend Developer",
    company: "Acme Corp",
    location: "San Francisco, CA",
    salary: "$120k - $150k",
    description: "...",
    requirements: "...",
    postedBy: ObjectId("..."),
    applicationFormConfig: {
        mandatoryFields: {
            fullName: { id: "mandatory_fullName", type: "short_text", label: "Full Name", required: true, fromProfile: true },
            email: { id: "mandatory_email", type: "email", label: "Email", required: true, fromProfile: true },
            phone: { id: "mandatory_phone", type: "phone", label: "Phone", required: true, fromProfile: true },
            resume: { id: "mandatory_resume", type: "file", label: "Resume", required: true },
            coverLetter: { id: "mandatory_coverLetter", type: "long_text", label: "Cover Letter", required: false }
        },
        customFields: [
            {
                id: "field_1234567890_abc",
                type: "dropdown",
                label: "Years of React Experience",
                required: true,
                config: {
                    placeholder: "Select...",
                    options: ["0-2 years", "3-5 years", "5+ years"]
                },
                order: 0
            },
            {
                id: "field_1234567891_def",
                type: "long_text",
                label: "Describe your most complex React project",
                required: true,
                config: {
                    placeholder: "Tell us about...",
                    maxLength: 1000,
                    rows: 6
                },
                order: 1
            },
            {
                id: "field_1234567892_ghi",
                type: "multi_select",
                label: "Which technologies have you worked with?",
                required: false,
                config: {
                    options: ["TypeScript", "Next.js", "Redux", "GraphQL", "Testing Library"]
                },
                order: 2
            }
        ]
    },
    createdAt: ISODate("..."),
    updatedAt: ISODate("...")
}

// Example Application Document in MongoDB:
{
    _id: ObjectId("..."),
    jobId: ObjectId("..."),
    candidateId: ObjectId("..."),
    formData: {
        mandatory_fullName: "John Doe",
        mandatory_email: "john@example.com",
        mandatory_phone: "+1 555-0000",
        mandatory_resume: { url: "https://...", filename: "resume.pdf" },
        mandatory_coverLetter: "I am excited to apply...",
        field_1234567890_abc: "3-5 years",
        field_1234567891_def: "I built a real-time dashboard...",
        field_1234567892_ghi: ["TypeScript", "Next.js", "Redux"]
    },
    status: "pending",
    appliedAt: ISODate("..."),
    updatedAt: ISODate("...")
}
*/
