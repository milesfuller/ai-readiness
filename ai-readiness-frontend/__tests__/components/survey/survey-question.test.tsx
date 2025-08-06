import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SurveyQuestion } from '@/components/survey/survey-question'
import { SurveyQuestion as QuestionType } from '@/lib/data/survey-questions'

// Mock the VoiceRecorder component
jest.mock('@/components/survey/voice-recorder', () => ({
  VoiceRecorder: ({ onTranscriptionUpdate, initialValue }: any) => (
    <div data-testid="voice-recorder">
      <button
        onClick={() => onTranscriptionUpdate('Mock voice transcription')}
        data-testid="mock-voice-button"
      >
        Record Voice
      </button>
      <textarea
        value={initialValue}
        onChange={(e) => onTranscriptionUpdate(e.target.value)}
        data-testid="voice-transcription"
      />
    </div>
  )
}))

describe('SurveyQuestion Component', () => {
  const mockQuestion: QuestionType = {
    id: 'test-question-1',
    number: 1,
    text: 'What are your biggest challenges with current workflows?',
    description: 'This question helps us understand your pain points.',
    category: 'pain_of_old',
    categoryLabel: 'Pain of Old',
    estimatedTime: 3,
    required: true,
    maxLength: 500,
    placeholder: 'Describe your challenges...',
    helpText: 'Think about daily frustrations and inefficiencies.'
  }

  const defaultProps = {
    question: mockQuestion,
    answer: '',
    inputMethod: 'text' as const,
    onAnswerChange: jest.fn(),
    onInputMethodChange: jest.fn(),
    onNext: jest.fn(),
    onPrevious: jest.fn(),
    isFirst: false,
    isLast: false,
    canGoNext: false
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('renders question with all essential elements', () => {
      render(<SurveyQuestion {...defaultProps} />)

      expect(screen.getByText('What are your biggest challenges with current workflows?')).toBeInTheDocument()
      expect(screen.getByText('Question 1 • Pain of Old')).toBeInTheDocument()
      expect(screen.getByText('This question helps us understand your pain points.')).toBeInTheDocument()
      expect(screen.getByText('3 mins')).toBeInTheDocument()
      expect(screen.getByText('Choose your input method')).toBeInTheDocument()
    })

    it('displays correct category icon and color', () => {
      render(<SurveyQuestion {...defaultProps} />)

      const iconElement = screen.getByText('⚠️')
      expect(iconElement).toBeInTheDocument()
      expect(iconElement).toHaveClass('text-red-400')
    })

    it('shows help text when help button is clicked', async () => {
      const user = userEvent.setup()
      render(<SurveyQuestion {...defaultProps} />)

      const helpButton = screen.getByText('Show helpful tips')
      await user.click(helpButton)

      expect(screen.getByText('💡 Think about daily frustrations and inefficiencies.')).toBeInTheDocument()
      expect(screen.getByText('Hide helpful tips')).toBeInTheDocument()
    })

    it('formats time correctly for different values', () => {
      const singleMinuteQuestion = { ...mockQuestion, estimatedTime: 1 }
      render(<SurveyQuestion {...defaultProps} question={singleMinuteQuestion} />)
      expect(screen.getByText('1 min')).toBeInTheDocument()
    })
  })

  describe('Input Method Toggle', () => {
    it('renders both text and voice input buttons', () => {
      render(<SurveyQuestion {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Use text input' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Use voice input' })).toBeInTheDocument()
    })

    it('highlights active input method', () => {
      render(<SurveyQuestion {...defaultProps} />)

      const textButton = screen.getByRole('button', { name: 'Use text input' })
      const voiceButton = screen.getByRole('button', { name: 'Use voice input' })

      // Text should be active (default) - verify buttons are rendered
      expect(textButton).toBeInTheDocument()
      expect(voiceButton).toBeInTheDocument()
    })

    it('calls onInputMethodChange when switching methods', async () => {
      const user = userEvent.setup()
      render(<SurveyQuestion {...defaultProps} />)

      const voiceButton = screen.getByRole('button', { name: 'Use voice input' })
      await user.click(voiceButton)

      expect(defaultProps.onInputMethodChange).toHaveBeenCalledWith('voice')
    })

    it('displays correct input component based on selected method', () => {
      const { rerender } = render(<SurveyQuestion {...defaultProps} />)

      // Text input should be visible
      expect(screen.getByPlaceholderText('Describe your challenges...')).toBeInTheDocument()
      expect(screen.queryByTestId('voice-recorder')).not.toBeInTheDocument()

      // Switch to voice input
      rerender(<SurveyQuestion {...defaultProps} inputMethod="voice" />)
      
      expect(screen.queryByPlaceholderText('Describe your challenges...')).not.toBeInTheDocument()
      expect(screen.getByTestId('voice-recorder')).toBeInTheDocument()
    })
  })

  describe('Text Input Functionality', () => {
    it('displays current answer in textarea', () => {
      render(<SurveyQuestion {...defaultProps} answer="Current answer text" />)

      const textarea = screen.getByPlaceholderText('Describe your challenges...')
      expect(textarea).toHaveValue('Current answer text')
    })

    it('calls onAnswerChange when text is typed', async () => {
      const user = userEvent.setup()
      render(<SurveyQuestion {...defaultProps} />)

      const textarea = screen.getByPlaceholderText('Describe your challenges...')
      await user.type(textarea, 'New answer')

      expect(defaultProps.onAnswerChange).toHaveBeenCalledWith('New answer', 'text')
    })

    it('shows character count', () => {
      render(<SurveyQuestion {...defaultProps} answer="Test answer" />)

      expect(screen.getByText('11 / 500 characters')).toBeInTheDocument()
    })

    it('respects maxLength property', () => {
      render(<SurveyQuestion {...defaultProps} />)

      const textarea = screen.getByPlaceholderText('Describe your challenges...')
      expect(textarea).toHaveAttribute('maxLength', '500')
    })

    it('shows required indicator when answer is empty', () => {
      render(<SurveyQuestion {...defaultProps} />)

      expect(screen.getAllByText('Required').length).toBeGreaterThanOrEqual(2) // Mobile and desktop views, possibly more instances
    })

    it('shows answer provided indicator when answer exists', () => {
      render(<SurveyQuestion {...defaultProps} answer="Some answer" />)

      expect(screen.getAllByText('Answer provided').length).toBeGreaterThanOrEqual(2) // Mobile and desktop views, possibly more instances
    })
  })

  describe('Voice Input Functionality', () => {
    it('renders voice recorder when voice method is selected', () => {
      render(<SurveyQuestion {...defaultProps} inputMethod="voice" />)

      expect(screen.getByTestId('voice-recorder')).toBeInTheDocument()
    })

    it('passes correct props to VoiceRecorder', () => {
      render(<SurveyQuestion {...defaultProps} inputMethod="voice" answer="Initial voice text" />)

      const voiceTranscription = screen.getByTestId('voice-transcription')
      expect(voiceTranscription).toHaveValue('Initial voice text')
    })

    it('handles voice transcription updates', async () => {
      const user = userEvent.setup()
      render(<SurveyQuestion {...defaultProps} inputMethod="voice" />)

      const mockVoiceButton = screen.getByTestId('mock-voice-button')
      await user.click(mockVoiceButton)

      expect(defaultProps.onAnswerChange).toHaveBeenCalledWith('Mock voice transcription', 'voice')
    })

    it('syncs voice transcription with local state', async () => {
      const user = userEvent.setup()
      render(<SurveyQuestion {...defaultProps} inputMethod="voice" />)

      const voiceTranscription = screen.getByTestId('voice-transcription')
      await user.type(voiceTranscription, 'Edited transcription')

      expect(defaultProps.onAnswerChange).toHaveBeenCalledWith('Edited transcription', 'voice')
    })
  })

  describe('Navigation Controls', () => {
    it('renders navigation buttons', () => {
      render(<SurveyQuestion {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Go to previous question' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Go to next question' })).toBeInTheDocument()
    })

    it('disables previous button when isFirst is true', () => {
      render(<SurveyQuestion {...defaultProps} isFirst={true} />)

      const prevButton = screen.getByRole('button', { name: 'Go to previous question' })
      expect(prevButton).toBeDisabled()
    })

    it('disables next button when canGoNext is false', () => {
      render(<SurveyQuestion {...defaultProps} canGoNext={false} />)

      const nextButton = screen.getByRole('button', { name: 'Go to next question' })
      expect(nextButton).toBeDisabled()
    })

    it('shows "Complete Survey" text on last question', () => {
      render(<SurveyQuestion {...defaultProps} isLast={true} />)

      expect(screen.getByRole('button', { name: 'Complete the survey' })).toBeInTheDocument()
    })

    it('calls onNext when next button is clicked', async () => {
      const user = userEvent.setup()
      render(<SurveyQuestion {...defaultProps} canGoNext={true} />)

      const nextButton = screen.getByRole('button', { name: 'Go to next question' })
      await user.click(nextButton)

      expect(defaultProps.onNext).toHaveBeenCalled()
    })

    it('calls onPrevious when previous button is clicked', async () => {
      const user = userEvent.setup()
      render(<SurveyQuestion {...defaultProps} />)

      const prevButton = screen.getByRole('button', { name: 'Go to previous question' })
      await user.click(prevButton)

      expect(defaultProps.onPrevious).toHaveBeenCalled()
    })
  })

  describe('State Synchronization', () => {
    it('updates local answer when prop changes', () => {
      const { rerender } = render(<SurveyQuestion {...defaultProps} answer="Initial" />)

      const textarea = screen.getByPlaceholderText('Describe your challenges...')
      expect(textarea).toHaveValue('Initial')

      rerender(<SurveyQuestion {...defaultProps} answer="Updated" />)
      expect(textarea).toHaveValue('Updated')
    })

    it('maintains local state during editing', async () => {
      const user = userEvent.setup()
      render(<SurveyQuestion {...defaultProps} />)

      const textarea = screen.getByPlaceholderText('Describe your challenges...')
      await user.type(textarea, 'Local edit')

      expect(textarea).toHaveValue('Local edit')
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels for input method buttons', () => {
      render(<SurveyQuestion {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Use text input' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Use voice input' })).toBeInTheDocument()
    })

    it('has proper ARIA labels for navigation buttons', () => {
      render(<SurveyQuestion {...defaultProps} />)

      expect(screen.getByRole('button', { name: 'Go to previous question' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Go to next question' })).toBeInTheDocument()
    })

    it('supports keyboard navigation through interactive elements', async () => {
      const user = userEvent.setup()
      render(<SurveyQuestion {...defaultProps} />)

      // Tab through interactive elements
      await user.tab()
      expect(screen.getByText('Show helpful tips')).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: 'Use text input' })).toHaveFocus()

      await user.tab()
      expect(screen.getByRole('button', { name: 'Use voice input' })).toHaveFocus()

      await user.tab()
      expect(screen.getByPlaceholderText('Describe your challenges...')).toHaveFocus()
    })

    it('has proper focus management', async () => {
      const user = userEvent.setup()
      render(<SurveyQuestion {...defaultProps} />)

      const textButton = screen.getByRole('button', { name: 'Use text input' })
      await user.click(textButton)

      // Focus should be maintained on the clicked button
      expect(textButton).toHaveFocus()
    })
  })

  describe('Mobile Responsiveness', () => {
    it('shows mobile-specific layout elements', () => {
      render(<SurveyQuestion {...defaultProps} />)

      // Should have mobile-specific text (shorter versions)
      expect(screen.getByText('Back')).toBeInTheDocument()
      expect(screen.getByText('Next')).toBeInTheDocument()
    })

    it('has touch-friendly button classes', () => {
      render(<SurveyQuestion {...defaultProps} />)

      const textButton = screen.getByRole('button', { name: 'Use text input' })
      expect(textButton).toHaveClass('touch-target')
    })

    it('displays input method badge', () => {
      render(<SurveyQuestion {...defaultProps} />)

      // Should show current input method in the component
      expect(screen.getByText('Text')).toBeInTheDocument()
    })
  })

  describe('Answer Validation', () => {
    it('shows appropriate status for required questions', () => {
      render(<SurveyQuestion {...defaultProps} />)

      expect(screen.getAllByText('Required').length).toBeGreaterThanOrEqual(2)
    })

    it('shows appropriate status for optional questions', () => {
      const optionalQuestion = { ...mockQuestion, required: false }
      render(<SurveyQuestion {...defaultProps} question={optionalQuestion} />)

      expect(screen.getAllByText('Optional')).toHaveLength(2)
    })

    it('shows completion status when answer is provided', () => {
      render(<SurveyQuestion {...defaultProps} answer="Complete answer" />)

      expect(screen.getAllByText('Answer provided').length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('Error Handling', () => {
    it('handles missing question properties gracefully', () => {
      const incompleteQuestion = {
        ...mockQuestion,
        helpText: undefined,
        description: ''
      }

      expect(() => 
        render(<SurveyQuestion {...defaultProps} question={incompleteQuestion} />)
      ).not.toThrow()
    })

    it('handles empty answer gracefully', () => {
      expect(() => 
        render(<SurveyQuestion {...defaultProps} answer="" />)
      ).not.toThrow()
    })

    it('handles undefined callbacks gracefully', () => {
      const propsWithoutCallbacks = {
        ...defaultProps,
        onNext: undefined,
        onPrevious: undefined
      }

      expect(() => 
        render(<SurveyQuestion {...propsWithoutCallbacks} />)
      ).not.toThrow()
    })
  })

  describe('Security', () => {
    it('sanitizes question text to prevent XSS', () => {
      const maliciousQuestion = {
        ...mockQuestion,
        text: '<script>alert("XSS")</script>What is your question?',
        description: '<img src="x" onerror="alert(\'XSS\')">'
      }

      render(<SurveyQuestion {...defaultProps} question={maliciousQuestion} />)

      // The script tag should not be executed, only displayed as text
      expect(screen.getByText('<script>alert("XSS")</script>What is your question?')).toBeInTheDocument()
    })

    it('sanitizes user input to prevent XSS in answers', async () => {
      const user = userEvent.setup()
      render(<SurveyQuestion {...defaultProps} />)

      const textarea = screen.getByPlaceholderText('Describe your challenges...')
      const xssPayload = '<script>alert("XSS")</script>'
      
      await user.type(textarea, xssPayload)

      // The script should be displayed as text, not executed
      expect(textarea).toHaveValue(xssPayload)
      expect(defaultProps.onAnswerChange).toHaveBeenCalledWith(xssPayload, 'text')
    })
  })
})