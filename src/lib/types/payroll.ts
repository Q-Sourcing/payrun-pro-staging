// Payroll type definitions and enums for validation

export enum PayGroupType {
  Local = "Local",
  Expatriate = "Expatriate",
  Contractor = "Contractor",
  Intern = "Intern",
  Casual = "Casual",
}

export enum PayFrequency {
  Monthly = "Monthly",
  Weekly = "Weekly",
  DailyRate = "Daily Rate",
  PieceRate = "Piece Rate",
}

export enum EmployeeType {
  Local = "Local",
  Expatriate = "Expatriate",
}

export enum EmployeeCategory {
  Permanent = "Permanent",
  OnContract = "On Contract",
  Temporary = "Temporary",
  Intern = "Intern",
  Trainee = "Trainee",
  Casual = "Casual",
}

export enum EmploymentStatus {
  Active = "active",
  Inactive = "inactive",
  Suspended = "suspended",
  Terminated = "terminated",
}

// Helper functions for validation
export const getDefaultPayFrequency = (employeeType: EmployeeType): PayFrequency => {
  return employeeType === EmployeeType.Expatriate ? PayFrequency.DailyRate : PayFrequency.Monthly;
};

export const getDefaultPayGroupType = (employeeType: EmployeeType): PayGroupType => {
  return employeeType === EmployeeType.Expatriate ? PayGroupType.Expatriate : PayGroupType.Local;
};

export const isValidPayGroupType = (type: string): type is PayGroupType => {
  return Object.values(PayGroupType).includes(type as PayGroupType);
};

export const isValidPayFrequency = (frequency: string): frequency is PayFrequency => {
  return Object.values(PayFrequency).includes(frequency as PayFrequency);
};
