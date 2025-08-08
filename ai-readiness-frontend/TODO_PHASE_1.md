# ✅ TODO - Phase 1: JTBD Framework Core

## 🎯 Phase 1 Objective
Implement Jobs-to-be-Done (JTBD) framework with 5 forces mapping, scoring system, and analysis capabilities.

---

## 📋 Task List

### 🔴 Day 1: TDD Setup & Schema Updates

#### Morning Session (Tests First - TDD Red Phase):
```bash
# Create test files first (TDD approach)
```

- [ ] Create `/tests/jtbd/jtbd-schema.test.ts`
  - [ ] Test JTBD force enum validation
  - [ ] Test question-to-force mapping
  - [ ] Test force strength scoring (1-5)
  - [ ] Test force distribution validation

- [ ] Create `/tests/jtbd/jtbd-service.test.ts`
  - [ ] Test force calculation algorithm
  - [ ] Test response analysis by force
  - [ ] Test aggregate scoring
  - [ ] Test confidence intervals

- [ ] Create `/tests/jtbd/jtbd-api.test.ts`
  - [ ] Test GET /api/jtbd/analysis endpoint
  - [ ] Test POST /api/jtbd/calculate endpoint
  - [ ] Test error handling
  - [ ] Test response format

#### Afternoon Session (Implementation - TDD Green Phase):
- [ ] Update `/contracts/schema.ts`
  ```typescript
  // Add to existing schema:
  export const JTBDForce = z.enum([
    'demographic',
    'pain_of_old',
    'pull_of_new', 
    'anchors_to_old',
    'anxiety_of_new'
  ]);

  export const SurveyQuestionJTBD = SurveyTemplateQuestions.extend({
    jtbd_force: JTBDForce,
    force_description: z.string(),
    force_weight: z.number().min(0).max(1).default(1)
  });

  export const ResponseAnalysisJTBD = z.object({
    id: z.string().uuid(),
    response_id: z.string().uuid(),
    primary_force: JTBDForce,
    force_strength: z.number().min(1).max(5),
    confidence_score: z.number().min(0).max(1),
    contributing_factors: z.array(z.string())
  });
  ```

- [ ] Create database migration
  ```sql
  -- migrations/add_jtbd_fields.sql
  ALTER TABLE survey_template_questions 
  ADD COLUMN jtbd_force VARCHAR(50),
  ADD COLUMN force_description TEXT,
  ADD COLUMN force_weight DECIMAL(3,2) DEFAULT 1.0;
  ```

---

### 🟡 Day 2: Service Layer Implementation

#### Morning:
- [ ] Create `/services/database/jtbd-analysis.service.ts`
  - [ ] `calculateForceScore(responses, force)` method
  - [ ] `analyzeResponseForces(response)` method
  - [ ] `aggregateForceScores(responses)` method
  - [ ] `getForceDistribution(surveyId)` method

- [ ] Create `/services/database/jtbd-mapping.service.ts`
  - [ ] `mapQuestionToForce(question)` method
  - [ ] `validateForceCompletion(questions)` method
  - [ ] `getQuestionsByForce(surveyId, force)` method

#### Afternoon:
- [ ] Update `/services/database/survey-template.service.ts`
  - [ ] Add JTBD force to question creation
  - [ ] Add force validation on save
  - [ ] Add force distribution check

- [ ] Create `/lib/jtbd/calculations.ts`
  - [ ] Scoring algorithms
  - [ ] Weight calculations
  - [ ] Confidence intervals
  - [ ] Statistical functions

---

### 🟢 Day 3: API Endpoints

#### Morning:
- [ ] Create `/app/api/jtbd/analysis/route.ts`
  ```typescript
  // GET: Analyze survey responses for JTBD forces
  // Returns: Force scores, distribution, insights
  ```

- [ ] Create `/app/api/jtbd/calculate/route.ts`
  ```typescript
  // POST: Calculate JTBD scores for responses
  // Body: { responseIds: string[] }
  // Returns: { forces: {...}, confidence: number }
  ```

- [ ] Create `/app/api/surveys/[id]/jtbd/route.ts`
  ```typescript
  // GET: Get JTBD analysis for specific survey
  // Returns: Aggregate force analysis
  ```

#### Afternoon:
- [ ] Update existing endpoints to include JTBD:
  - [ ] `/app/api/templates/route.ts` - Include force in questions
  - [ ] `/app/api/surveys/[id]/responses/route.ts` - Add force analysis
  - [ ] `/app/api/organizations/[id]/insights/route.ts` - Include JTBD

---

### 🔵 Day 4: UI Components (Basic)

#### Morning:
- [ ] Create `/components/jtbd/ForceIndicator.tsx`
  - [ ] Visual indicator for force type
  - [ ] Color coding for each force
  - [ ] Tooltip with description

- [ ] Create `/components/jtbd/ForceScoreDisplay.tsx`
  - [ ] Score visualization (1-5 stars or bar)
  - [ ] Confidence indicator
  - [ ] Trend arrow if historical data

#### Afternoon:
- [ ] Update `/components/survey/QuestionCard.tsx`
  - [ ] Display JTBD force badge
  - [ ] Show force description
  - [ ] Indicate force weight

- [ ] Create `/components/jtbd/ForceDistributionChart.tsx`
  - [ ] Radar chart for 5 forces
  - [ ] Bar chart alternative
  - [ ] Export functionality

---

### ⚫ Day 5: Integration & Testing

#### Morning:
- [ ] Run all tests (TDD Refactor phase)
  ```bash
  npm run test:jtbd
  npm run test:integration
  ```

- [ ] Fix any failing tests
- [ ] Add missing test cases
- [ ] Performance testing

#### Afternoon:
- [ ] Manual testing checklist:
  - [ ] Create survey with JTBD questions
  - [ ] Map questions to all 5 forces
  - [ ] Submit responses
  - [ ] View force analysis
  - [ ] Export results

- [ ] Bug fixes and refinements

---

## 📊 Acceptance Criteria Checklist

### Functionality:
- [ ] All 5 JTBD forces available for mapping
- [ ] Questions can be assigned to forces
- [ ] Force scores calculate correctly (1-5 scale)
- [ ] Confidence scores provided
- [ ] API returns JTBD analysis

### Quality:
- [ ] Test coverage >95%
- [ ] No TypeScript errors
- [ ] ESLint passing
- [ ] Response time <200ms
- [ ] Documentation complete

### Integration:
- [ ] Database schema updated
- [ ] Migrations run successfully
- [ ] Existing features unaffected
- [ ] API backwards compatible
- [ ] UI displays JTBD data

---

## 🚨 Potential Blockers

1. **Schema Migration**
   - Risk: Existing data compatibility
   - Mitigation: Make fields nullable initially

2. **Performance**
   - Risk: Complex calculations slow
   - Mitigation: Add caching layer

3. **UI Complexity**
   - Risk: Too much information displayed
   - Mitigation: Progressive disclosure

---

## 📝 Notes

### Design Decisions:
- Use enum for forces (type safety)
- 1-5 scale for force strength
- Weight system for question importance
- Confidence based on response count

### Technical Considerations:
- Cache force calculations
- Batch process for efficiency
- Use database views for complex queries
- Consider Redis for real-time updates

---

## ✅ Definition of Done

Phase 1 is complete when:
1. ✅ All tests passing (>95% coverage)
2. ✅ Schema updated with JTBD fields
3. ✅ Services calculate forces correctly
4. ✅ API endpoints return JTBD data
5. ✅ Basic UI shows force information
6. ✅ Documentation updated
7. ✅ Code reviewed and approved
8. ✅ Performance benchmarks met
9. ✅ Stakeholder demo completed
10. ✅ Merged to develop branch

---

## 🔄 Daily Update Section

### Day 1 Progress:
- [ ] Morning tasks complete?
- [ ] Afternoon tasks complete?
- [ ] Blockers encountered:
- [ ] Decisions made:
- [ ] Tomorrow's priority:

### Day 2 Progress:
- [ ] Morning tasks complete?
- [ ] Afternoon tasks complete?
- [ ] Blockers encountered:
- [ ] Decisions made:
- [ ] Tomorrow's priority:

(Continue for each day...)

---

*Update this file at the end of each work session.*

**Phase Started:** 2025-01-08  
**Target Completion:** 2025-01-22  
**Actual Completion:** TBD