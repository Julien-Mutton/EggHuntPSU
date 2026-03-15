"""
URL configuration for the eggs app.
"""

from django.urls import path
from . import views
from . import management_views

urlpatterns = [
    # Admin endpoints
    path('admin/eggs/generate/', views.EggGenerateView.as_view(), name='egg-generate'),
    path('admin/eggs/export/', views.EggExportView.as_view(), name='egg-export'),
    path('admin/eggs/videos/', views.LocalVideoListView.as_view(), name='egg-videos'),
    path('admin/eggs/export/json/', management_views.EggExportJsonView.as_view(), name='egg-export-json'),
    path('admin/eggs/import/json/', management_views.EggImportJsonView.as_view(), name='egg-import-json'),
    path('admin/eggs/<int:pk>/reset/', views.EggResetView.as_view(), name='egg-reset'),
    path('admin/eggs/<int:pk>/', views.EggDetailView.as_view(), name='egg-detail'),
    path('admin/eggs/', views.EggListView.as_view(), name='egg-list'),
    path('admin/redemptions/', views.AdminRedemptionListView.as_view(), name='admin-redemptions'),

    # User endpoints
    path('redeem/<uuid:code_identifier>/', views.RedeemView.as_view(), name='redeem'),
    path('user/redemptions/', views.UserRedemptionListView.as_view(), name='user-redemptions'),

    # Public endpoints
    path('eggs/info/<uuid:code_identifier>/', views.EggInfoView.as_view(), name='egg-info'),
]
