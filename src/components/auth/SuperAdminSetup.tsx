import React, { useState, useEffect } from 'react';
import { Shield, User, Lock, Mail, CheckCircle, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PasswordStrengthMeter } from './PasswordStrengthMeter';
import { cn } from '@/lib/utils';

interface SuperAdminSetupProps {
  onComplete: () => void;
}

interface FormData {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
  securityQuestions: {
    question1: string;
    answer1: string;
    question2: string;
    answer2: string;
    question3: string;
    answer3: string;
  };
  agreeToTerms: boolean;
}

interface FormErrors {
  currentPassword?: string;
  newPassword?: string;
  confirmPassword?: string;
  securityQuestions?: string;
  agreeToTerms?: string;
  general?: string;
}

const SECURITY_QUESTIONS = [
  "What was the name of your first pet?",
  "What was the name of the street you grew up on?",
  "What was your mother's maiden name?",
  "What was the name of your first school?",
  "What was your childhood nickname?",
  "What was the make of your first car?",
  "What was the name of your first teacher?",
  "What was your favorite book as a child?",
  "What was the name of your first employer?",
  "What was your favorite movie as a teenager?"
];

export function SuperAdminSetup({ onComplete }: SuperAdminSetupProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    securityQuestions: {
      question1: '',
      answer1: '',
      question2: '',
      answer2: '',
      question3: '',
      answer3: ''
    },
    agreeToTerms: false
  });
  
  const [errors, setErrors] = useState<FormErrors>({});
  const [isLoading, setIsLoading] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [isValidating, setIsValidating] = useState(false);

  const totalSteps = 4;

  // Real-time password strength validation
  const handlePasswordChange = (password: string) => {
    setFormData(prev => ({ ...prev, newPassword: password }));
    
    if (password.length > 0) {
      setIsValidating(true);
      setTimeout(() => {
        const strength = calculatePasswordStrength(password);
        setPasswordStrength(strength);
        setIsValidating(false);
      }, 300);
    } else {
      setPasswordStrength(0);
      setIsValidating(false);
    }
  };

  // Calculate password strength (0-100)
  const calculatePasswordStrength = (password: string): number => {
    let strength = 0;
    
    if (password.length >= 8) strength += 20;
    if (password.length >= 12) strength += 10;
    if (/[a-z]/.test(password)) strength += 10;
    if (/[A-Z]/.test(password)) strength += 10;
    if (/[0-9]/.test(password)) strength += 10;
    if (/[^A-Za-z0-9]/.test(password)) strength += 10;
    if (!/(.)\1{2,}/.test(password)) strength += 10;
    if (!/123|abc|qwe/i.test(password)) strength += 10;
    if (!/password|admin|user/i.test(password)) strength += 10;
    
    return Math.min(strength, 100);
  };

  // Validate current step
  const validateCurrentStep = (): boolean => {
    const newErrors: FormErrors = {};
    
    switch (currentStep) {
      case 1: // Password change
        if (!formData.currentPassword) {
          newErrors.currentPassword = 'Current password is required';
        }
        if (!formData.newPassword) {
          newErrors.newPassword = 'New password is required';
        } else if (formData.newPassword.length < 8) {
          newErrors.newPassword = 'Password must be at least 8 characters long';
        } else if (passwordStrength < 80) {
          newErrors.newPassword = 'Password is too weak. Please choose a stronger password';
        }
        if (!formData.confirmPassword) {
          newErrors.confirmPassword = 'Please confirm your new password';
        } else if (formData.newPassword !== formData.confirmPassword) {
          newErrors.confirmPassword = 'Passwords do not match';
        }
        break;
        
      case 2: // Security questions
        if (!formData.securityQuestions.question1 || !formData.securityQuestions.answer1) {
          newErrors.securityQuestions = 'Please complete all security questions';
        }
        if (!formData.securityQuestions.question2 || !formData.securityQuestions.answer2) {
          newErrors.securityQuestions = 'Please complete all security questions';
        }
        if (!formData.securityQuestions.question3 || !formData.securityQuestions.answer3) {
          newErrors.securityQuestions = 'Please complete all security questions';
        }
        break;
        
      case 3: // Terms agreement
        if (!formData.agreeToTerms) {
          newErrors.agreeToTerms = 'You must agree to the terms and conditions';
        }
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < totalSteps) {
        setCurrentStep(prev => prev + 1);
      } else {
        handleComplete();
      }
    }
  };

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  // Handle form completion
  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // In real implementation, this would save the setup data
      console.log('Super admin setup completed:', formData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onComplete();
    } catch (error: any) {
      setErrors({
        general: error.message || 'Setup failed. Please try again.'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: string, value: any) => {
    if (field.startsWith('securityQuestions.')) {
      const [_, subField] = field.split('.');
      setFormData(prev => ({
        ...prev,
        securityQuestions: {
          ...prev.securityQuestions,
          [subField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }
    
    // Clear field-specific errors
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Change Your Password</h3>
              <p className="text-slate-600">
                For security reasons, you must change your temporary password
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword" className="text-sm font-medium text-slate-700">
                  Current Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="currentPassword"
                    type={showCurrentPassword ? 'text' : 'password'}
                    placeholder="Enter your current password"
                    value={formData.currentPassword}
                    onChange={(e) => handleInputChange('currentPassword', e.target.value)}
                    className={cn(
                      "pl-10 pr-10 h-12 transition-all duration-200",
                      errors.currentPassword && "border-red-500 focus:border-red-500 focus:ring-red-500"
                    )}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    disabled={isLoading}
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.currentPassword && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.currentPassword}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="newPassword" className="text-sm font-medium text-slate-700">
                  New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="newPassword"
                    type={showNewPassword ? 'text' : 'password'}
                    placeholder="Create a strong password"
                    value={formData.newPassword}
                    onChange={(e) => handlePasswordChange(e.target.value)}
                    className={cn(
                      "pl-10 pr-10 h-12 transition-all duration-200",
                      errors.newPassword && "border-red-500 focus:border-red-500 focus:ring-red-500"
                    )}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    disabled={isLoading}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                
                {formData.newPassword && (
                  <PasswordStrengthMeter 
                    strength={passwordStrength} 
                    isValidating={isValidating}
                  />
                )}
                
                {errors.newPassword && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.newPassword}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium text-slate-700">
                  Confirm New Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    placeholder="Confirm your new password"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={cn(
                      "pl-10 pr-10 h-12 transition-all duration-200",
                      errors.confirmPassword && "border-red-500 focus:border-red-500 focus:ring-red-500"
                    )}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="text-sm text-red-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.confirmPassword}
                  </p>
                )}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Security Questions</h3>
              <p className="text-slate-600">
                Set up security questions for account recovery
              </p>
            </div>

            <div className="space-y-6">
              {[1, 2, 3].map((num) => (
                <div key={num} className="space-y-4 p-4 border border-slate-200 rounded-lg">
                  <h4 className="font-medium text-slate-800">Security Question {num}</h4>
                  
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      Question
                    </Label>
                    <select
                      value={formData.securityQuestions[`question${num}` as keyof typeof formData.securityQuestions]}
                      onChange={(e) => handleInputChange(`securityQuestions.question${num}`, e.target.value)}
                      className="w-full h-12 px-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      disabled={isLoading}
                    >
                      <option value="">Select a security question</option>
                      {SECURITY_QUESTIONS.map((question, index) => (
                        <option key={index} value={question}>
                          {question}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      Answer
                    </Label>
                    <Input
                      type="text"
                      placeholder="Enter your answer"
                      value={formData.securityQuestions[`answer${num}` as keyof typeof formData.securityQuestions]}
                      onChange={(e) => handleInputChange(`securityQuestions.answer${num}`, e.target.value)}
                      className="h-12"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              ))}
              
              {errors.securityQuestions && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.securityQuestions}
                </p>
              )}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold text-slate-800">Terms & Conditions</h3>
              <p className="text-slate-600">
                Please review and accept the terms of service
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg max-h-64 overflow-y-auto">
                <h4 className="font-semibold text-slate-800 mb-2">Terms of Service</h4>
                <div className="text-sm text-slate-600 space-y-2">
                  <p>
                    By using the Global Payroll System, you agree to the following terms:
                  </p>
                  <ul className="list-disc list-inside space-y-1 ml-4">
                    <li>You are responsible for maintaining the security of your account</li>
                    <li>You will not share your login credentials with unauthorized persons</li>
                    <li>You will comply with all applicable laws and regulations</li>
                    <li>You will use the system only for legitimate business purposes</li>
                    <li>You understand that all data is subject to audit and monitoring</li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start space-x-2">
                <input
                  type="checkbox"
                  id="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={(e) => handleInputChange('agreeToTerms', e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                  disabled={isLoading}
                />
                <Label htmlFor="agreeToTerms" className="text-sm text-slate-600 cursor-pointer">
                  I have read and agree to the Terms of Service and Privacy Policy
                </Label>
              </div>
              
              {errors.agreeToTerms && (
                <p className="text-sm text-red-600 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {errors.agreeToTerms}
                </p>
              )}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-2xl flex items-center justify-center">
                <CheckCircle className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-lg font-semibold text-slate-800">Setup Complete!</h3>
              <p className="text-slate-600">
                Your super administrator account has been configured successfully
              </p>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-semibold text-green-800 mb-2">Account Details</h4>
                <div className="text-sm text-green-700 space-y-1">
                  <p><strong>Name:</strong> Nalungu Kevin</p>
                  <p><strong>Email:</strong> nalungukevin@gmail.com</p>
                  <p><strong>Role:</strong> Super Administrator</p>
                  <p><strong>Status:</strong> Active</p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">Next Steps</h4>
                <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
                  <li>Configure your organization settings</li>
                  <li>Set up payroll groups and employees</li>
                  <li>Configure integrations (Zoho, etc.)</li>
                  <li>Review security settings and audit logs</li>
                </ul>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <Card className="w-full max-w-2xl relative z-10 bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Super Administrator Setup
          </CardTitle>
          <CardDescription className="text-slate-600">
            Complete your initial account configuration
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Step {currentStep} of {totalSteps}</span>
              <span>{Math.round((currentStep / totalSteps) * 100)}% Complete</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
              />
            </div>
          </div>

          {/* Error alert */}
          {errors.general && (
            <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.general}</AlertDescription>
            </Alert>
          )}

          {/* Step content */}
          {renderStepContent()}

          {/* Navigation buttons */}
          {currentStep < totalSteps && (
            <div className="flex gap-3 pt-4">
              {currentStep > 1 && (
                <Button
                  variant="outline"
                  onClick={handlePrevious}
                  className="flex-1 h-12"
                  disabled={isLoading}
                >
                  Previous
                </Button>
              )}
              <Button
                onClick={handleNext}
                className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                {currentStep === totalSteps - 1 ? 'Complete Setup' : 'Next'}
              </Button>
            </div>
          )}

          {currentStep === totalSteps && (
            <div className="flex justify-center pt-4">
              <Button
                onClick={onComplete}
                className="px-8 h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
                disabled={isLoading}
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : null}
                Continue to Dashboard
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
