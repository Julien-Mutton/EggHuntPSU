"""
Views for achievements (prizes), community links, global reward link claims, and sponsors.
"""

from django.db import transaction
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from .models import (
    Prize, CommunityLink, GlobalRewardLink,
    GlobalRewardLinkClaim, SponsorOrganization,
)
from .serializers import (
    PrizeSerializer, PrizeAdminSerializer,
    CommunityLinkSerializer, CommunityLinkAdminSerializer,
    SponsorSerializer,
)


# ── Achievements (Prizes) ──────────────────────────────────

class PrizeListView(generics.ListAPIView):
    serializer_class = PrizeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Prize.objects.filter(is_active=True)


class PrizeAdminCreateView(generics.CreateAPIView):
    serializer_class = PrizeAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]


class PrizeAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = PrizeAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = Prize.objects.all()


# ── Community Links ─────────────────────────────────────────

class CommunityLinkListView(generics.ListAPIView):
    serializer_class = CommunityLinkSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return CommunityLink.objects.filter(is_active=True)


class CommunityLinkAdminCreateView(generics.ListCreateAPIView):
    serializer_class = CommunityLinkAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = CommunityLink.objects.all()


class CommunityLinkAdminDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CommunityLinkAdminSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = CommunityLink.objects.all()


# ── Global Reward Link Claims ───────────────────────────────

class GlobalLinkClaimView(APIView):
    """POST /api/global-links/<pk>/claim/ — claim a global reward link."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            link = GlobalRewardLink.objects.get(pk=pk, is_active=True)
        except GlobalRewardLink.DoesNotExist:
            return Response({'detail': 'Link not found.'}, status=status.HTTP_404_NOT_FOUND)

        user = request.user
        redirect_url = link.url

        if link.extra_points == 0:
            return Response({'success': True, 'points_awarded': 0, 'redirect_url': redirect_url})

        if link.is_unique_per_user and GlobalRewardLinkClaim.objects.filter(user=user, reward_link=link).exists():
            return Response({'success': True, 'already_claimed': True, 'points_awarded': 0, 'redirect_url': redirect_url})

        with transaction.atomic():
            user.refresh_from_db()
            user.total_points += link.extra_points
            user.save(update_fields=['total_points'])
            GlobalRewardLinkClaim.objects.create(user=user, reward_link=link, points_awarded=link.extra_points)

        return Response({'success': True, 'points_awarded': link.extra_points, 'redirect_url': redirect_url})


# ── Sponsors ────────────────────────────────────────────────

class SponsorListView(generics.ListAPIView):
    """GET /api/sponsors/ — public list of active sponsors."""
    serializer_class = SponsorSerializer
    permission_classes = [permissions.AllowAny]

    def get_queryset(self):
        return SponsorOrganization.objects.filter(is_active=True)
