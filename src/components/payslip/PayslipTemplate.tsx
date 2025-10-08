import React from 'react';
import { PayslipData, PayslipTemplateConfig } from '@/lib/types/payslip';
import { format } from 'date-fns';

interface PayslipTemplateProps {
  data: PayslipData;
  config: PayslipTemplateConfig;
  template: 'corporate' | 'minimal' | 'premium';
  className?: string;
}

export const PayslipTemplate: React.FC<PayslipTemplateProps> = ({
  data,
  config,
  template,
  className = ''
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-UG', {
      style: 'currency',
      currency: 'UGX',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const renderHeader = () => {
    if (template === 'minimal') {
      return (
        <div className="payslip-minimal-header">
          <div className="company-info">
            <h1 className="company-name" style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.headingSize,
              fontFamily: config.styling.fontFamily,
              fontWeight: config.styling.fontWeight.bold
            }}>
              {data.company.name}
            </h1>
            <p className="company-address" style={{ 
              color: config.styling.secondaryColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily
            }}>
              {data.company.address}
            </p>
          </div>
          <h2 className="payslip-title" style={{ 
            color: config.styling.primaryColor,
            fontSize: config.styling.headingSize,
            fontFamily: config.styling.fontFamily,
            fontWeight: config.styling.fontWeight.bold
          }}>
            PAYSLIP
          </h2>
        </div>
      );
    }

    return (
      <div className="payslip-header">
        {config.layout.header.showLogo && (
          <div className="company-logo" style={{ 
            background: `linear-gradient(135deg, ${config.styling.primaryColor}, ${config.styling.secondaryColor})`
          }}>
            {data.company.name.charAt(0)}
          </div>
        )}
        
        <div className="company-info">
          <h1 className="company-name" style={{ 
            color: config.styling.textColor,
            fontSize: config.styling.headingSize,
            fontFamily: config.styling.fontFamily,
            fontWeight: config.styling.fontWeight.bold
          }}>
            {data.company.name}
          </h1>
          <p className="company-address" style={{ 
            color: config.styling.secondaryColor,
            fontSize: config.styling.smallSize,
            fontFamily: config.styling.fontFamily
          }}>
            {data.company.address}
          </p>
          <p className="company-email" style={{ 
            color: config.styling.secondaryColor,
            fontSize: config.styling.smallSize,
            fontFamily: config.styling.fontFamily
          }}>
            {data.company.email}
          </p>
        </div>
        
        <div className="payslip-title">
          <h2 style={{ 
            color: config.styling.primaryColor,
            fontSize: config.styling.headingSize,
            fontFamily: config.styling.fontFamily,
            fontWeight: config.styling.fontWeight.bold
          }}>
            PAYSLIP
          </h2>
          <p style={{ 
            color: config.styling.secondaryColor,
            fontSize: config.styling.smallSize,
            fontFamily: config.styling.fontFamily
          }}>
            {data.payPeriod.display}
          </p>
        </div>
      </div>
    );
  };

  const renderEmployeeInfo = () => {
    if (!config.layout.sections.employeeInfo) return null;

    return (
      <div className="info-grid">
        <div className="info-section">
          <h3 style={{ 
            color: config.styling.primaryColor,
            fontSize: config.styling.bodySize,
            fontFamily: config.styling.fontFamily,
            fontWeight: config.styling.fontWeight.bold
          }}>
            Employee Information
          </h3>
          <div className="info-row">
            <span className="label" style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily
            }}>Employee Code:</span>
            <span className="value" style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily,
              fontWeight: config.styling.fontWeight.medium
            }}>{data.employee.code}</span>
          </div>
          <div className="info-row">
            <span className="label" style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily
            }}>Name:</span>
            <span className="value" style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily,
              fontWeight: config.styling.fontWeight.medium
            }}>{data.employee.name}</span>
          </div>
          <div className="info-row">
            <span className="label" style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily
            }}>Job Title:</span>
            <span className="value" style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily,
              fontWeight: config.styling.fontWeight.medium
            }}>{data.employee.jobTitle}</span>
          </div>
          <div className="info-row">
            <span className="label" style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily
            }}>Department:</span>
            <span className="value" style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily,
              fontWeight: config.styling.fontWeight.medium
            }}>{data.employee.department}</span>
          </div>
        </div>
        
        <div className="info-section">
          <h3 style={{ 
            color: config.styling.primaryColor,
            fontSize: config.styling.bodySize,
            fontFamily: config.styling.fontFamily,
            fontWeight: config.styling.fontWeight.bold
          }}>
            Payment Details
          </h3>
          <div className="info-row">
            <span className="label" style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily
            }}>Pay Period:</span>
            <span className="value" style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily,
              fontWeight: config.styling.fontWeight.medium
            }}>{data.payPeriod.display}</span>
          </div>
          <div className="info-row">
            <span className="label" style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily
            }}>Bank:</span>
            <span className="value" style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily,
              fontWeight: config.styling.fontWeight.medium
            }}>{data.employee.bank.name} - {data.employee.bank.account}</span>
          </div>
          <div className="info-row">
            <span className="label" style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily
            }}>Net Pay:</span>
            <span className="value highlight" style={{ 
              color: config.styling.accentColor,
              fontSize: config.styling.bodySize,
              fontFamily: config.styling.fontFamily,
              fontWeight: config.styling.fontWeight.bold
            }}>{formatCurrency(data.totals.net)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderEarnings = () => {
    if (!config.layout.sections.earnings) return null;

    return (
      <div className="earnings-section">
        <h3 style={{ 
          color: config.styling.primaryColor,
          fontSize: config.styling.bodySize,
          fontFamily: config.styling.fontFamily,
          fontWeight: config.styling.fontWeight.bold
        }}>
          Earnings
        </h3>
        <table className="earnings-table">
          <thead>
            <tr style={{ backgroundColor: config.styling.borderColor }}>
              <th style={{ 
                color: config.styling.textColor,
                fontSize: config.styling.smallSize,
                fontFamily: config.styling.fontFamily,
                fontWeight: config.styling.fontWeight.bold
              }}>Description</th>
              <th style={{ 
                color: config.styling.textColor,
                fontSize: config.styling.smallSize,
                fontFamily: config.styling.fontFamily,
                fontWeight: config.styling.fontWeight.bold
              }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.earnings.map((earning, index) => (
              <tr key={index}>
                <td style={{ 
                  color: config.styling.textColor,
                  fontSize: config.styling.smallSize,
                  fontFamily: config.styling.fontFamily
                }}>{earning.description}</td>
                <td className="amount-column" style={{ 
                  color: config.styling.primaryColor,
                  fontSize: config.styling.smallSize,
                  fontFamily: config.styling.fontFamily,
                  fontWeight: config.styling.fontWeight.medium
                }}>{formatCurrency(earning.amount)}</td>
              </tr>
            ))}
            <tr className="total-row" style={{ backgroundColor: config.styling.borderColor }}>
              <td style={{ 
                color: config.styling.textColor,
                fontSize: config.styling.smallSize,
                fontFamily: config.styling.fontFamily,
                fontWeight: config.styling.fontWeight.bold
              }}>Total Earnings</td>
              <td className="amount-column" style={{ 
                color: config.styling.accentColor,
                fontSize: config.styling.smallSize,
                fontFamily: config.styling.fontFamily,
                fontWeight: config.styling.fontWeight.bold
              }}>{formatCurrency(data.totals.gross)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderDeductions = () => {
    if (!config.layout.sections.deductions) return null;

    return (
      <div className="deductions-section">
        <h3 style={{ 
          color: config.styling.primaryColor,
          fontSize: config.styling.bodySize,
          fontFamily: config.styling.fontFamily,
          fontWeight: config.styling.fontWeight.bold
        }}>
          Deductions
        </h3>
        <table className="deductions-table">
          <thead>
            <tr style={{ backgroundColor: config.styling.borderColor }}>
              <th style={{ 
                color: config.styling.textColor,
                fontSize: config.styling.smallSize,
                fontFamily: config.styling.fontFamily,
                fontWeight: config.styling.fontWeight.bold
              }}>Description</th>
              <th style={{ 
                color: config.styling.textColor,
                fontSize: config.styling.smallSize,
                fontFamily: config.styling.fontFamily,
                fontWeight: config.styling.fontWeight.bold
              }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {data.deductions.map((deduction, index) => (
              <tr key={index}>
                <td style={{ 
                  color: config.styling.textColor,
                  fontSize: config.styling.smallSize,
                  fontFamily: config.styling.fontFamily
                }}>{deduction.description}</td>
                <td className="amount-column" style={{ 
                  color: config.styling.primaryColor,
                  fontSize: config.styling.smallSize,
                  fontFamily: config.styling.fontFamily,
                  fontWeight: config.styling.fontWeight.medium
                }}>{formatCurrency(deduction.amount)}</td>
              </tr>
            ))}
            <tr className="total-row" style={{ backgroundColor: config.styling.borderColor }}>
              <td style={{ 
                color: config.styling.textColor,
                fontSize: config.styling.smallSize,
                fontFamily: config.styling.fontFamily,
                fontWeight: config.styling.fontWeight.bold
              }}>Total Deductions</td>
              <td className="amount-column" style={{ 
                color: config.styling.primaryColor,
                fontSize: config.styling.smallSize,
                fontFamily: config.styling.fontFamily,
                fontWeight: config.styling.fontWeight.bold
              }}>{formatCurrency(data.totals.deductions)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    );
  };

  const renderContributions = () => {
    if (!config.layout.sections.contributions) return null;

    return (
      <div className="contributions-section">
        <h3 style={{ 
          color: config.styling.primaryColor,
          fontSize: config.styling.bodySize,
          fontFamily: config.styling.fontFamily,
          fontWeight: config.styling.fontWeight.bold
        }}>
          Contributions
        </h3>
        <div className="contributions-grid">
          <div className="contribution-item">
            <span style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily
            }}>NSSF</span>
            <div className="contribution-breakdown">
              <span style={{ 
                color: config.styling.textColor,
                fontSize: config.styling.smallSize,
                fontFamily: config.styling.fontFamily
              }}>Company: {formatCurrency(data.contributions.nssf.company)}</span>
              <span style={{ 
                color: config.styling.textColor,
                fontSize: config.styling.smallSize,
                fontFamily: config.styling.fontFamily
              }}>Employee: {formatCurrency(data.contributions.nssf.employee)}</span>
              <span style={{ 
                color: config.styling.accentColor,
                fontSize: config.styling.smallSize,
                fontFamily: config.styling.fontFamily,
                fontWeight: config.styling.fontWeight.bold
              }}>Total: {formatCurrency(data.contributions.nssf.total)}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderLeave = () => {
    if (!config.layout.sections.leave) return null;

    return (
      <div className="leave-section">
        <h3 style={{ 
          color: config.styling.primaryColor,
          fontSize: config.styling.bodySize,
          fontFamily: config.styling.fontFamily,
          fontWeight: config.styling.fontWeight.bold
        }}>
          Leave Information
        </h3>
        <div className="leave-info">
          <div className="leave-item">
            <span style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily
            }}>Leave Taken: {data.leave.taken} days</span>
          </div>
          <div className="leave-item">
            <span style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily
            }}>Leave Due: {data.leave.due} days</span>
          </div>
        </div>
      </div>
    );
  };

  const renderTotals = () => {
    if (!config.layout.sections.totals) return null;

    return (
      <div className="totals-section">
        <h3 style={{ 
          color: config.styling.primaryColor,
          fontSize: config.styling.bodySize,
          fontFamily: config.styling.fontFamily,
          fontWeight: config.styling.fontWeight.bold
        }}>
          Summary
        </h3>
        <div className="totals-grid">
          <div className="total-item">
            <span style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily
            }}>Gross Pay:</span>
            <span style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily,
              fontWeight: config.styling.fontWeight.medium
            }}>{formatCurrency(data.totals.gross)}</span>
          </div>
          <div className="total-item">
            <span style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily
            }}>Total Deductions:</span>
            <span style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.smallSize,
              fontFamily: config.styling.fontFamily,
              fontWeight: config.styling.fontWeight.medium
            }}>{formatCurrency(data.totals.deductions)}</span>
          </div>
          <div className="total-item net-pay">
            <span style={{ 
              color: config.styling.textColor,
              fontSize: config.styling.bodySize,
              fontFamily: config.styling.fontFamily,
              fontWeight: config.styling.fontWeight.bold
            }}>Net Pay:</span>
            <span style={{ 
              color: config.styling.accentColor,
              fontSize: config.styling.bodySize,
              fontFamily: config.styling.fontFamily,
              fontWeight: config.styling.fontWeight.bold
            }}>{formatCurrency(data.totals.net)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderFooter = () => {
    if (!config.branding.confidentialityFooter) return null;

    return (
      <div className="payslip-footer">
        <p style={{ 
          color: config.styling.secondaryColor,
          fontSize: config.styling.smallSize,
          fontFamily: config.styling.fontFamily,
          fontStyle: 'italic'
        }}>
          This payslip is confidential and intended for the recipient only.
        </p>
      </div>
    );
  };

  const getTemplateClass = () => {
    switch (template) {
      case 'corporate':
        return 'payslip-corporate';
      case 'minimal':
        return 'payslip-minimal';
      case 'premium':
        return 'payslip-premium';
      default:
        return 'payslip-corporate';
    }
  };

  return (
    <div className={`payslip-container ${getTemplateClass()} ${className}`} style={{
      backgroundColor: config.styling.backgroundColor,
      borderColor: config.styling.borderColor,
      fontFamily: config.styling.fontFamily
    }}>
      {config.branding.showWatermark && (
        <div className="watermark" style={{ color: config.styling.borderColor }}>
          {config.branding.watermarkText}
        </div>
      )}
      
      {renderHeader()}
      
      {template === 'premium' && (
        <div className="accent-stripe" style={{ 
          background: `linear-gradient(90deg, ${config.styling.primaryColor}, ${config.styling.secondaryColor})`
        }}></div>
      )}
      
      {config.layout.order.map((section) => {
        switch (section) {
          case 'employeeInfo':
            return renderEmployeeInfo();
          case 'payPeriod':
            return null; // Already in header
          case 'earnings':
            return renderEarnings();
          case 'deductions':
            return renderDeductions();
          case 'contributions':
            return renderContributions();
          case 'leave':
            return renderLeave();
          case 'totals':
            return renderTotals();
          default:
            return null;
        }
      })}
      
      {renderFooter()}
    </div>
  );
};
