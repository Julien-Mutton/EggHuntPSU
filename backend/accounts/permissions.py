"""
Custom permissions for EggHunt.
"""

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Only allow users with role='adm'."""

    def has_permission(self, request, view):
        return (
            request.user
            and request.user.is_authenticated
            and request.user.role == 'adm'
        )
