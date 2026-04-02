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
GUILD_ID = 863475027214598173

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
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute('''
        CREATE TABLE IF NOT EXISTS member_stats (
            user_id BIGINT PRIMARY KEY,
            guild_id BIGINT,
            username VARCHAR(255),
            nickname VARCHAR(255),
            avatar_url VARCHAR(500),
            join_date TIMESTAMP,
            message_count INT DEFAULT 0,
            voice_time_seconds INT DEFAULT 0,
            last_updated TIMESTAMP DEFAULT NOW()
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS voice_sessions (
            id SERIAL PRIMARY KEY,
            user_id BIGINT,
            session_start TIMESTAMP,
            session_end TIMESTAMP,
            duration_seconds INT
        )
    ''')

    conn.commit()
    cur.close()
    conn.close()

@bot.event
async def on_ready():
    print(f'{bot.user} has connected to Discord!')
    init_database()

    # Sync commands with Discord
    try:
        synced = await bot.tree.sync()
        print(f"Synced {len(synced)} command(s)")
    except Exception as e:
        print(f"Error syncing commands: {e}")

    # Start voice tracking if not already running
    if not track_voice_activity.is_running():
        track_voice_activity.start()

@bot.event
async def on_message(message):
    print(f"[MESSAGE] {message.author} in #{message.channel}: {message.content[:50]}")

    if message.author == bot.user:
        print(f"[IGNORED] Message from bot itself")
        return

    try:
        # Track message count
        conn = get_db_connection()
        cur = conn.cursor()

        # Get member info from guild
        member = message.guild.get_member(message.author.id)
        nickname = member.nick if member and member.nick else None
        avatar_url = str(message.author.display_avatar.url) if message.author.display_avatar else None

        cur.execute('''
            INSERT INTO member_stats (user_id, guild_id, username, nickname, avatar_url, message_count, join_date, last_updated)
            VALUES (%s, %s, %s, %s, %s, 1, %s, NOW())
            ON CONFLICT (user_id) DO UPDATE SET
                message_count = member_stats.message_count + 1,
                username = %s,
                nickname = %s,
                avatar_url = %s,
                last_updated = NOW()
        ''', (message.author.id, message.guild.id, str(message.author), nickname, avatar_url, message.author.created_at, str(message.author), nickname, avatar_url))

        conn.commit()
        cur.close()
        conn.close()
        print(f"[TRACKED] {message.author} - message count updated")
    except Exception as e:
        print(f"[ERROR] Failed to track message: {e}")

    await bot.process_commands(message)

@bot.event
async def on_voice_state_update(member, before, after):
    conn = get_db_connection()
    cur = conn.cursor()

    # User joined voice channel
    if before.channel is None and after.channel is not None:
        cur.execute('''
            INSERT INTO voice_sessions (user_id, session_start)
            VALUES (%s, NOW())
        ''', (member.id,))
        conn.commit()

    # User left voice channel
    elif before.channel is not None and after.channel is None:
        cur.execute('''
            UPDATE voice_sessions
            SET session_end = NOW(),
                duration_seconds = EXTRACT(EPOCH FROM (NOW() - session_start))::INT
            WHERE user_id = %s AND session_end IS NULL
        ''', (member.id,))

        # Update total voice time
        cur.execute('''
            INSERT INTO member_stats (user_id, username, voice_time_seconds, join_date)
            SELECT user_id, %s, COALESCE(SUM(duration_seconds), 0), %s
            FROM voice_sessions WHERE user_id = %s
            ON CONFLICT (user_id) DO UPDATE SET
                voice_time_seconds = COALESCE(SUM(
                    (SELECT COALESCE(SUM(duration_seconds), 0) FROM voice_sessions WHERE user_id = %s)
                ), 0),
                last_updated = NOW()
        ''', (str(member), member.created_at, member.id, member.id))

        conn.commit()

    cur.close()
    conn.close()

@bot.tree.command(name="stats", description="View your member statistics")
async def stats(interaction: discord.Interaction):
    user_id = interaction.user.id

    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute('''
        SELECT user_id, username, nickname, avatar_url, message_count, voice_time_seconds, join_date
        FROM member_stats WHERE user_id = %s
    ''', (user_id,))

    stats_data = cur.fetchone()
    cur.close()
    conn.close()

    if not stats_data:
        await interaction.response.send_message("No statistics found for you yet.", ephemeral=True)
        return

    voice_hours = stats_data['voice_time_seconds'] // 3600
    voice_mins = (stats_data['voice_time_seconds'] % 3600) // 60
    display_name = stats_data['nickname'] or stats_data['username']

    embed = discord.Embed(title=f"{display_name}'s Statistics", color=discord.Color.blue())
    embed.add_field(name="Messages", value=stats_data['message_count'], inline=False)
    embed.add_field(name="Voice Time", value=f"{voice_hours}h {voice_mins}m", inline=False)
    embed.add_field(name="Member Since", value=stats_data['join_date'].strftime("%B %d, %Y"), inline=False)

    if stats_data['avatar_url']:
        embed.set_thumbnail(url=stats_data['avatar_url'])

    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="leaderboard", description="View the member leaderboard")
async def leaderboard(interaction: discord.Interaction):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    # Messages leaderboard
    cur.execute('''
        SELECT username, nickname, avatar_url, message_count FROM member_stats
        WHERE guild_id = %s
        ORDER BY message_count DESC LIMIT 10
    ''', (interaction.guild.id,))

    top_messages = cur.fetchall()

    # Voice time leaderboard
    cur.execute('''
        SELECT username, nickname, avatar_url, voice_time_seconds FROM member_stats
        WHERE guild_id = %s
        ORDER BY voice_time_seconds DESC LIMIT 10
    ''', (interaction.guild.id,))

    top_voice = cur.fetchall()

    cur.close()
    conn.close()

    embed = discord.Embed(title="Community Leaderboard", color=discord.Color.gold())

    # Messages leaderboard
    messages_text = "\n".join([f"{i+1}. {row['nickname'] or row['username']}: {row['message_count']} messages"
                               for i, row in enumerate(top_messages)])
    embed.add_field(name="🏆 Top Messagers", value=messages_text or "No data yet", inline=False)

    # Voice leaderboard
    voice_text = "\n".join([f"{i+1}. {row['nickname'] or row['username']}: {row['voice_time_seconds']//3600}h"
                            for i, row in enumerate(top_voice)])
    embed.add_field(name="🎤 Top Voice Chatters", value=voice_text or "No data yet", inline=False)

    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="profile", description="View a member's profile")
@discord.app_commands.describe(member="The member to view")
async def profile(interaction: discord.Interaction, member: discord.Member):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute('''
        SELECT user_id, username, nickname, avatar_url, message_count, voice_time_seconds, join_date
        FROM member_stats WHERE user_id = %s
    ''', (member.id,))

    stats_data = cur.fetchone()
    cur.close()
    conn.close()

    if not stats_data:
        await interaction.response.send_message(f"No statistics found for {member.mention}.", ephemeral=True)
        return

    voice_hours = stats_data['voice_time_seconds'] // 3600
    voice_mins = (stats_data['voice_time_seconds'] % 3600) // 60
    display_name = stats_data['nickname'] or stats_data['username']

    embed = discord.Embed(title=f"{display_name}'s Profile", color=discord.Color.purple())

    if stats_data['avatar_url']:
        embed.set_thumbnail(url=stats_data['avatar_url'])
    elif member.avatar:
        embed.set_thumbnail(url=member.avatar.url)

    embed.add_field(name="Username", value=stats_data['username'], inline=True)
    embed.add_field(name="Status", value=str(member.status), inline=True)
    embed.add_field(name="Messages", value=stats_data['message_count'], inline=True)
    embed.add_field(name="Voice Time", value=f"{voice_hours}h {voice_mins}m", inline=True)
    embed.add_field(name="Member Since", value=stats_data['join_date'].strftime("%B %d, %Y"), inline=False)

    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="oldest", description="View the oldest member in the server")
async def oldest(interaction: discord.Interaction):
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

@tasks.loop(minutes=30)
async def track_voice_activity():
    """Periodic task to sync voice activity"""
    conn = get_db_connection()
    cur = conn.cursor()

    # Update voice time for all members
    cur.execute('''
        UPDATE member_stats SET
            voice_time_seconds = (
                SELECT COALESCE(SUM(duration_seconds), 0)
                FROM voice_sessions WHERE user_id = member_stats.user_id
            ),
            last_updated = NOW()
    ''')

    conn.commit()
    cur.close()
    conn.close()

# Run bot
if __name__ == "__main__":
    bot.run(DISCORD_TOKEN)
