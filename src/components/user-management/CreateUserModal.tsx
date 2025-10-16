import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { createUser, CreateUserRequest } from "@/integrations/supabase/client";
import { ALL_COUNTRIES } from "@/lib/constants/countries";
import { log, error as logError } from "@/lib/logger";
import { UserPlus, Loader2, AlertCircle } from "lucide-react";

interface CreateUserModalProps {
  onUserCreated?: () => void;
}

export const CreateUserModal = ({ onUserCreated }: CreateUserModalProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<CreateUserRequest>({
    email: "",
    password: "",
    full_name: "",
    role: "employee",
    country: "UG",
  });
  const [errors, setErrors] = useState<Partial<CreateUserRequest>>({});

  const validateForm = (): boolean => {
    const newErrors: Partial<CreateUserRequest> = {};

    // Email validation
    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
    } else if (formData.password.length < 8) {
      newErrors.password = "Password must be at least 8 characters long";
    }

    // Full name validation
    if (!formData.full_name) {
      newErrors.full_name = "Full name is required";
    } else if (formData.full_name.trim().length < 2) {
      newErrors.full_name = "Full name must be at least 2 characters long";
    }

    // Role validation
    if (!formData.role) {
      newErrors.role = "Role is required";
    }

    // Country validation
    if (!formData.country) {
      newErrors.country = "Country is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      toast({
        title: "Validation Error",
        description: "Please fix the errors in the form before submitting.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      log(`Attempting to create user: ${formData.email} with role: ${formData.role}`);
      
      const result = await createUser(formData);
      
      if (result.success) {
        log(`User created successfully: ${formData.email}`);
        
        toast({
          title: "✅ User Created Successfully",
          description: `${formData.full_name} has been created with ${formData.role} role.`,
        });

        // Reset form
        setFormData({
          email: "",
          password: "",
          full_name: "",
          role: "employee",
          country: "UG",
        });
        setErrors({});
        setOpen(false);
        
        // Notify parent component
        onUserCreated?.();
      } else {
        logError(`Failed to create user: ${result.message}`);
        toast({
          title: "Failed to Create User",
          description: result.message || "Please check your inputs and try again.",
          variant: "destructive",
        });
      }
    } catch (err) {
      logError(`Error creating user: ${err}`);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: keyof CreateUserRequest, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const isFormValid = formData.email && formData.password && formData.full_name && formData.role && formData.country;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full">
          <UserPlus className="h-4 w-4 mr-2" />
          Create New User
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New User</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name *</Label>
                <Input
                  id="full_name"
                  type="text"
                  placeholder="Enter full name"
                  value={formData.full_name}
                  onChange={(e) => handleInputChange("full_name", e.target.value)}
                  className={errors.full_name ? "border-red-500" : ""}
                />
                {errors.full_name && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-600">
                      {errors.full_name}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter email address"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-600">
                      {errors.email}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="password">Temporary Password *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter temporary password"
                  value={formData.password}
                  onChange={(e) => handleInputChange("password", e.target.value)}
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-600">
                      {errors.password}
                    </AlertDescription>
                  </Alert>
                )}
                <p className="text-sm text-muted-foreground">
                  User will be required to change this password on first login.
                </p>
              </div>

              {/* Role */}
              <div className="space-y-2">
                <Label htmlFor="role">Role *</Label>
                <Select
                  value={formData.role}
                  onValueChange={(value) => handleInputChange("role", value)}
                >
                  <SelectTrigger className={errors.role ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select a role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="hr_manager">HR Manager</SelectItem>
                    <SelectItem value="finance">Finance</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                {errors.role && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-600">
                      {errors.role}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Country */}
              <div className="space-y-2">
                <Label htmlFor="country">Country / Entity *</Label>
                <Select
                  value={formData.country}
                  onValueChange={(value) => handleInputChange("country", value)}
                >
                  <SelectTrigger className={errors.country ? "border-red-500" : ""}>
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_COUNTRIES.map((country) => (
                      <SelectItem key={country.code} value={country.code}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.country && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-600">
                      {errors.country}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Submit Buttons */}
          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!isFormValid || loading}
              className="min-w-[120px]"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
