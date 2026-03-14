import logging
from datetime import datetime, timezone

from django.db import transaction
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsAdmin
from .models import EggQRCode, RewardLink

logger = logging.getLogger(__name__)
User = get_user_model()


def _serialize_egg(egg, include_state=True):
    """Serialize a single egg to a dict.
    include_state=True  → full backup (preserves claimed status, code, etc.)
    include_state=False → template (just the egg configuration, no state)
    """
    links = []
    for link in egg.reward_links.all():
        links.append({
            'name': link.name,
            'url': link.url,
            'icon': link.icon or '',
            'order': link.order,
            'extra_points': link.extra_points,
            'is_unique_per_user': link.is_unique_per_user,
        })

    data = {
        'title': egg.title,
        'points': egg.points,
        'label_text': egg.label_text,
        'show_gif': egg.show_gif,
        'gif_url': egg.gif_url,
        'video_url': egg.video_url,
        'local_video_path': egg.local_video_path,
        'rarity': egg.rarity,
        'reward_message': egg.reward_message,
        'is_rickroll': egg.is_rickroll,
        'internal_note': egg.internal_note,
        'reward_links': links,
    }

    if include_state:
        data.update({
            'code_identifier': str(egg.code_identifier),
            'is_redeemed': egg.is_redeemed,
            'redeemed_by_username': egg.redeemed_by.username if egg.redeemed_by else None,
            'redeemed_at': egg.redeemed_at.isoformat() if egg.redeemed_at else None,
            'is_active': egg.is_active,
            'exported_to_pdf': egg.exported_to_pdf,
        })

    return data


class EggExportJsonView(APIView):
    """
    POST /api/admin/eggs/export/json/
    Export egg data as JSON.
    Body: { egg_ids: [], mode: "full"|"template" }
    mode=full (default): includes claimed status, code identifier, etc.
    mode=template: configuration only, for creating fresh eggs on import.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        egg_ids = request.data.get('egg_ids', [])
        mode = request.data.get('mode', 'full')
        include_state = (mode != 'template')

        if egg_ids:
            eggs = EggQRCode.objects.filter(id__in=egg_ids)
        else:
            eggs = EggQRCode.objects.all()

        eggs = eggs.select_related('redeemed_by').prefetch_related('reward_links')
        egg_data = [_serialize_egg(egg, include_state=include_state) for egg in eggs]
        return Response(egg_data, status=status.HTTP_200_OK)


class EggImportJsonView(APIView):
    """
    POST /api/admin/eggs/import/json/
    Import eggs from JSON. Detects format automatically:
    - If entries contain 'code_identifier' → full restore (preserves state).
    - Otherwise → template import (creates fresh eggs with new codes).
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        data = request.data
        if not isinstance(data, list):
            return Response(
                {"error": "Expected a list of egg configurations."},
                status=status.HTTP_400_BAD_REQUEST
            )

        created_count = 0
        skipped_count = 0
        try:
            with transaction.atomic():
                for egg_dict in data:
                    is_full_restore = 'code_identifier' in egg_dict

                    if is_full_restore:
                        code = egg_dict['code_identifier']
                        if EggQRCode.objects.filter(code_identifier=code).exists():
                            skipped_count += 1
                            continue

                    redeemed_by_user = None
                    if is_full_restore and egg_dict.get('redeemed_by_username'):
                        redeemed_by_user = User.objects.filter(
                            username__iexact=egg_dict['redeemed_by_username']
                        ).first()

                    create_kwargs = {
                        'title': egg_dict.get('title', ''),
                        'points': int(egg_dict.get('points', 10)),
                        'label_text': egg_dict.get('label_text', ''),
                        'show_gif': bool(egg_dict.get('show_gif', False)),
                        'gif_url': egg_dict.get('gif_url', ''),
                        'video_url': egg_dict.get('video_url', ''),
                        'local_video_path': egg_dict.get('local_video_path', ''),
                        'rarity': egg_dict.get('rarity', 'common'),
                        'reward_message': egg_dict.get('reward_message', ''),
                        'is_rickroll': bool(egg_dict.get('is_rickroll', False)),
                        'internal_note': egg_dict.get('internal_note', ''),
                        'created_by': request.user,
                    }

                    if is_full_restore:
                        redeemed_at_raw = egg_dict.get('redeemed_at')
                        redeemed_at = None
                        if redeemed_at_raw:
                            redeemed_at = datetime.fromisoformat(redeemed_at_raw)
                            if redeemed_at.tzinfo is None:
                                redeemed_at = redeemed_at.replace(tzinfo=timezone.utc)
                        create_kwargs.update({
                            'code_identifier': code,
                            'is_redeemed': bool(egg_dict.get('is_redeemed', False)),
                            'redeemed_by': redeemed_by_user,
                            'redeemed_at': redeemed_at,
                            'is_active': bool(egg_dict.get('is_active', True)),
                            'exported_to_pdf': bool(egg_dict.get('exported_to_pdf', False)),
                        })

                    egg = EggQRCode(**create_kwargs)
                    egg.save()

                    links_data = egg_dict.get('reward_links', [])
                    link_objs = []
                    for link_data in links_data:
                        link_objs.append(RewardLink(
                            egg=egg,
                            name=link_data.get('name', 'Link'),
                            url=link_data.get('url', ''),
                            icon=link_data.get('icon', ''),
                            order=int(link_data.get('order', 0)),
                            extra_points=int(link_data.get('extra_points', 0)),
                            is_unique_per_user=bool(link_data.get('is_unique_per_user', False))
                        ))

                    if link_objs:
                        RewardLink.objects.bulk_create(link_objs)

                    created_count += 1

        except Exception as e:
            logger.error("Import failed: %s", e)
            return Response(
                {"error": "Failed to parse import data format."},
                status=status.HTTP_400_BAD_REQUEST
            )

        msg = f"Successfully imported {created_count} eggs."
        if skipped_count:
            msg += f" Skipped {skipped_count} (code already exists)."
        return Response({"success": True, "message": msg}, status=status.HTTP_201_CREATED)
