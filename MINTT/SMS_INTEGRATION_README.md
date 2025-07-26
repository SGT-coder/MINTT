# SMS Integration for MINTT CRM

This document explains the SMS integration implementation that allows users to receive SMS notifications for case assignments, responses, escalations, and resolutions.

## Overview

The SMS integration provides automatic SMS notifications to users when:
- A case is assigned to them
- A case response is added (for customers)
- A case is escalated to management
- A case is resolved (for customers)

## Architecture

### Backend Components

1. **Custom SMS Service** (`emails/custom_sms_service.py`)
   - Core SMS sending functionality
   - Integration with your SMS provider API
   - Case-specific notification methods
   - Bulk SMS capabilities

2. **Updated Case Views** (`cases/views.py`)
   - Enhanced case assignment with SMS notifications
   - Case escalation with SMS alerts
   - Case status updates with resolution notifications
   - Case response notifications

3. **SMS API Endpoints** (`emails/views.py`)
   - SMS management and sending
   - SMS templates and configurations
   - SMS logs and statistics
   - Bulk SMS operations

4. **Database Models** (`emails/models.py`)
   - SMS message tracking
   - SMS templates
   - SMS logs
   - User SMS configurations

### Frontend Components

1. **SMS Management** (`components/sms-management.tsx`)
   - SMS inbox and management
   - SMS templates
   - SMS configurations
   - SMS statistics

2. **Case Management** (`components/case-management.tsx`)
   - Enhanced case assignment with notification feedback
   - Case escalation with SMS alerts
   - Status updates with resolution notifications

3. **API Service** (`lib/api.ts`)
   - Updated API methods to handle notification responses
   - SMS-related API endpoints

## Configuration

### Environment Variables

Add these to your `.env` file:

```bash
# SMS Configuration
BASE_SMS_URL=http://your-sms-provider.com/api/send?
DEFAULT_SMS_FROM_NUMBER=SYSTEM
SMS_ENABLED=True
```

### SMS Provider Setup

1. **Update SMS URL**: Replace `BASE_SMS_URL` with your actual SMS provider's API endpoint
2. **Configure Phone Numbers**: Ensure users have phone numbers in their profiles
3. **Test Integration**: Use the management command to test SMS functionality

## Usage

### 1. Case Assignment with SMS

When a case is assigned to a user, they will automatically receive:
- Email notification (existing functionality)
- SMS notification (new functionality)

```typescript
// Frontend usage
const result = await apiService.assignCase(caseId, userId, reason);
if (result.notifications?.sms_sent) {
  toast({
    title: "Case Assigned",
    description: "SMS notification sent to assigned user",
  });
}
```

### 2. Case Escalation with SMS

When a case is escalated, the manager will receive:
- Email notification
- SMS notification

```typescript
// Frontend usage
const result = await apiService.escalateCase(caseId);
if (result.notifications?.sms_sent) {
  toast({
    title: "Case Escalated",
    description: "SMS notification sent to manager",
  });
}
```

### 3. Case Resolution with SMS

When a case is marked as resolved, the customer will receive:
- SMS notification about case resolution

```typescript
// Frontend usage
const result = await apiService.updateCaseStatus(caseId, 'resolved', note);
if (result.notifications?.sms_sent) {
  toast({
    title: "Case Resolved",
    description: "SMS notification sent to customer",
  });
}
```

### 4. Case Response with SMS

When a response is added to a case, the customer will receive:
- SMS notification about the new response

```typescript
// Backend automatically sends SMS when response is created
const response = await apiService.createCaseResponse(responseData);
// SMS is sent automatically if customer has phone number
```

## Testing

### Management Command

Use the provided management command to test SMS functionality:

```bash
# Test basic SMS sending
python manage.py test_sms_integration --phone "1234567890" --message "Test message"

# Test SMS to specific user
python manage.py test_sms_integration --user-id 1 --message "Test user SMS"

# Test case assignment SMS
python manage.py test_sms_integration --case-id 1

# Test bulk SMS
python manage.py test_sms_integration
```

### Manual Testing

1. **Create a case** and assign it to a user with a phone number
2. **Check SMS logs** in the admin panel or SMS management interface
3. **Verify notifications** are sent for case events
4. **Test error handling** by using invalid phone numbers

## SMS Templates

The system includes default SMS templates for:

1. **Case Assignment**: "Case #CASE-001 has been assigned to you. Title: [Title]. Please check your MINTT CRM account. Thank you."

2. **Case Response**: "Your case #CASE-001 has received a response. Please check your MINTT CRM account for details. Thank you."

3. **Case Escalation**: "Case #CASE-001 has been escalated and requires your attention. Please check your MINTT CRM account. Thank you."

4. **Case Resolution**: "Your case #CASE-001 has been resolved. Thank you for using MINTT CRM."

## Customization

### Custom SMS Messages

You can customize SMS messages by modifying the `CustomSMSService` methods:

```python
# In emails/custom_sms_service.py
def send_case_assignment_sms(case, assigned_user):
    message = f"Case #{case.case_number} has been assigned to you. Title: {case.title}. Please check your MINTT CRM account. Thank you."
    # Customize the message format here
```

### SMS Provider Integration

To integrate with a different SMS provider:

1. **Update the `send_sms` method** in `CustomSMSService`
2. **Modify the URL construction** to match your provider's API
3. **Update error handling** for your provider's response format

### Phone Number Formatting

The system automatically handles phone number formatting:
- Converts "251" prefix to "0" for Ethiopian numbers
- URL encodes messages for safe transmission
- Validates phone numbers before sending

## Error Handling

The SMS integration includes comprehensive error handling:

1. **Missing Phone Numbers**: Logs warnings when users don't have phone numbers
2. **SMS Failures**: Creates failed SMS records with error messages
3. **Network Issues**: Handles timeout and connection errors
4. **Graceful Degradation**: SMS failures don't break case operations

## Monitoring

### SMS Logs

All SMS activities are logged in the database:
- SMS creation and sending
- Delivery confirmations
- Error messages
- Retry attempts

### Statistics

The SMS management interface provides:
- Total SMS sent
- Success/failure rates
- SMS by type and status
- User-specific SMS history

## Security Considerations

1. **Phone Number Privacy**: Phone numbers are stored securely
2. **Message Content**: SMS content is logged for audit purposes
3. **Rate Limiting**: Consider implementing rate limiting for SMS sending
4. **Provider Security**: Use secure API endpoints and authentication

## Troubleshooting

### Common Issues

1. **SMS Not Sending**
   - Check `BASE_SMS_URL` configuration
   - Verify phone number format
   - Check SMS provider API status

2. **Missing Notifications**
   - Ensure users have phone numbers
   - Check SMS_ENABLED setting
   - Review SMS logs for errors

3. **Phone Number Issues**
   - Verify phone number format
   - Check for country code requirements
   - Test with different number formats

### Debug Commands

```bash
# Check SMS configuration
python manage.py shell
>>> from django.conf import settings
>>> print(settings.BASE_SMS_URL)
>>> print(settings.SMS_ENABLED)

# Check user phone numbers
python manage.py shell
>>> from django.contrib.auth import get_user_model
>>> User = get_user_model()
>>> users_with_phones = User.objects.filter(phone__isnull=False).exclude(phone='')
>>> print(f"Users with phones: {users_with_phones.count()}")
```

## Future Enhancements

1. **SMS Templates**: Add more customizable SMS templates
2. **SMS Scheduling**: Allow scheduled SMS notifications
3. **SMS Preferences**: User preferences for SMS notifications
4. **SMS Analytics**: Advanced SMS analytics and reporting
5. **Multi-language SMS**: Support for multiple languages
6. **SMS Webhooks**: Real-time SMS delivery confirmations

## Support

For issues with SMS integration:
1. Check the SMS logs in the admin panel
2. Review the management command output
3. Verify SMS provider configuration
4. Test with the provided management commands 