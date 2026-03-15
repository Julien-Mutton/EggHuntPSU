"""
EggQRCode and Redemption models.
"""

import uuid
import os
from django.db import models
from django.conf import settings
from django.db.models.signals import post_delete
from django.dispatch import receiver


class EggQRCode(models.Model):
    """A single egg in the hunt, represented by a QR code."""

    code_identifier = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    title = models.CharField(max_length=200, blank=True, default='')
    internal_note = models.TextField(blank=True, default='')
    points = models.PositiveIntegerField(default=10)
    label_text = models.CharField(
        max_length=300, blank=True, default='',
        help_text='Optional text printed above the QR code on export.',
    )

    # Redemption state
    is_redeemed = models.BooleanField(default=False)
    redeemed_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='redeemed_eggs',
    )
    redeemed_at = models.DateTimeField(null=True, blank=True)

    # GIF / Media behaviour
    show_gif = models.BooleanField(default=False)
    gif_url = models.URLField(blank=True, default='')
    gif_file = models.FileField(upload_to='egg_gifs/', blank=True, default='')
    local_video_path = models.CharField(
        max_length=255, blank=True, default='',
        help_text='Path to a local video (e.g., "egg_videos/myvid.mp4") to be played as a reward.'
    )
    video_url = models.URLField(
        blank=True, default='',
        help_text='Embedded Youtube/Vimeo URL. Takes priority over GIF if set.'
    )

    # Reward enhancements
    RARITY_CHOICES = (
        ('common', 'Common'),
        ('uncommon', 'Uncommon'),
        ('rare', 'Rare'),
        ('legendary', 'Legendary'),
    )
    rarity = models.CharField(max_length=12, choices=RARITY_CHOICES, default='common')
    reward_message = models.TextField(
        blank=True, default='',
        help_text='Custom message shown to user upon redemption.',
    )

    # Special reward behaviors
    is_rickroll = models.BooleanField(
        default=False,
        help_text='If True, redirects the user to Rick Astley after redemption.',
    )

    # Export tracking
    exported_to_pdf = models.BooleanField(default=False)

    # Status
    is_active = models.BooleanField(default=True)

    # Audit
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='created_eggs',
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        label = self.title or str(self.code_identifier)[:8]
        status = '✓' if self.is_redeemed else '○'
        return f"[{status}] {label} ({self.points} pts)"

    @property
    def gif(self):
        """Return the GIF URL, preferring uploaded file over URL field."""
        if self.gif_file:
            return self.gif_file.url
        return self.gif_url or None


class Redemption(models.Model):
    """Historical record of a user redeeming an egg."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        null=True, blank=True,
        on_delete=models.SET_NULL,
        related_name='redemptions',
    )
    egg = models.ForeignKey(
        EggQRCode,
        on_delete=models.CASCADE,
        related_name='redemption_records',
    )
    points_awarded = models.PositiveIntegerField()
    bonus_points_awarded = models.PositiveIntegerField(default=0)
    redeemed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-redeemed_at']
        unique_together = ('user', 'egg')

    def __str__(self):
        total = self.points_awarded + self.bonus_points_awarded
        return f"{self.user.username} → {self.egg} (+{total})"


class RewardLink(models.Model):
    """Linktree-style custom links that show up when a specific egg is scanned.
    Can optionally grant extra points when claimed. If is_unique_per_user is True,
    each user can earn points from this link at most once.
    """

    egg = models.ForeignKey(
        EggQRCode,
        on_delete=models.CASCADE,
        related_name='reward_links'
    )
    name = models.CharField(max_length=100)
    url = models.URLField()
    icon = models.CharField(
        max_length=50,
        blank=True, default='',
        help_text="e.g. 'whatsapp', 'groupme', 'instagram', 'linktree', 'discord', 'twitter', 'facebook', 'link'"
    )
    order = models.IntegerField(default=0)
    extra_points = models.PositiveIntegerField(
        default=0,
        help_text='Points awarded when user claims this link. 0 = no points.',
    )
    is_unique_per_user = models.BooleanField(
        default=False,
        help_text='If True, each user can earn points from this link at most once.',
    )

    class Meta:
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.name} for {self.egg.title or self.egg.code_identifier}"


class RewardLinkClaim(models.Model):
    """Records when a user has claimed a reward link (for unique links, one per user)."""

    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='reward_link_claims',
    )
    reward_link = models.ForeignKey(
        RewardLink,
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


@receiver(post_delete, sender=EggQRCode)
def auto_delete_file_on_delete(sender, instance, **kwargs):
    """
    Deletes the physical file from filesystem when corresponding `EggQRCode` object is deleted.
    """
    if instance.gif_file:
        if os.path.isfile(instance.gif_file.path):
            os.remove(instance.gif_file.path)
