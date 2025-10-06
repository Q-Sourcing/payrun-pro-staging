import React, { useState, useEffect } from 'react';
import { Shield, Smartphone, Mail, Key, CheckCircle, AlertCircle, Loader2, Copy, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface MFASetupProps {
  onComplete: () => void;
  onSkip: () => void;
  userEmail: string;
}

type MFAMethod = 'totp' | 'sms' | 'email';

interface TOTPData {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export function MFASetup({ onComplete, onSkip, userEmail }: MFASetupProps) {
  const [selectedMethod, setSelectedMethod] = useState<MFAMethod>('totp');
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [totpData, setTotpData] = useState<TOTPData | null>(null);
  const [showBackupCodes, setShowBackupCodes] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Generate TOTP setup data
  const generateTOTPSetup = async () => {
    setIsLoading(true);
    try {
      // Generate a random secret (in real implementation, this would come from backend)
      const secret = generateSecret();
      const appName = 'Global Payroll System';
      const accountName = userEmail;
      const otpAuthUrl = `otpauth://totp/${appName}:${accountName}?secret=${secret}&issuer=${appName}`;
      
      // Generate QR code using a web API (free service)
      // Alternative: You can also use Google Charts API: `https://chart.googleapis.com/chart?chs=200x200&chld=M|0&cht=qr&chl=${encodeURIComponent(otpAuthUrl)}`
      const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(otpAuthUrl)}`;
      
      // Generate backup codes
      const backupCodes = generateBackupCodes();
      
      setTotpData({
        secret,
        qrCode: qrCodeUrl,
        backupCodes
      });
    } catch (error) {
      setError('Failed to generate TOTP setup. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate random secret for TOTP
  const generateSecret = (): string => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
    let secret = '';
    for (let i = 0; i < 32; i++) {
      secret += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return secret;
  };

  // Generate backup codes
  const generateBackupCodes = (): string[] => {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      const code = Math.random().toString(36).substring(2, 10).toUpperCase();
      codes.push(code);
    }
    return codes;
  };

  // Verify TOTP code
  const verifyTOTPCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError('Please enter a valid 6-digit code');
      return;
    }

    setIsVerifying(true);
    try {
      // In real implementation, this would verify with backend
      // For demo purposes, accept any 6-digit code
      if (verificationCode.length === 6 && /^\d+$/.test(verificationCode)) {
        setSuccess('MFA has been successfully enabled!');
        setTimeout(() => {
          onComplete();
        }, 2000);
      } else {
        setError('Invalid verification code. Please try again.');
      }
    } catch (error) {
      setError('Verification failed. Please try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Send SMS verification
  const sendSMSVerification = async () => {
    if (!phoneNumber) {
      setError('Please enter a valid phone number');
      return;
    }

    setIsLoading(true);
    try {
      // In real implementation, this would send SMS via backend
      console.log('Sending SMS to:', phoneNumber);
      setSuccess('Verification code sent to your phone');
    } catch (error) {
      setError('Failed to send SMS. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Send email verification
  const sendEmailVerification = async () => {
    setIsLoading(true);
    try {
      // In real implementation, this would send email via backend
      console.log('Sending email to:', userEmail);
      setSuccess('Verification code sent to your email');
    } catch (error) {
      setError('Failed to send email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Copy to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setSuccess('Copied to clipboard');
    } catch (error) {
      setError('Failed to copy to clipboard');
    }
  };

  // Initialize TOTP setup when component mounts
  useEffect(() => {
    if (selectedMethod === 'totp' && !totpData) {
      generateTOTPSetup();
    }
  }, [selectedMethod]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 p-4">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl animate-pulse delay-1000" />
      </div>

      <Card className="w-full max-w-2xl relative z-10 bg-white/95 backdrop-blur-sm border-0 shadow-2xl">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto w-16 h-16 bg-gradient-to-br from-green-600 to-blue-600 rounded-2xl flex items-center justify-center mb-4">
            <Shield className="w-8 h-8 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent">
            Enable Multi-Factor Authentication
          </CardTitle>
          <CardDescription className="text-slate-600">
            Add an extra layer of security to your account
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Error/Success alerts */}
          {error && (
            <Alert variant="destructive" className="animate-in slide-in-from-top-2 duration-300">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50 text-green-800 animate-in slide-in-from-top-2 duration-300">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          {/* MFA Method Selection */}
          <Tabs value={selectedMethod} onValueChange={(value) => setSelectedMethod(value as MFAMethod)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="totp" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Authenticator App
              </TabsTrigger>
              <TabsTrigger value="sms" className="flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                SMS
              </TabsTrigger>
              <TabsTrigger value="email" className="flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Email
              </TabsTrigger>
            </TabsList>

            {/* TOTP Setup */}
            <TabsContent value="totp" className="space-y-6">
              <div className="text-center space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Set up Authenticator App</h3>
                <p className="text-slate-600">
                  Scan the QR code with your authenticator app (Google Authenticator, Microsoft Authenticator, etc.)
                </p>
              </div>

              {totpData ? (
                <div className="space-y-6">
                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-lg shadow-sm border">
                      <img 
                        src={totpData.qrCode} 
                        alt="QR Code for TOTP setup" 
                        className="w-48 h-48"
                        onError={(e) => {
                          // Fallback if QR code fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  </div>

                  {/* Manual Secret Entry */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-slate-700">
                      Can't scan? Enter this code manually:
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={totpData.secret}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => copyToClipboard(totpData.secret)}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Verification */}
                  <div className="space-y-4">
                    <Label htmlFor="totp-code" className="text-sm font-medium text-slate-700">
                      Enter the 6-digit code from your authenticator app:
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        id="totp-code"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        placeholder="000000"
                        maxLength={6}
                        className="text-center font-mono text-lg tracking-widest"
                      />
                      <Button
                        onClick={verifyTOTPCode}
                        disabled={isVerifying || verificationCode.length !== 6}
                        className="px-6"
                      >
                        {isVerifying ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          'Verify'
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              )}
            </TabsContent>

            {/* SMS Setup */}
            <TabsContent value="sms" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Set up SMS Authentication</h3>
                <p className="text-slate-600">
                  We'll send verification codes to your phone number
                </p>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-medium text-slate-700">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phoneNumber}
                      onChange={(e) => setPhoneNumber(e.target.value)}
                      placeholder="+1 (555) 123-4567"
                      className="h-12"
                    />
                  </div>

                  <Button
                    onClick={sendSMSVerification}
                    disabled={isLoading || !phoneNumber}
                    className="w-full h-12"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Send Verification Code
                  </Button>

                  {success && (
                    <div className="space-y-2">
                      <Label htmlFor="sms-code" className="text-sm font-medium text-slate-700">
                        Enter the code sent to your phone:
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="sms-code"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="000000"
                          maxLength={6}
                          className="text-center font-mono text-lg tracking-widest"
                        />
                        <Button
                          onClick={verifyTOTPCode}
                          disabled={isVerifying || verificationCode.length !== 6}
                          className="px-6"
                        >
                          {isVerifying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Verify'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* Email Setup */}
            <TabsContent value="email" className="space-y-6">
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-800">Set up Email Authentication</h3>
                <p className="text-slate-600">
                  We'll send verification codes to your email address
                </p>

                <div className="space-y-4">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <p className="text-sm text-slate-600">
                      <strong>Email:</strong> {userEmail}
                    </p>
                  </div>

                  <Button
                    onClick={sendEmailVerification}
                    disabled={isLoading}
                    className="w-full h-12"
                  >
                    {isLoading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : null}
                    Send Verification Code
                  </Button>

                  {success && (
                    <div className="space-y-2">
                      <Label htmlFor="email-code" className="text-sm font-medium text-slate-700">
                        Enter the code sent to your email:
                      </Label>
                      <div className="flex gap-2">
                        <Input
                          id="email-code"
                          value={verificationCode}
                          onChange={(e) => setVerificationCode(e.target.value)}
                          placeholder="000000"
                          maxLength={6}
                          className="text-center font-mono text-lg tracking-widest"
                        />
                        <Button
                          onClick={verifyTOTPCode}
                          disabled={isVerifying || verificationCode.length !== 6}
                          className="px-6"
                        >
                          {isVerifying ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            'Verify'
                          )}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={onSkip}
              className="flex-1 h-12"
            >
              Skip for Now
            </Button>
            <Button
              onClick={onComplete}
              disabled={!success}
              className="flex-1 h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700"
            >
              Complete Setup
            </Button>
          </div>

          {/* Security Notice */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium mb-1">Security Recommendation</p>
                <p>
                  Multi-factor authentication provides additional protection for your account. 
                  We recommend setting it up now, but you can configure it later in your security settings.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
