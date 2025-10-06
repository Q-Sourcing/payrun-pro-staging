import React, { useState, useEffect } from 'react';
import { CheckCircle, ArrowRight, ArrowLeft, Shield, User, Settings, Bell, Globe, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';

interface OnboardingWizardProps {
  onComplete: () => void;
  userEmail: string;
  userName: string;
}

interface WizardStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  component: React.ReactNode;
  required: boolean;
}

interface OnboardingData {
  profile: {
    firstName: string;
    lastName: string;
    phone: string;
    department: string;
    position: string;
  };
  preferences: {
    language: string;
    timezone: string;
    dateFormat: string;
    currency: string;
  };
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    security: boolean;
    payroll: boolean;
    reports: boolean;
  };
  security: {
    mfaEnabled: boolean;
    securityQuestions: boolean;
    backupCodes: boolean;
  };
}

export function OnboardingWizard({ onComplete, userEmail, userName }: OnboardingWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const { user } = useAuth();

  const [onboardingData, setOnboardingData] = useState<OnboardingData>({
    profile: {
      firstName: userName.split(' ')[0] || '',
      lastName: userName.split(' ').slice(1).join(' ') || '',
      phone: '',
      department: '',
      position: ''
    },
    preferences: {
      language: 'en',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      dateFormat: 'MM/DD/YYYY',
      currency: 'USD'
    },
    notifications: {
      email: true,
      sms: false,
      push: true,
      security: true,
      payroll: true,
      reports: false
    },
    security: {
      mfaEnabled: false,
      securityQuestions: false,
      backupCodes: false
    }
  });

  const steps: WizardStep[] = [
    {
      id: 'welcome',
      title: 'Welcome to Global Payroll System',
      description: 'Let\'s get you set up with your new account',
      icon: <User className="w-6 h-6" />,
      component: <WelcomeStep />,
      required: true
    },
    {
      id: 'profile',
      title: 'Complete Your Profile',
      description: 'Tell us a bit about yourself',
      icon: <User className="w-6 h-6" />,
      component: <ProfileStep data={onboardingData.profile} onChange={(data) => updateData('profile', data)} />,
      required: true
    },
    {
      id: 'preferences',
      title: 'Set Your Preferences',
      description: 'Customize your experience',
      icon: <Settings className="w-6 h-6" />,
      component: <PreferencesStep data={onboardingData.preferences} onChange={(data) => updateData('preferences', data)} />,
      required: false
    },
    {
      id: 'notifications',
      title: 'Notification Settings',
      description: 'Choose how you want to be notified',
      icon: <Bell className="w-6 h-6" />,
      component: <NotificationsStep data={onboardingData.notifications} onChange={(data) => updateData('notifications', data)} />,
      required: false
    },
    {
      id: 'security',
      title: 'Security Setup',
      description: 'Secure your account with additional protection',
      icon: <Shield className="w-6 h-6" />,
      component: <SecurityStep data={onboardingData.security} onChange={(data) => updateData('security', data)} />,
      required: false
    },
    {
      id: 'complete',
      title: 'Setup Complete!',
      description: 'You\'re all set to start using the system',
      icon: <CheckCircle className="w-6 h-6" />,
      component: <CompleteStep />,
      required: true
    }
  ];

  const updateData = (section: keyof OnboardingData, data: any) => {
    setOnboardingData(prev => ({
      ...prev,
      [section]: data
    }));
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCompletedSteps(prev => new Set([...prev, currentStep]));
      setCurrentStep(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      // Save onboarding data to database
      console.log('Saving onboarding data:', onboardingData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      onComplete();
    } catch (error) {
      console.error('Failed to complete onboarding:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const canProceed = () => {
    const currentStepData = steps[currentStep];
    if (!currentStepData.required) return true;
    
    // Add validation logic for each step
    switch (currentStep) {
      case 0: return true; // Welcome step
      case 1: return onboardingData.profile.firstName && onboardingData.profile.lastName;
      case 2: return true; // Preferences are optional
      case 3: return true; // Notifications are optional
      case 4: return true; // Security is optional
      case 5: return true; // Complete step
      default: return false;
    }
  };

  const progress = ((currentStep + 1) / steps.length) * 100;

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
            {steps[currentStep].icon}
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {steps[currentStep].title}
          </CardTitle>
          <CardDescription className="text-slate-600">
            {steps[currentStep].description}
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Progress indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-slate-600">
              <span>Step {currentStep + 1} of {steps.length}</span>
              <span>{Math.round(progress)}% Complete</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>

          {/* Step content */}
          <div className="min-h-[400px]">
            {steps[currentStep].component}
          </div>

          {/* Navigation */}
          <div className="flex gap-3 pt-4">
            {currentStep > 0 && (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="flex-1 h-12"
                disabled={isLoading}
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>
            )}
            
            <Button
              onClick={handleNext}
              className="flex-1 h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              disabled={!canProceed() || isLoading}
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4 mr-2" />
              )}
              {currentStep === steps.length - 1 ? 'Complete Setup' : 'Next'}
            </Button>
          </div>

          {/* Skip option for optional steps */}
          {!steps[currentStep].required && currentStep < steps.length - 1 && (
            <div className="text-center">
              <button
                onClick={handleNext}
                className="text-sm text-slate-500 hover:text-slate-700 transition-colors"
                disabled={isLoading}
              >
                Skip this step
              </button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Step Components
function WelcomeStep() {
  return (
    <div className="text-center space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Welcome to Global Payroll System!</h3>
        <p className="text-slate-600">
          We're excited to have you on board. This quick setup will help you get the most out of your new account.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Shield className="w-8 h-8 text-blue-600 mx-auto mb-2" />
          <h4 className="font-semibold text-blue-800 mb-1">Secure</h4>
          <p className="text-sm text-blue-600">Enterprise-grade security</p>
        </div>
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <User className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <h4 className="font-semibold text-green-800 mb-1">User-Friendly</h4>
          <p className="text-sm text-green-600">Intuitive interface</p>
        </div>
        <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <Settings className="w-8 h-8 text-purple-600 mx-auto mb-2" />
          <h4 className="font-semibold text-purple-800 mb-1">Customizable</h4>
          <p className="text-sm text-purple-600">Tailored to your needs</p>
        </div>
      </div>
    </div>
  );
}

function ProfileStep({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="firstName">First Name</Label>
          <Input
            id="firstName"
            value={data.firstName}
            onChange={(e) => onChange({ ...data, firstName: e.target.value })}
            placeholder="John"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="lastName">Last Name</Label>
          <Input
            id="lastName"
            value={data.lastName}
            onChange={(e) => onChange({ ...data, lastName: e.target.value })}
            placeholder="Doe"
          />
        </div>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          value={data.phone}
          onChange={(e) => onChange({ ...data, phone: e.target.value })}
          placeholder="+1 (555) 123-4567"
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="department">Department</Label>
          <Input
            id="department"
            value={data.department}
            onChange={(e) => onChange({ ...data, department: e.target.value })}
            placeholder="Human Resources"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="position">Position</Label>
          <Input
            id="position"
            value={data.position}
            onChange={(e) => onChange({ ...data, position: e.target.value })}
            placeholder="HR Manager"
          />
        </div>
      </div>
    </div>
  );
}

function PreferencesStep({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="language">Language</Label>
          <Select value={data.language} onValueChange={(value) => onChange({ ...data, language: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Spanish</SelectItem>
              <SelectItem value="fr">French</SelectItem>
              <SelectItem value="de">German</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="timezone">Timezone</Label>
          <Select value={data.timezone} onValueChange={(value) => onChange({ ...data, timezone: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="UTC">UTC</SelectItem>
              <SelectItem value="America/New_York">Eastern Time</SelectItem>
              <SelectItem value="America/Chicago">Central Time</SelectItem>
              <SelectItem value="America/Denver">Mountain Time</SelectItem>
              <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="dateFormat">Date Format</Label>
          <Select value={data.dateFormat} onValueChange={(value) => onChange({ ...data, dateFormat: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
              <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
              <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Select value={data.currency} onValueChange={(value) => onChange({ ...data, currency: value })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="USD">USD ($)</SelectItem>
              <SelectItem value="EUR">EUR (€)</SelectItem>
              <SelectItem value="GBP">GBP (£)</SelectItem>
              <SelectItem value="CAD">CAD (C$)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function NotificationsStep({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <h4 className="font-semibold text-slate-800">Notification Channels</h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="email"
              checked={data.email}
              onCheckedChange={(checked) => onChange({ ...data, email: checked })}
            />
            <Label htmlFor="email">Email notifications</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="sms"
              checked={data.sms}
              onCheckedChange={(checked) => onChange({ ...data, sms: checked })}
            />
            <Label htmlFor="sms">SMS notifications</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="push"
              checked={data.push}
              onCheckedChange={(checked) => onChange({ ...data, push: checked })}
            />
            <Label htmlFor="push">Push notifications</Label>
          </div>
        </div>
      </div>
      
      <div className="space-y-4">
        <h4 className="font-semibold text-slate-800">Notification Types</h4>
        <div className="space-y-3">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="security"
              checked={data.security}
              onCheckedChange={(checked) => onChange({ ...data, security: checked })}
            />
            <Label htmlFor="security">Security alerts</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="payroll"
              checked={data.payroll}
              onCheckedChange={(checked) => onChange({ ...data, payroll: checked })}
            />
            <Label htmlFor="payroll">Payroll updates</Label>
          </div>
          <div className="flex items-center space-x-2">
            <Checkbox
              id="reports"
              checked={data.reports}
              onCheckedChange={(checked) => onChange({ ...data, reports: checked })}
            />
            <Label htmlFor="reports">Report notifications</Label>
          </div>
        </div>
      </div>
    </div>
  );
}

function SecurityStep({ data, onChange }: { data: any; onChange: (data: any) => void }) {
  return (
    <div className="space-y-6">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
        <h4 className="font-semibold text-amber-800 mb-2">Security Recommendations</h4>
        <p className="text-sm text-amber-700">
          We recommend setting up additional security measures to protect your account.
        </p>
      </div>
      
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
          <div>
            <h4 className="font-semibold text-slate-800">Multi-Factor Authentication</h4>
            <p className="text-sm text-slate-600">Add an extra layer of security</p>
          </div>
          <Checkbox
            checked={data.mfaEnabled}
            onCheckedChange={(checked) => onChange({ ...data, mfaEnabled: checked })}
          />
        </div>
        
        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
          <div>
            <h4 className="font-semibold text-slate-800">Security Questions</h4>
            <p className="text-sm text-slate-600">Set up account recovery questions</p>
          </div>
          <Checkbox
            checked={data.securityQuestions}
            onCheckedChange={(checked) => onChange({ ...data, securityQuestions: checked })}
          />
        </div>
        
        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
          <div>
            <h4 className="font-semibold text-slate-800">Backup Codes</h4>
            <p className="text-sm text-slate-600">Generate recovery codes</p>
          </div>
          <Checkbox
            checked={data.backupCodes}
            onCheckedChange={(checked) => onChange({ ...data, backupCodes: checked })}
          />
        </div>
      </div>
    </div>
  );
}

function CompleteStep() {
  return (
    <div className="text-center space-y-6">
      <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-2xl flex items-center justify-center">
        <CheckCircle className="w-8 h-8 text-white" />
      </div>
      
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-slate-800">Setup Complete!</h3>
        <p className="text-slate-600">
          Your account has been configured successfully. You can now start using the Global Payroll System.
        </p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
          <CheckCircle className="w-6 h-6 text-green-600 mx-auto mb-2" />
          <h4 className="font-semibold text-green-800 mb-1">Profile Complete</h4>
          <p className="text-sm text-green-600">Your profile has been set up</p>
        </div>
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <Settings className="w-6 h-6 text-blue-600 mx-auto mb-2" />
          <h4 className="font-semibold text-blue-800 mb-1">Preferences Set</h4>
          <p className="text-sm text-blue-600">Your preferences are configured</p>
        </div>
      </div>
    </div>
  );
}
