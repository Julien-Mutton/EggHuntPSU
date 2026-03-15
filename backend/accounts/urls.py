"""
URL configuration for the accounts app (auth endpoints).
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from .email_views import AdminSendEmailView, AdminUserListView
from .serializers import CaseInsensitiveTokenObtainPairSerializer

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/', TokenObtainPairView.as_view(serializer_class=CaseInsensitiveTokenObtainPairSerializer), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('me/', views.MeView.as_view(), name='me'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    path('delete-account/', views.DeleteAccountView.as_view(), name='delete_account'),
    path('social/google/', views.SocialLoginView.as_view(), name='social_google'),
    path('social/microsoft/', views.SocialLoginView.as_view(), name='social_microsoft'),
    # Admin endpoints
    path('admin/email/send/', AdminSendEmailView.as_view(), name='admin-send-email'),
    path('admin/users/', AdminUserListView.as_view(), name='admin-user-list'),
]
