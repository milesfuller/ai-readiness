import { test, expect, Page, BrowserContext } from '@playwright/test';

/**
 * SURVEY FLOW E2E TESTS
 * 
 * Test Coordination ID: survey-testing-001
 * 
 * COMPREHENSIVE TEST SCENARIOS:
 * 1. Survey session initialization and navigation
 * 2. Question progression with form validation
 * 3. Answer persistence across page refreshes
 * 4. Progress tracking and visual feedback
 * 5. Dynamic routing with sessionId parameter
 * 6. Survey completion workflow
 * 7. Error handling and recovery scenarios
 * 8. Mobile responsiveness and touch interactions
 */

test.describe('Survey Flow - Complete Journey Testing', () => {
  let page: Page;
  let context: BrowserContext;

  test.beforeEach(async ({ browser }) => {
    console.log('🚀 SURVEY TESTER: Setting up test environment...');
    
    context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
      permissions: ['microphone'], // For voice recording tests
      geolocation: { latitude: 37.7749, longitude: -122.4194 }, // San Francisco
    });
    
    page = await context.newPage();
    
    // Set up console logging for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`❌ BROWSER ERROR: ${msg.text()}`);
      }
    });
    
    // Mock user data for consistent testing
    await page.addInitScript(() => {
      window.localStorage.setItem('test-user', JSON.stringify({
        id: 'test-user-001',
        name: 'Test User',
        role: 'user'
      }));
    });
  });

  test.afterEach(async () => {
    console.log('🧹 SURVEY TESTER: Cleaning up test environment...');
    await context.close();
  });

  test.describe('Survey Session Creation and Routing', () => {
    
    test('should create new survey session with valid sessionId', async () => {
      console.log('📋 TEST: Survey session creation...');
      
      // Generate unique session ID
      const sessionId = `test-session-${Date.now()}`;
      
      // Navigate to survey with dynamic sessionId
      await page.goto(`/survey/${sessionId}`);
      
      // Wait for page to load and survey to initialize
      await page.waitForSelector('[data-testid="survey-container"]', { timeout: 10000 });
      
      // Verify session is properly initialized
      await expect(page).toHaveTitle(/AI Readiness Assessment/);
      await expect(page.locator('h1')).toContainText('AI Readiness Assessment');
      
      // Verify sessionId is properly handled in the URL
      expect(page.url()).toContain(sessionId);
      
      // Check initial question is displayed
      await expect(page.locator('[data-testid="survey-question"]')).toBeVisible();
      await expect(page.locator('text=Question 1 of')).toBeVisible();
      
      console.log('✅ Survey session created successfully');
    });

    test('should handle invalid sessionId gracefully', async () => {
      console.log('⚠️ TEST: Invalid session ID handling...');
      
      const invalidSessionId = 'invalid-session-with-special-chars-<script>';
      
      await page.goto(`/survey/${invalidSessionId}`);
      
      // Should either redirect or show error, not crash
      await page.waitForLoadState('networkidle');
      
      // Check that the page doesn't crash and shows some content
      const bodyText = await page.textContent('body');
      expect(bodyText).toBeTruthy();
      
      console.log('✅ Invalid session ID handled gracefully');
    });

    test('should maintain session state across page refreshes', async () => {
      console.log('🔄 TEST: Session persistence across refresh...');
      
      const sessionId = `persist-test-${Date.now()}`;
      
      await page.goto(`/survey/${sessionId}`);
      await page.waitForSelector('[data-testid="survey-question"]');
      
      // Answer the first question
      const textInput = page.locator('textarea').first();
      const testAnswer = 'This is my persistent test answer';
      
      await textInput.fill(testAnswer);
      await page.waitForTimeout(2000); // Allow auto-save to trigger
      
      // Refresh the page
      await page.reload();
      await page.waitForSelector('[data-testid="survey-question"]');
      
      // Verify answer is preserved
      const preservedAnswer = await textInput.inputValue();
      expect(preservedAnswer).toBe(testAnswer);
      
      console.log('✅ Session state preserved across refresh');
    });
  });

  test.describe('Question Navigation and Progression', () => {
    
    test('should navigate forward through all survey questions', async () => {
      console.log('➡️ TEST: Forward navigation through questions...');
      
      const sessionId = `nav-forward-${Date.now()}`;
      
      await page.goto(`/survey/${sessionId}`);
      await page.waitForSelector('[data-testid="survey-question"]');
      
      let currentQuestionNumber = 1;
      const maxQuestions = 16; // Based on survey-questions.ts
      
      while (currentQuestionNumber <= maxQuestions) {
        console.log(`📝 Answering question ${currentQuestionNumber}...`);
        
        // Verify current question number
        await expect(page.locator(`text=Question ${currentQuestionNumber} of`)).toBeVisible();
        
        // Answer current question
        const answered = await answerCurrentQuestion(page);
        expect(answered).toBeTruthy();
        
        // Check if this is the last question
        const isLastQuestion = currentQuestionNumber === maxQuestions;
        
        if (isLastQuestion) {
          // Look for complete survey button
          const completeButton = page.locator('button:has-text("Complete Survey")');
          await expect(completeButton).toBeVisible();
          await completeButton.click();
          
          // Wait for completion page
          await page.waitForURL(/\/complete/);
          break;
        } else {
          // Click next button
          const nextButton = page.locator('button:has-text("Next Question")');
          await expect(nextButton).toBeEnabled();
          await nextButton.click();
          
          currentQuestionNumber++;
          
          // Wait for next question to load
          await page.waitForTimeout(1000);
        }
      }
      
      console.log('✅ Successfully navigated through all questions');
    });

    test('should navigate backward through answered questions', async () => {
      console.log('⬅️ TEST: Backward navigation through questions...');
      
      const sessionId = `nav-backward-${Date.now()}`;
      
      await page.goto(`/survey/${sessionId}`);
      await page.waitForSelector('[data-testid="survey-question"]');
      
      // Answer first 3 questions and navigate forward
      for (let i = 1; i <= 3; i++) {
        console.log(`📝 Answering question ${i}...`);
        
        await answerCurrentQuestion(page);
        
        if (i < 3) {
          await page.locator('button:has-text("Next Question")').click();
          await page.waitForTimeout(1000);
        }
      }
      
      // Now navigate backward
      console.log('⬅️ Testing backward navigation...');
      
      const previousButton = page.locator('button:has-text("Previous")');
      await expect(previousButton).toBeEnabled();
      await previousButton.click();
      
      // Should be on question 2
      await expect(page.locator('text=Question 2 of')).toBeVisible();
      
      // Go back one more time
      await previousButton.click();
      
      // Should be on question 1 
      await expect(page.locator('text=Question 1 of')).toBeVisible();
      
      // Previous button should be disabled on first question
      await expect(previousButton).toBeDisabled();
      
      console.log('✅ Backward navigation working correctly');
    });

    test('should prevent navigation without required answers', async () => {
      console.log('⚠️ TEST: Required field validation...');
      
      const sessionId = `validation-${Date.now()}`;
      
      await page.goto(`/survey/${sessionId}`);
      await page.waitForSelector('[data-testid="survey-question"]');
      
      // Try to proceed without answering required question
      const nextButton = page.locator('button:has-text("Next Question")');
      
      // Next button should be disabled initially
      await expect(nextButton).toBeDisabled();
      
      // Fill in a partial answer (just spaces)
      const textInput = page.locator('textarea').first();
      await textInput.fill('   '); // Just whitespace
      
      // Next button should still be disabled
      await expect(nextButton).toBeDisabled();
      
      // Fill in a proper answer
      await textInput.fill('This is a proper answer');
      
      // Now next button should be enabled
      await expect(nextButton).toBeEnabled();
      
      console.log('✅ Required field validation working correctly');
    });
  });

  test.describe('Progress Tracking and Visual Feedback', () => {
    
    test('should update progress bar as questions are answered', async () => {
      console.log('📊 TEST: Progress tracking...');
      
      const sessionId = `progress-${Date.now()}`;
      
      await page.goto(`/survey/${sessionId}`);
      await page.waitForSelector('[data-testid="survey-question"]');
      
      // Check initial progress (should be 0%)
      const progressBar = page.locator('[role="progressbar"]');
      await expect(progressBar).toBeVisible();
      
      let initialProgress = await progressBar.getAttribute('aria-valuenow');
      expect(parseFloat(initialProgress || '0')).toBe(0);
      
      // Answer first question
      await answerCurrentQuestion(page);
      
      // Progress should increase
      await page.waitForTimeout(1000); // Allow progress to update
      let currentProgress = await progressBar.getAttribute('aria-valuenow');
      expect(parseFloat(currentProgress || '0')).toBeGreaterThan(0);
      
      console.log(`Progress after first question: ${currentProgress}%`);
      
      // Answer a few more questions and check progress increases
      for (let i = 2; i <= 4; i++) {
        await page.locator('button:has-text("Next Question")').click();
        await page.waitForTimeout(1000);
        
        await answerCurrentQuestion(page);
        
        const newProgress = await progressBar.getAttribute('aria-valuenow');
        expect(parseFloat(newProgress || '0')).toBeGreaterThan(parseFloat(currentProgress || '0'));
        currentProgress = newProgress;
        
        console.log(`Progress after question ${i}: ${currentProgress}%`);
      }
      
      console.log('✅ Progress tracking working correctly');
    });

    test('should show celebration effects at progress milestones', async () => {
      console.log('🎉 TEST: Milestone celebrations...');
      
      const sessionId = `celebration-${Date.now()}`;
      
      await page.goto(`/survey/${sessionId}`);
      await page.waitForSelector('[data-testid="survey-question"]');
      
      // Answer enough questions to trigger 25% milestone
      const questionsFor25Percent = Math.ceil(16 * 0.25); // Roughly 4 questions
      
      for (let i = 1; i <= questionsFor25Percent; i++) {
        await answerCurrentQuestion(page);
        
        if (i < questionsFor25Percent) {
          await page.locator('button:has-text("Next Question")').click();
          await page.waitForTimeout(1000);
        }
      }
      
      // Check for celebration elements
      await page.waitForTimeout(2000); // Allow celebration to trigger
      
      // Look for celebration indicators (confetti, hearts, etc.)
      const celebrationElements = await page.locator('.celebrate-bounce, .animate-pulse, .success-pulse').count();
      expect(celebrationElements).toBeGreaterThan(0);
      
      console.log('✅ Milestone celebrations working');
    });

    test('should display category-wise progress breakdown', async () => {
      console.log('📈 TEST: Category progress breakdown...');
      
      const sessionId = `category-progress-${Date.now()}`;
      
      await page.goto(`/survey/${sessionId}`);
      await page.waitForSelector('[data-testid="survey-question"]');
      
      // Scroll down to see progress by category section
      await page.locator('text=Progress by Category').scrollIntoViewIfNeeded();
      
      // Verify all JTBD categories are displayed
      const expectedCategories = [
        'Pain of Old',
        'Pull of New', 
        'Anchors to Old',
        'Anxiety of New'
      ];
      
      for (const category of expectedCategories) {
        await expect(page.locator(`text=${category}`)).toBeVisible();
        
        // Check category has progress bar
        const categorySection = page.locator(`text=${category}`).locator('..').locator('..');
        await expect(categorySection.locator('[role="progressbar"]')).toBeVisible();
      }
      
      console.log('✅ Category progress breakdown displayed correctly');
    });
  });

  test.describe('Question Types and Input Methods', () => {
    
    test('should handle text input method switching', async () => {
      console.log('💬 TEST: Text input method...');
      
      const sessionId = `text-input-${Date.now()}`;
      
      await page.goto(`/survey/${sessionId}`);
      await page.waitForSelector('[data-testid="survey-question"]');
      
      // Verify text input is selected by default
      const textButton = page.locator('button:has-text("Text")').first();
      await expect(textButton).toHaveClass(/default/);
      
      // Verify textarea is visible
      const textarea = page.locator('textarea');
      await expect(textarea).toBeVisible();
      
      // Fill in text answer
      const testAnswer = 'This is my text input answer for testing purposes.';
      await textarea.fill(testAnswer);
      
      // Verify character count updates
      const characterCount = page.locator('text=/\\d+ \/ \\d+ characters/');
      await expect(characterCount).toBeVisible();
      
      // Verify answer validation status
      const answerStatus = page.locator('text=Answer provided');
      await expect(answerStatus).toBeVisible();
      
      console.log('✅ Text input method working correctly');
    });

    test('should switch between text and voice input methods', async () => {
      console.log('🎤 TEST: Input method switching...');
      
      const sessionId = `input-switch-${Date.now()}`;
      
      await page.goto(`/survey/${sessionId}`);
      await page.waitForSelector('[data-testid="survey-question"]');
      
      // Start with text input
      const textButton = page.locator('button:has-text("Text")').first();
      const voiceButton = page.locator('button:has-text("Voice")').first();
      
      await expect(textButton).toHaveClass(/default/);
      await expect(page.locator('textarea')).toBeVisible();
      
      // Switch to voice input
      await voiceButton.click();
      
      await expect(voiceButton).toHaveClass(/default/);
      await expect(page.locator('textarea')).toBeHidden();
      
      // Should show voice recording interface
      await expect(page.locator('text=Tap to start recording')).toBeVisible();
      await expect(page.locator('button[aria-label="Start recording"]')).toBeVisible();
      
      // Switch back to text
      await textButton.click();
      
      await expect(textButton).toHaveClass(/default/);
      await expect(page.locator('textarea')).toBeVisible();
      
      console.log('✅ Input method switching working correctly');
    });

    test('should validate different question requirements', async () => {
      console.log('✅ TEST: Question requirement validation...');
      
      const sessionId = `validation-${Date.now()}`;
      
      await page.goto(`/survey/${sessionId}`);
      await page.waitForSelector('[data-testid="survey-question"]');
      
      // Test required questions
      let questionNumber = 1;
      const maxQuestionsToTest = 5;
      
      while (questionNumber <= maxQuestionsToTest) {
        console.log(`Testing validation for question ${questionNumber}...`);
        
        const nextButton = page.locator('button:has-text("Next Question")');
        
        // Initially next should be disabled for required questions
        const isRequired = await page.locator('text=Required').isVisible();
        
        if (isRequired) {
          await expect(nextButton).toBeDisabled();
          
          // Fill answer
          await answerCurrentQuestion(page);
          
          // Now next should be enabled
          await expect(nextButton).toBeEnabled();
        }
        
        if (questionNumber < maxQuestionsToTest) {
          await nextButton.click();
          await page.waitForTimeout(1000);
          questionNumber++;
        } else {
          break;
        }
      }
      
      console.log('✅ Question requirement validation working');
    });
  });

  test.describe('Auto-save and Data Persistence', () => {
    
    test('should auto-save answers during typing', async () => {
      console.log('💾 TEST: Auto-save functionality...');
      
      const sessionId = `autosave-${Date.now()}`;
      
      await page.goto(`/survey/${sessionId}`);
      await page.waitForSelector('[data-testid="survey-question"]');
      
      const textarea = page.locator('textarea');
      const testAnswer = 'This answer should be auto-saved automatically';
      
      // Type answer
      await textarea.fill(testAnswer);
      
      // Wait for auto-save to trigger (component has 3s debounce)
      await page.waitForTimeout(4000);
      
      // Look for save status indicators
      const saveStatus = page.locator('text=Saved, text=Auto-save');
      await expect(saveStatus).toBeVisible();
      
      // Refresh page to verify persistence
      await page.reload();
      await page.waitForSelector('[data-testid="survey-question"]');
      
      // Answer should be preserved
      const preservedAnswer = await textarea.inputValue();
      expect(preservedAnswer).toBe(testAnswer);
      
      console.log('✅ Auto-save working correctly');
    });

    test('should handle save errors gracefully', async () => {
      console.log('⚠️ TEST: Save error handling...');
      
      const sessionId = `save-error-${Date.now()}`;
      
      // Mock network failure
      await page.route('**/api/**', route => {
        route.abort('failed');
      });
      
      await page.goto(`/survey/${sessionId}`);
      await page.waitForSelector('[data-testid="survey-question"]');
      
      const textarea = page.locator('textarea');
      await textarea.fill('This answer will fail to save');
      
      // Wait for save attempt
      await page.waitForTimeout(4000);
      
      // Should show error status
      const errorStatus = page.locator('text=Save failed, text=Error');
      await expect(errorStatus).toBeVisible();
      
      // Remove route mock
      await page.unroute('**/api/**');
      
      console.log('✅ Save error handling working');
    });
  });

  test.describe('Survey Completion Flow', () => {
    
    test('should complete survey and navigate to completion page', async () => {
      console.log('🏁 TEST: Survey completion flow...');
      
      const sessionId = `complete-${Date.now()}`;
      
      await page.goto(`/survey/${sessionId}`);
      await page.waitForSelector('[data-testid="survey-question"]');
      
      // Answer all questions quickly (abbreviated for testing)
      let currentQuestion = 1;
      const totalQuestions = 16;
      
      // Answer first few questions to demonstrate flow
      for (let i = 1; i <= 3; i++) {
        await answerCurrentQuestion(page);
        
        if (i < 3) {
          await page.locator('button:has-text("Next Question")').click();
          await page.waitForTimeout(1000);
        }
      }
      
      // Skip to last question for completion testing
      const questionNavigation = page.locator('.grid .rounded-lg').nth(15); // Question 16
      await questionNavigation.click();
      await page.waitForTimeout(1000);
      
      // Answer final question
      await answerCurrentQuestion(page);
      
      // Complete survey
      const completeButton = page.locator('button:has-text("Complete Survey")');
      await expect(completeButton).toBeVisible();
      await completeButton.click();
      
      // Should navigate to completion page
      await page.waitForURL(/\/complete/);
      
      // Verify completion page elements
      await expect(page.locator('text=Assessment Complete')).toBeVisible();
      await expect(page.locator('text=Thank you')).toBeVisible();
      
      console.log('✅ Survey completion flow working correctly');
    });

    test('should display completion page with analysis results', async () => {
      console.log('📊 TEST: Completion page analysis display...');
      
      const sessionId = `analysis-${Date.now()}`;
      
      // Navigate directly to completion page for testing
      await page.goto(`/survey/${sessionId}/complete`);
      await page.waitForSelector('text=Assessment Complete');
      
      // Wait for analysis to process (3s delay in component)
      await page.waitForTimeout(4000);
      
      // Verify analysis elements
      await expect(page.locator('text=Your AI Readiness Score')).toBeVisible();
      await expect(page.locator('[role="progressbar"]')).toBeVisible(); // Circular progress
      
      // Verify JTBD category analysis
      await expect(page.locator('text=JTBD Framework Analysis')).toBeVisible();
      
      const jtbdCategories = [
        'Pain of Old',
        'Pull of New',
        'Anchors to Old', 
        'Anxiety of New'
      ];
      
      for (const category of jtbdCategories) {
        await expect(page.locator(`text=${category}`)).toBeVisible();
      }
      
      // Verify insights and recommendations
      await expect(page.locator('text=Key Insights')).toBeVisible();
      await expect(page.locator('text=Recommendations')).toBeVisible();
      
      console.log('✅ Completion page analysis display working');
    });

    test('should provide completion page action buttons', async () => {
      console.log('🔧 TEST: Completion page actions...');
      
      const sessionId = `actions-${Date.now()}`;
      
      await page.goto(`/survey/${sessionId}/complete`);
      await page.waitForSelector('text=Assessment Complete');
      
      // Wait for analysis to complete
      await page.waitForTimeout(4000);
      
      // Verify action buttons are present
      const actionButtons = [
        'Download Report',
        'Share Results',
        'View Dashboard',
        'Schedule Follow-up'
      ];
      
      for (const buttonText of actionButtons) {
        const button = page.locator(`button:has-text("${buttonText}")`);
        await expect(button).toBeVisible();
        await expect(button).toBeEnabled();
      }
      
      // Test dashboard navigation
      const dashboardButton = page.locator('button:has-text("View Dashboard")');
      await dashboardButton.click();
      
      // Should navigate to dashboard
      await page.waitForURL(/\/dashboard/);
      
      console.log('✅ Completion page actions working correctly');
    });
  });
});

/**
 * HELPER FUNCTIONS
 */

async function answerCurrentQuestion(page: Page): Promise<boolean> {
  console.log('📝 Helper: Answering current question...');
  
  // Wait for question to be fully loaded
  await page.waitForTimeout(500);
  
  // Try to answer based on available input types
  
  // Text inputs (textarea, input fields)
  const textInputs = page.locator('textarea, input[type="text"]').first();
  if (await textInputs.isVisible()) {
    await textInputs.fill('This is a comprehensive test answer that provides meaningful content for the question being asked. It includes sufficient detail to trigger validation and auto-save functionality.');
    return true;
  }
  
  // Radio buttons
  const radioButtons = page.locator('input[type="radio"]').first();
  if (await radioButtons.isVisible()) {
    await radioButtons.check();
    return true;
  }
  
  // Checkboxes
  const checkboxes = page.locator('input[type="checkbox"]').first();
  if (await checkboxes.isVisible()) {
    await checkboxes.check();
    return true;
  }
  
  // Range sliders
  const rangeInputs = page.locator('input[type="range"]').first();
  if (await rangeInputs.isVisible()) {
    await rangeInputs.fill('7');
    return true;
  }
  
  // Select dropdowns
  const selects = page.locator('select').first();
  if (await selects.isVisible()) {
    await selects.selectOption({ index: 1 });
    return true;
  }
  
  console.log('⚠️ No answerable input found for current question');
  return false;
}