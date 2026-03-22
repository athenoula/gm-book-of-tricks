-- Add recap field to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS recap text DEFAULT NULL;

-- Plot threads table
CREATE TABLE plot_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  status text DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  note text DEFAULT NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE plot_threads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plot_threads_campaign_access" ON plot_threads
  FOR ALL USING (
    campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())
  );

CREATE INDEX idx_plot_threads_campaign ON plot_threads(campaign_id);

CREATE TRIGGER update_plot_threads_updated_at
  BEFORE UPDATE ON plot_threads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
