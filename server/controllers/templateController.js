import ApplicationTemplate from '../models/ApplicationTemplate.js';
import { ObjectId } from 'mongodb';

// @desc    Get all application templates
// @route   GET /api/templates
// @access  Private (Admin)
export const getTemplates = async (req, res) => {
    try {
        const templates = await ApplicationTemplate.find({});

        res.status(200).json({
            success: true,
            count: templates.length,
            data: templates
        });
    } catch (error) {
        console.error('Error fetching templates:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get single template
// @route   GET /api/templates/:id
// @access  Private
export const getTemplate = async (req, res) => {
    try {
        const template = await ApplicationTemplate.findById(req.params.id);

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        res.status(200).json({
            success: true,
            data: template
        });
    } catch (error) {
        console.error('Error fetching template:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get template for a specific job
// @route   GET /api/templates/job/:jobId
// @access  Private
export const getTemplateForJob = async (req, res) => {
    try {
        // First try to find template assigned to this job
        let template = await ApplicationTemplate.findOne({ jobId: new ObjectId(req.params.jobId) });

        // If no specific template, get default template
        if (!template) {
            template = await ApplicationTemplate.getDefault();
        }

        // If still no template, return basic template
        if (!template) {
            template = {
                name: 'Basic Application',
                isDefault: true,
                fields: [
                    {
                        id: 'resume',
                        type: 'file',
                        label: 'Resume',
                        required: true,
                        accept: '.pdf,.doc,.docx'
                    },
                    {
                        id: 'coverLetter',
                        type: 'textarea',
                        label: 'Cover Letter',
                        required: false,
                        placeholder: 'Tell us why you\'re a great fit...'
                    }
                ]
            };
        }

        res.status(200).json({
            success: true,
            data: template
        });
    } catch (error) {
        console.error('Error fetching template for job:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Create new template
// @route   POST /api/templates
// @access  Private (Admin only)
export const createTemplate = async (req, res) => {
    try {
        const { name, description, fields, jobId, isDefault } = req.body;

        if (!name || !fields || !Array.isArray(fields)) {
            return res.status(400).json({
                success: false,
                message: 'Name and fields array are required'
            });
        }

        // If setting as default, unset other defaults
        if (isDefault) {
            await ApplicationTemplate.find({ isDefault: true }).then(templates => {
                templates.forEach(async (t) => {
                    await ApplicationTemplate.findByIdAndUpdate(t._id, { isDefault: false });
                });
            });
        }

        const templateData = {
            name,
            description: description || '',
            fields,
            jobId: jobId ? new ObjectId(jobId) : null,
            isDefault: isDefault || false,
            createdBy: new ObjectId(req.user._id)
        };

        const template = await ApplicationTemplate.create(templateData);

        res.status(201).json({
            success: true,
            data: template
        });
    } catch (error) {
        console.error('Error creating template:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Update template
// @route   PUT /api/templates/:id
// @access  Private (Admin only)
export const updateTemplate = async (req, res) => {
    try {
        const template = await ApplicationTemplate.findById(req.params.id);

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        // If setting as default, unset other defaults
        if (req.body.isDefault) {
            await ApplicationTemplate.find({ isDefault: true }).then(templates => {
                templates.forEach(async (t) => {
                    if (t._id.toString() !== req.params.id) {
                        await ApplicationTemplate.findByIdAndUpdate(t._id, { isDefault: false });
                    }
                });
            });
        }

        const updatedTemplate = await ApplicationTemplate.findByIdAndUpdate(
            req.params.id,
            req.body
        );

        res.status(200).json({
            success: true,
            data: updatedTemplate
        });
    } catch (error) {
        console.error('Error updating template:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Delete template
// @route   DELETE /api/templates/:id
// @access  Private (Admin only)
export const deleteTemplate = async (req, res) => {
    try {
        const template = await ApplicationTemplate.findById(req.params.id);

        if (!template) {
            return res.status(404).json({
                success: false,
                message: 'Template not found'
            });
        }

        await ApplicationTemplate.findByIdAndDelete(req.params.id);

        res.status(200).json({
            success: true,
            data: {}
        });
    } catch (error) {
        console.error('Error deleting template:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};

// @desc    Get default field templates
// @route   GET /api/templates/defaults/fields
// @access  Private (Admin only)
export const getDefaultFields = async (req, res) => {
    try {
        const defaultFields = [
            {
                id: 'resume',
                type: 'file',
                label: 'Resume/CV',
                required: true,
                accept: '.pdf,.doc,.docx',
                category: 'basic'
            },
            {
                id: 'coverLetter',
                type: 'textarea',
                label: 'Cover Letter',
                required: false,
                placeholder: 'Tell us why you\'re interested in this position...',
                category: 'basic'
            },
            {
                id: 'phone',
                type: 'tel',
                label: 'Phone Number',
                required: true,
                placeholder: '+1 (555) 000-0000',
                category: 'contact'
            },
            {
                id: 'linkedin',
                type: 'url',
                label: 'LinkedIn Profile',
                required: false,
                placeholder: 'https://linkedin.com/in/yourprofile',
                category: 'contact'
            },
            {
                id: 'portfolio',
                type: 'url',
                label: 'Portfolio/Website',
                required: false,
                placeholder: 'https://yourportfolio.com',
                category: 'contact'
            },
            {
                id: 'experience',
                type: 'number',
                label: 'Years of Experience',
                required: true,
                min: 0,
                max: 50,
                category: 'professional'
            },
            {
                id: 'currentCompany',
                type: 'text',
                label: 'Current Company',
                required: false,
                placeholder: 'Company Name',
                category: 'professional'
            },
            {
                id: 'currentRole',
                type: 'text',
                label: 'Current Role',
                required: false,
                placeholder: 'Job Title',
                category: 'professional'
            },
            {
                id: 'expectedSalary',
                type: 'number',
                label: 'Expected Salary (Annual)',
                required: false,
                placeholder: '80000',
                category: 'compensation'
            },
            {
                id: 'noticePeriod',
                type: 'select',
                label: 'Notice Period',
                required: true,
                options: [
                    'Immediate',
                    '15 days',
                    '1 month',
                    '2 months',
                    '3 months'
                ],
                category: 'availability'
            },
            {
                id: 'availability',
                type: 'date',
                label: 'Available Start Date',
                required: true,
                category: 'availability'
            },
            {
                id: 'willingToRelocate',
                type: 'radio',
                label: 'Willing to Relocate?',
                required: true,
                options: ['Yes', 'No'],
                category: 'preferences'
            },
            {
                id: 'workMode',
                type: 'select',
                label: 'Preferred Work Mode',
                required: true,
                options: ['Remote', 'Hybrid', 'On-site', 'Flexible'],
                category: 'preferences'
            }
        ];

        res.status(200).json({
            success: true,
            data: defaultFields
        });
    } catch (error) {
        console.error('Error fetching default fields:', error);
        res.status(500).json({
            success: false,
            message: 'Server Error'
        });
    }
};
