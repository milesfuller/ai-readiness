-- ============================================================================
-- DEFAULT SURVEY SEED DATA
-- ============================================================================

-- Insert default AI Readiness survey template
INSERT INTO surveys (
    id,
    title,
    description,
    instructions,
    version,
    question_count,
    estimated_duration_minutes,
    is_voice_enabled,
    is_anonymous,
    jtbd_framework_version,
    status,
    is_template
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'AI Readiness Assessment',
    'Comprehensive assessment to evaluate your organization''s readiness for AI adoption using the Jobs-to-be-Done framework.',
    'Please answer each question thoughtfully. You can use either text or voice input. Your responses will help us understand your organization''s current state and readiness for AI implementation.',
    '1.0',
    12,
    20,
    true,
    false,
    'v1.0',
    'active',
    true
) ON CONFLICT (id) DO NOTHING;

-- Insert survey questions based on JTBD framework
INSERT INTO survey_questions (
    survey_id,
    question_number,
    question_text,
    question_context,
    placeholder_text,
    jtbd_force,
    force_description,
    input_type,
    is_required,
    max_length,
    min_length,
    order_index
) VALUES 
-- Question 1: Demographic/Context
(
    '00000000-0000-0000-0000-000000000001',
    1,
    'Tell us about your role and organization. What is your position, and what type of organization do you work for?',
    'This helps us understand your perspective and organizational context for AI readiness.',
    'e.g., I''m a VP of Technology at a mid-size financial services company with 500 employees...',
    'demographic',
    'Understanding the respondent''s role and organizational context',
    'text_or_voice',
    true,
    1000,
    20,
    1
),
-- Question 2: Pain of Old
(
    '00000000-0000-0000-0000-000000000001',
    2,
    'What are the biggest operational challenges or inefficiencies your organization currently faces that you believe AI could help solve?',
    'This explores the problems with current processes that create motivation for change.',
    'e.g., We spend too much time on manual data entry, our customer service response times are slow...',
    'pain_of_old',
    'Current problems and frustrations that motivate change',
    'text_or_voice',
    true,
    2000,
    50,
    2
),
-- Question 3: Pain of Old (continued)
(
    '00000000-0000-0000-0000-000000000001',
    3,
    'How much time or resources does your organization waste on tasks that could potentially be automated or enhanced with AI?',
    'Quantifying the cost of current inefficiencies.',
    'e.g., Our team spends 20 hours per week on manual reporting that could be automated...',
    'pain_of_old',
    'Quantifying waste and inefficiency in current processes',
    'text_or_voice',
    true,
    1500,
    30,
    3
),
-- Question 4: Pull of New
(
    '00000000-0000-0000-0000-000000000001',
    4,
    'What specific benefits or improvements do you hope AI will bring to your organization?',
    'This explores the positive outcomes they envision from AI adoption.',
    'e.g., Improved customer experience, faster decision-making, reduced costs...',
    'pull_of_new',
    'Desired benefits and positive outcomes from AI adoption',
    'text_or_voice',
    true,
    2000,
    40,
    4
),
-- Question 5: Pull of New (continued)
(
    '00000000-0000-0000-0000-000000000001',
    5,
    'Have you seen competitors or similar organizations successfully implement AI? What outcomes did they achieve that you find compelling?',
    'Understanding what successful AI implementations inspire them.',
    'e.g., Our competitor reduced processing time by 60% using AI for document analysis...',
    'pull_of_new',
    'Inspiration from successful AI implementations by others',
    'text_or_voice',
    true,
    1800,
    30,
    5
),
-- Question 6: Pull of New (vision)
(
    '00000000-0000-0000-0000-000000000001',
    6,
    'Imagine your organization in 3 years with AI successfully integrated. What does a typical day look like? How are things different?',
    'This captures their vision of the transformed future state.',
    'e.g., Employees focus on strategic work while AI handles routine tasks, decisions are data-driven and faster...',
    'pull_of_new',
    'Vision of the transformed future state with AI',
    'text_or_voice',
    true,
    2000,
    50,
    6
),
-- Question 7: Anchors to Old
(
    '00000000-0000-0000-0000-000000000001',
    7,
    'What existing systems, processes, or investments would be difficult or expensive to change when implementing AI?',
    'This identifies barriers and constraints that resist change.',
    'e.g., Our legacy CRM system that would be expensive to replace, established workflows that work well...',
    'anchors_to_old',
    'Existing investments and systems that resist change',
    'text_or_voice',
    true,
    1800,
    30,
    7
),
-- Question 8: Anchors to Old (continued)
(
    '00000000-0000-0000-0000-000000000001',
    8,
    'What aspects of your current operations are working well and should be preserved during any AI implementation?',
    'Understanding what they want to protect and maintain.',
    'e.g., Our personalized customer service approach, our quality control processes, team collaboration...',
    'anchors_to_old',
    'Successful current practices worth preserving',
    'text_or_voice',
    true,
    1500,
    30,
    8
),
-- Question 9: Anxiety of New
(
    '00000000-0000-0000-0000-000000000001',
    9,
    'What concerns or fears do you have about implementing AI in your organization?',
    'This explores worries and resistance to AI adoption.',
    'e.g., Job displacement fears, data security concerns, implementation complexity, cost overruns...',
    'anxiety_of_new',
    'Fears and concerns about AI implementation',
    'text_or_voice',
    true,
    2000,
    30,
    9
),
-- Question 10: Anxiety of New (continued)
(
    '00000000-0000-0000-0000-000000000001',
    10,
    'What could go wrong with an AI implementation in your organization? What keeps you up at night about this?',
    'Deep dive into implementation fears and worst-case scenarios.',
    'e.g., AI making wrong decisions, staff resistance, technology not working as promised...',
    'anxiety_of_new',
    'Worst-case scenarios and deep fears about AI',
    'text_or_voice',
    true,
    1800,
    30,
    10
),
-- Question 11: Readiness Assessment
(
    '00000000-0000-0000-0000-000000000001',
    11,
    'How would you rate your organization''s current technical infrastructure, data quality, and team capabilities for AI implementation?',
    'Direct assessment of technical and organizational readiness.',
    'e.g., Our data is mostly clean but in silos, we have some technical talent but need AI expertise...',
    'anxiety_of_new',
    'Current readiness and capability gaps',
    'text_or_voice',
    true,
    1800,
    40,
    11
),
-- Question 12: Priority and Timeline
(
    '00000000-0000-0000-0000-000000000001',
    12,
    'Given everything you''ve shared, what would be your ideal next steps for AI exploration or implementation? What timeline feels realistic?',
    'Understanding their preferred path forward and urgency level.',
    'e.g., Start with a pilot project in customer service within 6 months, then expand based on results...',
    'pull_of_new',
    'Preferred implementation approach and timeline',
    'text_or_voice',
    true,
    2000,
    40,
    12
);

-- Insert a sample organization for demo purposes
INSERT INTO organizations (
    id,
    name,
    slug,
    description,
    industry,
    size_category,
    contact_email,
    contact_name,
    subscription_tier,
    is_active
) VALUES (
    '00000000-0000-0000-0000-000000000002',
    'Demo Organization',
    'demo-org',
    'Sample organization for demonstration purposes',
    'Technology',
    'medium',
    'demo@example.com',
    'Demo Admin',
    'free',
    true
) ON CONFLICT (id) DO NOTHING;

-- Insert system notifications
INSERT INTO system_notifications (
    title,
    message,
    notification_type,
    target_type,
    is_active,
    expires_at
) VALUES 
(
    'Welcome to AI Readiness Assessment',
    'Welcome to the AI Readiness Assessment tool. This survey uses the Jobs-to-be-Done framework to evaluate your organization''s readiness for AI adoption.',
    'info',
    'all_users',
    true,
    NOW() + INTERVAL '90 days'
),
(
    'Voice Input Available',
    'You can now use voice input for survey responses. Click the microphone icon to record your answers.',
    'success',
    'all_users',
    true,
    NOW() + INTERVAL '30 days'
);

-- Insert default survey for the demo organization
INSERT INTO surveys (
    id,
    organization_id,
    title,
    description,
    instructions,
    version,
    question_count,
    estimated_duration_minutes,
    is_voice_enabled,
    is_anonymous,
    jtbd_framework_version,
    status,
    is_template
) VALUES (
    '00000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000002',
    'Demo Organization AI Readiness Assessment',
    'AI Readiness Assessment customized for Demo Organization',
    'Please answer each question thoughtfully based on your experience at Demo Organization.',
    '1.0',
    12,
    20,
    true,
    false,
    'v1.0',
    'active',
    false
) ON CONFLICT (id) DO NOTHING;

-- Copy questions from template to demo survey
INSERT INTO survey_questions (
    survey_id,
    question_number,
    question_text,
    question_context,
    placeholder_text,
    jtbd_force,
    force_description,
    input_type,
    is_required,
    max_length,
    min_length,
    order_index
)
SELECT 
    '00000000-0000-0000-0000-000000000003' as survey_id,
    question_number,
    question_text,
    question_context,
    placeholder_text,
    jtbd_force,
    force_description,
    input_type,
    is_required,
    max_length,
    min_length,
    order_index
FROM survey_questions 
WHERE survey_id = '00000000-0000-0000-0000-000000000001'
ON CONFLICT DO NOTHING;