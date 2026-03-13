from django.contrib import admin
from django.contrib.auth import get_user_model

User = get_user_model()


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('username', 'email', 'role', 'total_points', 'date_joined', 'is_active')
    list_filter = ('role', 'is_active', 'date_joined')
    search_fields = ('username', 'email')
    ordering = ('-total_points',)
    readonly_fields = ('total_points', 'date_joined', 'last_login')
    
    fieldsets = (
        ('Account Information', {
            'fields': ('username', 'email', 'password')
        }),
        ('Permissions & Roles', {
            'fields': ('role', 'is_active', 'is_staff', 'is_superuser')
        }),
        ('App Data', {
            'fields': ('total_points',)
        }),
        ('Important Dates', {
            'fields': ('last_login', 'date_joined'),
            'classes': ('collapse',)
        }),
    )
