from django.contrib import admin
from .models import EggQRCode, Redemption, RewardLink, RewardLinkClaim

class RewardLinkInline(admin.TabularInline):
    model = RewardLink
    extra = 1

@admin.register(EggQRCode)
class EggQRCodeAdmin(admin.ModelAdmin):
    list_display = (
        'title', 'points', 'rarity', 'is_redeemed',
        'redeemed_by', 'is_active', 'is_rickroll', 'created_at',
    )
    list_filter = ('is_redeemed', 'is_active', 'rarity', 'show_gif', 'is_rickroll', 'created_at')
    search_fields = ('title', 'code_identifier', 'reward_message', 'redeemed_by__username', 'redeemed_by__email')
    readonly_fields = ('code_identifier', 'created_at', 'updated_at', 'redeemed_at')
    inlines = [RewardLinkInline]
    
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


@admin.register(Redemption)
class RedemptionAdmin(admin.ModelAdmin):
    list_display = ('user', 'egg', 'points_awarded', 'bonus_points_awarded', 'redeemed_at')
    list_filter = ('redeemed_at',)
    search_fields = ('user__username', 'egg__title')

@admin.register(RewardLink)
class RewardLinkAdmin(admin.ModelAdmin):
    list_display = ('name', 'egg', 'order', 'extra_points', 'is_unique_per_user')
    search_fields = ('name', 'egg__title', 'url')
    list_filter = ('is_unique_per_user',)

@admin.register(RewardLinkClaim)
class RewardLinkClaimAdmin(admin.ModelAdmin):
    list_display = ('user', 'reward_link', 'points_awarded', 'claimed_at')
    search_fields = ('user__username', 'reward_link__name')
    list_filter = ('claimed_at',)
