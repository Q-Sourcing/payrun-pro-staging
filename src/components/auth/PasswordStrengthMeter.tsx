import React from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PasswordStrengthMeterProps {
  strength: number;
  isValidating?: boolean;
  showRequirements?: boolean;
}

interface PasswordRequirement {
  label: string;
  met: boolean;
  test: (password: string) => boolean;
}

const requirements: PasswordRequirement[] = [
  {
    label: 'At least 8 characters',
    met: false,
    test: (password) => password.length >= 8
  },
  {
    label: 'At least 1 uppercase letter',
    met: false,
    test: (password) => /[A-Z]/.test(password)
  },
  {
    label: 'At least 1 lowercase letter',
    met: false,
    test: (password) => /[a-z]/.test(password)
  },
  {
    label: 'At least 1 number',
    met: false,
    test: (password) => /[0-9]/.test(password)
  },
  {
    label: 'At least 1 special character',
    met: false,
    test: (password) => /[^A-Za-z0-9]/.test(password)
  },
  {
    label: 'No common patterns',
    met: false,
    test: (password) => !/(.)\1{2,}/.test(password) && !/123|abc|qwe/i.test(password)
  }
];

export function PasswordStrengthMeter({ 
  strength, 
  isValidating = false, 
  showRequirements = true 
}: PasswordStrengthMeterProps) {
  const getStrengthColor = (strength: number) => {
    if (strength < 30) return 'bg-red-500';
    if (strength < 60) return 'bg-yellow-500';
    if (strength < 80) return 'bg-blue-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = (strength: number) => {
    if (strength < 30) return 'Weak';
    if (strength < 60) return 'Fair';
    if (strength < 80) return 'Good';
    return 'Strong';
  };

  const getStrengthTextColor = (strength: number) => {
    if (strength < 30) return 'text-red-600';
    if (strength < 60) return 'text-yellow-600';
    if (strength < 80) return 'text-blue-600';
    return 'text-green-600';
  };

  return (
    <div className="space-y-3">
      {/* Strength bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">Password strength</span>
          {isValidating ? (
            <div className="flex items-center gap-1 text-slate-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              <span>Checking...</span>
            </div>
          ) : (
            <span className={cn("font-medium", getStrengthTextColor(strength))}>
              {getStrengthLabel(strength)}
            </span>
          )}
        </div>
        
        <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
          <div
            className={cn(
              "h-full transition-all duration-500 ease-out",
              getStrengthColor(strength)
            )}
            style={{ width: `${strength}%` }}
          />
        </div>
      </div>

      {/* Requirements checklist */}
      {showRequirements && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-slate-700">Password requirements:</p>
          <div className="grid grid-cols-1 gap-1">
            {requirements.map((requirement, index) => {
              const isMet = requirement.test('');
              return (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <div className="flex-shrink-0">
                    {isMet ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <XCircle className="w-4 h-4 text-slate-300" />
                    )}
                  </div>
                  <span className={cn(
                    "transition-colors duration-200",
                    isMet ? "text-green-700" : "text-slate-500"
                  )}>
                    {requirement.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
