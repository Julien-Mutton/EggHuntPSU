"""
URL configuration for the rewards app.
"""

from django.urls import path
from . import views

urlpatterns = [
    # Achievements (prizes)
    path('prizes/', views.PrizeListView.as_view(), name='prize-list'),
    path('admin/prizes/', views.PrizeAdminCreateView.as_view(), name='prize-admin-create'),
    path('admin/prizes/<int:pk>/', views.PrizeAdminDetailView.as_view(), name='prize-admin-detail'),

    # Community Links
    path('community-links/', views.CommunityLinkListView.as_view(), name='community-link-list'),
    path('admin/community-links/', views.CommunityLinkAdminCreateView.as_view(), name='community-link-admin-list'),
    path('admin/community-links/<int:pk>/', views.CommunityLinkAdminDetailView.as_view(), name='community-link-admin-detail'),

    # Global Reward Links
    path('global-links/<int:pk>/claim/', views.GlobalLinkClaimView.as_view(), name='global-link-claim'),

    # Sponsors
    path('sponsors/', views.SponsorListView.as_view(), name='sponsor-list'),
]
