import json
from django.db import transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsAdmin
from .models import EggQRCode, RewardLink

class EggExportJsonView(APIView):
    """
    POST /api/admin/eggs/export/json/
    Export fully reproducible JSON structures for backing up eggs.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def post(self, request):
        egg_ids = request.data.get('egg_ids', [])
        
        if egg_ids:
            eggs = EggQRCode.objects.filter(id__in=egg_ids).prefetch_related('reward_links')
        else:
            eggs = EggQRCode.objects.all().prefetch_related('reward_links')
            
        egg_data = []
        for egg in eggs:
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

            egg_data.append({
                # Note: We omit internal db IDs and 'redeemed' status to allow 
                # restoring it as a fresh, claimable egg.
                'title': egg.title,
                'points': egg.points,
                'label_text': egg.label_text,
                'show_gif': egg.show_gif,
                'gif_url': egg.gif_url,
                'video_url': egg.video_url,
                'rarity': egg.rarity,
                'reward_message': egg.reward_message,
                'is_rickroll': egg.is_rickroll,
                'internal_note': egg.internal_note,
                'reward_links': links,
            })
            
        return Response(egg_data, status=status.HTTP_200_OK)


class EggImportJsonView(APIView):
    """
    POST /api/admin/eggs/import/json/
    Import a JSON structure previously exported from EggExportJsonView.
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
        try:
            with transaction.atomic():
                for egg_dict in data:
                    # Defensive parsing
                    points = int(egg_dict.get('points', 10))
                    
                    egg = EggQRCode.objects.create(
                        title=egg_dict.get('title', ''),
                        points=points,
                        label_text=egg_dict.get('label_text', ''),
                        show_gif=bool(egg_dict.get('show_gif', False)),
                        gif_url=egg_dict.get('gif_url', ''),
                        video_url=egg_dict.get('video_url', ''),
                        rarity=egg_dict.get('rarity', 'common'),
                        reward_message=egg_dict.get('reward_message', ''),
                        is_rickroll=bool(egg_dict.get('is_rickroll', False)),
                        internal_note=egg_dict.get('internal_note', ''),
                        created_by=request.user
                    )
                    
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
            import logging
            logging.getLogger(__name__).error(f"Import crash: {e}")
            return Response(
                {"error": "Failed to parse import data format."},
                status=status.HTTP_400_BAD_REQUEST
            )
            
        return Response({
            "success": True, 
            "message": f"Successfully imported {created_count} eggs."
        }, status=status.HTTP_201_CREATED)
