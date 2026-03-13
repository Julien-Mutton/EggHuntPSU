"""
Serializer for the admin email sending feature.
"""

from rest_framework import serializers


class SendEmailSerializer(serializers.Serializer):
    """Validates input for sending emails from admin."""
    subject = serializers.CharField(max_length=300)
    body = serializers.CharField()
    recipient_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        default=list,
        help_text='Specific user IDs to send to. If empty and send_to_all is True, sends to all users.',
    )
    send_to_all = serializers.BooleanField(
        required=False,
        default=False,
        help_text='If True, sends to all users with email addresses.',
    )

    def validate(self, attrs):
        if not attrs.get('send_to_all') and not attrs.get('recipient_ids'):
            raise serializers.ValidationError(
                'Either send_to_all must be True or recipient_ids must be provided.'
            )
        return attrs
