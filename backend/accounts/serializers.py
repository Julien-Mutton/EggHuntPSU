"""
Serializers for user registration, profile, and social auth.
"""

import re
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model

User = get_user_model()


class CaseInsensitiveTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Lowercases the username before authentication so login is case-insensitive."""

    def validate(self, attrs):
        attrs[self.username_field] = attrs.get(self.username_field, '').lower()
        return super().validate(attrs)


class RegisterSerializer(serializers.ModelSerializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField(required=True)
    password = serializers.CharField(write_only=True, min_length=6)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password')

    def validate_username(self, value):
        normalized = re.sub(r'\s+', '_', value.strip()).lower()

        if not normalized:
            raise serializers.ValidationError("Username cannot be blank.")

        if len(normalized) < 3:
            raise serializers.ValidationError("Username must be at least 3 characters.")

        if not re.match(r'^[a-z0-9_]+$', normalized):
            raise serializers.ValidationError("Username can only contain letters, numbers, and underscores.")

        if User.objects.filter(username=normalized).exists():
            raise serializers.ValidationError("This username is already taken.")

        return normalized

    def validate_email(self, value):
        email = value.strip().lower()
        if not email:
            raise serializers.ValidationError("Email is required.")
        if User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return email

    def validate_password(self, value):
        if len(value) < 6:
            raise serializers.ValidationError("Password must be at least 6 characters.")
        if value.isdigit():
            raise serializers.ValidationError("Password cannot be entirely numeric.")
        return value

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
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
