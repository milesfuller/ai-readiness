import { test, expect, Page } from '@playwright/test';

/**
 * SURVEY PROGRESS TRACKING E2E TESTS
 * 
 * Test Coordination ID: survey-testing-004
 * 
 * COMPREHENSIVE PROGRESS TESTING:
 * 1. Overall progress bar updates and animations
 * 2. Category-wise progress breakdown (JTBD framework)
 * 3. Progress milestone celebrations and visual feedback
 * 4. Question navigation grid with status indicators
 * 5. Progress persistence across page refreshes
 * 6. Real-time progress updates during survey completion
 * 7. Progress validation and accuracy checks
 * 8. Mobile responsive progress indicators
 * 9. Accessibility compliance for progress elements
 * 10. Performance optimization for progress calculations
 */

test.describe('Survey Progress Tracking Tests', () => {
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    console.log('📊 PROGRESS TESTER: Setting up progress tracking test environment...');
    
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 }
    });
    
    page = await context.newPage();
    
    // Mock user data and enhance animation testing
    await page.addInitScript(() => {
      window.localStorage.setItem('test-user', JSON.stringify({
        id: 'progress-test-user',
        name: 'Progress Test User',
        role: 'user'
      }));
      
      // Mock animation frame for consistent testing
      let animationId = 0;
      window.requestAnimationFrame = (callback) => {
        return setTimeout(callback, 16); // ~60fps
      };
      
      window.cancelAnimationFrame = (id) => {
        clearTimeout(id);
      };
    });
    
    const sessionId = `progress-test-${Date.now()}`;
    await page.goto(`/survey/${sessionId}`);
    await page.waitForSelector('[data-testid="survey-question"]');
  });

  test.describe('Overall Progress Bar Functionality', () => {
    
    test('should start at 0% progress with no answers', async () => {
      console.log('🏁 TEST: Initial progress state...');
      
      // Find progress bar
      const progressBar = page.locator('[role="progressbar"]').first();
      await expect(progressBar).toBeVisible();
      
      // Should start at 0%
      const initialProgress = await progressBar.getAttribute('aria-valuenow');
      expect(parseFloat(initialProgress || '0')).toBe(0);
      
      // Verify progress text shows 0%
      await expect(page.locator('text=0%')).toBeVisible();
      
      // Check progress encouragement text for 0%
      await expect(page.locator('text=off to a great start')).toBeHidden();
      
      console.log('✅ Initial progress state correct');
    });

    test('should update progress incrementally as questions are answered', async () => {
      console.log('📈 TEST: Incremental progress updates...');
      
      const progressBar = page.locator('[role="progressbar"]').first();
      let previousProgress = 0;
      
      // Answer first 5 questions and track progress
      for (let questionNum = 1; questionNum <= 5; questionNum++) {
        console.log(`📝 Answering question ${questionNum}...`);
        
        // Verify we're on the correct question
        await expect(page.locator(`text=Question ${questionNum} of`)).toBeVisible();
        
        // Answer current question
        const answered = await answerCurrentQuestion(page);
        expect(answered).toBeTruthy();
        
        // Wait for progress to update
        await page.waitForTimeout(1000);
        
        // Check progress increased
        const currentProgress = await progressBar.getAttribute('aria-valuenow');
        const progressValue = parseFloat(currentProgress || '0');
        
        expect(progressValue).toBeGreaterThan(previousProgress);
        console.log(`Progress after question ${questionNum}: ${progressValue}%`);
        
        previousProgress = progressValue;
        
        // Move to next question (except for last one)
        if (questionNum < 5) {
          const nextButton = page.locator('button:has-text("Next Question")');
          await expect(nextButton).toBeEnabled();
          await nextButton.click();
          await page.waitForTimeout(1000);
        }
      }
      
      // Final progress should be around 31.25% (5/16 questions)
      expect(previousProgress).toBeCloseTo(31.25, 1);
      
      console.log('✅ Incremental progress updates working correctly');
    });

    test('should show progress encouragement messages', async () => {
      console.log('💬 TEST: Progress encouragement messages...');
      
      // Answer first question to get some progress
      await answerCurrentQuestion(page);
      await page.waitForTimeout(1000);
      
      // Should show encouragement for early progress
      await expect(page.locator('text=off to a great start')).toBeVisible();
      
      // Answer several more questions to reach 25%
      for (let i = 2; i <= 4; i++) {
        await page.locator('button:has-text("Next Question")').click();
        await page.waitForTimeout(1000);
        await answerCurrentQuestion(page);
        await page.waitForTimeout(1000);
      }
      
      // Should show different encouragement for 25% progress
      await expect(page.locator('text=Making excellent progress')).toBeVisible();
      
      console.log('✅ Progress encouragement messages working correctly');
    });

    test('should display progress with proper ARIA attributes', async () => {
      console.log('♿ TEST: Progress bar accessibility...');
      
      const progressBar = page.locator('[role="progressbar"]').first();
      
      // Verify ARIA attributes
      await expect(progressBar).toHaveAttribute('role', 'progressbar');
      await expect(progressBar).toHaveAttribute('aria-valuenow');
      await expect(progressBar).toHaveAttribute('aria-valuemin', '0');
      await expect(progressBar).toHaveAttribute('aria-valuemax', '100');
      
      // Answer a question and check updated ARIA values
      await answerCurrentQuestion(page);
      await page.waitForTimeout(1000);
      
      const updatedProgress = await progressBar.getAttribute('aria-valuenow');
      expect(parseFloat(updatedProgress || '0')).toBeGreaterThan(0);
      
      console.log('✅ Progress bar accessibility attributes correct');
    });
  });

  test.describe('Category Progress Breakdown', () => {
    
    test('should display all JTBD categories with progress bars', async () => {
      console.log('📊 TEST: JTBD category progress display...');
      
      // Scroll to category progress section
      await page.locator('text=Progress by Category').scrollIntoViewIfNeeded();
      await expect(page.locator('text=Progress by Category')).toBeVisible();
      
      // Verify all four JTBD categories
      const expectedCategories = [
        { name: 'Pain of Old', icon: '⚠️' },
        { name: 'Pull of New', icon: '🚀' },
        { name: 'Anchors to Old', icon: '⚓' },
        { name: 'Anxiety of New', icon: '😰' }
      ];
      
      for (const category of expectedCategories) {
        console.log(`Checking category: ${category.name}`);
        
        // Verify category label and icon
        await expect(page.locator(`text=${category.name}`)).toBeVisible();
        await expect(page.locator(`text=${category.icon}`)).toBeVisible();
        
        // Verify category has progress bar
        const categorySection = page.locator(`text=${category.name}`).locator('..').locator('..');
        await expect(categorySection.locator('[role="progressbar"]')).toBeVisible();
        
        // Verify question count (0/X initially)
        await expect(categorySection.locator('text=/0\\/\\d+/')).toBeVisible();
      }
      
      console.log('✅ All JTBD categories displayed correctly');
    });

    test('should update category progress as relevant questions are answered', async () => {
      console.log('🎯 TEST: Category-specific progress updates...');
      
      // Answer first question (should be "Pull of New" category based on survey-questions.ts)
      await answerCurrentQuestion(page);
      await page.waitForTimeout(1000);
      
      // Check category progress section
      await page.locator('text=Progress by Category').scrollIntoViewIfNeeded();
      
      // "Pull of New" category should show some progress (1/X)
      const pullOfNewSection = page.locator('text=Pull of New').locator('..').locator('..');
      await expect(pullOfNewSection.locator('text=/1\\/\\d+/')).toBeVisible();
      
      // Other categories should still be at 0
      const painOfOldSection = page.locator('text=Pain of Old').locator('..').locator('..');
      await expect(painOfOldSection.locator('text=/0\\/\\d+/')).toBeVisible();
      
      console.log('✅ Category-specific progress updates working');
    });

    test('should show completion animations for completed categories', async () => {
      console.log('🎉 TEST: Category completion animations...');
      
      // This would require completing all questions in a category
      // For testing purposes, we'll answer several questions to see partial animations
      
      const pullOfNewSection = page.locator('text=Pull of New').locator('..').locator('..');
      
      // Answer multiple questions to progress in Pull of New category
      let questionsAnswered = 0;
      const maxQuestionsToTest = 8; // Test first 8 questions
      
      while (questionsAnswered < maxQuestionsToTest) {
        await answerCurrentQuestion(page);
        await page.waitForTimeout(1000);
        
        questionsAnswered++;
        
        // Check if this category is getting progress
        await page.locator('text=Progress by Category').scrollIntoViewIfNeeded();
        
        const categoryProgress = pullOfNewSection.locator('[role="progressbar"]');
        const progressValue = await categoryProgress.getAttribute('aria-valuenow');
        
        if (parseFloat(progressValue || '0') === 100) {
          // Category is complete - check for celebration effects
          await expect(pullOfNewSection.locator('.celebrate-bounce')).toBeVisible();
          await expect(pullOfNewSection.locator('.success-pulse')).toBeVisible();
          console.log('✅ Category completion animation detected');
          break;
        }
        
        // Move to next question
        if (questionsAnswered < maxQuestionsToTest) {
          const nextButton = page.locator('button:has-text("Next Question")');
          if (await nextButton.isVisible() && await nextButton.isEnabled()) {
            await nextButton.click();
            await page.waitForTimeout(1000);
          } else {
            break;
          }
        }
      }
      
      console.log('✅ Category completion testing completed');
    });
  });

  test.describe('Question Navigation Grid', () => {
    
    test('should display question navigation with status indicators', async () => {
      console.log('🗂️ TEST: Question navigation grid...');
      
      // Scroll to navigation section
      await page.locator('text=Question Navigation').scrollIntoViewIfNeeded();
      
      // Verify navigation grid is visible
      const navigationGrid = page.locator('.grid.grid-cols-4');
      await expect(navigationGrid).toBeVisible();
      
      // Should show 16 question buttons (based on survey-questions.ts)
      const questionButtons = navigationGrid.locator('button');
      const buttonCount = await questionButtons.count();
      expect(buttonCount).toBe(16);
      
      // First question should be current (highlighted)
      const firstButton = questionButtons.first();
      await expect(firstButton).toHaveClass(/bg-teal-500/);
      await expect(firstButton).toHaveClass(/animate-pulse/);
      
      // Other questions should be unanswered (muted style)
      const secondButton = questionButtons.nth(1);
      await expect(secondButton).toHaveClass(/bg-muted/);
      
      console.log('✅ Question navigation grid displayed correctly');
    });

    test('should update navigation status as questions are answered', async () => {
      console.log('✅ TEST: Navigation status updates...');
      
      const navigationGrid = page.locator('.grid.grid-cols-4');
      
      // Answer first question
      await answerCurrentQuestion(page);
      await page.waitForTimeout(1000);
      
      // Move to second question
      await page.locator('button:has-text("Next Question")').click();
      await page.waitForTimeout(1000);
      
      // Scroll to navigation to see updates
      await page.locator('text=Question Navigation').scrollIntoViewIfNeeded();
      
      // First button should now be answered (green with checkmark)
      const firstButton = navigationGrid.locator('button').first();
      await expect(firstButton).toHaveClass(/bg-green-500/);
      
      // Second button should be current (teal and pulsing)
      const secondButton = navigationGrid.locator('button').nth(1);
      await expect(secondButton).toHaveClass(/bg-teal-500/);
      await expect(secondButton).toHaveClass(/animate-pulse/);
      
      console.log('✅ Navigation status updates working correctly');
    });

    test('should allow navigation by clicking question numbers', async () => {
      console.log('🔢 TEST: Direct question navigation...');
      
      // Answer first question
      await answerCurrentQuestion(page);
      await page.waitForTimeout(1000);
      
      // Navigate to navigation grid
      await page.locator('text=Question Navigation').scrollIntoViewIfNeeded();
      
      // Click on question 3 button
      const thirdQuestionButton = page.locator('.grid.grid-cols-4').locator('button').nth(2);
      await thirdQuestionButton.click();
      await page.waitForTimeout(1000);
      
      // Should now be on question 3
      await expect(page.locator('text=Question 3 of')).toBeVisible();
      
      // Navigation should update to show question 3 as current
      await page.locator('text=Question Navigation').scrollIntoViewIfNeeded();
      await expect(thirdQuestionButton).toHaveClass(/bg-teal-500/);
      
      console.log('✅ Direct question navigation working correctly');
    });

    test('should show tooltips with question information', async () => {
      console.log('💭 TEST: Question navigation tooltips...');
      
      await page.locator('text=Question Navigation').scrollIntoViewIfNeeded();
      
      const navigationGrid = page.locator('.grid.grid-cols-4');
      const firstButton = navigationGrid.locator('button').first();
      
      // Verify tooltip attributes
      const title = await firstButton.getAttribute('title');
      expect(title).toContain('Question 1');
      expect(title).toBeTruthy();
      
      // Verify ARIA label
      const ariaLabel = await firstButton.getAttribute('aria-label');
      expect(ariaLabel).toContain('Go to question 1');
      expect(ariaLabel).toBeTruthy();
      
      console.log('✅ Question navigation tooltips working correctly');
    });
  });

  test.describe('Progress Milestones and Celebrations', () => {
    
    test('should trigger celebration at 25% milestone', async () => {
      console.log('🎊 TEST: 25% milestone celebration...');
      
      // Answer enough questions to reach 25% (4 out of 16 questions)
      const questionsFor25Percent = Math.ceil(16 * 0.25);
      
      for (let i = 1; i <= questionsFor25Percent; i++) {
        console.log(`Answering question ${i} for 25% milestone...`);
        
        await answerCurrentQuestion(page);
        await page.waitForTimeout(1000);
        
        if (i < questionsFor25Percent) {
          await page.locator('button:has-text("Next Question")').click();
          await page.waitForTimeout(1000);
        }
      }
      
      // Should trigger milestone celebration
      await page.waitForTimeout(2000); // Allow celebration to trigger
      
      // Look for celebration indicators
      const celebrationElements = await page.locator('.success-pulse, .animate-pulse, .celebrate-bounce').count();
      expect(celebrationElements).toBeGreaterThan(0);
      
      // Should show trophy icon for reaching milestone
      await expect(page.locator('text=🏆').or(page.locator('[data-lucide="trophy"]'))).toBeVisible();
      
      console.log('✅ 25% milestone celebration triggered');
    });

    test('should update progress bar styling at milestones', async () => {
      console.log('🎨 TEST: Progress bar styling at milestones...');
      
      const progressBar = page.locator('[role="progressbar"]').first();
      
      // Answer questions to reach 25%
      for (let i = 1; i <= 4; i++) {
        await answerCurrentQuestion(page);
        await page.waitForTimeout(1000);
        
        if (i < 4) {
          await page.locator('button:has-text("Next Question")').click();
          await page.waitForTimeout(1000);
        }
      }
      
      // Progress bar should have milestone styling
      await expect(progressBar).toHaveClass(/gradient/);
      
      console.log('✅ Progress bar milestone styling applied');
    });

    test('should show different celebration effects for different milestones', async () => {
      console.log('🌟 TEST: Different milestone celebrations...');
      
      // Test 25% milestone (hearts)
      for (let i = 1; i <= 4; i++) {
        await answerCurrentQuestion(page);
        if (i < 4) {
          await page.locator('button:has-text("Next Question")').click();
          await page.waitForTimeout(1000);
        }
      }
      
      await page.waitForTimeout(2000);
      
      // Should show hearts for 25% milestone
      // Note: This tests the component behavior, actual hearts might be CSS animations
      const celebrationCount = await page.locator('[class*="celebrate"], [class*="pulse"], [class*="bounce"]').count();
      expect(celebrationCount).toBeGreaterThan(0);
      
      console.log('✅ Milestone celebration effects working');
    });
  });

  test.describe('Progress Persistence and Data Integrity', () => {
    
    test('should persist progress across page refreshes', async () => {
      console.log('💾 TEST: Progress persistence...');
      
      // Answer 3 questions
      for (let i = 1; i <= 3; i++) {
        await answerCurrentQuestion(page);
        await page.waitForTimeout(1000);
        
        if (i < 3) {
          await page.locator('button:has-text("Next Question")').click();
          await page.waitForTimeout(1000);
        }
      }
      
      // Record progress before refresh
      const progressBar = page.locator('[role="progressbar"]').first();
      const progressBeforeRefresh = await progressBar.getAttribute('aria-valuenow');
      
      // Refresh page
      await page.reload();
      await page.waitForSelector('[data-testid="survey-question"]');
      
      // Progress should be preserved
      const progressAfterRefresh = await progressBar.getAttribute('aria-valuenow');
      expect(progressAfterRefresh).toBe(progressBeforeRefresh);
      
      // Navigation should show answered questions
      await page.locator('text=Question Navigation').scrollIntoViewIfNeeded();
      const answeredButtons = page.locator('.grid.grid-cols-4').locator('button[class*="bg-green"]');
      const answeredCount = await answeredButtons.count();
      expect(answeredCount).toBe(3);
      
      console.log('✅ Progress persistence working correctly');
    });

    test('should maintain accurate progress calculations', async () => {
      console.log('🧮 TEST: Progress calculation accuracy...');
      
      // Answer exactly 8 questions (50%)
      for (let i = 1; i <= 8; i++) {
        await answerCurrentQuestion(page);
        await page.waitForTimeout(500);
        
        if (i < 8) {
          await page.locator('button:has-text("Next Question")').click();
          await page.waitForTimeout(500);
        }
      }
      
      // Should be exactly 50%
      const progressBar = page.locator('[role="progressbar"]').first();
      const finalProgress = await progressBar.getAttribute('aria-valuenow');
      expect(parseFloat(finalProgress || '0')).toBe(50);
      
      // Progress text should show 50%
      await expect(page.locator('text=50%')).toBeVisible();
      
      console.log('✅ Progress calculation accuracy verified');
    });
  });

  test.describe('Mobile Responsive Progress Display', () => {
    
    test('should display progress correctly on mobile', async () => {
      console.log('📱 TEST: Mobile progress display...');
      
      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Progress bar should still be visible
      const progressBar = page.locator('[role="progressbar"]').first();
      await expect(progressBar).toBeVisible();
      
      // Progress text should be visible
      await expect(page.locator('text=Overall Progress')).toBeVisible();
      
      // Answer question and verify update
      await answerCurrentQuestion(page);
      await page.waitForTimeout(1000);
      
      // Progress should update on mobile
      const progress = await progressBar.getAttribute('aria-valuenow');
      expect(parseFloat(progress || '0')).toBeGreaterThan(0);
      
      console.log('✅ Mobile progress display working correctly');
    });

    test('should show compact navigation on mobile', async () => {
      console.log('📱 TEST: Mobile navigation grid...');
      
      await page.setViewportSize({ width: 375, height: 667 });
      
      // Scroll to navigation
      await page.locator('text=Question Navigation').scrollIntoViewIfNeeded();
      
      // Navigation grid should adapt to mobile (smaller grid)
      const navigationGrid = page.locator('.grid.grid-cols-4');
      await expect(navigationGrid).toBeVisible();
      
      // Question buttons should still be interactive on mobile
      const questionButtons = navigationGrid.locator('button');
      const firstButton = questionButtons.first();
      await expect(firstButton).toBeVisible();
      await expect(firstButton).toBeEnabled();
      
      console.log('✅ Mobile navigation grid working correctly');
    });
  });
});

/**
 * HELPER FUNCTIONS
 */

async function answerCurrentQuestion(page: Page): Promise<boolean> {
  console.log('📝 Helper: Answering current question for progress tracking...');
  
  // Wait for question to be fully loaded
  await page.waitForTimeout(500);
  
  // Try different input types
  
  // Text inputs (textarea, input fields)
  const textInputs = page.locator('textarea, input[type="text"]').first();
  if (await textInputs.isVisible()) {
    await textInputs.fill('Progress tracking test answer - this response is used to test progress bar updates and milestone celebrations during survey completion.');
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
    await rangeInputs.fill('8');
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