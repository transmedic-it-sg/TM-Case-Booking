// Default email templates with proper variables for each status

export const getDefaultEmailTemplates = () => ({
  'Case Booked': {
    subject: '🆕 New Case Booking: {{caseReference}} - {{hospital}}',
    body: `Dear Team,

A new case has been booked and requires your attention.

📋 CASE DETAILS:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Country: {{country}}

👤 PATIENT INFORMATION:
• Patient Name: {{patientName}}
• MRN: {{mrn}}

🏥 SURGERY DETAILS:
• Date of Surgery: {{dateOfSurgery}}
• Time: {{timeOfProcedure}}
• Procedure Type: {{procedureType}}
• Procedure Name: {{procedureName}}
• Doctor: {{doctorName}}
• Surgery Sets: {{surgerySetSelection}}

📝 ADDITIONAL INFORMATION:
• Special Instructions: {{specialInstruction}}
• Submitted By: {{submittedBy}}
• Submitted At: {{submittedAt}}

Please review and process this case promptly.

Best regards,
TM Case Booking System`
  },

  'Preparing Order': {
    subject: '📦 Order Being Prepared: {{caseReference}} - {{hospital}}',
    body: `Dear Team,

The order for case {{caseReference}} is now being prepared.

📋 CASE INFORMATION:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Patient: {{patientName}}
• Surgery Date: {{dateOfSurgery}}

🏥 SURGERY DETAILS:
• Procedure: {{procedureName}}
• Doctor: {{doctorName}}
• Surgery Sets: {{surgerySetSelection}}
• Surgery Implants: {{surgeryImplants}}

📦 ORDER STATUS:
• Current Status: Preparing Order
• Sales Order No: {{salesOrderNo}}
• PO Number: {{poNo}}
• Processed By: {{processedBy}}
• Updated At: {{processedAt}}

The order will be ready for delivery soon.

Best regards,
TM Case Booking System`
  },

  'Order Prepared': {
    subject: '✅ Order Ready: {{caseReference}} - {{hospital}}',
    body: `Dear Team,

The order for case {{caseReference}} has been prepared and is ready for delivery.

📋 CASE INFORMATION:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Patient: {{patientName}}
• Surgery Date: {{dateOfSurgery}}
• Surgery Time: {{timeOfProcedure}}

📦 ORDER DETAILS:
• Sales Order No: {{salesOrderNo}}
• PO Number: {{poNo}}
• Surgery Sets: {{surgerySetSelection}}
• Surgery Implants: {{surgeryImplants}}

🚚 DELIVERY INFORMATION:
• Delivery Address: {{deliveryAddress}}
• Contact Person: {{contactPerson}}
• Contact Number: {{contactNumber}}

Please arrange for delivery to the hospital.

Best regards,
TM Case Booking System`
  },

  'Sales Approved': {
    subject: '✅ Sales Approved: {{caseReference}} - {{hospital}}',
    body: `Dear Team,

Case {{caseReference}} has been approved by sales and is ready for delivery.

📋 CASE DETAILS:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Patient: {{patientName}}
• Surgery Date: {{dateOfSurgery}}

💰 ORDER INFORMATION:
• Sales Order No: {{salesOrderNo}}
• PO Number: {{poNo}}
• Surgery Sets: {{surgerySetSelection}}
• Surgery Implants: {{surgeryImplants}}

🏥 SURGERY DETAILS:
• Procedure: {{procedureName}}
• Doctor: {{doctorName}}
• Special Instructions: {{specialInstruction}}

Please review and approve at your earliest convenience.

Best regards,
TM Case Booking System`
  },

  'Pending Delivery (Hospital)': {
    subject: '🚚 Pending Delivery to Hospital: {{caseReference}} - {{hospital}}',
    body: `Dear Team,

The order for case {{caseReference}} is pending delivery to the hospital.

📋 CASE INFORMATION:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Patient: {{patientName}}
• Surgery Date: {{dateOfSurgery}}
• Surgery Time: {{timeOfProcedure}}

🚚 DELIVERY DETAILS:
• Delivery Address: {{deliveryAddress}}
• Contact Person: {{contactPerson}}
• Contact Number: {{contactNumber}}
• Sales Order No: {{salesOrderNo}}

📦 ORDER CONTENTS:
• Surgery Sets: {{surgerySetSelection}}
• Surgery Implants: {{surgeryImplants}}
• Special Instructions: {{specialInstruction}}

Please ensure timely delivery for the scheduled surgery.

Best regards,
TM Case Booking System`
  },

  'Delivered (Hospital)': {
    subject: '✅ Delivered to Hospital: {{caseReference}} - {{hospital}}',
    body: `Dear Team,

The order for case {{caseReference}} has been successfully delivered to the hospital.

📋 CASE INFORMATION:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Patient: {{patientName}}
• Surgery Date: {{dateOfSurgery}}

✅ DELIVERY CONFIRMATION:
• Delivered At: {{currentDateTime}}
• Sales Order No: {{salesOrderNo}}
• Delivered To: {{contactPerson}}

📦 DELIVERED ITEMS:
• Surgery Sets: {{surgerySetSelection}}
• Surgery Implants: {{surgeryImplants}}

The items are now ready for the scheduled surgery.

Best regards,
TM Case Booking System`
  },

  'Case Completed': {
    subject: '🏁 Case Completed: {{caseReference}} - {{hospital}}',
    body: `Dear Team,

Case {{caseReference}} has been successfully completed.

📋 CASE SUMMARY:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Patient: {{patientName}}
• MRN: {{mrn}}

🏥 SURGERY DETAILS:
• Surgery Date: {{dateOfSurgery}}
• Procedure: {{procedureName}}
• Doctor: {{doctorName}}

✅ ITEMS USED:
• Surgery Sets: {{surgerySetSelection}}
• Surgery Implants: {{surgeryImplants}}

📊 CASE TIMELINE:
• Submitted: {{submittedAt}}
• Completed: {{currentDateTime}}
• Processed By: {{processedBy}}

Please proceed with post-surgery activities and collection arrangements.

Best regards,
TM Case Booking System`
  },

  'Pending Collection (At Hospital)': {
    subject: '📥 Pending Collection from Hospital: {{caseReference}} - {{hospital}}',
    body: `Dear Team,

Items from case {{caseReference}} are pending collection from the hospital.

📋 CASE INFORMATION:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Surgery Date: {{dateOfSurgery}}

📦 ITEMS FOR COLLECTION:
• Surgery Sets: {{surgerySetSelection}}
• Surgery Implants: {{surgeryImplants}}

📍 COLLECTION DETAILS:
• Collection Address: {{deliveryAddress}}
• Contact Person: {{contactPerson}}
• Contact Number: {{contactNumber}}

Please arrange for collection at your earliest convenience.

Best regards,
TM Case Booking System`
  },

  'Delivered (Office)': {
    subject: '✅ Collected & Delivered to Office: {{caseReference}} - {{hospital}}',
    body: `Dear Team,

Items from case {{caseReference}} have been collected from the hospital and delivered to the office.

📋 CASE INFORMATION:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Patient: {{patientName}}
• Surgery Date: {{dateOfSurgery}}

✅ COLLECTION CONFIRMATION:
• Collected At: {{currentDateTime}}
• Sales Order No: {{salesOrderNo}}

📦 COLLECTED ITEMS:
• Surgery Sets: {{surgerySetSelection}}
• Surgery Implants: {{surgeryImplants}}

Items are now ready for processing and billing.

Best regards,
TM Case Booking System`
  },

  'To be billed': {
    subject: '💰 Ready for Billing: {{caseReference}} - {{hospital}}',
    body: `Dear Billing Team,

Case {{caseReference}} is ready for billing.

📋 CASE INFORMATION:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Patient: {{patientName}}
• MRN: {{mrn}}

💰 BILLING DETAILS:
• Sales Order No: {{salesOrderNo}}
• PO Number: {{poNo}}
• Surgery Date: {{dateOfSurgery}}

📦 ITEMS TO BILL:
• Surgery Sets: {{surgerySetSelection}}
• Surgery Implants: {{surgeryImplants}}

📊 CASE TIMELINE:
• Submitted: {{submittedAt}}
• Completed: {{processedAt}}

Please process the billing for this case.

Best regards,
TM Case Booking System`
  },

  'Case Closed': {
    subject: '🔒 Case Closed: {{caseReference}} - {{hospital}}',
    body: `Dear Team,

Case {{caseReference}} has been closed.

📋 FINAL CASE SUMMARY:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Patient: {{patientName}}
• MRN: {{mrn}}

🏥 SURGERY DETAILS:
• Surgery Date: {{dateOfSurgery}}
• Procedure: {{procedureName}}
• Doctor: {{doctorName}}

📦 ITEMS USED:
• Surgery Sets: {{surgerySetSelection}}
• Surgery Implants: {{surgeryImplants}}

💰 BILLING:
• Sales Order No: {{salesOrderNo}}
• PO Number: {{poNo}}

📊 COMPLETE TIMELINE:
• Case Submitted: {{submittedAt}}
• Case Closed: {{currentDateTime}}

This case is now complete and archived.

Best regards,
TM Case Booking System`
  },

  'Case Cancelled': {
    subject: '❌ Case Cancelled: {{caseReference}} - {{hospital}}',
    body: `Dear Team,

Case {{caseReference}} has been cancelled.

📋 CANCELLED CASE DETAILS:
• Case Reference: {{caseReference}}
• Hospital: {{hospital}}
• Department: {{department}}
• Patient: {{patientName}}
• Original Surgery Date: {{dateOfSurgery}}

❌ CANCELLATION INFORMATION:
• Cancelled At: {{currentDateTime}}
• Cancelled By: {{processedBy}}
• Last Status: {{status}}

🏥 ORIGINAL SURGERY DETAILS:
• Procedure: {{procedureName}}
• Doctor: {{doctorName}}
• Surgery Sets: {{surgerySetSelection}}

📝 NOTES:
• Special Instructions: {{specialInstruction}}
• Remarks: {{remarks}}

Please take note of this cancellation and make necessary adjustments.

Best regards,
TM Case Booking System`
  }
});

export default getDefaultEmailTemplates;