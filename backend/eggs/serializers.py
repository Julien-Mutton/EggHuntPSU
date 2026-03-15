"""
Serializers for eggs, redemptions, and batch creation.
"""

from rest_framework import serializers
from django.conf import settings
from .models import EggQRCode, Redemption


class EggSerializer(serializers.ModelSerializer):
    """Full egg detail — used by admin views."""
    redeemed_by_username = serializers.CharField(
        source='redeemed_by.username', read_only=True, default=None,
    )
    created_by_username = serializers.CharField(
        source='created_by.username', read_only=True, default=None,
    )
    gif = serializers.SerializerMethodField()
    custom_video = serializers.SerializerMethodField()
    qr_url = serializers.SerializerMethodField()

    class Meta:
        model = EggQRCode
        fields = (
            'id', 'code_identifier', 'title', 'internal_note', 'points',
            'label_text', 'is_redeemed', 'redeemed_by', 'redeemed_by_username',
            'redeemed_at', 'show_gif', 'gif_url', 'gif_file', 'gif', 'local_video_path', 'custom_video', 'video_url',
            'rarity', 'reward_message', 'is_rickroll',
            'exported_to_pdf', 'is_active', 'created_by', 'created_by_username',
            'created_at', 'updated_at', 'qr_url',
        )
        read_only_fields = (
            'id', 'code_identifier', 'is_redeemed', 'redeemed_by',
            'redeemed_at', 'exported_to_pdf', 'created_by', 'created_at', 'updated_at',
        )

    def get_gif(self, obj):
        if obj.gif_file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.gif_file.url)
            return obj.gif_file.url
        return obj.gif_url or None

    def get_custom_video(self, obj):
        if obj.local_video_path:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(settings.MEDIA_URL + obj.local_video_path)
            return settings.MEDIA_URL + obj.local_video_path
        return None

    def get_qr_url(self, obj):
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
        return f"{frontend_url}/redeem/{obj.code_identifier}"


class RewardLinkRedemptionSerializer(serializers.Serializer):
    """Global reward link as shown after redemption, with already_claimed status."""
    id = serializers.IntegerField()
    name = serializers.CharField()
    url = serializers.URLField()
    icon = serializers.CharField(allow_blank=True)
    order = serializers.IntegerField()
    extra_points = serializers.IntegerField()
    is_unique_per_user = serializers.BooleanField()
    already_claimed = serializers.BooleanField()


class EggGenerateSerializer(serializers.Serializer):
    """Input for batch egg generation."""
    count = serializers.IntegerField(min_value=1, max_value=10000, default=1)
    points = serializers.IntegerField(min_value=1, default=10)
    title = serializers.CharField(max_length=200, required=False, default='', allow_blank=True)
    label_text = serializers.CharField(max_length=300, required=False, default='', allow_blank=True)
    show_gif = serializers.BooleanField(required=False, default=False)
    gif_url = serializers.URLField(required=False, default='', allow_blank=True)
    local_video_path = serializers.CharField(required=False, default='', allow_blank=True)
    video_url = serializers.URLField(required=False, default='', allow_blank=True)
    rarity = serializers.ChoiceField(
        choices=['common', 'uncommon', 'rare', 'legendary'],
        required=False, default='common',
    )
    reward_message = serializers.CharField(required=False, default='', allow_blank=True)
    is_rickroll = serializers.BooleanField(required=False, default=False)


class EggUpdateSerializer(serializers.ModelSerializer):
    """Partial update for an egg."""
    class Meta:
        model = EggQRCode
        fields = (
            'title', 'internal_note', 'points', 'label_text',
            'show_gif', 'gif_url', 'gif_file', 'local_video_path', 'video_url', 'is_active',
            'rarity', 'reward_message', 'is_rickroll',
        )
        extra_kwargs = {
            'title': {'allow_blank': True},
            'internal_note': {'allow_blank': True},
            'label_text': {'allow_blank': True},
            'gif_url': {'allow_blank': True},
            'video_url': {'allow_blank': True},
            'local_video_path': {'allow_blank': True},
            'reward_message': {'allow_blank': True},
        }


class RedemptionSerializer(serializers.ModelSerializer):
    username = serializers.SerializerMethodField()
    egg_title = serializers.CharField(source='egg.title', read_only=True)
    egg_code = serializers.UUIDField(source='egg.code_identifier', read_only=True)

    class Meta:
        model = Redemption
        fields = (
            'id', 'username', 'egg', 'egg_title', 'egg_code',
            'points_awarded', 'redeemed_at',
        )

    def get_username(self, obj):
        return obj.user.username if obj.user else 'Deleted User'


class RedemptionResultSerializer(serializers.Serializer):
    """Response after a redemption attempt."""
    success = serializers.BooleanField()
    message = serializers.CharField()
    points_earned = serializers.IntegerField()
    total_points = serializers.IntegerField()
    egg_title = serializers.CharField()
    show_gif = serializers.BooleanField()
    gif_url = serializers.CharField(allow_null=True)
    custom_video_url = serializers.CharField(allow_null=True, required=False)
    video_url = serializers.CharField(allow_null=True, allow_blank=True)
    rarity = serializers.CharField()
    reward_message = serializers.CharField(allow_blank=True)
    is_rickroll = serializers.BooleanField(default=False)
    reward_links = RewardLinkRedemptionSerializer(many=True, required=False)


class EggExportSerializer(serializers.Serializer):
    """Input for PDF export."""
    egg_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text='Specific egg IDs to export. If empty, exports all unredeemed.',
    )


class EggInfoSerializer(serializers.ModelSerializer):
    """Public egg info — minimal data, no auth required."""
    valid = serializers.SerializerMethodField()

    class Meta:
        model = EggQRCode
        fields = ('valid', 'title', 'is_redeemed', 'is_active', 'points')
        read_only_fields = fields

    def get_valid(self, obj):
        return True
