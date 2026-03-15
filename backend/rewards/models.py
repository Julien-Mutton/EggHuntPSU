"""
Models for the rewards system: achievements (prizes), global reward links,
and sponsor organizations.
"""

from django.db import models
from django.conf import settings


class Prize(models.Model):
    """An achievement that unlocks when a user reaches a point threshold."""

    name = models.CharField(max_length=200)
    description = models.TextField(blank=True, default='')
    points_required = models.PositiveIntegerField()
    image = models.ImageField(upload_to='prize_images/', blank=True, default='')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['points_required']
        verbose_name = 'Achievement'
        verbose_name_plural = 'Achievements'

    def __str__(self):
        return f"{self.name} ({self.points_required} pts)"


class GlobalRewardLink(models.Model):
    """
    Global reward links shown after ANY egg is redeemed.
    Managed via Django admin.
    """

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
    order = models.PositiveIntegerField(default=0)
    extra_points = models.PositiveIntegerField(
        default=0,
        help_text='Bonus points awarded when a user claims this link. 0 = no points.',
    )
    is_unique_per_user = models.BooleanField(
        default=True,
        help_text='Each user can earn points from this link at most once.',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'id']
        verbose_name = 'Global Reward Link'
        verbose_name_plural = 'Global Reward Links'

    def __str__(self):
        pts = f" (+{self.extra_points} pts)" if self.extra_points else ''
        return f"{self.name}{pts}"


class GlobalRewardLinkClaim(models.Model):
    """Tracks per-user claims of global reward links."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='global_reward_claims',
    )
    reward_link = models.ForeignKey(
        GlobalRewardLink,
        on_delete=models.CASCADE,
        related_name='claims',
    )
    claimed_at = models.DateTimeField(auto_now_add=True)
    points_awarded = models.PositiveIntegerField()

    class Meta:
        ordering = ['-claimed_at']
        unique_together = ('user', 'reward_link')

    def __str__(self):
        return f"{self.user.username} claimed {self.reward_link.name} (+{self.points_awarded})"


class SponsorOrganization(models.Model):
    """Sponsor organizations displayed on login/register pages. Managed via admin."""

    name = models.CharField(max_length=200)
    url = models.URLField(blank=True, default='')
    logo = models.ImageField(upload_to='sponsor_logos/', blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['order', 'name']
        verbose_name = 'Sponsor Organization'
        verbose_name_plural = 'Sponsor Organizations'

    def __str__(self):
        return self.name
