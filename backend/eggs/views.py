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
from .models import EggQRCode, Redemption, RewardLink, RewardLinkClaim
from .serializers import (
    EggSerializer, EggGenerateSerializer, EggUpdateSerializer,
    RedemptionSerializer, RedemptionResultSerializer, EggExportSerializer,
    EggInfoSerializer, RewardLinkSerializer,
)
from .pdf_export import export_eggs_pdf

logger = logging.getLogger(__name__)


# ── Admin: Generate Eggs ────────────────────────────────────

class EggGenerateView(APIView):
    """POST /api/admin/eggs/generate/ — Batch-create eggs."""
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def post(self, request):
        logger.info(
            "Egg creation attempt by %s (ID: %s) — payload: %s",
            request.user.username, request.user.id, request.data,
        )

        serializer = EggGenerateSerializer(data=request.data)
        if not serializer.is_valid():
            logger.warning(
                "Egg creation validation failed for %s: %s",
                request.user.username, serializer.errors,
            )
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
            logger.info(
                "Successfully created %d egg(s) by %s",
                len(created), request.user.username,
            )

            # Create reward links for each egg if provided
            links_input = d.get('links', [])
            if links_input:
                link_objs = []
                for egg in created:
                    for idx, link_data in enumerate(links_input):
                        link_objs.append(RewardLink(
                            egg=egg,
                            name=link_data['name'],
                            url=link_data['url'],
                            icon=link_data.get('icon', ''),
                            order=link_data.get('order', idx),
                            extra_points=link_data.get('extra_points', 0),
                            is_unique_per_user=link_data.get('is_unique_per_user', False),
                        ))
                RewardLink.objects.bulk_create(link_objs)
        except Exception:
            logger.exception("Database error during egg creation by %s", request.user.username)
            return Response(
                {'detail': 'Failed to create eggs due to a server error.'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

        # Re-fetch eggs with reward_links for response
        ids = [e.id for e in created]
        created_with_links = EggQRCode.objects.prefetch_related('reward_links').filter(id__in=ids)
        return Response({
            'created': len(created),
            'eggs': EggSerializer(created_with_links, many=True, context={'request': request}).data,
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
        qs = EggQRCode.objects.select_related(
            'redeemed_by', 'created_by',
        ).prefetch_related('reward_links').all()
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
    queryset = EggQRCode.objects.select_related(
        'redeemed_by', 'created_by',
    ).prefetch_related('reward_links')

    def get_serializer_class(self):
        if self.request.method in ('PATCH', 'PUT'):
            return EggUpdateSerializer
        return EggSerializer

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
            return Response(
                {'error': 'No eggs to export.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        pdf_buf = export_eggs_pdf(eggs)
        eggs.update(exported_to_pdf=True)
        response = HttpResponse(pdf_buf.getvalue(), content_type='application/pdf')
        response['Content-Disposition'] = 'attachment; filename="egg_hunt_qrcodes.pdf"'
        return response


# ── User: Link Claim ──────────────────────────────────────────

class LinkClaimView(APIView):
    """
    POST /api/links/<pk>/claim/
    Claim a reward link: optionally earn extra points, then open redirect_url.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        try:
            link = RewardLink.objects.get(pk=pk)
        except RewardLink.DoesNotExist:
            return Response(
                {'detail': 'Link not found.'},
                status=status.HTTP_404_NOT_FOUND,
            )

        redirect_url = link.url
        user = request.user

        if link.extra_points == 0:
            return Response({
                'success': True,
                'redirect_url': redirect_url,
            })

        if link.is_unique_per_user and RewardLinkClaim.objects.filter(user=user, reward_link=link).exists():
            return Response({
                'success': True,
                'already_claimed': True,
                'redirect_url': redirect_url,
            })

        with transaction.atomic():
            user.refresh_from_db()
            user.total_points += link.extra_points
            user.save(update_fields=['total_points'])
            RewardLinkClaim.objects.create(
                user=user,
                reward_link=link,
                points_awarded=link.extra_points,
            )
            
            # Tie the bonus points back to the original Redemption log
            redemption = Redemption.objects.filter(user=user, egg=link.egg).first()
            if redemption:
                redemption.bonus_points_awarded += link.extra_points
                redemption.save(update_fields=['bonus_points_awarded'])

        return Response({
            'success': True,
            'points_awarded': link.extra_points,
            'redirect_url': redirect_url,
        })


# ── User: Redeem ─────────────────────────────────────────────

def _build_reward_links(egg, user):
    """Build reward links list with per-user claim status."""
    result = []
    for link in egg.reward_links.all():
        already_claimed = (
            link.is_unique_per_user
            and RewardLinkClaim.objects.filter(user=user, reward_link=link).exists()
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
    """
    POST /api/redeem/<code_identifier>/
    Atomic single-use egg redemption.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, code_identifier):
        user = request.user
        logger.info("User %s (ID: %s) attempting to redeem egg: %s", user.username, user.id, code_identifier)

        try:
            with transaction.atomic():
                egg = (
                    EggQRCode.objects
                    .select_for_update()
                    .prefetch_related('reward_links')
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
                                             reward_links=_build_reward_links(egg, user)),
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
                                     reward_links=_build_reward_links(egg, user)),
                    status=status.HTTP_200_OK,
                )

        except EggQRCode.DoesNotExist:
            logger.warning("Redemption failed: Code %s not found. User: %s", code_identifier, user.username)
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
    """
    GET /api/eggs/info/<code_identifier>/
    Public endpoint — returns minimal egg info for pre-redemption checks.
    """
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
        return Redemption.objects.filter(
            user=self.request.user
        ).select_related('egg')


# ── Admin: Reward Links CRUD ─────────────────────────────────

class RewardLinkListCreateView(generics.ListCreateAPIView):
    """GET/POST /api/admin/eggs/<egg_pk>/links/"""
    serializer_class = RewardLinkSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return RewardLink.objects.filter(egg_id=self.kwargs['egg_pk'])

    def perform_create(self, serializer):
        egg = generics.get_object_or_404(EggQRCode, pk=self.kwargs['egg_pk'])
        serializer.save(egg=egg)


class RewardLinkDetailView(generics.RetrieveUpdateDestroyAPIView):
    """GET/PATCH/DELETE /api/admin/eggs/<egg_pk>/links/<pk>/"""
    serializer_class = RewardLinkSerializer
    permission_classes = [permissions.IsAuthenticated, IsAdmin]

    def get_queryset(self):
        return RewardLink.objects.filter(egg_id=self.kwargs['egg_pk'])
