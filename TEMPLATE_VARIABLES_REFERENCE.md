# Email Template Variables Reference

## Overview
This document lists all available template variables that can be used in email notifications for the TM Case Booking System.

## Template Variable Format
All variables should be wrapped in double curly braces: `{{variableName}}`

## Available Variables

### User Information
- `{{userName}}` - Full name of the user who created/modified the case
- `{{userEmail}}` - Email address of the user
- `{{userRole}}` - Role of the user (e.g., Sales Rep, Admin)
- `{{userCountry}}` - Country of the user

### Case Information
- `{{caseId}}` - Unique case booking ID
- `{{caseStatus}}` - Current status of the case (Pending, Confirmed, Cancelled)
- `{{caseCreatedDate}}` - Date when the case was created
- `{{caseModifiedDate}}` - Date when the case was last modified
- `{{caseNotes}}` - Additional notes for the case

### Patient Information
- `{{patientId}}` - Patient identifier/MRN
- `{{patientName}}` - Full name of the patient
- `{{patientAge}}` - Age of the patient
- `{{patientGender}}` - Gender of the patient

### Surgery Information
- `{{surgeryDate}}` - Scheduled date of surgery (format: YYYY-MM-DD)
- `{{surgeryTime}}` - Scheduled time of surgery
- `{{surgeryType}}` - Type of surgery/procedure
- `{{surgeryDuration}}` - Estimated duration of surgery
- `{{surgeonName}}` - Name of the primary surgeon
- `{{surgeonEmail}}` - Email of the primary surgeon

### Hospital Information
- `{{hospitalName}}` - Name of the hospital/medical facility
- `{{hospitalAddress}}` - Full address of the hospital
- `{{hospitalCountry}}` - Country where the hospital is located
- `{{operatingRoom}}` - Operating room number/name

### Product Information
- `{{productList}}` - List of all products/implants for the case
- `{{productCount}}` - Total number of products
- `{{surgerySets}}` - List of surgery sets
- `{{implants}}` - List of implants with quantities
- `{{loanerSetRequired}}` - Whether loaner set is required (Yes/No)

### Delivery Information
- `{{deliveryDate}}` - Expected delivery date
- `{{deliveryTime}}` - Expected delivery time
- `{{deliveryAddress}}` - Delivery address
- `{{deliveryInstructions}}` - Special delivery instructions

### Additional Information
- `{{priority}}` - Case priority (Normal, Urgent, Emergency)
- `{{specialRequirements}}` - Any special requirements for the case
- `{{attachments}}` - List of attached documents
- `{{amendmentReason}}` - Reason for case amendment (if applicable)
- `{{cancellationReason}}` - Reason for case cancellation (if applicable)

### System Information
- `{{systemUrl}}` - Link to the TM Case Booking system
- `{{caseUrl}}` - Direct link to view the specific case
- `{{currentDate}}` - Current date
- `{{currentTime}}` - Current time
- `{{notificationId}}` - Unique notification ID

## Example Usage

### Case Creation Email Template
```
Dear {{surgeonName}},

A new case has been created for your surgery.

Case Details:
- Case ID: {{caseId}}
- Patient: {{patientName}}
- Surgery Date: {{surgeryDate}}
- Surgery Type: {{surgeryType}}
- Hospital: {{hospitalName}}

Products Required:
{{productList}}

Please review the case details at: {{caseUrl}}

Best regards,
{{userName}}
```

### Amendment Notification Template
```
Case {{caseId}} has been amended.

Amendment Details:
- Modified by: {{userName}}
- Date: {{caseModifiedDate}}
- Reason: {{amendmentReason}}

Updated Surgery Information:
- Date: {{surgeryDate}}
- Time: {{surgeryTime}}
- Hospital: {{hospitalName}}

View full details: {{caseUrl}}
```

## Notes for Developers

1. **Variable Availability**: Not all variables will be available in all contexts. Ensure proper null checking in templates.

2. **Date Formatting**: Dates are provided in ISO format by default. Format them as needed in your templates.

3. **Lists**: Variables like `{{productList}}` and `{{implants}}` return formatted HTML lists. For plain text emails, use appropriate formatting.

4. **Custom Variables**: Additional variables can be added by extending the email context in the `emailService.ts` file.

5. **Localization**: Variable values are provided in the system's default language. Implement localization as needed.

## Testing Variables

To test email templates with these variables:

1. Use the Email Configuration page in the application
2. Create test templates with variables
3. Send test emails to verify variable substitution
4. Check the email preview before sending

## Support

For questions or to request additional template variables, please contact the development team.