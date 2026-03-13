"""
Prize and CommunityLink views for users and admins.
"""

from rest_framework import generics, permissions
from accounts.permissions import IsAdmin
from .models import Prize, CommunityLink
from .serializers import (
    PrizeSerializer, PrizeAdminSerializer,
    CommunityLinkSerializer, CommunityLinkAdminSerializer,
)


class PrizeListView(generics.ListAPIView):
    """GET /api/prizes/ — List all active prizes with unlock status."""
    serializer_class = PrizeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Prize.objects.filter(is_active=True)


class PrizeAdminCreateView(generics.CreateAPIView):
    """POST /api/admin/prizes/ — Create a new prize."""
    serializer_class = PrizeAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]


class PrizeAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/admin/prizes/<id>/ — Manage a prize."""
    serializer_class = PrizeAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = Prize.objects.all()


# ── Community Links ─────────────────────────────────────────

class CommunityLinkListView(generics.ListAPIView):
    """GET /api/community-links/ — Public list of active community links."""
    serializer_class = CommunityLinkSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return CommunityLink.objects.filter(is_active=True)


class CommunityLinkAdminCreateView(generics.ListCreateAPIView):
    """GET/POST /api/admin/community-links/ — Admin manage community links."""
    serializer_class = CommunityLinkAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = CommunityLink.objects.all()


class CommunityLinkAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/admin/community-links/<id>/ — Admin edit/delete."""
    serializer_class = CommunityLinkAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = CommunityLink.objects.all()
