-- 会议参谋数据库表结构
-- 在 Supabase SQL Editor 里执行

-- 会议类型表
CREATE TABLE IF NOT EXISTS meeting_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 会议表
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_type_id UUID NOT NULL REFERENCES meeting_types(id),
  title TEXT NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  summary TEXT NOT NULL DEFAULT '',
  minutes TEXT NOT NULL DEFAULT '',
  custom_goals JSONB NOT NULL DEFAULT '[]'::jsonb,
  custom_strategies JSONB NOT NULL DEFAULT '[]'::jsonb,
  discussion_points JSONB NOT NULL DEFAULT '[]'::jsonb,
  ai_suggestions JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 策略表
CREATE TABLE IF NOT EXISTS strategies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_type_id UUID REFERENCES meeting_types(id),
  title TEXT NOT NULL,
  scenario TEXT NOT NULL,
  response TEXT NOT NULL,
  category TEXT NOT NULL,
  source TEXT NOT NULL,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 声纹表
CREATE TABLE IF NOT EXISTS voice_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  is_user BOOLEAN NOT NULL DEFAULT false,
  voice_sample_key TEXT NOT NULL,
  voice_sample_url TEXT NOT NULL,
  voice_features JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 转写记录表
CREATE TABLE IF NOT EXISTS meeting_transcripts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id),
  voice_profile_id UUID REFERENCES voice_profiles(id),
  speaker_name TEXT NOT NULL,
  content TEXT NOT NULL,
  timestamp_ms INTEGER NOT NULL,
  is_user BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 录音文件表
CREATE TABLE IF NOT EXISTS meeting_audios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id),
  audio_key TEXT NOT NULL,
  audio_url TEXT NOT NULL,
  duration_ms INTEGER NOT NULL,
  segments JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_meetings_type ON meetings(meeting_type_id);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_transcripts_meeting ON meeting_transcripts(meeting_id);
CREATE INDEX IF NOT EXISTS idx_transcripts_timestamp ON meeting_transcripts(timestamp_ms);

-- 插入默认会议类型
INSERT INTO meeting_types (name, description, goals) VALUES
('客户谈判', '与客户进行商务谈判的会议', '["了解客户需求", "达成合作意向", "确定合作方案"]'),
('产品会议', '讨论产品需求和功能', '["需求评审", "优先级排序"]'),
('团队周会', '每周团队同步会议', '["同步进度", "解决问题", "安排下周工作"]');

-- 创建更新触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 为各表添加自动更新触发器
CREATE TRIGGER update_meeting_types_updated_at
  BEFORE UPDATE ON meeting_types
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meetings_updated_at
  BEFORE UPDATE ON meetings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_strategies_updated_at
  BEFORE UPDATE ON strategies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_voice_profiles_updated_at
  BEFORE UPDATE ON voice_profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
