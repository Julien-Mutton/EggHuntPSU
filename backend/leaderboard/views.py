"""
Leaderboard views.
"""

from rest_framework import generics, permissions
from rest_framework.response import Response
from django.contrib.auth import get_user_model

User = get_user_model()


class LeaderboardView(generics.ListAPIView):
    """
    GET /api/leaderboard/
    Returns ranked users by total_points descending.
    Accessible by both admins and users.
    """
    permission_classes = [permissions.IsAuthenticated]

    def list(self, request, *args, **kwargs):
        users = (
            User.objects
            .filter(role='user')
            .order_by('-total_points', 'username')
            .values('id', 'username', 'total_points')
        )

        # Add rank
        leaderboard = []
        rank = 0
        prev_points = None
        for i, user_data in enumerate(users, 1):
            if user_data['total_points'] != prev_points:
                rank = i
            prev_points = user_data['total_points']
            leaderboard.append({
                'rank': rank,
                'id': user_data['id'],
                'username': user_data['username'],
                'total_points': user_data['total_points'],
                'is_current_user': user_data['id'] == request.user.id,
            })

        return Response(leaderboard)
