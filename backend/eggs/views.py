"""
Egg views: generation, management, redemption, and export.
"""

import os
import logging

from django.db import transaction
from django.http import HttpResponse
from django.utils import timezone
from django.conf import settings
from rest_framework import generics, status, permissions
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdmin
from .models import EggQRCode, Redemption
from .serializers import (
    EggSerializer, EggGenerateSerializer, EggUpdateSerializer,
    RedemptionSerializer, RedemptionResultSerializer, EggExportSerializer,
    EggInfoSerializer,
)
from .pdf_export import export_eggs_pdf

logger = logging.getLogger(__name__)


# ── Admin: Generate Eggs ────────────────────────────────────

class EggGenerateView(APIView):
    """POST /api/admin/eggs/generate/ — Batch-create eggs."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = EggGenerateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        d = serializer.validated_data

        try:
            eggs = []
            for _ in range(d['count']):
                eggs.append(EggQRCode(
                    points=d['points'],
                    title=d.get('title', ''),
                    label_text=d.get('label_text', ''),
                    show_gif=d.get('show_gif', False),
                    gif_url=d.get('gif_url', ''),
                    video_url=d.get('video_url', ''),
                    local_video_path=d.get('local_video_path', ''),
                    rarity=d.get('rarity', 'common'),
                    reward_message=d.get('reward_message', ''),
                    is_rickroll=d.get('is_rickroll', False),
                    created_by=request.user,
                ))
            created = EggQRCode.objects.bulk_create(eggs)
        except Exception:
            logger.exception("Database error during egg creation by %s", request.user.username)
            return Response(
                {'detail': 'Failed to create eggs due to a server error.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        ids = [e.id for e in created]
        created_qs = EggQRCode.objects.filter(id__in=ids)
        return Response({
            'created': len(created),
            'eggs': EggSerializer(created_qs, many=True, context={'request': request}).data,
        }, status=status.HTTP_201_CREATED)


# ── Admin: List / Detail / Update / Local Videos ────────────

class LocalVideoListView(APIView):
    """GET /api/admin/eggs/videos/ — List available local videos."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get(self, request):
        videos_dir = os.path.join(settings.MEDIA_ROOT, 'egg_videos')
        os.makedirs(videos_dir, exist_ok=True)
        videos = []
        for filename in os.listdir(videos_dir):
            if filename.lower().endswith(('.mp4', '.webm', '.ogg')):
                videos.append({'path': f'egg_videos/{filename}', 'name': filename})
        return Response({'videos': videos})


class EggListView(generics.ListAPIView):
    """GET /api/admin/eggs/ — List all eggs for admin."""
    serializer_class = EggSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        qs = EggQRCode.objects.select_related('redeemed_by', 'created_by').all()
        redeemed = self.request.query_params.get('redeemed')
        if redeemed is not None:
            qs = qs.filter(is_redeemed=redeemed.lower() in ('true', '1'))
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() in ('true', '1'))
        return qs


class EggDetailView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/admin/eggs/<id>/ — View or update a single egg."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = EggQRCode.objects.select_related('redeemed_by', 'created_by')

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return EggUpdateSerializer
        return EggSerializer


# ── Admin: Reset Egg ─────────────────────────────────────────

class EggResetView(APIView):
    """POST /api/admin/eggs/<id>/reset/ — Reset a claimed egg back to unclaimed."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request, pk):
        try:
            egg = EggQRCode.objects.get(pk=pk)
        except EggQRCode.DoesNotExist:
            return Response({'detail': 'Egg not found.'}, status=status.HTTP_404_NOT_FOUND)

        if not egg.is_redeemed:
            return Response({'detail': 'This egg is not claimed.'}, status=status.HTTP_400_BAD_REQUEST)

        old_user = egg.redeemed_by

        with transaction.atomic():
            if old_user:
                points_to_remove = egg.points
                old_user.refresh_from_db()
                old_user.total_points = max(0, old_user.total_points - points_to_remove)
                old_user.save(update_fields=['total_points'])

            Redemption.objects.filter(egg=egg).delete()

            egg.is_redeemed = False
            egg.redeemed_by = None
            egg.redeemed_at = None
            egg.save(update_fields=['is_redeemed', 'redeemed_by', 'redeemed_at', 'updated_at'])

        return Response({
            'success': True,
            'message': f'Egg "{egg.title or str(egg.code_identifier)[:8]}" has been reset.',
        })


# ── Admin: Export PDF ────────────────────────────────────────

class EggExportView(APIView):
    """POST /api/admin/eggs/export/ — Export QR codes as PDF."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request):
        serializer = EggExportSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        egg_ids = serializer.validated_data.get('egg_ids', [])

        if egg_ids:
            eggs = EggQRCode.objects.filter(id__in=egg_ids)
        else:
            eggs = EggQRCode.objects.filter(is_redeemed=False, is_active=True)

        if not eggs.exists():
            return Response({'error': 'No eggs to export.'}, status=status.HTTP_400_BAD_REQUEST)

        pdf_buf = export_eggs_pdf(eggs)
        eggs.update(exported_to_pdf=True)
        response = HttpResponse(pdf_buf.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="egg_hunt_qrcodes.pdf"'
        return response


# ── User: Redeem ─────────────────────────────────────────────

def _build_reward_links(user):
    """Build global reward links list with per-user claim status."""
    from rewards.models import GlobalRewardLink, GlobalRewardLinkClaim
    result = []
    for link in GlobalRewardLink.objects.filter(is_active=True):
        already_claimed = (
            link.is_unique_per_user
            and GlobalRewardLinkClaim.objects.filter(user=user, reward_link=link).exists()
        )
        result.append({
            'id': link.id,
            'name': link.name,
            'url': link.url,
            'icon': link.icon or '',
            'order': link.order,
            'extra_points': link.extra_points,
            'is_unique_per_user': link.is_unique_per_user,
            'already_claimed': already_claimed,
        })
    return result


def _redeem_response(request, egg, user, *, success, message, points_earned, reward_links=None):
    """Build a serialized redemption result response dict."""
    show_full_reward = success
    custom_video_url = None
    if show_full_reward and egg.local_video_path:
        custom_video_url = request.build_absolute_uri(
            settings.MEDIA_URL.rstrip('/') + '/' + egg.local_video_path.lstrip('/')
        )
    return RedemptionResultSerializer({
        'success': success,
        'message': message,
        'points_earned': points_earned,
        'total_points': user.total_points,
        'egg_title': (egg.title or 'Mystery Egg') if show_full_reward else egg.title,
        'show_gif': egg.show_gif if show_full_reward else False,
        'gif_url': egg.gif if show_full_reward else None,
        'custom_video_url': custom_video_url,
        'video_url': egg.video_url if show_full_reward else None,
        'rarity': egg.rarity,
        'reward_message': egg.reward_message if show_full_reward else '',
        'is_rickroll': egg.is_rickroll if show_full_reward else False,
        'reward_links': reward_links or [],
    }).data


class RedeemView(APIView):
    """POST /api/redeem/<code_identifier>/ — Atomic single-use egg redemption."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, code_identifier):
        user = request.user

        try:
            with transaction.atomic():
                egg = (
                    EggQRCode.objects
                    .select_for_update()
                    .get(code_identifier=code_identifier)
                )

                if not egg.is_active:
                    return Response(
                        _redeem_response(request, egg, user, success=False,
                                         message='This egg is no longer active.', points_earned=0),
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                if egg.is_redeemed:
                    if egg.redeemed_by == user:
                        return Response(
                            _redeem_response(request, egg, user, success=True,
                                             message='You have already found this egg!', points_earned=0,
                                             reward_links=_build_reward_links(user)),
                            status=status.HTTP_200_OK,
                        )
                    return Response(
                        _redeem_response(request, egg, user, success=False,
                                         message='This egg has already been claimed by someone else!',
                                         points_earned=0),
                        status=status.HTTP_400_BAD_REQUEST,
                    )

                egg.is_redeemed = True
                egg.redeemed_by = user
                egg.redeemed_at = timezone.now()
                egg.save(update_fields=['is_redeemed', 'redeemed_by', 'redeemed_at', 'updated_at'])

                user.total_points += egg.points
                user.save(update_fields=['total_points'])

                Redemption.objects.create(user=user, egg=egg, points_awarded=egg.points)

                return Response(
                    _redeem_response(request, egg, user, success=True,
                                     message=f'You found an egg worth {egg.points} points!',
                                     points_earned=egg.points,
                                     reward_links=_build_reward_links(user)),
                    status=status.HTTP_200_OK,
                )

        except EggQRCode.DoesNotExist:
            empty_result = RedemptionResultSerializer({
                'success': False,
                'message': 'Invalid QR code. This egg does not exist.',
                'points_earned': 0,
                'total_points': user.total_points,
                'egg_title': '',
                'show_gif': False,
                'gif_url': None,
                'custom_video_url': None,
                'video_url': None,
                'rarity': 'common',
                'reward_message': '',
                'is_rickroll': False,
                'reward_links': [],
            }).data
            return Response(empty_result, status=status.HTTP_404_NOT_FOUND)


# ── Public: Egg Info (no auth required) ──────────────────

class EggInfoView(APIView):
    """GET /api/eggs/info/<code_identifier>/ — Public minimal egg info."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, code_identifier):
        try:
            egg = EggQRCode.objects.get(code_identifier=code_identifier)
            return Response(EggInfoSerializer(egg).data)
        except EggQRCode.DoesNotExist:
            return Response(
                {'valid': False, 'message': 'This QR code is not valid.'},
                status=status.HTTP_404_NOT_FOUND,
            )


# ── Redemption History ───────────────────────────────────────

class AdminRedemptionListView(generics.ListAPIView):
    """GET /api/admin/redemptions/ — All redemptions for admin."""
    serializer_class = RedemptionSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]
    queryset = Redemption.objects.select_related('user', 'egg').all()


class UserRedemptionListView(generics.ListAPIView):
    """GET /api/user/redemptions/ — Current user's redemption history."""
    serializer_class = RedemptionSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Redemption.objects.filter(user=self.request.user).select_related('egg')
