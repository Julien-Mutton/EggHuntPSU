"""
Management command to seed the database with test data.
Usage: python manage.py seed
"""

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from eggs.models import EggQRCode
from rewards.models import Prize, SponsorOrganization

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed the database with test data (admin, users, eggs, prizes, sponsors).'

    def handle(self, *args, **options):
        self.stdout.write('🌱 Seeding database...\n')

        # ── Admin ────────────────────────────────────────────
        admin, created = User.objects.get_or_create(
            username='admin',
            defaults={
                'email': 'admin@egghunt.local',
                'role': 'adm',
                'total_points': 0,
            },
        )
        if created:
            admin.set_password('admin123')
            admin.save()
            self.stdout.write(self.style.SUCCESS('  ✓ Admin created (admin / admin123)'))
        else:
            self.stdout.write('  ⊘ Admin already exists')

        # ── Test Users ───────────────────────────────────────
        test_users = [
            ('alice', 'alice@egghunt.local', 'password123'),
            ('bob', 'bob@egghunt.local', 'password123'),
            ('charlie', 'charlie@egghunt.local', 'password123'),
        ]
        for uname, email, pwd in test_users:
            user, created = User.objects.get_or_create(
                username=uname,
                defaults={'email': email, 'role': 'user', 'total_points': 0},
            )
            if created:
                user.set_password(pwd)
                user.save()
                self.stdout.write(self.style.SUCCESS(f'  ✓ User "{uname}" created'))
            else:
                self.stdout.write(f'  ⊘ User "{uname}" already exists')

        # ── Test Eggs (with varied rarities) ─────────────────
        if EggQRCode.objects.count() == 0:
            eggs = []
            egg_configs = [
                {'title': 'Golden Egg', 'points': 100, 'label_text': '⭐ GOLDEN EGG ⭐',
                 'rarity': 'legendary', 'reward_message': '🎉 Incredible! You found the legendary Golden Egg!',
                 'show_gif': True, 'gif_url': 'https://media.giphy.com/media/3o7abKhOpu0NwenH3O/giphy.gif'},
                {'title': 'Silver Egg', 'points': 50, 'label_text': 'Silver Egg',
                 'rarity': 'rare', 'reward_message': 'Great find! This silver egg is a rare one.',
                 'show_gif': True, 'gif_url': 'https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif'},
                {'title': 'Bronze Egg', 'points': 25, 'label_text': 'Bronze Egg',
                 'rarity': 'uncommon'},
                {'title': 'Common Egg 1', 'points': 10, 'rarity': 'common'},
                {'title': 'Common Egg 2', 'points': 10, 'rarity': 'common'},
                {'title': 'Common Egg 3', 'points': 10, 'rarity': 'common'},
                {'title': 'Common Egg 4', 'points': 10, 'rarity': 'common'},
                {'title': 'Diamond Egg', 'points': 75, 'label_text': '💎 Rare Find!',
                 'rarity': 'rare', 'reward_message': 'A diamond egg! These are extremely hard to find.',
                 'show_gif': True, 'gif_url': 'https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif'},
                {'title': 'Uncommon Egg 1', 'points': 15, 'rarity': 'uncommon'},
                {'title': 'Uncommon Egg 2', 'points': 15, 'rarity': 'uncommon'},
            ]
            for cfg in egg_configs:
                eggs.append(EggQRCode(
                    title=cfg.get('title', ''),
                    points=cfg.get('points', 10),
                    label_text=cfg.get('label_text', ''),
                    show_gif=cfg.get('show_gif', False),
                    gif_url=cfg.get('gif_url', ''),
                    rarity=cfg.get('rarity', 'common'),
                    reward_message=cfg.get('reward_message', ''),
                    created_by=admin,
                ))
            EggQRCode.objects.bulk_create(eggs)
            self.stdout.write(self.style.SUCCESS(f'  ✓ {len(eggs)} test eggs created'))
        else:
            self.stdout.write(f'  ⊘ Eggs already exist ({EggQRCode.objects.count()} total)')

        # ── Prizes ───────────────────────────────────────────
        if Prize.objects.count() == 0:
            prizes = [
                Prize(
                    name='Egg Hunter Badge',
                    description='Awarded for collecting your first 25 points. Welcome to the hunt!',
                    points_required=25,
                ),
                Prize(
                    name='Egg Explorer Trophy',
                    description='You\'ve gathered 100 points! You\'re a true explorer.',
                    points_required=100,
                ),
                Prize(
                    name='Grand Champion Crown',
                    description='An incredible 250 points! You are the grand champion of the egg hunt!',
                    points_required=250,
                ),
            ]
            Prize.objects.bulk_create(prizes)
            self.stdout.write(self.style.SUCCESS(f'  ✓ {len(prizes)} prizes created'))
        else:
            self.stdout.write(f'  ⊘ Prizes already exist ({Prize.objects.count()} total)')

        # ── Sponsors ─────────────────────────────────────────
        if SponsorOrganization.objects.count() == 0:
            import os, shutil
            from django.conf import settings

            logos_dir = os.path.join(settings.MEDIA_ROOT, 'sponsor_logos')
            os.makedirs(logos_dir, exist_ok=True)

            base_dir = os.path.dirname(settings.BASE_DIR)
            sponsors_data = [
                {
                    'name': 'The Global Engagement Community',
                    'url': 'https://linktr.ee/TheGlobalEngagementCommunity',
                    'source_logo': os.path.join(base_dir, 'frontend', 'public', 'GEC_logo.png'),
                    'logo_filename': 'gec_logo.png',
                    'order': 1,
                },
                {
                    'name': 'Nittany AI Student Society',
                    'url': 'https://linktr.ee/colinruark1',
                    'source_logo': os.path.join(base_dir, 'Student Society.png'),
                    'logo_filename': 'nittany_ai_logo.png',
                    'order': 2,
                },
            ]
            for s in sponsors_data:
                logo_path = ''
                src = s['source_logo']
                if os.path.isfile(src):
                    dest = os.path.join(logos_dir, s['logo_filename'])
                    shutil.copy2(src, dest)
                    logo_path = f'sponsor_logos/{s["logo_filename"]}'

                SponsorOrganization.objects.create(
                    name=s['name'],
                    url=s['url'],
                    logo=logo_path,
                    order=s['order'],
                )
            self.stdout.write(self.style.SUCCESS(f'  ✓ {len(sponsors_data)} sponsors created'))
        else:
            self.stdout.write(f'  ⊘ Sponsors already exist ({SponsorOrganization.objects.count()} total)')

        self.stdout.write(self.style.SUCCESS('\n🎉 Seeding complete!'))
