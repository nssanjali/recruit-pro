import {
    Type,
    AlignLeft,
    Hash,
    Mail,
    Phone,
    ChevronDown,
    CheckSquare,
    Circle,
    Calendar,
    Upload
} from 'lucide-react';

// Field Types Enum
export const FIELD_TYPES = {
    SHORT_TEXT: 'short_text',
    LONG_TEXT: 'long_text',
    NUMBER: 'number',
    EMAIL: 'email',
    PHONE: 'phone',
    DROPDOWN: 'dropdown',
    MULTI_SELECT: 'multi_select',
    RADIO: 'radio',
    CHECKBOX: 'checkbox',
    DATE: 'date',
    FILE: 'file'
};

// Field Type Configuration
export const FIELD_TYPE_CONFIG = {
    [FIELD_TYPES.SHORT_TEXT]: {
        label: 'Short Text',
        description: 'Single line text input',
        icon: Type,
        color: 'bg-gradient-to-br from-blue-500 to-blue-600',
        defaultConfig: {
            placeholder: 'Enter your answer...',
            minLength: null,
            maxLength: null
        }
    },
    [FIELD_TYPES.LONG_TEXT]: {
        label: 'Long Text',
        description: 'Multi-line text area',
        icon: AlignLeft,
        color: 'bg-gradient-to-br from-purple-500 to-purple-600',
        defaultConfig: {
            placeholder: 'Enter detailed information...',
            minLength: null,
            maxLength: null,
            rows: 4
        }
    },
    [FIELD_TYPES.NUMBER]: {
        label: 'Number',
        description: 'Numeric input only',
        icon: Hash,
        color: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
        defaultConfig: {
            placeholder: 'Enter a number...',
            min: null,
            max: null
        }
    },
    [FIELD_TYPES.EMAIL]: {
        label: 'Email',
        description: 'Email address input',
        icon: Mail,
        color: 'bg-gradient-to-br from-orange-500 to-orange-600',
        defaultConfig: {
            placeholder: 'your.email@example.com'
        }
    },
    [FIELD_TYPES.PHONE]: {
        label: 'Phone',
        description: 'Phone number input',
        icon: Phone,
        color: 'bg-gradient-to-br from-pink-500 to-pink-600',
        defaultConfig: {
            placeholder: '+1 (555) 000-0000'
        }
    },
    [FIELD_TYPES.DROPDOWN]: {
        label: 'Dropdown',
        description: 'Select one option',
        icon: ChevronDown,
        color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
        defaultConfig: {
            placeholder: 'Select an option...',
            options: ['Option 1', 'Option 2', 'Option 3']
        }
    },
    [FIELD_TYPES.MULTI_SELECT]: {
        label: 'Multi-Select',
        description: 'Select multiple options',
        icon: CheckSquare,
        color: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
        defaultConfig: {
            placeholder: 'Select options...',
            options: ['Option 1', 'Option 2', 'Option 3']
        }
    },
    [FIELD_TYPES.RADIO]: {
        label: 'Radio Buttons',
        description: 'Choose one from list',
        icon: Circle,
        color: 'bg-gradient-to-br from-violet-500 to-violet-600',
        defaultConfig: {
            options: ['Option 1', 'Option 2', 'Option 3']
        }
    },
    [FIELD_TYPES.CHECKBOX]: {
        label: 'Checkbox',
        description: 'Yes/No or agreement',
        icon: CheckSquare,
        color: 'bg-gradient-to-br from-teal-500 to-teal-600',
        defaultConfig: {
            label: 'I agree to the terms'
        }
    },
    [FIELD_TYPES.DATE]: {
        label: 'Date',
        description: 'Date picker',
        icon: Calendar,
        color: 'bg-gradient-to-br from-rose-500 to-rose-600',
        defaultConfig: {
            placeholder: 'Select a date...'
        }
    },
    [FIELD_TYPES.FILE]: {
        label: 'File Upload',
        description: 'Upload documents',
        icon: Upload,
        color: 'bg-gradient-to-br from-amber-500 to-amber-600',
        defaultConfig: {
            maxSize: 10, // MB
            allowedTypes: ['.pdf', '.doc', '.docx'],
            placeholder: 'Click to upload or drag and drop'
        }
    }
};

// Mandatory Fields (always included in application forms)
export const MANDATORY_FIELDS = [
    {
        id: 'mandatory_name',
        type: FIELD_TYPES.SHORT_TEXT,
        label: 'Full Name',
        required: true,
        config: {
            placeholder: 'Enter your full name'
        }
    },
    {
        id: 'mandatory_email',
        type: FIELD_TYPES.EMAIL,
        label: 'Email Address',
        required: true,
        config: {
            placeholder: 'your.email@example.com'
        }
    },
    {
        id: 'mandatory_phone',
        type: FIELD_TYPES.PHONE,
        label: 'Phone Number',
        required: true,
        config: {
            placeholder: '+1 (555) 000-0000'
        }
    },
    {
        id: 'mandatory_resume',
        type: FIELD_TYPES.FILE,
        label: 'Resume/CV',
        required: true,
        config: {
            maxSize: 10,
            allowedTypes: ['.pdf', '.doc', '.docx'],
            placeholder: 'Upload your resume'
        }
    }
];

// Helper function to generate unique field IDs
export const generateFieldId = () => {
    return `field_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Helper function to create a new field
export const createField = (type) => {
    const config = FIELD_TYPE_CONFIG[type];
    return {
        id: generateFieldId(),
        type,
        label: config.label,
        required: false,
        config: { ...config.defaultConfig }
    };
};

// Validate field configuration
export const validateField = (field) => {
    if (!field.label || field.label.trim() === '') {
        return { valid: false, error: 'Field label is required' };
    }

    if ([FIELD_TYPES.DROPDOWN, FIELD_TYPES.MULTI_SELECT, FIELD_TYPES.RADIO].includes(field.type)) {
        if (!field.config.options || field.config.options.length === 0) {
            return { valid: false, error: 'At least one option is required' };
        }
    }

    return { valid: true };
};

// Convert form config to submission format
export const serializeFormConfig = (customFields) => {
    return {
        mandatoryFields: MANDATORY_FIELDS,
        customFields: customFields.map(field => ({
            id: field.id,
            type: field.type,
            label: field.label,
            required: field.required,
            config: field.config
        }))
    };
};
