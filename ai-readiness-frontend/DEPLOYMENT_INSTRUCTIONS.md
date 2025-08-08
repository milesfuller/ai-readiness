# 🚀 Deployment Instructions for Phase 1 & 2

## Current Status
✅ **Code pushed to:** `feature/phase-1-jtbd-framework` branch
✅ **Repository:** https://github.com/milesfuller/ai-readiness.git
✅ **Ready for:** Pull Request creation and deployment

## Step 1: Create Pull Request

### Option A: Via GitHub Web Interface
1. Go to: https://github.com/milesfuller/ai-readiness/pull/new/feature/phase-1-jtbd-framework
2. Set base branch to: `main`
3. Use the PR title and description below

### Option B: Via GitHub CLI
```bash
# If you have GitHub CLI configured:
gh pr create --title "feat: Phase 1 JTBD Framework & Phase 2 Voice Recording Support" --base main
```

### PR Title:
```
feat: Phase 1 JTBD Framework & Phase 2 Voice Recording Support
```

### PR Description:
```markdown
## Summary
- Implements Phase 1: JTBD (Jobs-to-be-Done) Framework Core functionality
- Implements Phase 2: Voice Recording Support with transcription capabilities
- Adds comprehensive test coverage following TDD principles

## Features Added
### Phase 1: JTBD Framework
- JTBD force types and analysis services
- API endpoints for JTBD analysis
- UI components for force visualization

### Phase 2: Voice Recording
- Real-time audio recording with waveform
- Multi-provider transcription support
- Audio quality analysis
- Secure storage with RLS policies

## Testing
- 84+ tests passing
- TDD approach with comprehensive coverage

## Deployment Required
1. Apply database migration
2. Configure environment variables
3. Set up storage bucket
```

## Step 2: Database Migration

### In Supabase Dashboard:
1. Go to SQL Editor
2. Create new query
3. Copy and run the migration from: `supabase/migrations/20250108_add_voice_recording.sql`
4. Verify tables created:
```sql
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('voice_recordings', 'transcription_segments', 'voice_quality_metrics');
```

## Step 3: Environment Configuration

### Add to Vercel/Production Environment:
```bash
# Required for transcription (optional - will use mock if not set)
OPENAI_API_KEY=your_openai_api_key

# Already configured (verify these exist)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_KEY=your_service_key
```

## Step 4: Supabase Storage Setup

### Create Storage Bucket:
1. Go to Supabase Dashboard > Storage
2. Create new bucket:
   - Name: `voice-recordings`
   - Public: `false`
3. Or run this SQL:
```sql
INSERT INTO storage.buckets (id, name, public)
VALUES ('voice-recordings', 'voice-recordings', false)
ON CONFLICT (id) DO NOTHING;

-- Add storage policies
CREATE POLICY "Users can upload their own recordings"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'voice-recordings' AND auth.uid() = owner);

CREATE POLICY "Users can view their own recordings"
ON storage.objects FOR SELECT
USING (bucket_id = 'voice-recordings' AND auth.uid() = owner);

CREATE POLICY "Users can delete their own recordings"
ON storage.objects FOR DELETE
USING (bucket_id = 'voice-recordings' AND auth.uid() = owner);
```

## Step 5: Deploy to Production

### If using Vercel:
1. Merge PR to main branch
2. Vercel will auto-deploy from main
3. Monitor deployment at: https://vercel.com/your-team/ai-readiness

### If manual deployment:
```bash
npm run build
npm run start
```

## Step 6: Post-Deployment Verification

### Test Voice Recording:
1. Navigate to a survey question
2. Click "Start Recording"
3. Record for 5-10 seconds
4. Stop and verify upload works
5. Test transcription (if API key configured)

### Check API Health:
```bash
# Test voice API endpoints
curl https://your-domain.com/api/voice/health

# Check database
SELECT COUNT(*) FROM voice_recordings;
```

## Step 7: Monitor

### Check for issues:
- Supabase Dashboard > Logs
- Vercel Dashboard > Functions logs
- Browser console for client-side errors

### Common Issues:
| Issue | Solution |
|-------|----------|
| Upload fails | Check storage bucket exists |
| Transcription fails | Verify OPENAI_API_KEY is set |
| No audio input | Check browser permissions |

## Rollback Plan

If issues occur:
```sql
-- Rollback database changes
DROP TABLE IF EXISTS voice_quality_metrics CASCADE;
DROP TABLE IF EXISTS transcription_segments CASCADE;
DROP TABLE IF EXISTS voice_recordings CASCADE;

-- Then revert the code deployment
git revert b22cf06
git push origin main
```

## Success Metrics

Monitor after deployment:
- [ ] Voice uploads working
- [ ] Transcriptions processing (if configured)
- [ ] Quality metrics calculating
- [ ] No console errors
- [ ] API response times < 2s

## Support

For issues:
1. Check `PHASE2_DEPLOYMENT.md` for detailed troubleshooting
2. Review logs in Supabase and Vercel dashboards
3. Test with `scripts/test-voice-recording.js`

---

**Deployment Status:** Ready for production! 🚀

All code is tested, committed, and pushed. Just follow the steps above to complete deployment.