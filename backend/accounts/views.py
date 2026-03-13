"""
Auth views: registration, profile, and social auth token exchange.
"""

from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from social_django.utils import load_strategy, load_backend
from social_core.exceptions import MissingBackend, AuthTokenError
from django.contrib.auth import get_user_model

from .serializers import (
    RegisterSerializer, UserSerializer, UpdateProfileSerializer,
    ChangePasswordSerializer, SocialAuthSerializer,
)

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — Register a new user and return JWT tokens."""
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        }, status=status.HTTP_201_CREATED)


class MeView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/auth/me/ — Return or update the current user's profile."""
    def get_object(self):
        return self.request.user

    def get_serializer_class(self):
        if self.request.method == 'PATCH':
            return UpdateProfileSerializer
        return UserSerializer


class ChangePasswordView(APIView):
    """POST /api/auth/change-password/ — Change password, returns new JWT tokens."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = request.user
        user.set_password(serializer.validated_data['new_password'])
        user.save(update_fields=['password'])
        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })


class SocialLoginView(APIView):
    """
    POST /api/auth/social/google/
    Accepts an OAuth access_token from the frontend,
    authenticates via Python Social Auth, returns JWT tokens.
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = SocialAuthSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        provider = serializer.validated_data.get('provider', 'google-oauth2')
        access_token = serializer.validated_data['access_token']

        try:
            strategy = load_strategy(request)
            backend = load_backend(strategy, provider, redirect_uri=None)
            user = backend.do_auth(access_token)
        except MissingBackend:
            return Response(
                {'error': f'Provider "{provider}" is not supported.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        except AuthTokenError as e:
            return Response(
                {'error': 'Invalid or expired token.', 'detail': str(e)},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if user is None:
            return Response(
                {'error': 'Authentication failed.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        refresh = RefreshToken.for_user(user)
        return Response({
            'user': UserSerializer(user).data,
            'tokens': {
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }
        })
