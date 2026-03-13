"""
URL configuration for the leaderboard app.
"""

from django.urls import path
from . import views

urlpatterns = [
    path('leaderboard/', views.LeaderboardView.as_view(), name='leaderboard'),
]
