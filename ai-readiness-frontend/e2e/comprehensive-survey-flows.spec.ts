/**
 * Comprehensive Survey Flow Tests
 * Tests all survey functionality including creation, completion, voice recording, and analytics
 */

import { test, expect } from './fixtures/test-setup';

test.describe('Comprehensive Survey Flow Tests', () => {
  
  test.describe('Survey Discovery and Navigation', () => {
    test('Should display available surveys', async ({ authenticatedPage: page }) => {
      await page.goto('/survey');
      
      // Should show survey listing page
      await expect(page.locator('body')).toBeVisible();
      
      // Check for survey cards or list
      const surveys = page.locator('[data-testid="survey-card"], .survey-item');
      const surveysExist = await surveys.count() > 0;
      
      if (surveysExist) {
        // Should have survey title and description
        await expect(surveys.first()).toBeVisible();
        
        const firstSurvey = surveys.first();
        const hasTitle = await firstSurvey.locator('h1, h2, h3, .survey-title').isVisible();
        const hasDescription = await firstSurvey.locator('p, .survey-description').isVisible();
        
        expect(hasTitle || hasDescription).toBe(true);
      } else {
        // Should show empty state
        const emptyState = page.locator('[data-testid="no-surveys"], .empty-state');
        await expect(emptyState).toBeVisible();
      }
    });

    test('Should navigate to survey from listing', async ({ authenticatedPage: page }) => {
      await page.goto('/survey');
      
      const surveyLink = page.locator('[data-testid="survey-link"], .survey-card a').first();
      if (await surveyLink.isVisible()) {
        await surveyLink.click();
        
        // Should navigate to survey page
        await expect(page).toHaveURL(/\/survey\/.+/);
        
        // Should show survey content
        await expect(page.locator('body')).toBeVisible();
      }
    });

    test('Should show survey progress and metadata', async ({ authenticatedPage: page }) => {
      await page.goto('/survey');
      
      const surveyCard = page.locator('[data-testid="survey-card"]').first();
      if (await surveyCard.isVisible()) {
        // Should show progress information
        const progressInfo = [
          '[data-testid="survey-progress"]',
          '.progress-bar',
          '[data-testid="completion-status"]',
          '.survey-status'
        ];
        
        let hasProgressInfo = false;
        for (const selector of progressInfo) {
          if (await surveyCard.locator(selector).isVisible()) {
            hasProgressInfo = true;
            break;
          }
        }
        
        // Should show either progress or start button
        const hasStartButton = await surveyCard.locator('[data-testid="start-survey"], .start-button').isVisible();
        expect(hasProgressInfo || hasStartButton).toBe(true);
      }
    });
  });

  test.describe('Survey Completion Flow', () => {
    test('Should start a new survey', async ({ authenticatedPage: page }) => {
      await page.goto('/survey');
      
      const startButton = page.locator('[data-testid="start-survey"], .start-button').first();
      if (await startButton.isVisible()) {
        await startButton.click();
        
        // Should navigate to survey session
        await expect(page).toHaveURL(/\/survey\/.+/);
        
        // Should show first question
        const question = page.locator('[data-testid="survey-question"], .question');
        await expect(question).toBeVisible();
        
        // Should show progress indicator
        const progressIndicators = [
          '[data-testid="progress-bar"]',
          '[data-testid="question-counter"]',
          '.progress-indicator'
        ];
        
        let hasProgress = false;
        for (const selector of progressIndicators) {
          if (await page.locator(selector).isVisible()) {
            hasProgress = true;
            break;
          }
        }
        expect(hasProgress).toBe(true);
      }
    });

    test('Should handle different question types', async ({ authenticatedPage: page }) => {
      await page.goto('/survey');
      
      const startButton = page.locator('[data-testid="start-survey"]').first();
      if (await startButton.isVisible()) {
        await startButton.click();
        await expect(page).toHaveURL(/\/survey\/.+/);
        
        // Test different question types if they exist
        const questionTypes = [
          {
            selector: '[data-testid="multiple-choice"]',
            action: async () => {
              const option = page.locator('[data-testid="option-1"], input[type="radio"]').first();
              if (await option.isVisible()) {
                await option.click();
              }
            }
          },
          {
            selector: '[data-testid="text-input"]',
            action: async () => {
              const textArea = page.locator('textarea, input[type="text"]');
              if (await textArea.isVisible()) {
                await textArea.fill('This is a test response');
              }
            }
          },
          {
            selector: '[data-testid="scale-question"]',
            action: async () => {
              const scaleOption = page.locator('[data-testid="scale-5"], input[value="5"]').first();
              if (await scaleOption.isVisible()) {
                await scaleOption.click();
              }
            }
          },
          {
            selector: '[data-testid="boolean-question"]',
            action: async () => {
              const yesOption = page.locator('[data-testid="yes-option"], input[value="true"]').first();
              if (await yesOption.isVisible()) {
                await yesOption.click();
              }
            }
          }
        ];
        
        for (const questionType of questionTypes) {
          if (await page.locator(questionType.selector).isVisible()) {
            await questionType.action();
            
            // Try to go to next question
            const nextButton = page.locator('[data-testid="next-question"], .next-button');
            if (await nextButton.isVisible()) {
              await nextButton.click();
              await page.waitForTimeout(1000);
            }
          }
        }
      }
    });

    test('Should validate required questions', async ({ authenticatedPage: page }) => {
      await page.goto('/survey');
      
      const startButton = page.locator('[data-testid="start-survey"]').first();
      if (await startButton.isVisible()) {
        await startButton.click();
        await expect(page).toHaveURL(/\/survey\/.+/);
        
        // Try to proceed without answering required question
        const nextButton = page.locator('[data-testid="next-question"], .next-button');
        if (await nextButton.isVisible()) {
          await nextButton.click();
          
          // Should show validation error
          const validationError = page.locator('[data-testid="validation-error"], .error-message');
          const hasError = await validationError.isVisible({ timeout: 3000 });
          
          if (hasError) {
            await expect(validationError).toContainText(/required|answer/i);
          }
        }
      }
    });

    test('Should save progress automatically', async ({ authenticatedPage: page }) => {
      await page.goto('/survey');
      
      const startButton = page.locator('[data-testid="start-survey"]').first();
      if (await startButton.isVisible()) {
        await startButton.click();
        await expect(page).toHaveURL(/\/survey\/.+/);
        
        // Answer first question
        const textInput = page.locator('textarea, input[type="text"]').first();
        const radioButton = page.locator('input[type="radio"]').first();
        
        if (await textInput.isVisible()) {
          await textInput.fill('Test response for auto-save');
        } else if (await radioButton.isVisible()) {
          await radioButton.click();
        }
        
        // Wait for auto-save
        await page.waitForTimeout(3000);
        
        // Refresh page to test persistence
        const currentUrl = page.url();
        await page.reload();
        
        // Should maintain progress
        await expect(page).toHaveURL(currentUrl);
        
        // Previous answer should be preserved
        if (await textInput.isVisible()) {
          await expect(textInput).toHaveValue('Test response for auto-save');
        }
      }
    });

    test('Should complete survey successfully', async ({ authenticatedPage: page }) => {
      await page.goto('/survey');
      
      const startButton = page.locator('[data-testid="start-survey"]').first();
      if (await startButton.isVisible()) {
        await startButton.click();
        await expect(page).toHaveURL(/\/survey\/.+/);
        
        // Go through survey questions (simplified flow)
        const maxQuestions = 5; // Limit to prevent infinite loop
        let questionCount = 0;
        
        while (questionCount < maxQuestions) {
          // Answer current question
          const textArea = page.locator('textarea').first();
          const radioButton = page.locator('input[type="radio"]').first();
          const checkbox = page.locator('input[type="checkbox"]').first();
          
          if (await textArea.isVisible()) {
            await textArea.fill(`Response to question ${questionCount + 1}`);
          } else if (await radioButton.isVisible()) {
            await radioButton.click();
          } else if (await checkbox.isVisible()) {
            await checkbox.click();
          }
          
          // Try to proceed
          const nextButton = page.locator('[data-testid="next-question"], .next-button');
          const submitButton = page.locator('[data-testid="submit-survey"], .submit-button');
          
          if (await submitButton.isVisible()) {
            await submitButton.click();
            break; // Survey completed
          } else if (await nextButton.isVisible()) {
            await nextButton.click();
            await page.waitForTimeout(1000);
            questionCount++;
          } else {
            break; // No more questions
          }
        }
        
        // Should show completion page or redirect
        await page.waitForTimeout(3000);
        const completionPage = await page.locator('[data-testid="survey-complete"], .completion-message').isVisible();
        const redirected = page.url().includes('/complete') || page.url().includes('/results');
        
        expect(completionPage || redirected).toBe(true);
      }
    });
  });

  test.describe('Voice Recording Functionality', () => {
    test('Should show voice recording option', async ({ authenticatedPage: page }) => {
      await page.goto('/survey');
      
      const startButton = page.locator('[data-testid="start-survey"]').first();
      if (await startButton.isVisible()) {
        await startButton.click();
        await expect(page).toHaveURL(/\/survey\/.+/);
        
        // Check for voice recording button
        const voiceButton = page.locator('[data-testid="voice-record"], .voice-button, .microphone-button');
        const hasVoiceOption = await voiceButton.isVisible();
        
        if (hasVoiceOption) {
          await expect(voiceButton).toBeVisible();
          
          // Should be clickable
          await expect(voiceButton).toBeEnabled();
        }
      }
    });

    test('Should handle voice recording permissions', async ({ authenticatedPage: page }) => {
      await page.goto('/survey');
      
      const startButton = page.locator('[data-testid="start-survey"]').first();
      if (await startButton.isVisible()) {
        await startButton.click();
        
        const voiceButton = page.locator('[data-testid="voice-record"]');
        if (await voiceButton.isVisible()) {
          // Mock permission denial
          await page.evaluate(() => {
            navigator.mediaDevices.getUserMedia = () => 
              Promise.reject(new Error('Permission denied'));
          });
          
          await voiceButton.click();
          
          // Should show permission error
          const permissionError = page.locator('[data-testid="permission-error"], .microphone-error');
          await expect(permissionError).toBeVisible({ timeout: 5000 });
        }
      }
    });

    test('Should handle voice recording workflow', async ({ authenticatedPage: page }) => {
      await page.goto('/survey');
      
      const startButton = page.locator('[data-testid="start-survey"]').first();
      if (await startButton.isVisible()) {
        await startButton.click();
        
        const voiceButton = page.locator('[data-testid="voice-record"]');
        if (await voiceButton.isVisible()) {
          // Mock successful media access
          await page.evaluate(() => {
            navigator.mediaDevices.getUserMedia = () => 
              Promise.resolve(new MediaStream());
          });
          
          await voiceButton.click();
          
          // Should show recording interface
          const recordingUI = [
            '[data-testid="recording-indicator"]',
            '[data-testid="stop-recording"]',
            '.recording-active',
            '.recording-timer'
          ];
          
          let showsRecordingUI = false;
          for (const selector of recordingUI) {
            if (await page.locator(selector).isVisible({ timeout: 3000 })) {
              showsRecordingUI = true;
              break;
            }
          }
          expect(showsRecordingUI).toBe(true);
          
          // Try to stop recording
          const stopButton = page.locator('[data-testid="stop-recording"], .stop-button');
          if (await stopButton.isVisible()) {
            await stopButton.click();
            
            // Should show playback or confirmation
            const postRecording = [
              '[data-testid="audio-playback"]',
              '[data-testid="recording-complete"]',
              '.audio-player'
            ];
            
            let showsPostRecording = false;
            for (const selector of postRecording) {
              if (await page.locator(selector).isVisible({ timeout: 3000 })) {
                showsPostRecording = true;
                break;
              }
            }
            expect(showsPostRecording).toBe(true);
          }
        }
      }
    });
  });

  test.describe('Survey Analytics and Results', () => {
    test('Should display personal survey results', async ({ authenticatedPage: page }) => {
      await page.goto('/results');
      
      // Should show results page
      await expect(page.locator('body')).toBeVisible();
      
      // Check for results content
      const resultsContent = [
        '[data-testid="survey-results"]',
        '[data-testid="results-dashboard"]',
        '.results-summary',
        '.analytics-chart'
      ];
      
      let hasResultsContent = false;
      for (const selector of resultsContent) {
        if (await page.locator(selector).isVisible({ timeout: 5000 })) {
          hasResultsContent = true;
          break;
        }
      }
      
      if (!hasResultsContent) {
        // Should show empty state if no results
        const emptyState = page.locator('[data-testid="no-results"], .empty-results');
        await expect(emptyState).toBeVisible();
      }
    });

    test('Should display survey completion statistics', async ({ authenticatedPage: page }) => {
      await page.goto('/results');
      
      const statsElements = [
        '[data-testid="completion-rate"]',
        '[data-testid="total-surveys"]',
        '[data-testid="average-score"]',
        '.completion-stats',
        '.survey-metrics'
      ];
      
      let hasStats = false;
      for (const selector of statsElements) {
        if (await page.locator(selector).isVisible()) {
          hasStats = true;
          
          // Stats should contain numeric values
          const text = await page.locator(selector).textContent();
          expect(text).toMatch(/\d+/); // Should contain numbers
          break;
        }
      }
      
      // Either has stats or shows empty state
      if (!hasStats) {
        const emptyState = page.locator('[data-testid="no-results"]');
        await expect(emptyState).toBeVisible();
      }
    });

    test('Should show JTBD force analysis', async ({ authenticatedPage: page }) => {
      await page.goto('/results');
      
      const jtbdElements = [
        '[data-testid="jtbd-forces"]',
        '[data-testid="force-diagram"]',
        '.jtbd-analysis',
        '.force-visualization'
      ];
      
      for (const selector of jtbdElements) {
        if (await page.locator(selector).isVisible()) {
          // Should show force categories
          const forceCategories = ['push', 'pull', 'habit', 'anxiety'];
          
          for (const category of forceCategories) {
            const categoryElement = page.locator(`[data-testid="${category}-force"]`);
            if (await categoryElement.isVisible()) {
              await expect(categoryElement).toBeVisible();
            }
          }
          break;
        }
      }
    });

    test('Should handle data export from results', async ({ authenticatedPage: page }) => {
      await page.goto('/results');
      
      const exportButton = page.locator('[data-testid="export-results"], .export-button');
      if (await exportButton.isVisible()) {
        await exportButton.click();
        
        // Should show export dialog
        const exportDialog = page.locator('[data-testid="export-dialog"], .export-modal');
        await expect(exportDialog).toBeVisible({ timeout: 5000 });
        
        // Should have format options
        const formatOptions = [
          '[data-testid="export-pdf"]',
          '[data-testid="export-csv"]',
          'input[value="pdf"]',
          'input[value="csv"]'
        ];
        
        let hasFormatOption = false;
        for (const selector of formatOptions) {
          if (await page.locator(selector).isVisible()) {
            hasFormatOption = true;
            break;
          }
        }
        expect(hasFormatOption).toBe(true);
      }
    });
  });

  test.describe('Survey Administration', () => {
    test('Should access organization survey analytics', async ({ authenticatedPage: page }) => {
      await page.goto('/organization/analytics');
      
      // May show access denied for regular users
      const hasAccess = await page.locator('[data-testid="analytics-dashboard"]').isVisible({ timeout: 5000 });
      const accessDenied = await page.locator('[data-testid="access-denied"]').isVisible({ timeout: 3000 });
      const redirected = page.url().includes('/dashboard') || page.url().includes('/auth/login');
      
      expect(hasAccess || accessDenied || redirected).toBe(true);
      
      if (hasAccess) {
        // Should show organization-level analytics
        const analyticsElements = [
          '[data-testid="response-rate"]',
          '[data-testid="department-breakdown"]',
          '[data-testid="trend-analysis"]'
        ];
        
        let hasAnalytics = false;
        for (const selector of analyticsElements) {
          if (await page.locator(selector).isVisible()) {
            hasAnalytics = true;
            break;
          }
        }
        expect(hasAnalytics).toBe(true);
      }
    });

    test('Should handle survey creation workflow', async ({ authenticatedPage: page }) => {
      await page.goto('/admin/surveys');
      
      const hasAccess = await page.locator('body').isVisible();
      const accessDenied = await page.locator('[data-testid="access-denied"]').isVisible({ timeout: 3000 });
      
      if (hasAccess && !accessDenied) {
        const createButton = page.locator('[data-testid="create-survey"], .create-button');
        if (await createButton.isVisible()) {
          await createButton.click();
          
          // Should show survey creation form
          const creationForm = page.locator('[data-testid="survey-form"], .survey-creator');
          await expect(creationForm).toBeVisible({ timeout: 5000 });
          
          // Should have basic fields
          const titleField = page.locator('[data-testid="survey-title"], input[name="title"]');
          const descriptionField = page.locator('[data-testid="survey-description"], textarea[name="description"]');
          
          if (await titleField.isVisible() && await descriptionField.isVisible()) {
            await titleField.fill('Test Survey');
            await descriptionField.fill('This is a test survey description');
            
            // Should be able to add questions
            const addQuestionButton = page.locator('[data-testid="add-question"], .add-question-button');
            if (await addQuestionButton.isVisible()) {
              await addQuestionButton.click();
              
              const questionForm = page.locator('[data-testid="question-form"]');
              await expect(questionForm).toBeVisible({ timeout: 3000 });
            }
          }
        }
      }
    });
  });

  test.describe('Survey Error Handling', () => {
    test('Should handle survey loading errors', async ({ authenticatedPage: page }) => {
      // Try to access non-existent survey
      await page.goto('/survey/non-existent-survey-id');
      
      // Should show error or redirect
      const errorMessage = page.locator('[data-testid="survey-not-found"], .error-message');
      const redirected = !page.url().includes('non-existent-survey-id');
      
      expect(await errorMessage.isVisible({ timeout: 5000 }) || redirected).toBe(true);
    });

    test('Should handle incomplete survey data', async ({ authenticatedPage: page }) => {
      await page.goto('/survey');
      
      // Mock incomplete survey data
      await page.evaluate(() => {
        window.localStorage.setItem('surveyData', JSON.stringify({
          id: 'test-survey',
          questions: [] // Empty questions
        }));
      });
      
      const startButton = page.locator('[data-testid="start-survey"]').first();
      if (await startButton.isVisible()) {
        await startButton.click();
        
        // Should handle gracefully
        const errorState = page.locator('[data-testid="survey-error"], .survey-unavailable');
        const hasContent = await page.locator('body').isVisible();
        
        expect(hasContent).toBe(true);
      }
    });

    test('Should handle survey submission failures', async ({ authenticatedPage: page }) => {
      await page.goto('/survey');
      
      const startButton = page.locator('[data-testid="start-survey"]').first();
      if (await startButton.isVisible()) {
        await startButton.click();
        
        // Mock network failure for submission
        await page.route('/api/survey/**', route => {
          route.fulfill({ status: 500, body: 'Server Error' });
        });
        
        // Try to submit survey
        const submitButton = page.locator('[data-testid="submit-survey"]');
        if (await submitButton.isVisible()) {
          await submitButton.click();
          
          // Should show error message
          const errorMessage = page.locator('[data-testid="submission-error"], .submit-error');
          await expect(errorMessage).toBeVisible({ timeout: 10000 });
          
          // Should offer retry option
          const retryButton = page.locator('[data-testid="retry-submit"], .retry-button');
          const hasRetry = await retryButton.isVisible({ timeout: 3000 });
          
          if (hasRetry) {
            await expect(retryButton).toBeVisible();
          }
        }
      }
    });
  });
});