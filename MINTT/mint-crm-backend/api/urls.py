from django.urls import path, include
from rest_framework.routers import DefaultRouter
from users.views import UserViewSet
from cases.views import CaseViewSet, CaseResponseViewSet
from contacts.views import ContactViewSet, CompanyViewSet
from documents.views import DocumentViewSet, FolderViewSet
from emails.views import EmailViewSet, EmailTemplateViewSet, UserEmailConfigViewSet, SMSViewSet, SMSTemplateViewSet, UserSMSConfigViewSet, EmailAttachmentViewSet
from meetings.views import (
    MeetingViewSet, MeetingCategoryViewSet, MeetingAttendanceViewSet,
    MeetingReminderViewSet, MeetingTemplateViewSet, CalendarIntegrationViewSet
)
from notifications.views import NotificationViewSet
from reports.views import ReportViewSet
from tasks.views import TaskViewSet

# Create a router and register our viewsets with it
router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'cases', CaseViewSet)
router.register(r'case-responses', CaseResponseViewSet)
router.register(r'contacts', ContactViewSet)
router.register(r'companies', CompanyViewSet)
router.register(r'documents', DocumentViewSet)
router.register(r'folders', FolderViewSet)
router.register(r'emails', EmailViewSet)
router.register(r'email-templates', EmailTemplateViewSet)
router.register(r'email-configs', UserEmailConfigViewSet, basename='email-config')
router.register(r'email-attachments', EmailAttachmentViewSet)
router.register(r'sms', SMSViewSet)
router.register(r'sms-templates', SMSTemplateViewSet)
router.register(r'sms-configs', UserSMSConfigViewSet, basename='sms-config')
router.register(r'meetings', MeetingViewSet)
router.register(r'meeting-categories', MeetingCategoryViewSet)
router.register(r'meeting-attendance', MeetingAttendanceViewSet)
router.register(r'meeting-reminders', MeetingReminderViewSet)
router.register(r'meeting-templates', MeetingTemplateViewSet)
router.register(r'calendar-integrations', CalendarIntegrationViewSet, basename='calendar-integration')
router.register(r'notifications', NotificationViewSet)
router.register(r'reports', ReportViewSet)
router.register(r'tasks', TaskViewSet)

# The API URLs are now determined automatically by the router
urlpatterns = [
    path('', include(router.urls)),
] 