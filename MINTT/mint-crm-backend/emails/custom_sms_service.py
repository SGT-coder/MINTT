import urllib.parse
import requests
from django.db.models import Q
from rest_framework.exceptions import ValidationError
from django.conf import settings
from django.utils import timezone
from .models import SMS, SMSTemplate, SMSLog, UserSMSConfig
from .services import SMSService
import logging

logger = logging.getLogger(__name__)

class CustomSMSService:
    """Custom SMS service that integrates with the provided SMS API"""
    
    @staticmethod
    def send_sms(*, phone_number: str, message: str):
        """
        Send SMS using the custom SMS API
        This is the core SMS sending function from the provided service
        """
        # Get base URL from settings
        base_url = getattr(settings, 'BASE_SMS_URL', 'http://your-sms-provider.com/api/send?')
        
        # Construct the final URL
        sms_url = f"{base_url}&phonenumber={phone_number}&message={message}"
        
        try:
            # Send the GET request
            response = requests.get(sms_url, timeout=10)  # Add timeout for safety
            
            # Raise an error for HTTP errors
            response.raise_for_status()
            
            return response.json()  # Assuming the endpoint returns JSON
        except requests.exceptions.RequestException as e:
            # Log the error
            logger.error(f"SMS sending failed for {phone_number}: {str(e)}")
            raise e
    
    @staticmethod
    def send_sms_to_user(*, user, message: str, case=None):
        """
        Send SMS to a specific user
        """
        if not user.phone:
            logger.warning(f"User {user.email} has no phone number configured")
            return None
        
        # Process phone number (convert 251 to 0 if needed)
        phone_number_str = str(user.phone)
        phone_number_processed = phone_number_str.replace("251", "0", 1) if phone_number_str.startswith("251") else phone_number_str
        
        try:
            # URL encode the message
            escaped_message = urllib.parse.quote(message, safe="")
            
            # Send SMS
            result = CustomSMSService.send_sms(
                phone_number=phone_number_processed, 
                message=escaped_message
            )
            
            # Create SMS record in database
            sms = SMS.objects.create(
                sms_type='outbound',
                status='sent',
                message=message,
                from_number=getattr(settings, 'DEFAULT_SMS_FROM_NUMBER', 'SYSTEM'),
                to_number=phone_number_processed,
                case=case,
                user=user,
                sent_at=timezone.now()
            )
            
            # Log the event
            SMSLog.objects.create(
                sms=sms,
                event='sent',
                data={'result': result, 'phone_number': phone_number_processed}
            )
            
            logger.info(f"SMS sent successfully to {user.email} ({phone_number_processed})")
            return sms
            
        except Exception as e:
            logger.error(f"Failed to send SMS to {user.email}: {str(e)}")
            
            # Create failed SMS record
            if case:
                sms = SMS.objects.create(
                    sms_type='outbound',
                    status='failed',
                    message=message,
                    from_number=getattr(settings, 'DEFAULT_SMS_FROM_NUMBER', 'SYSTEM'),
                    to_number=phone_number_processed,
                    case=case,
                    user=user,
                    error_message=str(e)
                )
                
                # Log the failure
                SMSLog.objects.create(
                    sms=sms,
                    event='failed',
                    data={'error': str(e), 'phone_number': phone_number_processed}
                )
            
            return None
    
    @staticmethod
    def send_case_assignment_sms(case, assigned_user):
        """
        Send case assignment notification SMS to assigned user
        """
        if not assigned_user.phone:
            logger.warning(f"Assigned user {assigned_user.email} has no phone number")
            return None
        
        # Create message
        message = f"Case #{case.case_number} has been assigned to you. Title: {case.title}. Please check your MINTT CRM account. Thank you."
        
        return CustomSMSService.send_sms_to_user(
            user=assigned_user,
            message=message,
            case=case
        )
    
    @staticmethod
    def send_case_response_sms(response):
        """
        Send case response notification SMS to customer
        """
        if not response.case.customer.phone:
            logger.warning(f"Customer {response.case.customer.email} has no phone number")
            return None
        
        # Create message
        message = f"Your case #{response.case.case_number} has received a response. Please check your MINTT CRM account for details. Thank you."
        
        return CustomSMSService.send_sms_to_user(
            user=response.case.customer,
            message=message,
            case=response.case
        )
    
    @staticmethod
    def send_case_escalation_sms(case, manager):
        """
        Send case escalation notification SMS to manager
        """
        if not manager.phone:
            logger.warning(f"Manager {manager.email} has no phone number")
            return None
        
        # Create message
        message = f"Case #{case.case_number} has been escalated and requires your attention. Please check your MINTT CRM account. Thank you."
        
        return CustomSMSService.send_sms_to_user(
            user=manager,
            message=message,
            case=case
        )
    
    @staticmethod
    def send_case_resolution_sms(case):
        """
        Send case resolution notification SMS to customer
        """
        if not case.customer.phone:
            logger.warning(f"Customer {case.customer.email} has no phone number")
            return None
        
        # Create message
        message = f"Your case #{case.case_number} has been resolved. Thank you for using MINTT CRM."
        
        return CustomSMSService.send_sms_to_user(
            user=case.customer,
            message=message,
            case=case
        )
    
    @staticmethod
    def send_bulk_sms_to_users(*, users, message: str, case=None):
        """
        Send SMS to multiple users
        """
        results = []
        
        for user in users:
            try:
                if user.phone:
                    sms = CustomSMSService.send_sms_to_user(
                        user=user,
                        message=message,
                        case=case
                    )
                    results.append({
                        'user': user.email,
                        'phone': user.phone,
                        'status': 'sent' if sms else 'failed',
                        'sms_id': sms.id if sms else None
                    })
                else:
                    results.append({
                        'user': user.email,
                        'phone': None,
                        'status': 'no_phone',
                        'sms_id': None
                    })
            except Exception as e:
                results.append({
                    'user': user.email,
                    'phone': user.phone,
                    'status': 'failed',
                    'error': str(e),
                    'sms_id': None
                })
        
        return results 