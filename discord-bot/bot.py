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

# Debug: Check if environment variables are loaded
print(f"DISCORD_TOKEN loaded: {'Yes' if DISCORD_TOKEN else 'No - MISSING'}")
print(f"DATABASE_URL loaded: {'Yes' if DATABASE_URL else 'No - MISSING'}")

if not DISCORD_TOKEN:
    raise ValueError("ERROR: DISCORD_TOKEN environment variable not set!")
if not DATABASE_URL:
    raise ValueError("ERROR: DATABASE_URL environment variable not set!")

# Initialize bot with intents - explicitly enable all needed intents
intents = discord.Intents.all()

bot = commands.Bot(command_prefix='/', intents=intents)

print(f"[STARTUP] Bot created with intents.message_content={intents.message_content}")

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

    cur.execute('''
        CREATE TABLE IF NOT EXISTS message_media (
            id SERIAL PRIMARY KEY,
            user_id BIGINT,
            guild_id BIGINT,
            message_id BIGINT,
            username VARCHAR(255),
            nickname VARCHAR(255),
            avatar_url VARCHAR(500),
            media_type VARCHAR(50),
            message_content TEXT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS message_reactions (
            id SERIAL PRIMARY KEY,
            user_id BIGINT,
            guild_id BIGINT,
            message_id BIGINT,
            username VARCHAR(255),
            nickname VARCHAR(255),
            avatar_url VARCHAR(500),
            message_content TEXT,
            reaction_count INT,
            created_at TIMESTAMP DEFAULT NOW()
        )
    ''')

    cur.execute('''
        CREATE TABLE IF NOT EXISTS member_stats (
            user_id BIGINT,
            guild_id BIGINT,
            PRIMARY KEY (user_id, guild_id),
            username VARCHAR(255),
            nickname VARCHAR(255),
            avatar_url VARCHAR(500),
            join_date TIMESTAMP,
            message_count INT DEFAULT 0,
            gif_count INT DEFAULT 0,
            image_count INT DEFAULT 0,
            voice_time_seconds INT DEFAULT 0,
            last_updated TIMESTAMP DEFAULT NOW()
        )
    ''')

    conn.commit()
    cur.close()
    conn.close()

@bot.event
async def on_ready():
    print(f'{bot.user} has connected to Discord!')
    print(f"Bot intents: {bot.intents}")
    print(f"Bot intents.message_content: {bot.intents.message_content}")
    print(f"Bot intents.guilds: {bot.intents.guilds}")
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

@bot.listen('on_message')
async def on_message_handler(message):
    print(f"[EVENT FIRED] on_message called for: {message.author}")

    if message.author == bot.user:
        print(f"[IGNORED] Message from bot itself")
        return

    print(f"[MESSAGE RECEIVED] {message.author} in #{message.channel}: {message.content[:50]}")

    if message.guild is None:
        print(f"[IGNORED] DM message (no guild)")
        return

    if message.guild.id != GUILD_ID:
        print(f"[IGNORED] Message from different guild: {message.guild.id} (expected {GUILD_ID})")
        return

    try:
        # Track message count
        conn = get_db_connection()
        cur = conn.cursor()

        # Get member info from guild
        member = message.guild.get_member(message.author.id)
        nickname = member.nick if member and member.nick else None
        avatar_url = str(message.author.display_avatar.url) if message.author.display_avatar else None
        join_date = member.joined_at if member else message.author.created_at

        # Detect media types
        gif_count = 0
        image_count = 0

        # Check attachments
        for attachment in message.attachments:
            if attachment.content_type:
                if 'image/gif' in attachment.content_type or attachment.filename.lower().endswith('.gif'):
                    gif_count += 1
                    cur.execute('''
                        INSERT INTO message_media (user_id, guild_id, message_id, username, nickname, avatar_url, media_type, message_content)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ''', (message.author.id, message.guild.id, message.id, str(message.author), nickname, avatar_url, 'gif', message.content or 'GIF'))
                elif 'image/' in attachment.content_type:
                    image_count += 1
                    cur.execute('''
                        INSERT INTO message_media (user_id, guild_id, message_id, username, nickname, avatar_url, media_type, message_content)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
                    ''', (message.author.id, message.guild.id, message.id, str(message.author), nickname, avatar_url, 'image', message.content or 'Image'))

        # Check embeds for images/gifs
        for embed in message.embeds:
            if embed.image:
                image_count += 1
            if embed.video:
                gif_count += 1

        # Update member stats
        cur.execute('''
            INSERT INTO member_stats (user_id, guild_id, username, nickname, avatar_url, message_count, gif_count, image_count, join_date, last_updated)
            VALUES (%s, %s, %s, %s, %s, 1, %s, %s, %s, NOW())
            ON CONFLICT (user_id, guild_id) DO UPDATE SET
                message_count = member_stats.message_count + 1,
                gif_count = member_stats.gif_count + %s,
                image_count = member_stats.image_count + %s,
                username = %s,
                nickname = %s,
                avatar_url = %s,
                join_date = %s,
                last_updated = NOW()
        ''', (message.author.id, message.guild.id, str(message.author), nickname, avatar_url, gif_count, image_count, join_date, gif_count, image_count, str(message.author), nickname, avatar_url, join_date))

        conn.commit()
        cur.close()
        conn.close()
        print(f"[TRACKED] {message.author} - message count updated (GIFs: {gif_count}, Images: {image_count})")
    except Exception as e:
        print(f"[ERROR] Failed to track message: {e}")
        import traceback
        traceback.print_exc()

    await bot.process_commands(message)

@bot.event
async def on_reaction_add(reaction, user):
    try:
        # Only track reactions on messages from other users
        if reaction.message.author == user:
            return

        conn = get_db_connection()
        cur = conn.cursor()

        # Get message author info
        message_member = reaction.message.guild.get_member(reaction.message.author.id) if reaction.message.guild else None
        nickname = message_member.nick if message_member and message_member.nick else None
        avatar_url = str(reaction.message.author.display_avatar.url) if reaction.message.author.display_avatar else None

        # Update or insert reaction tracking
        cur.execute('''
            INSERT INTO message_reactions (user_id, guild_id, message_id, username, nickname, avatar_url, message_content, reaction_count)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            ON CONFLICT (message_id) DO UPDATE SET
                reaction_count = %s
        ''', (reaction.message.author.id, reaction.message.guild.id, reaction.message.id, str(reaction.message.author), nickname, avatar_url, reaction.message.content[:100] or 'Message', len(reaction.message.reactions), len(reaction.message.reactions)))

        conn.commit()
        cur.close()
        conn.close()
        print(f"[REACTION] Message {reaction.message.id} now has {len(reaction.message.reactions)} reactions")
    except Exception as e:
        print(f"[ERROR] Failed to track reaction: {e}")

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
        nickname = member.nick if member.nick else None
        avatar_url = str(member.display_avatar.url) if member.display_avatar else None

        cur.execute('''
            INSERT INTO member_stats (user_id, username, nickname, avatar_url, voice_time_seconds, join_date, guild_id)
            VALUES (%s, %s, %s, %s, (SELECT COALESCE(SUM(duration_seconds), 0) FROM voice_sessions WHERE user_id = %s), %s, %s)
            ON CONFLICT (user_id, guild_id) DO UPDATE SET
                voice_time_seconds = (SELECT COALESCE(SUM(duration_seconds), 0) FROM voice_sessions WHERE user_id = %s),
                username = %s,
                nickname = %s,
                avatar_url = %s,
                join_date = %s,
                last_updated = NOW()
        ''', (member.id, str(member), nickname, avatar_url, member.id, member.joined_at, member.guild.id, member.id, str(member), nickname, avatar_url, member.joined_at))

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

@bot.tree.command(name="most-gifs", description="View who sent the most GIFs")
async def most_gifs(interaction: discord.Interaction):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute('''
        SELECT username, nickname, avatar_url, gif_count FROM member_stats
        WHERE guild_id = %s AND gif_count > 0
        ORDER BY gif_count DESC LIMIT 5
    ''', (interaction.guild.id,))

    top_gifs = cur.fetchall()
    cur.close()
    conn.close()

    if not top_gifs:
        await interaction.response.send_message("No GIFs shared yet.", ephemeral=True)
        return

    embed = discord.Embed(title="🎬 Most GIFs Sent", color=discord.Color.purple())
    for i, row in enumerate(top_gifs):
        display_name = row['nickname'] or row['username']
        embed.add_field(name=f"{i+1}. {display_name}", value=f"{row['gif_count']} GIFs", inline=False)

    if top_gifs[0]['avatar_url']:
        embed.set_thumbnail(url=top_gifs[0]['avatar_url'])

    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="most-images", description="View who sent the most images")
async def most_images(interaction: discord.Interaction):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute('''
        SELECT username, nickname, avatar_url, image_count FROM member_stats
        WHERE guild_id = %s AND image_count > 0
        ORDER BY image_count DESC LIMIT 5
    ''', (interaction.guild.id,))

    top_images = cur.fetchall()
    cur.close()
    conn.close()

    if not top_images:
        await interaction.response.send_message("No images shared yet.", ephemeral=True)
        return

    embed = discord.Embed(title="🖼️ Most Images Sent", color=discord.Color.blue())
    for i, row in enumerate(top_images):
        display_name = row['nickname'] or row['username']
        embed.add_field(name=f"{i+1}. {display_name}", value=f"{row['image_count']} Images", inline=False)

    if top_images[0]['avatar_url']:
        embed.set_thumbnail(url=top_images[0]['avatar_url'])

    await interaction.response.send_message(embed=embed)

@bot.tree.command(name="most-reactions", description="View the most reacted message")
async def most_reactions(interaction: discord.Interaction):
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=RealDictCursor)

    cur.execute('''
        SELECT username, nickname, avatar_url, message_content, reaction_count FROM message_reactions
        WHERE guild_id = %s
        ORDER BY reaction_count DESC LIMIT 1
    ''', (interaction.guild.id,))

    top_message = cur.fetchone()
    cur.close()
    conn.close()

    if not top_message:
        await interaction.response.send_message("No reactions tracked yet.", ephemeral=True)
        return

    display_name = top_message['nickname'] or top_message['username']

    embed = discord.Embed(title="🎉 Most Reacted Message", color=discord.Color.gold())
    embed.add_field(name="Member", value=display_name, inline=True)
    embed.add_field(name="Reactions", value=f"{top_message['reaction_count']} 👍", inline=True)
    embed.add_field(name="Message", value=top_message['message_content'], inline=False)

    if top_message['avatar_url']:
        embed.set_thumbnail(url=top_message['avatar_url'])

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
