from django.contrib import admin
from .models import Prize, CommunityLink


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
