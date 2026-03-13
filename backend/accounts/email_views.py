"""
Admin email-sending views.
"""

import logging
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth import get_user_model
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from .permissions import IsAdmin
from .email_serializers import SendEmailSerializer

logger = logging.getLogger(__name__)
User = get_user_model()


class AdminSendEmailView(APIView):
    """
    POST /api/auth/admin/email/send/
    Send personalized emails to selected users or all participants.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = SendEmailSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        d = serializer.validated_data

        subject = d['subject']
        body = d['body']
        send_to_all = d.get('send_to_all', False)
        recipient_ids = d.get('recipient_ids', [])

        # Determine recipients
        if send_to_all:
            recipients = User.objects.filter(
                role='user',
                email__isnull=False,
            ).exclude(email='').values_list('email', flat=True)
        else:
            recipients = User.objects.filter(
                id__in=recipient_ids,
                email__isnull=False,
            ).exclude(email='').values_list('email', flat=True)

        recipient_list = list(recipients)
        if not recipient_list:
            return Response(
                {'detail': 'No valid email addresses found for the selected recipients.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        from_email = settings.EMAIL_HOST_USER
        sent_count = 0
        failed_count = 0
        errors = []

        for email in recipient_list:
            try:
                send_mail(
                    subject=subject,
                    message=body,
                    from_email=from_email,
                    recipient_list=[email],
                    fail_silently=False,
                )
                sent_count += 1
            except Exception as e:
                error_msg = f"{email}: {type(e).__name__}: {e}"
                logger.error(f"Failed to send email to {error_msg}")
                errors.append(error_msg)
                failed_count += 1

        logger.info(
            f"Admin {request.user.username} sent email '{subject}' "
            f"to {sent_count} recipients ({failed_count} failed)"
        )

        response_data = {
            'success': sent_count > 0 or failed_count == 0,
            'sent_count': sent_count,
            'failed_count': failed_count,
            'total_recipients': len(recipient_list),
        }
        if errors:
            response_data['errors'] = errors

        return Response(response_data)


class AdminUserListView(APIView):
    """
    GET /api/auth/admin/users/
    Returns a list of all users for admin recipient selection.
    """
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        users = User.objects.all().order_by('username').values(
            'id', 'username', 'email', 'role', 'total_points',
        )
        return Response(list(users))
