CREATE TABLE public.demo_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  initials text NOT NULL,
  role text NOT NULL,
  company text NOT NULL,
  kind text NOT NULL,
  location text NOT NULL,
  photo_url text NOT NULL,
  bio text NOT NULL,
  ai_summary text NOT NULL,
  match integer NOT NULL DEFAULT 80,
  skills text[] NOT NULL DEFAULT '{}',
  interests text[] NOT NULL DEFAULT '{}',
  goals text[] NOT NULL DEFAULT '{}',
  projects text[] NOT NULL DEFAULT '{}',
  shared_goals text[] NOT NULL DEFAULT '{}',
  complementary_skills text[] NOT NULL DEFAULT '{}',
  reasons text[] NOT NULL DEFAULT '{}',
  suggested_collaboration text NOT NULL,
  conversation_starter text NOT NULL,
  accent text NOT NULL DEFAULT 'violet',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.demo_profiles TO anon;
GRANT SELECT ON public.demo_profiles TO authenticated;
GRANT ALL ON public.demo_profiles TO service_role;
ALTER TABLE public.demo_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Demo profiles are public" ON public.demo_profiles FOR SELECT USING (true);

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  headline text,
  location text,
  twin_intelligence integer NOT NULL DEFAULT 18,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own profile" ON public.profiles FOR ALL TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE TABLE public.twin_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source_id text NOT NULL,
  kind text NOT NULL DEFAULT 'import',
  gain integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, source_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.twin_sources TO authenticated;
GRANT ALL ON public.twin_sources TO service_role;
ALTER TABLE public.twin_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own twin sources" ON public.twin_sources FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  peer_slug text NOT NULL,
  status text NOT NULL DEFAULT 'connected',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, peer_slug)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.connections TO authenticated;
GRANT ALL ON public.connections TO service_role;
ALTER TABLE public.connections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own connections" ON public.connections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  peer_slug text NOT NULL,
  sender text NOT NULL DEFAULT 'user',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX messages_user_peer_idx ON public.messages (user_id, peer_slug, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own messages" ON public.messages FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  body text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own notifications" ON public.notifications FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO public.demo_profiles (slug, name, initials, role, company, kind, location, photo_url, bio, ai_summary, match, skills, interests, goals, projects, shared_goals, complementary_skills, reasons, suggested_collaboration, conversation_starter, accent) VALUES
('sarah-chen','Sarah Chen','SC','Founder & CEO','Loomlane AI','Founder','San Francisco, CA','https://i.pravatar.cc/240?u=sarah-chen','Building agentic workflow infrastructure for revenue teams. Second-time founder, previously led growth engineering at a Series C fintech.','Sarah''s twin is optimising for a technical co-founder with production LLM experience. Your project history maps almost perfectly onto her current hiring gap.',94,'{"Product strategy","LLM orchestration","Go-to-market","TypeScript"}','{"Agent design","Dev tools","Pricing psychology"}','{"Find a technical co-founder","Ship v2 by Q4","Raise a seed round"}','{"Loomlane Agents","Open-source eval harness"}','{"Both building AI products","Both exploring seed-stage funding"}','{"She owns GTM, you own inference infrastructure"}','{"Building AI products","Same startup goals","Complementary backend skills"}','You can help Sarah build the AI infrastructure behind Loomlane Agents.','Hi Sarah — our AI Twins noticed we''re working toward similar AI startup goals. Would love to connect and compare notes on evals.','violet'),
('marcus-hale','Marcus Hale','MH','Technical Recruiter','Northbeam Talent','Recruiter','Austin, TX','https://i.pravatar.cc/240?u=marcus-hale','Hires senior AI and platform engineers for late-seed to Series B startups. Places 40+ engineers a year.','Marcus is actively sourcing for three AI infrastructure roles that match your stack and seniority band within 8%.',91,'{"Technical sourcing","Compensation benchmarking","Interview design","Python hiring"}','{"AI infra hiring","Remote-first teams"}','{"Fill 3 senior AI roles","Build a warm engineering pipeline"}','{"AI infra talent report 2026"}','{"You want senior AI roles, he is hiring for them"}','{"He has the openings, you have the shipped systems"}','{"Hiring for your exact stack","Seniority band matches your experience","Roles are remote-friendly"}','A 15-minute intro call on two roles that fit your profile.','Hi Marcus — my AI Twin flagged your open AI infra roles as a strong fit for what I''ve shipped. Worth a short call?','blue'),
('aisha-rahman','Aisha Rahman','AR','Staff AI Engineer','Kestrel Labs','AI Engineer','London, UK','https://i.pravatar.cc/240?u=aisha-rahman','Works on retrieval quality and evaluation tooling for production LLM systems. Writes a weekly newsletter on eval design.','Aisha''s twin shares your retrieval-quality obsession. She has depth where your twin flagged gaps in evaluation methodology.',89,'{"RAG systems","Evaluation","Python","Vector databases"}','{"Eval benchmarks","Open source","Technical writing"}','{"Publish an eval benchmark","Mentor two engineers"}','{"evalkit","Retrieval quality playbook"}','{"Both improving LLM reliability"}','{"She brings eval rigour, you bring product velocity"}','{"Overlapping focus on retrieval","Fills your evaluation knowledge gap","Both active in open source"}','Co-author an open benchmark for retrieval quality.','Hi Aisha — our Twins matched on retrieval evaluation. I''d love to hear how you score groundedness in production.','green'),
('rahul-verma','Rahul Verma','RV','Co-founder','Stackfern','Founder','Bengaluru, IN','https://i.pravatar.cc/240?u=rahul-verma','Building developer infrastructure for AI-native teams. Looking for a technical co-founder to own the platform layer.','Rahul''s twin is searching for a co-founder with your exact platform and inference background.',88,'{"Developer tools","Distributed systems","Fundraising"}','{"AI-native infra","Open source","Founder communities"}','{"Find a co-founder","Launch private beta"}','{"Stackfern Runtime"}','{"Both want to build a company in AI infra"}','{"He brings distribution, you bring the platform layer"}','{"Seeking a co-founder in your domain","Shared AI infra thesis","Compatible working style"}','Explore a co-founder fit over a two-week build sprint.','Hi Rahul — our Twins matched on AI infra. You''re looking for a technical co-founder and I''m exploring exactly that.','violet'),
('diego-ferrer','Diego Ferrer','DF','Principal Engineer & Mentor','Arcadia Systems','Mentor','Barcelona, ES','https://i.pravatar.cc/240?u=diego-ferrer','18 years across distributed systems. Mentors engineers moving from senior to staff and beyond.','Diego mentors exactly the transition your twin detected in your goals: senior engineer to technical leadership.',87,'{"Distributed systems","Technical leadership","Career coaching"}','{"Staff-plus career paths","Systems design"}','{"Mentor 5 engineers this year","Write a staff engineer guide"}','{"Staff-plus mentorship circle"}','{"You want staff scope, he coaches that jump"}','{"He offers 18 years of leadership pattern recognition"}','{"Mentors your exact career transition","Deep systems background","Actively taking new mentees"}','Monthly mentorship session on scope and influence.','Hi Diego — my Twin picked up on your staff-plus mentorship work. I''m making that jump now and would value your perspective.','amber'),
('lena-novak','Lena Novak','LN','Partner','Halden Ventures','Investor','Berlin, DE','https://i.pravatar.cc/240?u=lena-novak','Pre-seed and seed investor in AI infrastructure and developer tools. Writes first cheques of EUR 300k-1.5M.','Lena''s thesis overlaps with the product direction your twin extracted from your projects.',84,'{"Seed investing","Market sizing","Founder coaching"}','{"AI infra","Developer tools","Technical founders"}','{"Back 6 AI infra teams","Meet more technical founders"}','{"AI infra thesis 2026"}','{"You may raise, she invests in your category"}','{"She brings capital and market framing"}','{"Invests in your product category","Prefers technical founders","Actively meeting pre-seed teams"}','A thesis conversation before you formally raise.','Hi Lena — our Twins matched on AI infrastructure. I''m early on something in that space and would value your read on the market.','violet'),
('tomas-ekwueme','Tomas Ekwueme','TE','Senior Product Manager','Sable Health','Product Manager','Toronto, CA','https://i.pravatar.cc/240?u=tomas-ekwueme','Ships AI features in regulated healthcare. Obsessed with turning model behaviour into trustworthy UX.','Tomas frames AI trust as a product problem — a lens your twin flagged as underdeveloped in your profile.',82,'{"Product discovery","AI UX","Regulated environments"}','{"Trust and safety UX","Health AI"}','{"Launch an AI triage flow","Find engineering partners"}','{"Sable Triage Copilot"}','{"Both shipping user-facing AI"}','{"He brings product framing, you bring model depth"}','{"Both shipping production AI","Complementary product and engineering skills","Shared interest in trust UX"}','Trade design reviews on AI trust patterns.','Hi Tomas — our Twins matched on user-facing AI. How do you communicate model uncertainty to clinicians?','blue'),
('priya-menon','Priya Menon','PM','Backend Engineer','Fleetwise','Software Engineer','Bengaluru, IN','https://i.pravatar.cc/240?u=priya-menon','Builds high-throughput event pipelines. Currently moving from platform work into applied AI.','Priya''s twin is looking for peers who already made the platform-to-AI move you completed.',80,'{"Go","Kafka","Postgres","Observability"}','{"Streaming systems","Applied AI"}','{"Move into an AI team","Ship a side project"}','{"Event replay engine"}','{"Both care about reliable data pipelines"}','{"She brings streaming depth, you bring model serving"}','{"Adjacent technical stack","Targeting your current domain","Both interested in side projects"}','Pair on a streaming inference side project.','Hi Priya — our Twins matched on data pipelines. I made the platform-to-AI jump last year, happy to share what worked.','green'),
('noah-adeyemi','Noah Adeyemi','NA','CS Student & Builder','University of Michigan','Student','Ann Arbor, MI','https://i.pravatar.cc/240?u=noah-adeyemi','Final-year CS student shipping open-source AI tooling. Looking for an internship and a mentor.','Noah''s twin requested guidance from engineers with your exact trajectory. High-signal mentee.',76,'{"Python","React","Fine-tuning"}','{"Open source","AI agents","Internships"}','{"Land an AI internship","Find a mentor"}','{"agentbench-lite","Campus AI club"}','{"He wants the path you have already walked"}','{"He brings energy and OSS momentum"}','{"Explicitly seeking mentorship in your field","Active open-source contributor","Shared interest in agent tooling"}','A short mentorship thread on breaking into AI engineering.','Hi Noah — my Twin flagged your open-source work. Happy to answer questions about breaking into AI engineering.','amber');