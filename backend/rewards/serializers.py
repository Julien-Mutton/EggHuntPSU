"""
Serializers for the Prize and CommunityLink models.
"""

from rest_framework import serializers
from .models import Prize, CommunityLink


class PrizeSerializer(serializers.ModelSerializer):
    """Full prize serializer, includes unlock status per-user via context."""
    is_unlocked = serializers.SerializerMethodField()
    progress = serializers.SerializerMethodField()

    class Meta:
        model = Prize
        fields = (
            'id', 'name', 'description', 'points_required', 'image',
            'is_active', 'is_unlocked', 'progress', 'created_at',
        )

    def get_is_unlocked(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return request.user.total_points >= obj.points_required
        return False

    def get_progress(self, obj):
        """Return percentage progress toward unlocking this prize."""
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if obj.points_required == 0:
                return 100
            return min(
                100,
                round(request.user.total_points / obj.points_required * 100),
            )
        return 0


class PrizeAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prize
        fields = (
            'id', 'name', 'description', 'points_required', 'image',
            'is_active', 'created_at', 'updated_at',
        )


class CommunityLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityLink
        fields = ('id', 'name', 'url', 'icon', 'description', 'order', 'is_active')


class CommunityLinkAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = CommunityLink
        fields = ('id', 'name', 'url', 'icon', 'description', 'order', 'is_active', 'created_at')
