"""
Python Social Auth custom pipeline steps.
Ensures OAuth-created accounts default to role 'user' and have lowercase usernames.
"""


def set_default_role(backend, user, is_new=False, *args, **kwargs):
    """Set role to 'user' for newly created OAuth accounts."""
    if is_new:
        user.role = 'user'
        user.save(update_fields=['role'])


def normalize_username(backend, details, user=None, *args, **kwargs):
    """Ensure the username from OAuth providers is stored lowercase."""
    if user and user.username != user.username.lower():
        user.username = user.username.lower()
        user.save(update_fields=['username'])
