import discord
from discord.ext import commands, tasks
import psycopg2
from psycopg2.extras import RealDictCursor
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')
DATABASE_URL = os.getenv('DATABASE_URL')
GUILD_ID = int(os.getenv('GUILD_ID', '863475027214598173'))

# Validate environment variables
if not DISCORD_TOKEN:
    raise ValueError("DISCORD_TOKEN environment variable is not set")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is not set")

# Initialize bot with intents
intents = discord.Intents.default()
intents.message_content = True
intents.members = True
intents.voice_states = True

bot = commands.Bot(command_prefix='/', intents=intents)

# Database connection
def get_db_connection():
    conn = psycopg2.connect(
        DATABASE_URL,
        keepalives=1,
        keepalives_idle=30,       # send keepalive after 30 s idle
        keepalives_interval=10,   # retry every 10 s
        keepalives_count=5,       # drop after 5 failed probes
    )
    return conn

def _ensure_connection(conn):
    """Return a live connection, reconnecting if the SSL link was dropped."""
    try:
        conn.cursor().execute('SELECT 1')
        return conn
    except Exception:
        try:
            conn.close()
        except Exception:
            pass
        return get_db_connection()

# Initialize database schema
def _safe_alter(cur, sql):
    """Run an ALTER TABLE using a savepoint so a failure doesn't abort the transaction."""
    cur.execute('SAVEPOINT safe_alter')
    try:
        cur.execute(sql)
        cur.execute('RELEASE SAVEPOINT safe_alter')
    except Exception:
        cur.execute('ROLLBACK TO SAVEPOINT safe_alter')

def init_database():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # ── member_stats ──────────────────────────────────────────────────────
        cur.execute('''
            CREATE TABLE IF NOT EXISTS member_stats (
                user_id BIGINT NOT NULL,
                guild_id BIGINT NOT NULL,
                username VARCHAR(255),
                nickname VARCHAR(255),
                avatar_url VARCHAR(500),
                join_date TIMESTAMP,
                message_count INT DEFAULT 0,
                gif_count INT DEFAULT 0,
                image_count INT DEFAULT 0,
                reaction_count INT DEFAULT 0,
                voice_time_seconds INT DEFAULT 0,
                last_updated TIMESTAMP DEFAULT NOW()
            )
        ''')
        _safe_alter(cur, 'ALTER TABLE member_stats ADD COLUMN gif_count INT DEFAULT 0')
        _safe_alter(cur, 'ALTER TABLE member_stats ADD COLUMN reaction_count INT DEFAULT 0')
        _safe_alter(cur, 'ALTER TABLE member_stats ADD COLUMN image_count INT DEFAULT 0')
        _safe_alter(cur, 'ALTER TABLE member_stats ADD COLUMN voice_time_seconds INT DEFAULT 0')
        _safe_alter(cur, 'ALTER TABLE member_stats ADD COLUMN last_updated TIMESTAMP DEFAULT NOW()')
        _safe_alter(cur, 'ALTER TABLE member_stats ADD COLUMN join_date TIMESTAMP')
        _safe_alter(cur, 'ALTER TABLE member_stats ADD COLUMN nickname VARCHAR(255)')
        _safe_alter(cur, 'ALTER TABLE member_stats ADD COLUMN avatar_url VARCHAR(500)')
        _safe_alter(cur, 'ALTER TABLE member_stats ADD COLUMN is_bot BOOLEAN DEFAULT FALSE')
        # Detect whether the existing PK is wrong (user_id-only instead of composite)
        cur.execute('''
            SELECT array_agg(a.attname::text) AS cols
            FROM pg_index i
            JOIN pg_class c  ON c.oid = i.indrelid
            JOIN pg_attribute a ON a.attrelid = c.oid AND a.attnum = ANY(i.indkey)
            WHERE c.relname = 'member_stats' AND i.indisprimary
        ''')
        pk_row = cur.fetchone()
        pk_cols = sorted(pk_row[0]) if pk_row and pk_row[0] else []
        # Backfill any NULL guild_ids left by old schema versions
        cur.execute('UPDATE member_stats SET guild_id = %s WHERE guild_id IS NULL', (GUILD_ID,))

        if pk_cols and pk_cols != sorted(['user_id', 'guild_id']):
            # Wrong PK — drop it, deduplicate, then add the correct composite PK
            print("[DATABASE] Migrating member_stats PK from user_id-only to (user_id, guild_id)")
            cur.execute('ALTER TABLE member_stats DROP CONSTRAINT member_stats_pkey')
            cur.execute('''
                DELETE FROM member_stats a USING member_stats b
                WHERE a.ctid < b.ctid
                  AND a.user_id = b.user_id AND a.guild_id = b.guild_id
            ''')
            cur.execute('ALTER TABLE member_stats ADD PRIMARY KEY (user_id, guild_id)')
        else:
            # Normal path — deduplicate then add PK if missing
            cur.execute('''
                DELETE FROM member_stats a USING member_stats b
                WHERE a.ctid < b.ctid
                  AND a.user_id = b.user_id AND a.guild_id = b.guild_id
            ''')
            _safe_alter(cur, 'ALTER TABLE member_stats ADD PRIMARY KEY (user_id, guild_id)')

        # ── message_reactions ─────────────────────────────────────────────────
        cur.execute('''
            CREATE TABLE IF NOT EXISTS message_reactions (
                message_id BIGINT NOT NULL,
                guild_id BIGINT NOT NULL,
                user_id BIGINT,
                username VARCHAR(255),
                nickname VARCHAR(255),
                avatar_url VARCHAR(500),
                message_content TEXT,
                reaction_count INT DEFAULT 0,
                last_updated TIMESTAMP DEFAULT NOW()
            )
        ''')
        _safe_alter(cur, 'ALTER TABLE message_reactions ADD COLUMN channel_id BIGINT')
        _safe_alter(cur, 'ALTER TABLE message_reactions ADD COLUMN last_updated TIMESTAMP DEFAULT NOW()')
        _safe_alter(cur, 'ALTER TABLE message_reactions ADD COLUMN user_id BIGINT')
        # Remove duplicates before adding PK
        cur.execute('''
            DELETE FROM message_reactions a USING message_reactions b
            WHERE a.ctid < b.ctid
              AND a.message_id = b.message_id AND a.guild_id = b.guild_id
        ''')
        _safe_alter(cur, 'ALTER TABLE message_reactions ADD PRIMARY KEY (message_id, guild_id)')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_message_reactions_guild ON message_reactions(guild_id)')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_message_reactions_count ON message_reactions(reaction_count DESC)')

        # ── voice_sessions ────────────────────────────────────────────────────
        cur.execute('''
            CREATE TABLE IF NOT EXISTS voice_sessions (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                guild_id BIGINT NOT NULL DEFAULT 0,
                session_start TIMESTAMP NOT NULL,
                session_end TIMESTAMP,
                duration_seconds INT
            )
        ''')
        _safe_alter(cur, 'ALTER TABLE voice_sessions ADD COLUMN guild_id BIGINT NOT NULL DEFAULT 0')

        # ── indexes ───────────────────────────────────────────────────────────
        cur.execute('CREATE INDEX IF NOT EXISTS idx_member_stats_guild ON member_stats(guild_id)')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_voice_sessions_user ON voice_sessions(user_id)')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_voice_sessions_guild ON voice_sessions(guild_id)')

        # Mark known excluded accounts so they never appear in leaderboards
        EXCLUDED_NAMES = [
            'AFK Bot#3192', 'Jockie Music#8158', 'Invite Tracker#0478',
            'Mudae#0807', 'Mr.Seal#4245', 'Moon Baiser#8784',
        ]
        cur.execute(
            'UPDATE member_stats SET is_bot = TRUE WHERE username = ANY(%s)',
            (EXCLUDED_NAMES,)
        )

        conn.commit()
        cur.close()
        conn.close()
        print("[DATABASE] Schema initialized successfully")
    except Exception as e:
        print(f"[ERROR] Failed to initialize database: {e}")
        raise

@bot.event
async def on_ready():
    print(f'{bot.user} has connected to Discord!')
    init_database()

    # Sync commands to the guild instantly (guild sync is immediate,
    # global sync can take up to an hour to propagate)
    try:
        guild_obj = discord.Object(id=GUILD_ID)
        bot.tree.copy_global_to(guild=guild_obj)
        synced = await bot.tree.sync(guild=guild_obj)
        print(f"[COMMANDS] Synced {len(synced)} command(s) to guild {GUILD_ID}")
    except Exception as e:
        print(f"[ERROR] Error syncing commands: {e}")

    # Start voice tracking if not already running
    if not track_voice_activity.is_running():
        track_voice_activity.start()
        print("[VOICE] Voice activity tracking started")

@bot.event
async def on_message(message):
    print(f"[MESSAGE] {message.author} in #{message.channel}: {message.content[:50]}")

    if message.author.bot:
        print(f"[IGNORED] Message from bot {message.author}")
        return

    # Ignore DMs - only track messages in guilds
    if not message.guild:
        print(f"[IGNORED] Direct message from {message.author}")
        return

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Get member info from guild
        member = message.guild.get_member(message.author.id)
        nickname = member.nick if member and member.nick else None
        avatar_url = str(message.author.display_avatar.url) if message.author.display_avatar else None
        # Use server join date, not Discord account creation date
        join_date = member.joined_at if member and member.joined_at else message.author.created_at

        # Check for gifs and images in content, attachments, and embeds (Tenor/Giphy)
        gif_count = 0
        image_count = 0
        IMAGE_EXTS = ('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff')
        if '.gif' in message.content.lower():
            gif_count = message.content.lower().count('.gif')
        for attachment in message.attachments:
            fname = attachment.filename.lower()
            if fname.endswith('.gif'):
                gif_count += 1
            elif fname.endswith(IMAGE_EXTS):
                image_count += 1
        # Count Tenor/Giphy GIFs sent as embeds
        for embed in message.embeds:
            url = (embed.url or '').lower()
            proxy = (embed.thumbnail.proxy_url if embed.thumbnail else '') or ''
            if 'tenor.com' in url or 'giphy.com' in url or proxy.endswith('.gif'):
                gif_count += 1

        # Atomic upsert — single statement, no race condition
        cur.execute('''
            INSERT INTO member_stats (user_id, guild_id, username, nickname, avatar_url,
                                     message_count, gif_count, image_count, join_date, is_bot, last_updated)
            VALUES (%s, %s, %s, %s, %s, 1, %s, %s, %s, FALSE, NOW())
            ON CONFLICT (user_id, guild_id) DO UPDATE SET
                message_count = member_stats.message_count + 1,
                gif_count     = member_stats.gif_count + EXCLUDED.gif_count,
                image_count   = member_stats.image_count + EXCLUDED.image_count,
                username      = EXCLUDED.username,
                nickname      = COALESCE(EXCLUDED.nickname, member_stats.nickname),
                avatar_url    = COALESCE(EXCLUDED.avatar_url, member_stats.avatar_url),
                is_bot        = FALSE,
                last_updated  = NOW()
        ''', (message.author.id, message.guild.id, str(message.author), nickname, avatar_url,
              gif_count, image_count, join_date))

        conn.commit()
        cur.close()
        conn.close()
        print(f"[TRACKED] {message.author} in {message.guild.name} - message count updated")
    except Exception as e:
        print(f"[ERROR] Failed to track message: {e}")

    await bot.process_commands(message)

@bot.event
async def on_voice_state_update(member, before, after):
    # Ignore if no guild context
    if not member.guild:
        return

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # User joined voice channel
        if before.channel is None and after.channel is not None:
            cur.execute('''
                INSERT INTO voice_sessions (user_id, guild_id, session_start)
                VALUES (%s, %s, NOW())
            ''', (member.id, member.guild.id))
            conn.commit()
            print(f"[VOICE] {member} joined voice in {member.guild.name}")

        # User left voice channel
        elif before.channel is not None and after.channel is None:
            # Update session end time
            cur.execute('''
                UPDATE voice_sessions
                SET session_end = NOW(),
                    duration_seconds = EXTRACT(EPOCH FROM (NOW() - session_start))::INT
                WHERE user_id = %s AND guild_id = %s AND session_end IS NULL
            ''', (member.id, member.guild.id))

            # Calculate total voice time for this user in this guild
            cur.execute('''
                SELECT COALESCE(SUM(duration_seconds), 0) as total_seconds
                FROM voice_sessions
                WHERE user_id = %s AND guild_id = %s
            ''', (member.id, member.guild.id))

            result = cur.fetchone()
            total_voice_seconds = result[0] if result else 0

            voice_join_date = member.joined_at if member.joined_at else member.created_at
            cur.execute('''
                UPDATE member_stats SET voice_time_seconds = %s, last_updated = NOW()
                WHERE user_id = %s AND guild_id = %s
            ''', (total_voice_seconds, member.id, member.guild.id))
            if cur.rowcount == 0:
                cur.execute('''
                    INSERT INTO member_stats (user_id, guild_id, username, voice_time_seconds, join_date, last_updated)
                    VALUES (%s, %s, %s, %s, %s, NOW())
                ''', (member.id, member.guild.id, str(member), total_voice_seconds, voice_join_date))

            conn.commit()
            print(f"[VOICE] {member} left voice in {member.guild.name} - Total: {total_voice_seconds}s")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"[ERROR] Failed to track voice state: {e}")

@bot.event
async def on_reaction_add(reaction, user):
    if user.bot:
        return
    if not reaction.message.guild:
        return

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        guild_id = reaction.message.guild.id
        message = reaction.message
        member = reaction.message.guild.get_member(user.id)
        nickname = member.nick if member and member.nick else None
        avatar_url = str(user.display_avatar.url) if user.display_avatar else None

        reaction_join_date = member.joined_at if member and member.joined_at else user.created_at
        cur.execute('''
            UPDATE member_stats SET reaction_count = reaction_count + 1, last_updated = NOW()
            WHERE user_id = %s AND guild_id = %s
        ''', (user.id, guild_id))
        if cur.rowcount == 0:
            cur.execute('''
                INSERT INTO member_stats (user_id, guild_id, username, nickname, avatar_url, reaction_count, join_date, last_updated)
                VALUES (%s, %s, %s, %s, %s, 1, %s, NOW())
            ''', (user.id, guild_id, str(user), nickname, avatar_url, reaction_join_date))

        # Track total reactions on the message itself
        total_reactions = sum(r.count for r in message.reactions)
        msg_content = message.content[:500] if message.content else None
        msg_author = reaction.message.guild.get_member(message.author.id)
        author_nick = msg_author.nick if msg_author and msg_author.nick else None
        author_avatar = str(message.author.display_avatar.url) if message.author.display_avatar else None

        cur.execute('''
            UPDATE message_reactions SET reaction_count = %s, last_updated = NOW()
            WHERE message_id = %s AND guild_id = %s
        ''', (total_reactions, message.id, guild_id))
        if cur.rowcount == 0:
            cur.execute('''
                INSERT INTO message_reactions (message_id, guild_id, channel_id, user_id, username, nickname, avatar_url, message_content, reaction_count, last_updated)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ''', (message.id, guild_id, message.channel.id, message.author.id, str(message.author), author_nick, author_avatar, msg_content, total_reactions))

        conn.commit()
        cur.close()
        conn.close()
        print(f"[REACTION] {user} reacted in {reaction.message.guild.name}")
    except Exception as e:
        print(f"[ERROR] Failed to track reaction add: {e}")

@bot.event
async def on_reaction_remove(reaction, user):
    if user.bot:
        return
    if not reaction.message.guild:
        return

    try:
        conn = get_db_connection()
        cur = conn.cursor()

        guild_id = reaction.message.guild.id
        message = reaction.message

        # Decrement reaction_count for the user who removed the reaction
        cur.execute('''
            UPDATE member_stats SET
                reaction_count = GREATEST(reaction_count - 1, 0),
                last_updated = NOW()
            WHERE user_id = %s AND guild_id = %s
        ''', (user.id, guild_id))

        # Update total reactions on the message
        total_reactions = sum(r.count for r in message.reactions)
        cur.execute('''
            UPDATE message_reactions SET
                reaction_count = %s,
                last_updated = NOW()
            WHERE message_id = %s AND guild_id = %s
        ''', (total_reactions, message.id, guild_id))

        conn.commit()
        cur.close()
        conn.close()
        print(f"[REACTION] {user} removed reaction in {reaction.message.guild.name}")
    except Exception as e:
        print(f"[ERROR] Failed to track reaction remove: {e}")

@bot.tree.command(name="stats", description="View your member statistics")
async def stats(interaction: discord.Interaction):
    try:
        user_id = interaction.user.id
        guild_id = interaction.guild.id

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute('''
            SELECT user_id, username, nickname, avatar_url, message_count, gif_count, reaction_count, voice_time_seconds, join_date
            FROM member_stats WHERE user_id = %s AND guild_id = %s
        ''', (user_id, guild_id))

        stats_data = cur.fetchone()
        cur.close()
        conn.close()

        if not stats_data:
            await interaction.response.send_message("No statistics found for you yet.", ephemeral=True)
            return

        voice_hours = stats_data['voice_time_seconds'] // 3600
        voice_mins = (stats_data['voice_time_seconds'] % 3600) // 60
        display_name = stats_data['nickname'] or stats_data['username']

        # Calculate member tenure
        if stats_data['join_date']:
            days_member = (datetime.now(stats_data['join_date'].tzinfo) - stats_data['join_date']).days
        else:
            days_member = 0

        embed = discord.Embed(title=f"{display_name}'s Statistics", color=discord.Color.blue())
        embed.add_field(name="Messages", value=stats_data['message_count'], inline=True)
        embed.add_field(name="GIFs Sent", value=stats_data['gif_count'], inline=True)
        embed.add_field(name="Reactions", value=stats_data['reaction_count'], inline=True)
        embed.add_field(name="Voice Time", value=f"{voice_hours}h {voice_mins}m", inline=True)
        embed.add_field(name="Member Since", value=stats_data['join_date'].strftime("%B %d, %Y") if stats_data['join_date'] else "Unknown", inline=True)
        embed.add_field(name="Days in Server", value=str(days_member), inline=True)

        if stats_data['avatar_url']:
            embed.set_thumbnail(url=stats_data['avatar_url'])

        await interaction.response.send_message(embed=embed)
    except Exception as e:
        print(f"[ERROR] /stats command failed: {e}")
        await interaction.response.send_message("Failed to retrieve statistics.", ephemeral=True)

@bot.tree.command(name="leaderboard", description="View the member leaderboard")
async def leaderboard(interaction: discord.Interaction):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        g = interaction.guild.id

        cur.execute('''SELECT username, nickname, message_count FROM member_stats
            WHERE guild_id = %s AND message_count > 0 AND is_bot IS NOT TRUE
            ORDER BY message_count DESC LIMIT 10''', (g,))
        top_messages = cur.fetchall()

        cur.execute('''SELECT username, nickname, gif_count FROM member_stats
            WHERE guild_id = %s AND gif_count > 0 AND is_bot IS NOT TRUE
            ORDER BY gif_count DESC LIMIT 10''', (g,))
        top_gifs = cur.fetchall()

        cur.execute('''SELECT username, nickname, reaction_count FROM member_stats
            WHERE guild_id = %s AND reaction_count > 0 AND is_bot IS NOT TRUE
            ORDER BY reaction_count DESC LIMIT 10''', (g,))
        top_reactions = cur.fetchall()

        cur.execute('''SELECT username, nickname, voice_time_seconds FROM member_stats
            WHERE guild_id = %s AND voice_time_seconds > 0 AND is_bot IS NOT TRUE
            ORDER BY voice_time_seconds DESC LIMIT 10''', (g,))
        top_voice = cur.fetchall()

        cur.close()
        conn.close()

        embed = discord.Embed(title="Community Leaderboard", color=discord.Color.gold())

        # Messages leaderboard
        messages_text = "\n".join([f"{i+1}. {row['nickname'] or row['username']}: {row['message_count']} messages"
                                   for i, row in enumerate(top_messages)])
        embed.add_field(name="💬 Top Messagers", value=messages_text or "No data yet", inline=False)

        # GIFs leaderboard
        gifs_text = "\n".join([f"{i+1}. {row['nickname'] or row['username']}: {row['gif_count']} GIFs"
                               for i, row in enumerate(top_gifs)])
        embed.add_field(name="🎬 GIF Masters", value=gifs_text or "No data yet", inline=False)

        # Reactions leaderboard
        reactions_text = "\n".join([f"{i+1}. {row['nickname'] or row['username']}: {row['reaction_count']} reactions"
                                    for i, row in enumerate(top_reactions)])
        embed.add_field(name="⭐ Reaction Kings", value=reactions_text or "No data yet", inline=False)

        # Voice leaderboard
        voice_text = "\n".join([f"{i+1}. {row['nickname'] or row['username']}: {row['voice_time_seconds']//3600}h"
                                for i, row in enumerate(top_voice)])
        embed.add_field(name="🎤 Top Voice Chatters", value=voice_text or "No data yet", inline=False)

        await interaction.response.send_message(embed=embed)
    except Exception as e:
        print(f"[ERROR] /leaderboard command failed: {e}")
        await interaction.response.send_message("Failed to retrieve leaderboard.", ephemeral=True)

@bot.tree.command(name="profile", description="View a member's profile")
@discord.app_commands.describe(member="The member to view")
async def profile(interaction: discord.Interaction, member: discord.Member):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute('''
            SELECT user_id, username, nickname, avatar_url, message_count, gif_count, reaction_count, voice_time_seconds, join_date
            FROM member_stats WHERE user_id = %s AND guild_id = %s
        ''', (member.id, interaction.guild.id))

        stats_data = cur.fetchone()
        cur.close()
        conn.close()

        if not stats_data:
            await interaction.response.send_message(f"No statistics found for {member.mention}.", ephemeral=True)
            return

        voice_hours = stats_data['voice_time_seconds'] // 3600
        voice_mins = (stats_data['voice_time_seconds'] % 3600) // 60
        display_name = stats_data['nickname'] or stats_data['username']

        # Calculate member tenure
        if stats_data['join_date']:
            days_member = (datetime.now(stats_data['join_date'].tzinfo) - stats_data['join_date']).days
        else:
            days_member = 0

        embed = discord.Embed(title=f"{display_name}'s Profile", color=discord.Color.purple())

        if stats_data['avatar_url']:
            embed.set_thumbnail(url=stats_data['avatar_url'])
        elif member.avatar:
            embed.set_thumbnail(url=member.avatar.url)

        embed.add_field(name="Username", value=stats_data['username'], inline=True)
        embed.add_field(name="Status", value=str(member.status), inline=True)
        embed.add_field(name="Messages", value=stats_data['message_count'], inline=True)
        embed.add_field(name="GIFs Sent", value=stats_data['gif_count'], inline=True)
        embed.add_field(name="Reactions", value=stats_data['reaction_count'], inline=True)
        embed.add_field(name="Voice Time", value=f"{voice_hours}h {voice_mins}m", inline=True)
        embed.add_field(name="Member Since", value=stats_data['join_date'].strftime("%B %d, %Y") if stats_data['join_date'] else "Unknown", inline=True)
        embed.add_field(name="Days in Server", value=str(days_member), inline=True)

        await interaction.response.send_message(embed=embed)
    except Exception as e:
        print(f"[ERROR] /profile command failed: {e}")
        await interaction.response.send_message("Failed to retrieve profile.", ephemeral=True)

@bot.tree.command(name="oldest", description="View the oldest member in the server")
async def oldest(interaction: discord.Interaction):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute('''
            SELECT username, nickname, avatar_url, join_date FROM member_stats
            WHERE guild_id = %s
            ORDER BY join_date ASC LIMIT 1
        ''', (interaction.guild.id,))

        oldest_member = cur.fetchone()
        cur.close()
        conn.close()

        if not oldest_member:
            await interaction.response.send_message("No member data available.", ephemeral=True)
            return

        display_name = oldest_member['nickname'] or oldest_member['username']

        embed = discord.Embed(title="👑 Oldest Member", color=discord.Color.green())
        embed.add_field(name="Member", value=display_name, inline=False)
        embed.add_field(name="Username", value=oldest_member['username'], inline=True)
        embed.add_field(name="Joined", value=oldest_member['join_date'].strftime("%B %d, %Y"), inline=True)

        if oldest_member['avatar_url']:
            embed.set_thumbnail(url=oldest_member['avatar_url'])

        await interaction.response.send_message(embed=embed)
    except Exception as e:
        print(f"[ERROR] /oldest command failed: {e}")
        await interaction.response.send_message("Failed to retrieve oldest member.", ephemeral=True)

@bot.tree.command(name="import-history", description="Import message history (Admin only)")
@discord.app_commands.checks.has_permissions(administrator=True)
async def import_history(interaction: discord.Interaction):
    """Fetch and process all historical messages from all channels"""
    try:
        await interaction.response.defer()

        guild_id = interaction.guild.id
        conn = get_db_connection()
        cur = conn.cursor()

        # Initialize user data dict
        user_data = {}

        print(f"[IMPORT] Starting message history import for {interaction.guild.name}")

        for member in interaction.guild.members:
            user_data[member.id] = {
                'username': str(member),
                'nickname': member.nick,
                'avatar_url': str(member.display_avatar.url) if member.display_avatar else None,
                'join_date': member.joined_at,
                'is_bot': member.bot,
                'messages': 0,
                'gifs': 0,
                'images': 0,
                'reactions': 0
            }

        # Track message reaction counts for message_reactions table
        message_reaction_data = {}
        reaction_errors = 0

        total_messages = 0
        IMAGE_EXTS = ('.png', '.jpg', '.jpeg', '.webp', '.bmp', '.tiff')

        # Pre-count accessible channels for the progress bar
        accessible_channels = [ch for ch in interaction.guild.text_channels
                                if ch.permissions_for(interaction.guild.me).read_message_history]
        total_channels = len(accessible_channels)
        channels_done = 0
        skipped_channels = []

        def _bar(done, total, width=12):
            filled = int(width * done / max(total, 1))
            return '█' * filled + '░' * (width - filled)

        # Send ONE progress message — edited in place throughout the import
        progress_msg = await interaction.followup.send(
            f"📊 **Import started** — {total_channels} channels to scan\n"
            f"`[{'░' * 12}]` 0%  •  0 messages"
        )

        for channel in accessible_channels:
            channel_count = 0
            try:
                async for message in channel.history(limit=None):
                    total_messages += 1
                    channel_count += 1

                    if message.author.id in user_data:
                        user_data[message.author.id]['messages'] += 1

                        if '.gif' in message.content.lower():
                            user_data[message.author.id]['gifs'] += message.content.lower().count('.gif')
                        for attachment in message.attachments:
                            fname = attachment.filename.lower()
                            if fname.endswith('.gif'):
                                user_data[message.author.id]['gifs'] += 1
                            elif fname.endswith(IMAGE_EXTS):
                                user_data[message.author.id]['images'] += 1
                        for embed in message.embeds:
                            url = (embed.url or '').lower()
                            proxy = (embed.thumbnail.proxy_url if embed.thumbnail else '') or ''
                            if 'tenor.com' in url or 'giphy.com' in url or proxy.endswith('.gif'):
                                user_data[message.author.id]['gifs'] += 1

                    total_msg_reactions = sum(r.count for r in message.reactions)
                    if total_msg_reactions > 0 and message.author.id in user_data:
                        author_data = user_data[message.author.id]
                        message_reaction_data[message.id] = {
                            'guild_id': guild_id,
                            'channel_id': channel.id,
                            'user_id': message.author.id,
                            'username': author_data['username'],
                            'nickname': author_data['nickname'],
                            'avatar_url': author_data['avatar_url'],
                            'message_content': message.content[:500] if message.content else None,
                            'reaction_count': total_msg_reactions,
                        }

            except discord.Forbidden:
                skipped_channels.append(channel.name)
                print(f"[IMPORT] No permission to read history in #{channel.name}")
                continue
            except Exception as e:
                print(f"[IMPORT] Error in #{channel.name}: {e}")
                continue

            channels_done += 1
            pct = int(100 * channels_done / max(total_channels, 1))
            bar = _bar(channels_done, total_channels)
            print(f"[IMPORT] #{channel.name}: {channel_count} messages ({pct}%)")
            try:
                await progress_msg.edit(content=(
                    f"📊 **Importing...** ({channels_done}/{total_channels} channels)\n"
                    f"`[{bar}]` {pct}%  •  {total_messages:,} messages\n"
                    f"✅ #{channel.name} — {channel_count:,} msgs"
                ))
            except Exception:
                pass  # token expired — keep going, data is still saving

            # Commit per-channel; each row gets its own savepoint so one bad row never aborts the batch
            if message_reaction_data:
                # Reconnect if the SSL link was dropped during the channel.history() fetch
                conn = _ensure_connection(conn)
                cur = conn.cursor(cursor_factory=RealDictCursor)
                for message_id, data in message_reaction_data.items():
                    cur.execute('''
                        UPDATE message_reactions SET reaction_count = %s, last_updated = NOW()
                        WHERE message_id = %s AND guild_id = %s
                    ''', (data['reaction_count'], message_id, data['guild_id']))
                    if cur.rowcount == 0:
                        cur.execute('''
                            INSERT INTO message_reactions (message_id, guild_id, channel_id, user_id, username, nickname, avatar_url, message_content, reaction_count, last_updated)
                            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                        ''', (message_id, data['guild_id'], data['channel_id'], data['user_id'],
                              data['username'], data['nickname'], data['avatar_url'],
                              data['message_content'], data['reaction_count']))
                conn.commit()
                message_reaction_data.clear()

        # Insert/update all user stats (per-row savepoints)
        print(f"[IMPORT] Storing {len(user_data)} user records...")
        conn = _ensure_connection(conn)
        cur = conn.cursor(cursor_factory=RealDictCursor)
        stat_errors = 0
        for user_id, data in user_data.items():
            try:
                cur.execute('''
                    UPDATE member_stats SET
                        message_count = GREATEST(message_count, %s),
                        gif_count     = %s,
                        image_count   = %s,
                        username      = %s,
                        nickname      = COALESCE(%s, nickname),
                        avatar_url    = COALESCE(%s, avatar_url),
                        is_bot        = %s,
                        last_updated  = NOW()
                    WHERE user_id = %s AND guild_id = %s
                ''', (data['messages'], data['gifs'], data['images'],
                      data['username'], data['nickname'], data['avatar_url'],
                      data['is_bot'], user_id, guild_id))
                if cur.rowcount == 0:
                    cur.execute('''
                        INSERT INTO member_stats (user_id, guild_id, username, nickname, avatar_url,
                                                 message_count, gif_count, image_count, reaction_count, join_date, is_bot, last_updated)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                    ''', (user_id, guild_id, data['username'], data['nickname'], data['avatar_url'],
                          data['messages'], data['gifs'], data['images'], data['reactions'], data['join_date'], data['is_bot']))
            except Exception as row_err:
                stat_errors += 1
                if stat_errors <= 3:
                    print(f"[IMPORT] Skipped stat row for {user_id}: {row_err}")

        conn.commit()
        cur.close()
        conn.close()

        print(f"[IMPORT] Import complete! Processed {total_messages} messages from {len(user_data)} users")

        embed = discord.Embed(title="✅ History Import Complete", color=discord.Color.green())
        embed.add_field(name="Messages Scanned", value=f"{total_messages:,}", inline=True)
        embed.add_field(name="Users Tracked", value=str(len(user_data)), inline=True)
        embed.add_field(name="Channels Scanned", value=str(channels_done), inline=True)
        if stat_errors or reaction_errors:
            embed.add_field(name="Skipped Rows", value=f"{stat_errors} stats · {reaction_errors} reactions", inline=False)
        if skipped_channels:
            embed.add_field(name="Skipped Channels", value=", ".join(f"#{c}" for c in skipped_channels[:10]), inline=False)
        embed.add_field(name="Status", value="All member statistics have been loaded!", inline=False)

        try:
            # Edit the progress message into the final result embed
            await progress_msg.edit(content=None, embed=embed)
        except Exception:
            print("[IMPORT] Note: interaction token expired before completion embed. Data was saved successfully.")

    except Exception as e:
        print(f"[ERROR] Import history failed: {e}")
        try:
            await interaction.followup.send(f"❌ Import failed: {str(e)}", ephemeral=True)
        except Exception:
            # Interaction token expired (15-min limit) — error already logged above
            print("[IMPORT] Could not send error to Discord (interaction token expired).")

@bot.tree.command(name="verify-schema", description="Check and repair the database schema (Admin only)")
@discord.app_commands.checks.has_permissions(administrator=True)
async def verify_schema(interaction: discord.Interaction):
    """Re-run all schema migrations without restarting the bot"""
    await interaction.response.defer(ephemeral=True)
    try:
        init_database()
        await interaction.followup.send("✅ Schema verified and repaired. Safe to run `/import-history` now.", ephemeral=True)
    except Exception as e:
        await interaction.followup.send(f"❌ Schema repair failed: {str(e)}", ephemeral=True)

@bot.tree.command(name="fix-join-dates", description="Fix join dates to use server join date (Admin only)")
@discord.app_commands.checks.has_permissions(administrator=True)
async def fix_join_dates(interaction: discord.Interaction):
    """Correct any join_dates that were incorrectly set to Discord account creation date"""
    try:
        await interaction.response.defer()

        conn = get_db_connection()
        cur = conn.cursor()
        fixed = 0

        for member in interaction.guild.members:
            if not member.joined_at:
                continue
            cur.execute('''
                UPDATE member_stats SET join_date = %s, last_updated = NOW()
                WHERE user_id = %s AND guild_id = %s
            ''', (member.joined_at, member.id, interaction.guild.id))
            if cur.rowcount > 0:
                fixed += 1

        conn.commit()
        cur.close()
        conn.close()

        embed = discord.Embed(title="✅ Join Dates Fixed", color=discord.Color.green())
        embed.add_field(name="Members Updated", value=str(fixed), inline=False)
        embed.add_field(name="Status", value="All join dates now reflect server join date, not Discord account creation.", inline=False)
        await interaction.followup.send(embed=embed)

    except Exception as e:
        print(f"[ERROR] fix-join-dates failed: {e}")
        await interaction.followup.send(f"❌ Failed: {str(e)}", ephemeral=True)

@tasks.loop(minutes=30)
async def track_voice_activity():
    """Periodic task to sync voice activity - recalculates voice time for all members"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Update voice time for all members based on voice_sessions
        cur.execute('''
            UPDATE member_stats SET
                voice_time_seconds = (
                    SELECT COALESCE(SUM(duration_seconds), 0)
                    FROM voice_sessions
                    WHERE user_id = member_stats.user_id
                    AND guild_id = member_stats.guild_id
                ),
                last_updated = NOW()
            WHERE EXISTS (
                SELECT 1 FROM voice_sessions
                WHERE user_id = member_stats.user_id
                AND guild_id = member_stats.guild_id
            )
        ''')

        conn.commit()
        cur.close()
        conn.close()
        print(f"[VOICE] Voice activity sync completed")
    except Exception as e:
        print(f"[ERROR] Voice activity tracking failed: {e}")

# Run bot
if __name__ == "__main__":
    if not DISCORD_TOKEN:
        print("[ERROR] DISCORD_TOKEN not set. Cannot start bot.")
        exit(1)
    bot.run(DISCORD_TOKEN)
