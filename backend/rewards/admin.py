from django.contrib import admin
from .models import Prize, CommunityLink, GlobalRewardLink, GlobalRewardLinkClaim, SponsorOrganization


@admin.register(Prize)
class PrizeAdmin(admin.ModelAdmin):
    list_display = ('name', 'points_required', 'is_active', 'created_at')
    list_filter = ('is_active',)
    search_fields = ('name',)


@admin.register(CommunityLink)
class CommunityLinkAdmin(admin.ModelAdmin):
    list_display = ('name', 'url', 'icon', 'order', 'is_active')
    list_filter = ('is_active', 'icon')
    list_editable = ('order', 'is_active')
    search_fields = ('name', 'url')


@admin.register(GlobalRewardLink)
class GlobalRewardLinkAdmin(admin.ModelAdmin):
    list_display = ('name', 'url', 'icon', 'extra_points', 'is_unique_per_user', 'order', 'is_active')
    list_filter = ('is_active', 'icon')
    list_editable = ('order', 'extra_points', 'is_active')
    search_fields = ('name', 'url')


@admin.register(GlobalRewardLinkClaim)
class GlobalRewardLinkClaimAdmin(admin.ModelAdmin):
    list_display = ('user', 'reward_link', 'points_awarded', 'claimed_at')
    search_fields = ('user__username', 'reward_link__name')
    list_filter = ('claimed_at',)


@admin.register(SponsorOrganization)
class SponsorOrganizationAdmin(admin.ModelAdmin):
    list_display = ('name', 'url', 'order', 'is_active')
    list_filter = ('is_active',)
    list_editable = ('order', 'is_active')
    search_fields = ('name',)
