"""
Rename EggLink to RewardLink with updated fields and related_name.
"""

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('eggs', '0003_eggqrcode_video_url_egglink'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='EggLink',
            new_name='RewardLink',
        ),
        migrations.AlterField(
            model_name='rewardlink',
            name='egg',
            field=models.ForeignKey(
                on_delete=django.db.models.deletion.CASCADE,
                related_name='reward_links',
                to='eggs.eggqrcode',
            ),
        ),
        migrations.AlterField(
            model_name='rewardlink',
            name='icon',
            field=models.CharField(
                blank=True,
                default='',
                help_text="e.g. 'whatsapp', 'groupme', 'instagram', 'linktree', 'discord', 'twitter', 'facebook', 'link'",
                max_length=50,
            ),
        ),
        migrations.AlterField(
            model_name='rewardlink',
            name='order',
            field=models.IntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='rewardlink',
            name='url',
            field=models.URLField(),
        ),
        migrations.RemoveField(
            model_name='rewardlink',
            name='created_at',
        ),
        migrations.AlterModelOptions(
            name='rewardlink',
            options={'ordering': ['order', 'id']},
        ),
    ]
