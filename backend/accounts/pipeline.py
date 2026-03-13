"""
Python Social Auth custom pipeline step.
Ensures OAuth-created accounts default to role 'user'.
"""


def set_default_role(backend, user, is_new=False, *args, **kwargs):
    """Set role to 'user' for newly created OAuth accounts."""
    if is_new:
        user.role = 'user'
        user.save(update_fields=['role'])
