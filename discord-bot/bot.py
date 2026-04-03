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
    conn = psycopg2.connect(DATABASE_URL)
    return conn

# Initialize database schema
def init_database():
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        # Create member_stats table with composite primary key for multi-guild support
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
                reaction_count INT DEFAULT 0,
                voice_time_seconds INT DEFAULT 0,
                last_updated TIMESTAMP DEFAULT NOW(),
                PRIMARY KEY (user_id, guild_id)
            )
        ''')

        # Add missing columns if they don't exist
        try:
            cur.execute('ALTER TABLE member_stats ADD COLUMN gif_count INT DEFAULT 0')
        except:
            pass

        try:
            cur.execute('ALTER TABLE member_stats ADD COLUMN reaction_count INT DEFAULT 0')
        except:
            pass

        # Create voice_sessions table with guild_id for proper tracking
        cur.execute('''
            CREATE TABLE IF NOT EXISTS voice_sessions (
                id SERIAL PRIMARY KEY,
                user_id BIGINT NOT NULL,
                guild_id BIGINT NOT NULL,
                session_start TIMESTAMP NOT NULL,
                session_end TIMESTAMP,
                duration_seconds INT
            )
        ''')

        # Create indexes for faster queries
        cur.execute('CREATE INDEX IF NOT EXISTS idx_member_stats_guild ON member_stats(guild_id)')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_voice_sessions_user ON voice_sessions(user_id)')
        cur.execute('CREATE INDEX IF NOT EXISTS idx_voice_sessions_guild ON voice_sessions(guild_id)')

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

    # Sync commands with Discord
    try:
        synced = await bot.tree.sync()
        print(f"[COMMANDS] Synced {len(synced)} command(s)")
    except Exception as e:
        print(f"[ERROR] Error syncing commands: {e}")

    # Start voice tracking if not already running
    if not track_voice_activity.is_running():
        track_voice_activity.start()
        print("[VOICE] Voice activity tracking started")

@bot.event
async def on_message(message):
    print(f"[MESSAGE] {message.author} in #{message.channel}: {message.content[:50]}")

    if message.author == bot.user:
        print(f"[IGNORED] Message from bot itself")
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

        # Check for gifs in content or attachments
        gif_count = 0
        if '.gif' in message.content.lower():
            gif_count = message.content.lower().count('.gif')
        for attachment in message.attachments:
            if attachment.filename.lower().endswith('.gif'):
                gif_count += 1

        # Upsert member stats with proper guild isolation
        cur.execute('''
            INSERT INTO member_stats (user_id, guild_id, username, nickname, avatar_url, message_count, gif_count, join_date, last_updated)
            VALUES (%s, %s, %s, %s, %s, 1, %s, %s, NOW())
            ON CONFLICT (user_id, guild_id) DO UPDATE SET
                message_count = member_stats.message_count + 1,
                gif_count = member_stats.gif_count + %s,
                username = %s,
                nickname = COALESCE(%s, member_stats.nickname),
                avatar_url = COALESCE(%s, member_stats.avatar_url),
                last_updated = NOW()
        ''', (message.author.id, message.guild.id, str(message.author), nickname, avatar_url, gif_count, message.author.created_at, gif_count, str(message.author), nickname, avatar_url))

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

            # Upsert member stats with proper voice time
            cur.execute('''
                INSERT INTO member_stats (user_id, guild_id, username, voice_time_seconds, join_date, last_updated)
                VALUES (%s, %s, %s, %s, %s, NOW())
                ON CONFLICT (user_id, guild_id) DO UPDATE SET
                    voice_time_seconds = %s,
                    last_updated = NOW()
            ''', (member.id, member.guild.id, str(member), total_voice_seconds, member.created_at, total_voice_seconds))

            conn.commit()
            print(f"[VOICE] {member} left voice in {member.guild.name} - Total: {total_voice_seconds}s")

        cur.close()
        conn.close()
    except Exception as e:
        print(f"[ERROR] Failed to track voice state: {e}")

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

        # Messages leaderboard
        cur.execute('''
            SELECT username, nickname, message_count FROM member_stats
            WHERE guild_id = %s AND message_count > 0
            ORDER BY message_count DESC LIMIT 10
        ''', (interaction.guild.id,))

        top_messages = cur.fetchall()

        # GIFs leaderboard
        cur.execute('''
            SELECT username, nickname, gif_count FROM member_stats
            WHERE guild_id = %s AND gif_count > 0
            ORDER BY gif_count DESC LIMIT 10
        ''', (interaction.guild.id,))

        top_gifs = cur.fetchall()

        # Reactions leaderboard
        cur.execute('''
            SELECT username, nickname, reaction_count FROM member_stats
            WHERE guild_id = %s AND reaction_count > 0
            ORDER BY reaction_count DESC LIMIT 10
        ''', (interaction.guild.id,))

        top_reactions = cur.fetchall()

        # Voice time leaderboard
        cur.execute('''
            SELECT username, nickname, voice_time_seconds FROM member_stats
            WHERE guild_id = %s AND voice_time_seconds > 0
            ORDER BY voice_time_seconds DESC LIMIT 10
        ''', (interaction.guild.id,))

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

        # Get all members and their join dates
        print(f"[IMPORT] Starting message history import for {interaction.guild.name}")
        await interaction.followup.send(f"📚 Starting history import for **{interaction.guild.name}**...")

        for member in interaction.guild.members:
            user_data[member.id] = {
                'username': str(member),
                'nickname': member.nick,
                'avatar_url': str(member.display_avatar.url) if member.display_avatar else None,
                'join_date': member.joined_at,
                'messages': 0,
                'gifs': 0,
                'reactions': 0
            }

        # Iterate through all channels
        total_messages = 0
        for channel in interaction.guild.text_channels:
            if not channel.permissions_for(interaction.guild.me).read_message_history:
                continue

            try:
                async for message in channel.history(limit=None):
                    total_messages += 1

                    # Track message
                    if message.author.id in user_data:
                        user_data[message.author.id]['messages'] += 1

                        # Count gifs
                        if '.gif' in message.content.lower():
                            user_data[message.author.id]['gifs'] += message.content.lower().count('.gif')
                        for attachment in message.attachments:
                            if attachment.filename.lower().endswith('.gif'):
                                user_data[message.author.id]['gifs'] += 1

                    # Track reactions
                    for reaction in message.reactions:
                        async for user in reaction.users():
                            if user.id in user_data:
                                user_data[user.id]['reactions'] += 1

                    # Progress update every 500 messages
                    if total_messages % 500 == 0:
                        print(f"[IMPORT] Processed {total_messages} messages...")

            except discord.Forbidden:
                print(f"[IMPORT] No permission to read history in #{channel.name}")
                continue

        # Insert/update all user data into database
        print(f"[IMPORT] Storing {len(user_data)} user records...")
        for user_id, data in user_data.items():
            cur.execute('''
                INSERT INTO member_stats (user_id, guild_id, username, nickname, avatar_url,
                                         message_count, gif_count, reaction_count, join_date, last_updated)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
                ON CONFLICT (user_id, guild_id) DO UPDATE SET
                    message_count = %s,
                    gif_count = %s,
                    reaction_count = %s,
                    username = %s,
                    nickname = COALESCE(%s, member_stats.nickname),
                    avatar_url = COALESCE(%s, member_stats.avatar_url),
                    last_updated = NOW()
            ''', (user_id, guild_id, data['username'], data['nickname'], data['avatar_url'],
                  data['messages'], data['gifs'], data['reactions'], data['join_date'],
                  data['messages'], data['gifs'], data['reactions'],
                  data['username'], data['nickname'], data['avatar_url']))

        conn.commit()
        cur.close()
        conn.close()

        print(f"[IMPORT] Import complete! Processed {total_messages} messages from {len(user_data)} users")

        embed = discord.Embed(title="✅ History Import Complete", color=discord.Color.green())
        embed.add_field(name="Total Messages Scanned", value=str(total_messages), inline=False)
        embed.add_field(name="Total Users Tracked", value=str(len(user_data)), inline=False)
        embed.add_field(name="Status", value="All member statistics have been loaded!", inline=False)

        await interaction.followup.send(embed=embed)

    except Exception as e:
        print(f"[ERROR] Import history failed: {e}")
        await interaction.followup.send(f"❌ Import failed: {str(e)}", ephemeral=True)

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
