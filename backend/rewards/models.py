"""
Prize model for the rewards system.
"""

from django.db import models


class Prize(models.Model):
    """A prize that unlocks when a user reaches a point threshold."""

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    points_required = models.PositiveIntegerField()
    image = models.ImageField(upload_to='prize_images/', blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['points_required']

    def __str__(self):
        return f"{self.name} ({self.points_required} pts)"


class CommunityLink(models.Model):
    """A configurable promotional/community link."""

    ICON_CHOICES = (
        ('whatsapp', 'WhatsApp'),
        ('groupme', 'GroupMe'),
        ('instagram', 'Instagram'),
        ('linktree', 'Linktree'),
        ('discord', 'Discord'),
        ('twitter', 'Twitter'),
        ('facebook', 'Facebook'),
        ('link', 'Generic Link'),
    )

    name = models.CharField(max_length=100)
    url = models.URLField()
    icon = models.CharField(max_length=50, choices=ICON_CHOICES, default='link')
    description = models.CharField(max_length=300, blank=True, default='')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'name']

    def __str__(self):
        return f"{self.name} ({self.icon})"
