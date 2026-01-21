-- Productify Pro Initial Schema Migration for Supabase
-- Run this in Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enum types
CREATE TYPE plan_type AS ENUM ('free', 'personal', 'pro', 'team', 'enterprise');
CREATE TYPE team_role AS ENUM ('owner', 'admin', 'member');

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255),
    name VARCHAR(255),
    avatar_url VARCHAR(500),

    -- Auth
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    auth_provider VARCHAR(50) DEFAULT 'email',
    google_id VARCHAR(255) UNIQUE,

    -- Password Reset
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,

    -- Subscription
    plan plan_type DEFAULT 'free',
    trial_started_at TIMESTAMP DEFAULT NOW(),
    trial_ends_at TIMESTAMP DEFAULT (NOW() + INTERVAL '7 days'),
    subscription_id VARCHAR(255),
    subscription_status VARCHAR(50) DEFAULT 'trialing',
    stripe_customer_id VARCHAR(255) UNIQUE,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    last_login_at TIMESTAMP,

    -- Device tracking
    device_id VARCHAR(255),
    device_name VARCHAR(255)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

-- User settings table
CREATE TABLE IF NOT EXISTS user_settings_new (
    id SERIAL PRIMARY KEY,
    user_id INTEGER UNIQUE REFERENCES users(id) ON DELETE CASCADE,

    -- General
    theme VARCHAR(20) DEFAULT 'dark',
    language VARCHAR(10) DEFAULT 'en',
    timezone VARCHAR(50) DEFAULT 'UTC',

    -- Tracking
    track_idle BOOLEAN DEFAULT true,
    idle_timeout INTEGER DEFAULT 5,
    work_start_time VARCHAR(10) DEFAULT '09:00',
    work_end_time VARCHAR(10) DEFAULT '17:00',
    work_days JSONB DEFAULT '["mon", "tue", "wed", "thu", "fri"]',

    -- Screenshots
    screenshots_enabled BOOLEAN DEFAULT true,
    screenshot_interval INTEGER DEFAULT 15,
    screenshot_quality VARCHAR(20) DEFAULT 'medium',
    blur_screenshots BOOLEAN DEFAULT false,

    -- AI
    ai_enabled BOOLEAN DEFAULT true,
    openai_api_key_set BOOLEAN DEFAULT false,

    -- Notifications
    notifications_enabled BOOLEAN DEFAULT true,
    distraction_alerts BOOLEAN DEFAULT true,
    goal_reminders BOOLEAN DEFAULT true,
    daily_summary BOOLEAN DEFAULT true,

    -- Custom lists
    productive_apps JSONB DEFAULT '[]',
    distracting_apps JSONB DEFAULT '[]',
    excluded_apps JSONB DEFAULT '[]'
);

CREATE INDEX idx_user_settings_user_id ON user_settings_new(user_id);

-- Teams table
CREATE TABLE IF NOT EXISTS teams (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE,
    description VARCHAR(500),
    avatar_url VARCHAR(500),

    -- Subscription
    subscription_id VARCHAR(255),
    subscription_status VARCHAR(50) DEFAULT 'trialing',
    max_members INTEGER DEFAULT 10,

    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    owner_id INTEGER REFERENCES users(id)
);

CREATE INDEX idx_teams_slug ON teams(slug);
CREATE INDEX idx_teams_owner_id ON teams(owner_id);

-- Team members table
CREATE TABLE IF NOT EXISTS team_members (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    role team_role DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT NOW(),

    -- Privacy settings
    share_activity BOOLEAN DEFAULT true,
    share_screenshots BOOLEAN DEFAULT false,
    share_urls BOOLEAN DEFAULT true,

    UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_members_team_id ON team_members(team_id);
CREATE INDEX idx_team_members_user_id ON team_members(user_id);

-- Team invites table
CREATE TABLE IF NOT EXISTS team_invites (
    id SERIAL PRIMARY KEY,
    team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role team_role DEFAULT 'member',
    token VARCHAR(255) UNIQUE,
    expires_at TIMESTAMP,
    accepted BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_team_invites_token ON team_invites(token);
CREATE INDEX idx_team_invites_team_id ON team_invites(team_id);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    app_name VARCHAR(255) NOT NULL,
    window_title TEXT NOT NULL,
    url TEXT,
    domain VARCHAR(255),
    platform VARCHAR(50),
    start_time TIMESTAMP NOT NULL,
    end_time TIMESTAMP,
    duration INTEGER DEFAULT 0,
    category VARCHAR(100) DEFAULT 'other',
    productivity_score FLOAT DEFAULT 0.5,
    is_productive BOOLEAN DEFAULT false,
    extra_data JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_activities_user_id ON activities(user_id);
CREATE INDEX idx_activities_start_time ON activities(start_time);
CREATE INDEX idx_activities_app_name ON activities(app_name);
CREATE INDEX idx_activities_user_start ON activities(user_id, start_time);

-- URL Activities table
CREATE TABLE IF NOT EXISTS url_activities (
    id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_id VARCHAR(255) NOT NULL,
    full_url TEXT NOT NULL,
    domain VARCHAR(255) NOT NULL,
    platform VARCHAR(50),
    page_title VARCHAR(500),
    favicon_url VARCHAR(500),
    duration INTEGER DEFAULT 0,
    timestamp TIMESTAMP DEFAULT NOW(),
    category VARCHAR(100) DEFAULT 'other',
    is_productive BOOLEAN DEFAULT false,
    productivity_score FLOAT DEFAULT 0.5
);

CREATE INDEX idx_url_activities_user_id ON url_activities(user_id);
CREATE INDEX idx_url_activities_domain ON url_activities(domain);
CREATE INDEX idx_url_activities_timestamp ON url_activities(timestamp);

-- YouTube Activities table
CREATE TABLE IF NOT EXISTS youtube_activities (
    id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    activity_id VARCHAR(255) NOT NULL,
    video_id VARCHAR(50) NOT NULL,
    video_title VARCHAR(500) NOT NULL,
    channel_name VARCHAR(255),
    watch_duration INTEGER DEFAULT 0,
    watch_percentage FLOAT,
    timestamp TIMESTAMP DEFAULT NOW(),
    video_category VARCHAR(100) DEFAULT 'other',
    is_productive BOOLEAN DEFAULT false,
    ai_classification JSONB
);

CREATE INDEX idx_youtube_activities_user_id ON youtube_activities(user_id);
CREATE INDEX idx_youtube_activities_video_id ON youtube_activities(video_id);

-- Screenshots table
CREATE TABLE IF NOT EXISTS screenshots (
    id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP DEFAULT NOW(),

    -- Local storage (legacy)
    image_path VARCHAR(500),
    thumbnail_path VARCHAR(500),

    -- Cloud storage (Firebase)
    storage_url TEXT,
    thumbnail_url TEXT,
    storage_path VARCHAR(500),

    -- Metadata
    app_name VARCHAR(255),
    window_title TEXT,
    url TEXT,
    category VARCHAR(100) DEFAULT 'other',
    is_blurred BOOLEAN DEFAULT false,
    is_deleted BOOLEAN DEFAULT false
);

CREATE INDEX idx_screenshots_user_id ON screenshots(user_id);
CREATE INDEX idx_screenshots_timestamp ON screenshots(timestamp);
CREATE INDEX idx_screenshots_user_timestamp ON screenshots(user_id, timestamp);

-- Goals table
CREATE TABLE IF NOT EXISTS goals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    goal_type VARCHAR(50) NOT NULL,
    target_value FLOAT NOT NULL,
    current_value FLOAT DEFAULT 0.0,
    frequency VARCHAR(20) DEFAULT 'daily',

    -- For app/category specific goals
    target_app VARCHAR(255),
    target_category VARCHAR(100),

    -- Settings
    is_active BOOLEAN DEFAULT true,
    notifications_enabled BOOLEAN DEFAULT true,

    -- Tracking
    status VARCHAR(20) DEFAULT 'on_track',
    last_reset TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_goals_user_id ON goals(user_id);
CREATE INDEX idx_goals_status ON goals(status);

-- Streaks table
CREATE TABLE IF NOT EXISTS streaks (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    streak_type VARCHAR(50) NOT NULL,
    current_count INTEGER DEFAULT 0,
    best_count INTEGER DEFAULT 0,
    last_updated TIMESTAMP DEFAULT NOW(),
    last_achieved_date TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_streaks_user_id ON streaks(user_id);
CREATE INDEX idx_streaks_type ON streaks(streak_type);

-- Achievements table
CREATE TABLE IF NOT EXISTS achievements (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    achievement_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    icon VARCHAR(50),
    earned_at TIMESTAMP,
    progress FLOAT DEFAULT 0.0,
    target FLOAT,
    is_unlocked BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_achievements_user_id ON achievements(user_id);
CREATE INDEX idx_achievements_type ON achievements(achievement_type);

-- Focus sessions table
CREATE TABLE IF NOT EXISTS focus_sessions (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255),
    duration_planned INTEGER NOT NULL,
    duration_actual INTEGER,
    started_at TIMESTAMP DEFAULT NOW(),
    ended_at TIMESTAMP,
    was_completed BOOLEAN DEFAULT false,
    was_interrupted BOOLEAN DEFAULT false,
    interruption_count INTEGER DEFAULT 0,
    notes TEXT,

    -- Session settings
    block_distractions BOOLEAN DEFAULT true,
    break_reminder BOOLEAN DEFAULT true,

    -- Tracked activity
    primary_app VARCHAR(255),
    primary_category VARCHAR(100),
    productive_time INTEGER DEFAULT 0,

    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_focus_sessions_user_id ON focus_sessions(user_id);
CREATE INDEX idx_focus_sessions_started_at ON focus_sessions(started_at);

-- Daily goal progress table
CREATE TABLE IF NOT EXISTS daily_goal_progress (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    goal_id INTEGER REFERENCES goals(id) ON DELETE CASCADE,
    date TIMESTAMP NOT NULL,
    value FLOAT DEFAULT 0.0,
    target FLOAT NOT NULL,
    was_achieved BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_daily_goal_progress_user_id ON daily_goal_progress(user_id);
CREATE INDEX idx_daily_goal_progress_goal_id ON daily_goal_progress(goal_id);
CREATE INDEX idx_daily_goal_progress_date ON daily_goal_progress(date);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(255) PRIMARY KEY DEFAULT uuid_generate_v4()::text,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_goals_updated_at BEFORE UPDATE ON goals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security (RLS) Policies
-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings_new ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE url_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE youtube_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE streaks ENABLE ROW LEVEL SECURITY;
ALTER TABLE achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE focus_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE daily_goal_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Note: Since we're using JWT auth from FastAPI (not Supabase auth),
-- we'll use a service role key for API access and handle auth in the backend.
-- Create policies to allow service role full access:

CREATE POLICY "Service role has full access to users"
    ON users FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to user_settings_new"
    ON user_settings_new FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to activities"
    ON activities FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to url_activities"
    ON url_activities FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to youtube_activities"
    ON youtube_activities FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to screenshots"
    ON screenshots FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to goals"
    ON goals FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to streaks"
    ON streaks FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to achievements"
    ON achievements FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to focus_sessions"
    ON focus_sessions FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to daily_goal_progress"
    ON daily_goal_progress FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to notifications"
    ON notifications FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to teams"
    ON teams FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to team_members"
    ON team_members FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role has full access to team_invites"
    ON team_invites FOR ALL
    USING (true)
    WITH CHECK (true);
