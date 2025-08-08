/**
 * JTBD SERVICE LOGIC TESTS (TDD RED PHASE)
 * 
 * Tests for Jobs-to-be-Done service layer business logic.
 * These tests will FAIL initially until service implementation is complete.
 * 
 * RUN: npm run test:jtbd-service
 */

import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';

// JTBD Service imports (will fail until implemented)
import {
  JTBDAnalysisService,
  JTBDForceCalculator,
  JTBDResponseAnalyzer,
  JTBDConfidenceCalculator,
  JTBDRecommendationEngine,
  JTBDCacheService
} from '../../src/services/jtbd-service';

// JTBD Types imports
import {
  JTBDForce,
  JTBDForceDistribution,
  JTBDAnalysisResult,
  JTBDForceStrength,
  JTBDQuestionForceMapping,
  JTBDAnalysisRequest,
  JTBDAnalysisOptions,
  JTBDConfidenceInterval,
  JTBDRecommendation
} from '../../src/types/jtbd-schema';

// Mock survey responses
import { Response, Question, Survey } from '../../contracts/api';

// ============================================================================
// TEST DATA FACTORIES (TDD - These will fail until types exist)
// ============================================================================

const createMockSurveyResponses = (): Response[] => [
  {
    id: '1',
    sessionId: 'session-1',
    questionId: 'q1-demographic',
    value: 'Age: 25-34',
    answeredAt: new Date('2024-01-01'),
    timeSpent: 10
  },
  {
    id: '2', 
    sessionId: 'session-1',
    questionId: 'q2-pain',
    value: 'Current solution is too slow and crashes frequently',
    answeredAt: new Date('2024-01-01'),
    timeSpent: 45
  },
  {
    id: '3',
    sessionId: 'session-1', 
    questionId: 'q3-pull',
    value: 'I need better performance and reliability',
    answeredAt: new Date('2024-01-01'),
    timeSpent: 30
  },
  {
    id: '4',
    sessionId: 'session-2',
    questionId: 'q4-anchors',
    value: 'Already invested $50K in current system',
    answeredAt: new Date('2024-01-01'),
    timeSpent: 20
  },
  {
    id: '5',
    sessionId: 'session-2',
    questionId: 'q5-anxiety', 
    value: 'Worried about data migration risks',
    answeredAt: new Date('2024-01-01'),
    timeSpent: 25
  }
];

const createMockQuestionMappings = (): JTBDQuestionForceMapping[] => [
  {
    questionId: 'q1-demographic',
    surveyId: 'survey-1',
    force: 'demographic',
    weight: 1.0,
    confidence: 0.9,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    questionId: 'q2-pain',
    surveyId: 'survey-1', 
    force: 'pain_of_old',
    weight: 1.5,
    confidence: 0.95,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    questionId: 'q3-pull',
    surveyId: 'survey-1',
    force: 'pull_of_new',
    weight: 1.3,
    confidence: 0.88,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    questionId: 'q4-anchors',
    surveyId: 'survey-1',
    force: 'anchors_to_old',
    weight: 1.2,
    confidence: 0.85,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    questionId: 'q5-anxiety',
    surveyId: 'survey-1',
    force: 'anxiety_of_new',
    weight: 1.1,
    confidence: 0.82,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

const createMockAnalysisRequest = (): JTBDAnalysisRequest => ({
  surveyId: 'survey-1',
  responses: createMockSurveyResponses(),
  questionMappings: createMockQuestionMappings(),
  options: {
    includeConfidenceIntervals: true,
    includeRecommendations: true,
    minimumSampleSize: 30,
    confidenceLevel: 0.95,
    aggregationMethod: 'weighted_average',
    excludeOutliers: true,
    cacheResults: true
  },
  requestedAt: new Date('2024-01-01')
});

// ============================================================================
// FORCE CALCULATION ALGORITHM TESTS (RED PHASE)
// ============================================================================

describe('JTBDForceCalculator', () => {
  let forceCalculator: JTBDForceCalculator;

  beforeEach(() => {
    // This will FAIL until JTBDForceCalculator class is implemented
    forceCalculator = new JTBDForceCalculator();
  });

  describe('Force Strength Calculation', () => {
    test('calculateForceStrength computes weighted average correctly', async () => {
      // This test will FAIL until calculateForceStrength method is implemented
      const responses = createMockSurveyResponses().filter(r => 
        r.questionId === 'q2-pain' || r.questionId === 'q3-pull'
      );
      const mappings = createMockQuestionMappings().filter(m =>
        m.force === 'pain_of_old' || m.force === 'pull_of_new'
      );

      const strengthResult = await forceCalculator.calculateForceStrength(
        'pain_of_old',
        responses,
        mappings,
        { method: 'weighted_average' }
      );

      expect(strengthResult).toHaveProperty('strength');
      expect(strengthResult).toHaveProperty('confidence');
      expect(strengthResult).toHaveProperty('sampleSize');
      expect(strengthResult).toHaveProperty('standardDeviation');
      
      expect(strengthResult.strength).toBeGreaterThanOrEqual(1);
      expect(strengthResult.strength).toBeLessThanOrEqual(5);
      expect(strengthResult.confidence).toBeGreaterThanOrEqual(0);
      expect(strengthResult.confidence).toBeLessThanOrEqual(1);
    });

    test('calculateForceStrength handles insufficient data gracefully', async () => {
      // This test will FAIL until error handling is implemented
      const emptyResponses: Response[] = [];
      const mappings = createMockQuestionMappings();

      await expect(forceCalculator.calculateForceStrength(
        'pain_of_old',
        emptyResponses,
        mappings,
        { method: 'weighted_average', minimumSampleSize: 5 }
      )).rejects.toThrow('Insufficient data for force calculation');
    });

    test('calculateForceStrength applies response filtering correctly', async () => {
      // This test will FAIL until filtering logic is implemented
      const responses = [
        ...createMockSurveyResponses(),
        {
          id: '6',
          sessionId: 'session-3',
          questionId: 'q2-pain',
          value: '', // Empty response should be filtered
          answeredAt: new Date('2024-01-01'),
          timeSpent: 1
        },
        {
          id: '7',
          sessionId: 'session-4', 
          questionId: 'q2-pain',
          value: 'N/A', // Should be filtered as non-response
          answeredAt: new Date('2024-01-01'),
          timeSpent: 2
        }
      ];
      const mappings = createMockQuestionMappings();

      const result = await forceCalculator.calculateForceStrength(
        'pain_of_old',
        responses,
        mappings,
        { method: 'weighted_average', filterEmptyResponses: true }
      );

      // Should exclude empty/invalid responses from sample size
      expect(result.sampleSize).toBe(1); // Only one valid pain response
    });

    test('calculateForceStrength applies question weights correctly', async () => {
      // This test will FAIL until weighting logic is implemented
      const responses = createMockSurveyResponses();
      const mappings = createMockQuestionMappings().map(m => 
        m.force === 'pain_of_old' ? { ...m, weight: 2.0 } : m
      );

      const resultWithWeight = await forceCalculator.calculateForceStrength(
        'pain_of_old',
        responses,
        mappings,
        { method: 'weighted_average' }
      );

      const resultWithoutWeight = await forceCalculator.calculateForceStrength(
        'pain_of_old', 
        responses,
        mappings.map(m => ({ ...m, weight: 1.0 })),
        { method: 'weighted_average' }
      );

      // Higher weight should result in higher strength for same responses
      expect(resultWithWeight.strength).toBeGreaterThan(resultWithoutWeight.strength);
    });

    test('calculateForceStrength handles multiple aggregation methods', async () => {
      // This test will FAIL until multiple aggregation methods are implemented
      const responses = createMockSurveyResponses();
      const mappings = createMockQuestionMappings();

      const methods = ['weighted_average', 'median', 'mode', 'trimmed_mean'];
      
      for (const method of methods) {
        const result = await forceCalculator.calculateForceStrength(
          'pain_of_old',
          responses,
          mappings,
          { method: method as any }
        );
        
        expect(result.strength).toBeGreaterThanOrEqual(1);
        expect(result.strength).toBeLessThanOrEqual(5);
        expect(result.confidence).toBeGreaterThan(0);
      }
    });
  });

  describe('Force Distribution Calculation', () => {
    test('calculateForceDistribution computes all forces', async () => {
      // This test will FAIL until calculateForceDistribution method is implemented
      const request = createMockAnalysisRequest();
      
      const distribution = await forceCalculator.calculateForceDistribution(request);

      expect(distribution).toHaveProperty('surveyId');
      expect(distribution).toHaveProperty('demographic');
      expect(distribution).toHaveProperty('pain_of_old');
      expect(distribution).toHaveProperty('pull_of_new');
      expect(distribution).toHaveProperty('anchors_to_old');
      expect(distribution).toHaveProperty('anxiety_of_new');
      expect(distribution).toHaveProperty('totalResponses');
      expect(distribution).toHaveProperty('analysisDate');
      expect(distribution).toHaveProperty('methodology');

      expect(distribution.surveyId).toBe(request.surveyId);
      expect(distribution.totalResponses).toBeGreaterThan(0);
    });

    test('calculateForceDistribution validates force strength ranges', async () => {
      // This test will FAIL until validation is implemented
      const request = createMockAnalysisRequest();
      
      const distribution = await forceCalculator.calculateForceDistribution(request);

      const forces: JTBDForce[] = ['demographic', 'pain_of_old', 'pull_of_new', 'anchors_to_old', 'anxiety_of_new'];
      
      forces.forEach(force => {
        expect(distribution[force].strength).toBeGreaterThanOrEqual(1);
        expect(distribution[force].strength).toBeLessThanOrEqual(5);
        expect(distribution[force].confidence).toBeGreaterThanOrEqual(0);
        expect(distribution[force].confidence).toBeLessThanOrEqual(1);
        expect(distribution[force].sampleSize).toBeGreaterThan(0);
      });
    });

    test('calculateForceDistribution handles missing force mappings', async () => {
      // This test will FAIL until missing mapping handling is implemented
      const incompleteRequest = {
        ...createMockAnalysisRequest(),
        questionMappings: createMockQuestionMappings().filter(m => 
          m.force !== 'anxiety_of_new' // Remove anxiety mappings
        )
      };

      const distribution = await forceCalculator.calculateForceDistribution(incompleteRequest);

      // Should still calculate distribution but with lower confidence for missing forces
      expect(distribution.anxiety_of_new.confidence).toBeLessThan(0.5);
      expect(distribution.anxiety_of_new.sampleSize).toBe(0);
      expect(distribution.anxiety_of_new.strength).toBeGreaterThanOrEqual(1); // Default/estimated value
    });

    test('calculateForceDistribution respects minimum sample size', async () => {
      // This test will FAIL until sample size validation is implemented
      const request = {
        ...createMockAnalysisRequest(),
        options: {
          ...createMockAnalysisRequest().options,
          minimumSampleSize: 100 // Higher than our mock data
        }
      };

      await expect(forceCalculator.calculateForceDistribution(request))
        .rejects.toThrow('Insufficient sample size for reliable analysis');
    });
  });
});

// ============================================================================
// RESPONSE ANALYSIS TESTS (RED PHASE)
// ============================================================================

describe('JTBDResponseAnalyzer', () => {
  let responseAnalyzer: JTBDResponseAnalyzer;

  beforeEach(() => {
    // This will FAIL until JTBDResponseAnalyzer class is implemented
    responseAnalyzer = new JTBDResponseAnalyzer();
  });

  describe('Response Sentiment Analysis', () => {
    test('analyzeSentiment detects positive sentiment', async () => {
      // This test will FAIL until analyzeSentiment method is implemented
      const positiveResponses = [
        'I love the new features and improved performance',
        'This solution would save us so much time',
        'Exactly what we need to solve our problems'
      ];

      for (const response of positiveResponses) {
        const sentiment = await responseAnalyzer.analyzeSentiment(response);
        
        expect(sentiment).toHaveProperty('score');
        expect(sentiment).toHaveProperty('magnitude');
        expect(sentiment).toHaveProperty('label');
        
        expect(sentiment.score).toBeGreaterThan(0.3);
        expect(sentiment.label).toBe('positive');
      }
    });

    test('analyzeSentiment detects negative sentiment', async () => {
      // This test will FAIL until negative sentiment detection is implemented
      const negativeResponses = [
        'The current system is frustrating and unreliable',
        'I hate having to deal with these constant problems',
        'This is making my job much harder than it should be'
      ];

      for (const response of negativeResponses) {
        const sentiment = await responseAnalyzer.analyzeSentiment(response);
        
        expect(sentiment.score).toBeLessThan(-0.3);
        expect(sentiment.label).toBe('negative');
      }
    });

    test('analyzeSentiment detects neutral sentiment', async () => {
      // This test will FAIL until neutral sentiment detection is implemented
      const neutralResponses = [
        'The system works as expected',
        'We use this tool for data analysis',
        'Our current process involves multiple steps'
      ];

      for (const response of neutralResponses) {
        const sentiment = await responseAnalyzer.analyzeSentiment(response);
        
        expect(sentiment.score).toBeGreaterThanOrEqual(-0.3);
        expect(sentiment.score).toBeLessThanOrEqual(0.3);
        expect(sentiment.label).toBe('neutral');
      }
    });
  });

  describe('Force Intensity Scoring', () => {
    test('scoreForceIntensity rates pain responses correctly', async () => {
      // This test will FAIL until scoreForceIntensity method is implemented
      const painResponses = [
        { text: 'Slightly annoying', expectedIntensity: 2 },
        { text: 'Very frustrating and time-consuming', expectedIntensity: 4 },
        { text: 'Absolutely terrible, makes me want to quit', expectedIntensity: 5 },
        { text: 'Minor inconvenience', expectedIntensity: 1 }
      ];

      for (const { text, expectedIntensity } of painResponses) {
        const intensity = await responseAnalyzer.scoreForceIntensity(text, 'pain_of_old');
        
        expect(intensity).toHaveProperty('score');
        expect(intensity).toHaveProperty('confidence');
        expect(intensity).toHaveProperty('keywords');
        
        expect(intensity.score).toBeCloseTo(expectedIntensity, 0.5);
        expect(intensity.score).toBeGreaterThanOrEqual(1);
        expect(intensity.score).toBeLessThanOrEqual(5);
      }
    });

    test('scoreForceIntensity identifies key emotion words', async () => {
      // This test will FAIL until keyword extraction is implemented
      const emotionalResponse = 'I am extremely frustrated and angry with the slow performance';
      
      const intensity = await responseAnalyzer.scoreForceIntensity(emotionalResponse, 'pain_of_old');
      
      expect(intensity.keywords).toContain('extremely');
      expect(intensity.keywords).toContain('frustrated');
      expect(intensity.keywords).toContain('angry');
      expect(intensity.score).toBeGreaterThan(4);
    });

    test('scoreForceIntensity handles different force types', async () => {
      // This test will FAIL until multi-force scoring is implemented
      const response = 'I need better security and reliability features';
      
      const pullIntensity = await responseAnalyzer.scoreForceIntensity(response, 'pull_of_new');
      const painIntensity = await responseAnalyzer.scoreForceIntensity(response, 'pain_of_old');
      
      // Should score higher for pull (need/want) than pain (problem)
      expect(pullIntensity.score).toBeGreaterThan(painIntensity.score);
      expect(pullIntensity.keywords).toContain('need');
    });
  });

  describe('Response Clustering', () => {
    test('clusterResponses groups similar responses', async () => {
      // This test will FAIL until clusterResponses method is implemented
      const responses = [
        'System is too slow',
        'Performance is terrible',
        'Takes forever to load',
        'Need better reporting features',
        'Want more analytics',
        'Require advanced dashboards'
      ];

      const clusters = await responseAnalyzer.clusterResponses(responses, 'pain_of_old');
      
      expect(clusters).toBeInstanceOf(Array);
      expect(clusters.length).toBeGreaterThan(0);
      
      // Should group performance complaints together
      const performanceCluster = clusters.find(c => 
        c.responses.some(r => r.includes('slow') || r.includes('performance'))
      );
      expect(performanceCluster).toBeDefined();
      expect(performanceCluster.responses.length).toBeGreaterThanOrEqual(2);
    });

    test('clusterResponses calculates cluster strength', async () => {
      // This test will FAIL until cluster strength calculation is implemented
      const responses = createMockSurveyResponses().map(r => r.value);
      
      const clusters = await responseAnalyzer.clusterResponses(responses, 'pain_of_old');
      
      clusters.forEach(cluster => {
        expect(cluster).toHaveProperty('strength');
        expect(cluster).toHaveProperty('confidence');
        expect(cluster).toHaveProperty('keywords');
        
        expect(cluster.strength).toBeGreaterThanOrEqual(1);
        expect(cluster.strength).toBeLessThanOrEqual(5);
        expect(cluster.confidence).toBeGreaterThanOrEqual(0);
        expect(cluster.confidence).toBeLessThanOrEqual(1);
      });
    });
  });
});

// ============================================================================
// CONFIDENCE INTERVAL CALCULATION TESTS (RED PHASE)
// ============================================================================

describe('JTBDConfidenceCalculator', () => {
  let confidenceCalculator: JTBDConfidenceCalculator;

  beforeEach(() => {
    // This will FAIL until JTBDConfidenceCalculator class is implemented
    confidenceCalculator = new JTBDConfidenceCalculator();
  });

  describe('Confidence Interval Calculation', () => {
    test('calculateConfidenceInterval computes 95% CI correctly', async () => {
      // This test will FAIL until calculateConfidenceInterval method is implemented
      const forceStrength: JTBDForceStrength = {
        force: 'pain_of_old',
        strength: 3.5,
        confidence: 0.85,
        sampleSize: 100,
        standardDeviation: 1.2,
        createdAt: new Date()
      };

      const ci = await confidenceCalculator.calculateConfidenceInterval(
        forceStrength,
        0.95
      );

      expect(ci).toHaveProperty('lowerBound');
      expect(ci).toHaveProperty('upperBound');
      expect(ci).toHaveProperty('confidenceLevel');
      expect(ci).toHaveProperty('marginOfError');

      expect(ci.lowerBound).toBeLessThan(forceStrength.strength);
      expect(ci.upperBound).toBeGreaterThan(forceStrength.strength);
      expect(ci.confidenceLevel).toBe(0.95);
      expect(ci.marginOfError).toBeGreaterThan(0);
    });

    test('calculateConfidenceInterval handles different confidence levels', async () => {
      // This test will FAIL until multiple confidence levels are implemented
      const forceStrength: JTBDForceStrength = {
        force: 'pain_of_old',
        strength: 4.0,
        confidence: 0.9,
        sampleSize: 50,
        standardDeviation: 0.8,
        createdAt: new Date()
      };

      const ci90 = await confidenceCalculator.calculateConfidenceInterval(forceStrength, 0.90);
      const ci95 = await confidenceCalculator.calculateConfidenceInterval(forceStrength, 0.95);
      const ci99 = await confidenceCalculator.calculateConfidenceInterval(forceStrength, 0.99);

      // Higher confidence level should result in wider interval
      expect(ci99.marginOfError).toBeGreaterThan(ci95.marginOfError);
      expect(ci95.marginOfError).toBeGreaterThan(ci90.marginOfError);
    });

    test('calculateConfidenceInterval adjusts for small sample sizes', async () => {
      // This test will FAIL until small sample size adjustment is implemented
      const smallSampleStrength: JTBDForceStrength = {
        force: 'pain_of_old',
        strength: 3.8,
        confidence: 0.7,
        sampleSize: 15, // Small sample
        standardDeviation: 1.0,
        createdAt: new Date()
      };

      const largeSampleStrength: JTBDForceStrength = {
        ...smallSampleStrength,
        sampleSize: 200 // Large sample
      };

      const smallCI = await confidenceCalculator.calculateConfidenceInterval(smallSampleStrength, 0.95);
      const largeCI = await confidenceCalculator.calculateConfidenceInterval(largeSampleStrength, 0.95);

      // Small sample should have wider confidence interval
      expect(smallCI.marginOfError).toBeGreaterThan(largeCI.marginOfError);
    });
  });

  describe('Overall Analysis Confidence', () => {
    test('calculateOverallConfidence weighs multiple factors', async () => {
      // This test will FAIL until calculateOverallConfidence method is implemented
      const distribution = {
        surveyId: 'test',
        demographic: { strength: 3.2, confidence: 0.9, sampleSize: 100 },
        pain_of_old: { strength: 4.5, confidence: 0.95, sampleSize: 120 },
        pull_of_new: { strength: 3.8, confidence: 0.85, sampleSize: 90 },
        anchors_to_old: { strength: 2.1, confidence: 0.7, sampleSize: 60 },
        anxiety_of_new: { strength: 2.8, confidence: 0.8, sampleSize: 80 },
        totalResponses: 100,
        analysisDate: new Date(),
        methodology: 'weighted_average' as const
      };

      const overallConfidence = await confidenceCalculator.calculateOverallConfidence(distribution);

      expect(overallConfidence).toHaveProperty('confidence');
      expect(overallConfidence).toHaveProperty('factors');
      expect(overallConfidence).toHaveProperty('recommendations');

      expect(overallConfidence.confidence).toBeGreaterThanOrEqual(0);
      expect(overallConfidence.confidence).toBeLessThanOrEqual(1);
      expect(overallConfidence.factors).toBeInstanceOf(Array);
    });

    test('calculateOverallConfidence penalizes low sample sizes', async () => {
      // This test will FAIL until sample size penalty is implemented
      const highSampleDistribution = {
        surveyId: 'test',
        demographic: { strength: 3.0, confidence: 0.9, sampleSize: 200 },
        pain_of_old: { strength: 3.0, confidence: 0.9, sampleSize: 200 },
        pull_of_new: { strength: 3.0, confidence: 0.9, sampleSize: 200 },
        anchors_to_old: { strength: 3.0, confidence: 0.9, sampleSize: 200 },
        anxiety_of_new: { strength: 3.0, confidence: 0.9, sampleSize: 200 },
        totalResponses: 200,
        analysisDate: new Date(),
        methodology: 'weighted_average' as const
      };

      const lowSampleDistribution = {
        ...highSampleDistribution,
        demographic: { ...highSampleDistribution.demographic, sampleSize: 10 },
        pain_of_old: { ...highSampleDistribution.pain_of_old, sampleSize: 10 },
        totalResponses: 10
      };

      const highConfidence = await confidenceCalculator.calculateOverallConfidence(highSampleDistribution);
      const lowConfidence = await confidenceCalculator.calculateOverallConfidence(lowSampleDistribution);

      expect(highConfidence.confidence).toBeGreaterThan(lowConfidence.confidence);
    });
  });
});

// ============================================================================
// RECOMMENDATION ENGINE TESTS (RED PHASE)
// ============================================================================

describe('JTBDRecommendationEngine', () => {
  let recommendationEngine: JTBDRecommendationEngine;

  beforeEach(() => {
    // This will FAIL until JTBDRecommendationEngine class is implemented
    recommendationEngine = new JTBDRecommendationEngine();
  });

  describe('Strategic Recommendations', () => {
    test('generateRecommendations provides actionable insights for high pain scenarios', async () => {
      // This test will FAIL until generateRecommendations method is implemented
      const highPainAnalysis: JTBDAnalysisResult = {
        id: 'test-analysis',
        surveyId: 'test-survey',
        forceDistribution: {
          surveyId: 'test-survey',
          demographic: { strength: 3.0, confidence: 0.8, sampleSize: 100 },
          pain_of_old: { strength: 4.8, confidence: 0.95, sampleSize: 100 }, // High pain
          pull_of_new: { strength: 4.2, confidence: 0.9, sampleSize: 100 },
          anchors_to_old: { strength: 1.5, confidence: 0.7, sampleSize: 100 }, // Low anchors
          anxiety_of_new: { strength: 2.0, confidence: 0.8, sampleSize: 100 }, // Low anxiety
          totalResponses: 100,
          analysisDate: new Date(),
          methodology: 'weighted_average'
        },
        switchLikelihood: 0.85,
        primaryDrivers: ['pain_of_old', 'pull_of_new'],
        secondaryDrivers: ['demographic'],
        barriers: ['anxiety_of_new'],
        confidence: 0.9,
        recommendations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const recommendations = await recommendationEngine.generateRecommendations(highPainAnalysis);

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeGreaterThan(0);

      // Should recommend focusing on pain points
      const painRecommendation = recommendations.find(r => 
        r.category === 'messaging' && r.content.toLowerCase().includes('pain')
      );
      expect(painRecommendation).toBeDefined();

      // Should have high priority recommendations
      const highPriorityRecs = recommendations.filter(r => r.priority === 'high');
      expect(highPriorityRecs.length).toBeGreaterThan(0);
    });

    test('generateRecommendations addresses high anchor scenarios', async () => {
      // This test will FAIL until anchor-specific recommendations are implemented
      const highAnchorAnalysis: JTBDAnalysisResult = {
        id: 'test-analysis',
        surveyId: 'test-survey',
        forceDistribution: {
          surveyId: 'test-survey',
          demographic: { strength: 3.0, confidence: 0.8, sampleSize: 100 },
          pain_of_old: { strength: 3.5, confidence: 0.85, sampleSize: 100 },
          pull_of_new: { strength: 3.8, confidence: 0.88, sampleSize: 100 },
          anchors_to_old: { strength: 4.5, confidence: 0.92, sampleSize: 100 }, // High anchors
          anxiety_of_new: { strength: 3.2, confidence: 0.8, sampleSize: 100 },
          totalResponses: 100,
          analysisDate: new Date(),
          methodology: 'weighted_average'
        },
        switchLikelihood: 0.35,
        primaryDrivers: ['anchors_to_old'],
        secondaryDrivers: ['anxiety_of_new'],
        barriers: ['anchors_to_old', 'anxiety_of_new'],
        confidence: 0.85,
        recommendations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const recommendations = await recommendationEngine.generateRecommendations(highAnchorAnalysis);

      // Should recommend addressing switching costs
      const anchorRecommendation = recommendations.find(r => 
        r.content.toLowerCase().includes('migration') || 
        r.content.toLowerCase().includes('transition')
      );
      expect(anchorRecommendation).toBeDefined();

      // Should suggest gradual adoption strategies
      const gradualRecommendation = recommendations.find(r =>
        r.content.toLowerCase().includes('gradual') ||
        r.content.toLowerCase().includes('pilot')
      );
      expect(gradualRecommendation).toBeDefined();
    });

    test('generateRecommendations provides different recommendation categories', async () => {
      // This test will FAIL until categorized recommendations are implemented
      const analysis = {
        id: 'test-analysis',
        surveyId: 'test-survey',
        forceDistribution: {
          surveyId: 'test-survey',
          demographic: { strength: 3.0, confidence: 0.8, sampleSize: 100 },
          pain_of_old: { strength: 4.0, confidence: 0.9, sampleSize: 100 },
          pull_of_new: { strength: 3.5, confidence: 0.85, sampleSize: 100 },
          anchors_to_old: { strength: 2.5, confidence: 0.75, sampleSize: 100 },
          anxiety_of_new: { strength: 3.0, confidence: 0.8, sampleSize: 100 },
          totalResponses: 100,
          analysisDate: new Date(),
          methodology: 'weighted_average' as const
        },
        switchLikelihood: 0.7,
        primaryDrivers: ['pain_of_old', 'pull_of_new'],
        secondaryDrivers: ['demographic'],
        barriers: ['anxiety_of_new'],
        confidence: 0.85,
        recommendations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const recommendations = await recommendationEngine.generateRecommendations(analysis);

      const categories = [...new Set(recommendations.map(r => r.category))];
      
      expect(categories).toContain('messaging');
      expect(categories).toContain('product');
      expect(categories).toContain('marketing');
      expect(categories).toContain('sales');
    });
  });

  describe('Recommendation Prioritization', () => {
    test('prioritizeRecommendations orders by impact and feasibility', async () => {
      // This test will FAIL until prioritizeRecommendations method is implemented
      const recommendations: JTBDRecommendation[] = [
        {
          id: '1',
          category: 'messaging',
          content: 'Focus marketing on pain points',
          rationale: 'High pain scores indicate strong motivation',
          priority: 'medium',
          impact: 'high',
          effort: 'low',
          confidence: 0.9,
          createdAt: new Date()
        },
        {
          id: '2',
          category: 'product',
          content: 'Build migration tools',
          rationale: 'High anchors require switching cost reduction',
          priority: 'low',
          impact: 'medium',
          effort: 'high',
          confidence: 0.7,
          createdAt: new Date()
        }
      ];

      const prioritized = await recommendationEngine.prioritizeRecommendations(
        recommendations,
        { weightImpact: 0.6, weightEffort: 0.4 }
      );

      expect(prioritized).toBeInstanceOf(Array);
      expect(prioritized.length).toBe(recommendations.length);

      // First recommendation should have higher combined score
      expect(prioritized[0].priority).toBe('high');
      expect(prioritized[1].priority).toBe('medium');
    });

    test('prioritizeRecommendations considers confidence levels', async () => {
      // This test will FAIL until confidence weighting is implemented
      const lowConfidenceRec: JTBDRecommendation = {
        id: '1',
        category: 'messaging',
        content: 'Test message',
        rationale: 'Low confidence insight',
        priority: 'high',
        impact: 'high',
        effort: 'low',
        confidence: 0.3, // Low confidence
        createdAt: new Date()
      };

      const highConfidenceRec: JTBDRecommendation = {
        id: '2',
        category: 'messaging',
        content: 'Test message 2',
        rationale: 'High confidence insight',
        priority: 'medium',
        impact: 'high',
        effort: 'low',
        confidence: 0.95, // High confidence
        createdAt: new Date()
      };

      const prioritized = await recommendationEngine.prioritizeRecommendations([
        lowConfidenceRec,
        highConfidenceRec
      ]);

      // High confidence recommendation should be prioritized despite lower initial priority
      expect(prioritized[0].id).toBe('2');
    });
  });
});

// ============================================================================
// CACHE SERVICE TESTS (RED PHASE)
// ============================================================================

describe('JTBDCacheService', () => {
  let cacheService: JTBDCacheService;

  beforeEach(() => {
    // This will FAIL until JTBDCacheService class is implemented
    cacheService = new JTBDCacheService();
  });

  afterEach(async () => {
    // Clean up cache after each test
    if (cacheService && typeof cacheService.clear === 'function') {
      await cacheService.clear();
    }
  });

  describe('Analysis Result Caching', () => {
    test('cacheAnalysisResult stores and retrieves results', async () => {
      // This test will FAIL until cacheAnalysisResult method is implemented
      const mockResult: JTBDAnalysisResult = {
        id: 'cached-analysis',
        surveyId: 'test-survey',
        forceDistribution: {
          surveyId: 'test-survey',
          demographic: { strength: 3.0, confidence: 0.8, sampleSize: 100 },
          pain_of_old: { strength: 4.0, confidence: 0.9, sampleSize: 100 },
          pull_of_new: { strength: 3.5, confidence: 0.85, sampleSize: 100 },
          anchors_to_old: { strength: 2.5, confidence: 0.75, sampleSize: 100 },
          anxiety_of_new: { strength: 3.0, confidence: 0.8, sampleSize: 100 },
          totalResponses: 100,
          analysisDate: new Date(),
          methodology: 'weighted_average'
        },
        switchLikelihood: 0.7,
        primaryDrivers: ['pain_of_old'],
        secondaryDrivers: ['pull_of_new'],
        barriers: ['anchors_to_old'],
        confidence: 0.85,
        recommendations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const cacheKey = 'test-survey-analysis';
      await cacheService.cacheAnalysisResult(cacheKey, mockResult, 3600); // 1 hour TTL

      const retrieved = await cacheService.getAnalysisResult(cacheKey);
      expect(retrieved).toEqual(mockResult);
    });

    test('getAnalysisResult returns null for non-existent cache', async () => {
      // This test will FAIL until cache miss handling is implemented
      const result = await cacheService.getAnalysisResult('non-existent-key');
      expect(result).toBeNull();
    });

    test('cache respects TTL and expires entries', async () => {
      // This test will FAIL until TTL implementation is complete
      const mockResult: JTBDAnalysisResult = {
        id: 'ttl-test',
        surveyId: 'test',
        forceDistribution: {
          surveyId: 'test',
          demographic: { strength: 3.0, confidence: 0.8, sampleSize: 100 },
          pain_of_old: { strength: 4.0, confidence: 0.9, sampleSize: 100 },
          pull_of_new: { strength: 3.5, confidence: 0.85, sampleSize: 100 },
          anchors_to_old: { strength: 2.5, confidence: 0.75, sampleSize: 100 },
          anxiety_of_new: { strength: 3.0, confidence: 0.8, sampleSize: 100 },
          totalResponses: 100,
          analysisDate: new Date(),
          methodology: 'weighted_average'
        },
        switchLikelihood: 0.7,
        primaryDrivers: [],
        secondaryDrivers: [],
        barriers: [],
        confidence: 0.85,
        recommendations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const cacheKey = 'ttl-test-key';
      await cacheService.cacheAnalysisResult(cacheKey, mockResult, 1); // 1 second TTL

      // Should be available immediately
      let retrieved = await cacheService.getAnalysisResult(cacheKey);
      expect(retrieved).toEqual(mockResult);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1100));

      // Should be expired
      retrieved = await cacheService.getAnalysisResult(cacheKey);
      expect(retrieved).toBeNull();
    });
  });

  describe('Cache Management', () => {
    test('invalidateCache removes specific entries', async () => {
      // This test will FAIL until invalidateCache method is implemented
      const mockResult: JTBDAnalysisResult = {
        id: 'invalidate-test',
        surveyId: 'test',
        forceDistribution: {
          surveyId: 'test',
          demographic: { strength: 3.0, confidence: 0.8, sampleSize: 100 },
          pain_of_old: { strength: 4.0, confidence: 0.9, sampleSize: 100 },
          pull_of_new: { strength: 3.5, confidence: 0.85, sampleSize: 100 },
          anchors_to_old: { strength: 2.5, confidence: 0.75, sampleSize: 100 },
          anxiety_of_new: { strength: 3.0, confidence: 0.8, sampleSize: 100 },
          totalResponses: 100,
          analysisDate: new Date(),
          methodology: 'weighted_average'
        },
        switchLikelihood: 0.7,
        primaryDrivers: [],
        secondaryDrivers: [],
        barriers: [],
        confidence: 0.85,
        recommendations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const cacheKey = 'invalidate-test-key';
      await cacheService.cacheAnalysisResult(cacheKey, mockResult);

      // Verify it's cached
      let retrieved = await cacheService.getAnalysisResult(cacheKey);
      expect(retrieved).toEqual(mockResult);

      // Invalidate
      await cacheService.invalidateCache(cacheKey);

      // Should be gone
      retrieved = await cacheService.getAnalysisResult(cacheKey);
      expect(retrieved).toBeNull();
    });

    test('clear removes all cache entries', async () => {
      // This test will FAIL until clear method is implemented
      const mockResult1: JTBDAnalysisResult = {
        id: 'clear-test-1',
        surveyId: 'test1',
        forceDistribution: {
          surveyId: 'test1',
          demographic: { strength: 3.0, confidence: 0.8, sampleSize: 100 },
          pain_of_old: { strength: 4.0, confidence: 0.9, sampleSize: 100 },
          pull_of_new: { strength: 3.5, confidence: 0.85, sampleSize: 100 },
          anchors_to_old: { strength: 2.5, confidence: 0.75, sampleSize: 100 },
          anxiety_of_new: { strength: 3.0, confidence: 0.8, sampleSize: 100 },
          totalResponses: 100,
          analysisDate: new Date(),
          methodology: 'weighted_average'
        },
        switchLikelihood: 0.7,
        primaryDrivers: [],
        secondaryDrivers: [],
        barriers: [],
        confidence: 0.85,
        recommendations: [],
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const mockResult2 = { ...mockResult1, id: 'clear-test-2', surveyId: 'test2' };

      await cacheService.cacheAnalysisResult('key1', mockResult1);
      await cacheService.cacheAnalysisResult('key2', mockResult2);

      // Clear all
      await cacheService.clear();

      // Both should be gone
      const retrieved1 = await cacheService.getAnalysisResult('key1');
      const retrieved2 = await cacheService.getAnalysisResult('key2');
      
      expect(retrieved1).toBeNull();
      expect(retrieved2).toBeNull();
    });
  });
});

// ============================================================================
// INTEGRATION TESTS (RED PHASE)
// ============================================================================

describe('JTBD Service Integration', () => {
  let analysisService: JTBDAnalysisService;

  beforeEach(() => {
    // This will FAIL until JTBDAnalysisService class is implemented
    analysisService = new JTBDAnalysisService();
  });

  describe('End-to-End Analysis', () => {
    test('performAnalysis completes full JTBD workflow', async () => {
      // This test will FAIL until performAnalysis method is implemented
      const request = createMockAnalysisRequest();
      
      const result = await analysisService.performAnalysis(request);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('surveyId');
      expect(result).toHaveProperty('forceDistribution');
      expect(result).toHaveProperty('switchLikelihood');
      expect(result).toHaveProperty('primaryDrivers');
      expect(result).toHaveProperty('barriers');
      expect(result).toHaveProperty('recommendations');
      expect(result).toHaveProperty('confidence');

      expect(result.surveyId).toBe(request.surveyId);
      expect(result.switchLikelihood).toBeGreaterThanOrEqual(0);
      expect(result.switchLikelihood).toBeLessThanOrEqual(1);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    test('performAnalysis handles caching correctly', async () => {
      // This test will FAIL until caching integration is implemented
      const request = {
        ...createMockAnalysisRequest(),
        options: {
          ...createMockAnalysisRequest().options,
          cacheResults: true
        }
      };

      // First call should calculate and cache
      const startTime1 = performance.now();
      const result1 = await analysisService.performAnalysis(request);
      const duration1 = performance.now() - startTime1;

      // Second call should use cache (should be faster)
      const startTime2 = performance.now();
      const result2 = await analysisService.performAnalysis(request);
      const duration2 = performance.now() - startTime2;

      expect(result1).toEqual(result2);
      expect(duration2).toBeLessThan(duration1 * 0.5); // Should be significantly faster
    });

    test('performAnalysis validates input data', async () => {
      // This test will FAIL until input validation is implemented
      const invalidRequest = {
        ...createMockAnalysisRequest(),
        surveyId: '', // Invalid survey ID
        responses: [], // No responses
        questionMappings: [] // No mappings
      };

      await expect(analysisService.performAnalysis(invalidRequest))
        .rejects.toThrow('Invalid analysis request');
    });

    test('performAnalysis handles partial data gracefully', async () => {
      // This test will FAIL until graceful degradation is implemented
      const partialRequest = {
        ...createMockAnalysisRequest(),
        responses: createMockSurveyResponses().slice(0, 2), // Only 2 responses
        questionMappings: createMockQuestionMappings().slice(0, 2) // Only 2 mappings
      };

      const result = await analysisService.performAnalysis(partialRequest);

      expect(result).toBeDefined();
      expect(result.confidence).toBeLessThan(0.8); // Lower confidence due to limited data
      
      // Should include warning in recommendations
      const warningRec = result.recommendations.find(r => 
        r.content.toLowerCase().includes('sample size') ||
        r.content.toLowerCase().includes('more data')
      );
      expect(warningRec).toBeDefined();
    });
  });

  describe('Service Performance', () => {
    test('analysis completes within acceptable time limits', async () => {
      // This test will FAIL until performance optimization is complete
      const request = createMockAnalysisRequest();
      
      const startTime = performance.now();
      await analysisService.performAnalysis(request);
      const duration = performance.now() - startTime;

      // Should complete analysis in under 2 seconds for typical dataset
      expect(duration).toBeLessThan(2000);
    });

    test('analysis scales with response volume', async () => {
      // This test will FAIL until scalable implementation exists
      const baseResponses = createMockSurveyResponses();
      
      // Test with different response volumes
      const smallRequest = {
        ...createMockAnalysisRequest(),
        responses: baseResponses.slice(0, 10)
      };
      
      const largeRequest = {
        ...createMockAnalysisRequest(),
        responses: Array(1000).fill(null).map((_, i) => ({
          ...baseResponses[i % baseResponses.length],
          id: `response-${i}`,
          sessionId: `session-${Math.floor(i / 5)}`
        }))
      };

      const startTime1 = performance.now();
      await analysisService.performAnalysis(smallRequest);
      const smallDuration = performance.now() - startTime1;

      const startTime2 = performance.now();
      await analysisService.performAnalysis(largeRequest);
      const largeDuration = performance.now() - startTime2;

      // Large dataset should not take disproportionately longer
      expect(largeDuration).toBeLessThan(smallDuration * 50);
    });
  });
});

/**
 * TDD RED PHASE SERVICE TEST SUMMARY
 * 
 * These tests will FAIL until the following services are implemented:
 * ❌ JTBDAnalysisService - Main orchestration service
 * ❌ JTBDForceCalculator - Force strength calculation algorithms
 * ❌ JTBDResponseAnalyzer - Response sentiment and intensity analysis
 * ❌ JTBDConfidenceCalculator - Statistical confidence calculations
 * ❌ JTBDRecommendationEngine - Strategic recommendation generation
 * ❌ JTBDCacheService - Performance caching layer
 * ❌ Force aggregation algorithms
 * ❌ Sentiment analysis integration
 * ❌ Confidence interval calculations
 * ❌ Recommendation prioritization logic
 * ❌ Cache management with TTL
 * ❌ Input validation and error handling
 * ❌ Performance optimizations
 * 
 * Run: npm run test:jtbd-service to see all failing tests
 * 
 * Next Phase: Implement service classes and business logic to make tests pass (GREEN phase)
 */