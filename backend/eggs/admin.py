from django.contrib import admin
from django.utils.safestring import mark_safe
from .models import EggQRCode, Redemption


@admin.register(EggQRCode)
class EggQRCodeAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'code_short', 'points', 'rarity', 'is_redeemed',
        'redeemed_by_display', 'is_active', 'is_rickroll', 'created_at',
    )
    list_filter = ('is_redeemed', 'is_active', 'rarity', 'show_gif', 'is_rickroll', 'exported_to_pdf', 'created_at')
    search_fields = ('title', 'code_identifier', 'reward_message', 'redeemed_by__username')
    readonly_fields = ('code_identifier', 'created_at', 'updated_at', 'redeemed_at')
    list_per_page = 50

    fieldsets = (
        ('Basic Configuration', {
            'fields': ('title', 'code_identifier', 'label_text', 'points', 'rarity', 'is_active')
        }),
        ('Redemption Status', {
            'fields': ('is_redeemed', 'redeemed_by', 'redeemed_at')
        }),
        ('Reward Content', {
            'fields': ('reward_message', 'is_rickroll', 'local_video_path', 'video_url', 'show_gif', 'gif_url')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )

    @admin.display(description='Code', ordering='code_identifier')
    def code_short(self, obj):
        return str(obj.code_identifier)[:8]

    @admin.display(description='Redeemed By', ordering='redeemed_by__username')
    def redeemed_by_display(self, obj):
        if obj.redeemed_by:
            return obj.redeemed_by.username
        if obj.is_redeemed:
            return mark_safe('<em style="color:#999">Deleted User</em>')
        return '—'


@admin.register(Redemption)
class RedemptionAdmin(admin.ModelAdmin):
    list_display = ('username_display', 'egg', 'points_awarded', 'bonus_points_awarded', 'redeemed_at')
    list_filter = ('redeemed_at', 'egg__rarity')
    search_fields = ('user__username', 'egg__title', 'egg__code_identifier')
    raw_id_fields = ('user', 'egg')
    list_per_page = 50
    list_select_related = ('user', 'egg')

    @admin.display(description='User', ordering='user__username')
    def username_display(self, obj):
        if obj.user:
            return obj.user.username
        return mark_safe('<em style="color:#999">Deleted User</em>')
