"""
Serializers for user registration, profile, and social auth.
"""

import re
from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(max_length=150)
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def validate_username(self, value):
        # 1) Trim outer whitespace
        # 2) Convert any internal blocks of whitespace to a single underscore
        normalized = re.sub(r'\s+', '_', value.strip())

        if not normalized:
            raise serializers.ValidationError("Username cannot be entirely blank spaces.")

        # Check for duplication (case-insensitive for safety)
        if User.objects.filter(username__iexact=normalized).exists():
            raise serializers.ValidationError("This username is already taken.")
            
        return normalized

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data.get('email', ''),
            password=validated_data['password'],
            role='user',
        )
        return user


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'role', 'total_points', 'date_joined')
        read_only_fields = fields


class UpdateProfileSerializer(serializers.ModelSerializer):
    """Writable serializer for profile updates (email only)."""
    class Meta:
        model = User
        fields = ('email',)

    def validate_email(self, value):
        qs = User.objects.filter(email__iexact=value).exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('This email is already in use by another account.')
        return value.lower()


class ChangePasswordSerializer(serializers.Serializer):
    """Input for changing password."""
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect.')
        return value


class SocialAuthSerializer(serializers.Serializer):
    """Accepts an OAuth access token from the frontend and returns JWT tokens."""
    access_token = serializers.CharField()
    provider = serializers.CharField(default='google-oauth2')
