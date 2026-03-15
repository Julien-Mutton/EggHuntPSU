"""
Serializers for achievements (prizes), global reward links, and sponsors.
"""

from rest_framework import serializers
from .models import Prize, GlobalRewardLink, SponsorOrganization


class PrizeSerializer(serializers.ModelSerializer):
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
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            if obj.points_required == 0:
                return 100
            return min(100, round(request.user.total_points / obj.points_required * 100))
        return 0


class PrizeAdminSerializer(serializers.ModelSerializer):
    class Meta:
        model = Prize
        fields = (
            'id', 'name', 'description', 'points_required', 'image',
            'is_active', 'created_at', 'updated_at',
        )


class GlobalRewardLinkSerializer(serializers.ModelSerializer):
    class Meta:
        model = GlobalRewardLink
        fields = ('id', 'name', 'url', 'icon', 'order', 'extra_points', 'is_unique_per_user', 'is_active')


class SponsorSerializer(serializers.ModelSerializer):
    logo = serializers.SerializerMethodField()

    class Meta:
        model = SponsorOrganization
        fields = ('id', 'name', 'url', 'logo', 'order')

    def get_logo(self, obj):
        if obj.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.logo.url)
            return obj.logo.url
        return None
