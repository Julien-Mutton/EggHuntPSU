"""
Custom User model for the Egg Hunt application.
Two roles: 'adm' (admin) and 'user' (participant).
"""

from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    ROLE_CHOICES = (
        ('adm', 'Admin'),
        ('user', 'User'),
    )

    role = models.CharField(max_length=4, choices=ROLE_CHOICES, default='user')
    total_points = models.IntegerField(default=0)

    class Meta:
        ordering = ['-total_points']

    def __str__(self):
        return f"{self.username} ({self.get_role_display()}) — {self.total_points} pts"

    @property
    def is_admin(self):
        return self.role == 'adm'
