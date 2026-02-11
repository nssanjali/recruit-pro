import {
    Type, AlignLeft, Hash, Mail, Phone, ChevronDown,
    CheckSquare, Circle, Check, Calendar, Upload
} from 'lucide-react';
import { FIELD_TYPES, FIELD_TYPE_CONFIG } from '../lib/formFieldTypes';
import { Card } from './ui';

const ICON_MAP = {
    Type, AlignLeft, Hash, Mail, Phone, ChevronDown,
    CheckSquare, Circle, Check, Calendar, Upload
};

export function FieldTypeSelector({ onSelectField }) {
    const fieldTypes = Object.entries(FIELD_TYPE_CONFIG);

    return (
        <div className="space-y-4">
            <div>
                <h3 className="text-sm font-bold text-slate-700 uppercase tracking-wider mb-3">
                    Add Field
                </h3>
                <div className="grid grid-cols-2 gap-2">
                    {fieldTypes.map(([type, config]) => {
                        const Icon = ICON_MAP[config.icon];
                        return (
                            <button
                                key={type}
                                onClick={() => onSelectField(type)}
                                className="flex items-center gap-3 p-3 bg-white border-2 border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all group text-left"
                            >
                                <div className="w-8 h-8 rounded-lg bg-slate-100 group-hover:bg-emerald-100 flex items-center justify-center flex-shrink-0">
                                    <Icon className="w-4 h-4 text-slate-600 group-hover:text-emerald-600" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-slate-900 truncate">
                                        {config.label}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                        {config.description}
                                    </p>
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
