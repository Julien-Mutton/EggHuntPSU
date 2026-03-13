import os
import django
from rest_framework.settings import api_settings

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "egghunt.settings")
django.setup()

from rest_framework.pagination import PageNumberPagination

class TestPaginator(PageNumberPagination):
    pass

p = TestPaginator()
print(f"PAGE_SIZE: {p.page_size}")
print(f"page_size_query_param: {p.page_size_query_param}")
print(f"max_page_size: {p.max_page_size}")
print(api_settings.user_settings)
