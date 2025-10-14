# Create User Feature Documentation

## Overview

The Create User feature allows super administrators to create new users in the PayRun Pro system with appropriate roles and permissions. This feature is implemented as a secure, role-based system that ensures only authorized users can create accounts.

## Features

### 🔐 Security
- **Role-based access**: Only users with `super_admin` role can access the create user functionality
- **Secure authentication**: Uses Supabase Auth with service role key for user creation
- **Input validation**: Comprehensive form validation on both client and server side
- **Secure logging**: No sensitive data (passwords, tokens) is logged

### 📝 User Creation Form
- **Full Name**: User's complete name
- **Email Address**: Unique email for authentication
- **Temporary Password**: Secure temporary password (user must change on first login)
- **Role Selection**: Choose from employee, hr_manager, finance, or admin
- **Country/Entity**: Geographic location for the user

### 🎯 Available Roles
- **Employee**: Basic access to view own payslips and personal information
- **HR Manager**: Access to employee management and HR-related functions
- **Finance**: Access to financial data, payroll calculations, and reporting
- **Admin**: Administrative access to most system functions

## Technical Implementation

### Frontend Components

#### CreateUserModal (`src/components/user-management/CreateUserModal.tsx`)
- Modal dialog with form validation
- Real-time validation feedback
- Secure form submission
- Toast notifications for success/error states

#### SystemSettingsSection (`src/components/settings/SystemSettingsSection.tsx`)
- Role-based visibility (only shows for super_admin users)
- User statistics dashboard
- Recent users list
- System information display

### Backend Implementation

#### Edge Function (`supabase/functions/create-user/index.ts`)
- **Authentication**: Validates super_admin role before allowing user creation
- **User Creation**: Uses Supabase Auth admin API to create users
- **Profile Creation**: Automatically creates user profile in the database
- **Role Assignment**: Assigns selected role to the new user
- **Error Handling**: Comprehensive error handling with rollback on failures

#### API Integration (`src/integrations/supabase/client.ts`)
- `createUser()` function for calling the Edge Function
- Type-safe interfaces for requests and responses
- Automatic session token handling

### Database Schema

The feature works with the following database tables:
- `profiles`: User profile information
- `user_roles`: Role assignments linking users to their roles
- `auth.users`: Supabase Auth user data (managed automatically)

## Usage Instructions

### For Super Administrators

1. **Access System Settings**
   - Navigate to Settings → System Settings
   - Only super_admin users will see this section

2. **Create New User**
   - Click "Create New User" button
   - Fill out the form with required information:
     - Full Name (required)
     - Email Address (required, must be unique)
     - Temporary Password (required, min 8 characters)
     - Role (required, select from dropdown)
     - Country/Entity (required, select from list)
   - Click "Create User" to submit

3. **View User Statistics**
   - See total user count
   - View users by role distribution
   - Check recent user activity

### For New Users

1. **First Login**
   - Use the email address provided by the super admin
   - Use the temporary password
   - System will prompt to change password on first login

2. **Role-based Access**
   - Access to features is determined by assigned role
   - Contact super admin if access issues occur

## Deployment

### Prerequisites
- Supabase CLI installed
- Service role key configured in Supabase project

### Deploy Edge Function
```bash
# Deploy the create-user function
npm run deploy:create-user

# Test the function
npm run test:create-user
```

### Environment Variables
Ensure the following environment variable is set in your Supabase project:
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for admin operations

## Security Considerations

### Authentication
- All requests to the Edge Function require valid authentication
- Super admin role is verified on every request
- Service role key is never exposed to the frontend

### Data Protection
- Passwords are never logged or stored in plain text
- User creation is logged without sensitive information
- Failed attempts are logged for security monitoring

### Validation
- Email format validation
- Password strength requirements
- Role validation against allowed values
- Required field validation

## Error Handling

### Common Error Scenarios
1. **Invalid Role**: User doesn't have super_admin permission
2. **Duplicate Email**: Email address already exists
3. **Validation Errors**: Missing or invalid form data
4. **Network Errors**: Connection issues with Supabase

### Error Messages
- Clear, user-friendly error messages
- Toast notifications for immediate feedback
- Detailed logging for debugging (without sensitive data)

## Monitoring and Logging

### Logged Events
- User creation attempts (success/failure)
- Role verification checks
- Form validation errors
- System errors

### Security Monitoring
- Failed authentication attempts
- Unauthorized access attempts
- User creation patterns

## Future Enhancements

### Planned Features
- Bulk user import from CSV
- User invitation system via email
- Role hierarchy management
- User activity tracking
- Password policy enforcement

### Integration Opportunities
- LDAP/Active Directory integration
- Single Sign-On (SSO) support
- Multi-factor authentication
- Advanced user analytics

## Troubleshooting

### Common Issues

1. **"Insufficient permissions" error**
   - Ensure user has super_admin role
   - Check role assignment in database

2. **"Email already exists" error**
   - Email is already registered in the system
   - Use a different email address

3. **Edge Function deployment fails**
   - Check Supabase CLI installation
   - Verify project configuration
   - Ensure service role key is set

4. **Form validation errors**
   - Check all required fields are filled
   - Ensure email format is correct
   - Verify password meets requirements

### Support
For technical support or feature requests, contact the development team or create an issue in the project repository.
