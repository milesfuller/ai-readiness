/**
 * Jest DOM Type Verification Test
 * This test ensures all Jest DOM matchers are properly typed and working
 * It serves as both a test and documentation for available matchers
 */

import React from 'react'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'

// Simple test component for Jest DOM matcher verification
const TestComponent: React.FC = () => {
  return (
    <div data-testid="container">
      <h1 className="title main-heading" id="main-title">
        Jest DOM Test Component
      </h1>
      
      <form>
        <input
          type="email"
          data-testid="email-input"
          placeholder="Enter email"
          required
          aria-label="Email address"
        />
        
        <input
          type="password"
          data-testid="password-input"
          placeholder="Enter password"
          disabled
        />
        
        <input
          type="checkbox"
          data-testid="checkbox-input"
          checked
          readOnly
        />
        
        <select data-testid="select-input" value="option1">
          <option value="option1">Option 1</option>
          <option value="option2">Option 2</option>
        </select>
        
        <button type="submit" data-testid="submit-button">
          Submit
        </button>
      </form>
      
      <div data-testid="empty-div"></div>
      
      <div 
        data-testid="styled-div"
        style={{ backgroundColor: 'red', fontSize: '16px' }}
      >
        Styled content
      </div>
      
      <div data-testid="hidden-div" style={{ display: 'none' }}>
        Hidden content
      </div>
      
      <div role="alert" data-testid="alert-div">
        Error message
      </div>
    </div>
  )
}

describe('Jest DOM Matchers Type Verification', () => {
  beforeEach(() => {
    render(<TestComponent />)
  })

  describe('Document and Visibility Matchers', () => {
    it('should support toBeInTheDocument matcher', () => {
      const container = screen.getByTestId('container')
      expect(container).toBeInTheDocument()
    })

    it('should support toBeVisible matcher', () => {
      const title = screen.getByText('Jest DOM Test Component')
      expect(title).toBeVisible()
    })

    it('should support toBeEmptyDOMElement matcher', () => {
      const emptyDiv = screen.getByTestId('empty-div')
      expect(emptyDiv).toBeEmptyDOMElement()
    })
  })

  describe('Form Element Matchers', () => {
    it('should support toBeRequired matcher', () => {
      const emailInput = screen.getByTestId('email-input')
      expect(emailInput).toBeRequired()
    })

    it('should support toBeDisabled matcher', () => {
      const passwordInput = screen.getByTestId('password-input')
      expect(passwordInput).toBeDisabled()
    })

    it('should support toBeEnabled matcher', () => {
      const emailInput = screen.getByTestId('email-input')
      expect(emailInput).toBeEnabled()
    })

    it('should support toBeChecked matcher', () => {
      const checkbox = screen.getByTestId('checkbox-input')
      expect(checkbox).toBeChecked()
    })

    it('should support toHaveFocus matcher', () => {
      const submitButton = screen.getByTestId('submit-button')
      submitButton.focus()
      expect(submitButton).toHaveFocus()
    })

    it('should support toBeValid and toBeInvalid matchers', () => {
      const emailInput = screen.getByTestId('email-input') as HTMLInputElement
      // Set a valid value to make the input valid
      emailInput.value = 'test@example.com'
      expect(emailInput).toBeValid()
      
      // Test invalid state
      emailInput.value = 'invalid-email'
      expect(emailInput).toBeInvalid()
    })
  })

  describe('Content and Style Matchers', () => {
    it('should support toHaveTextContent matcher', () => {
      const title = screen.getByTestId('container')
      expect(title).toHaveTextContent('Jest DOM Test Component')
      expect(title).toHaveTextContent(/Jest DOM/)
    })

    it('should support toHaveValue matcher', () => {
      const selectInput = screen.getByTestId('select-input')
      expect(selectInput).toHaveValue('option1')
    })

    it('should support toHaveDisplayValue matcher', () => {
      const selectInput = screen.getByTestId('select-input')
      expect(selectInput).toHaveDisplayValue('Option 1')
    })

    it('should support toHaveStyle matcher', () => {
      const styledDiv = screen.getByTestId('styled-div')
      // Use computed color value or style object for consistency
      expect(styledDiv).toHaveStyle('background-color: rgb(255, 0, 0)')
      expect(styledDiv).toHaveStyle({ fontSize: '16px' })
    })
  })

  describe('Attribute and Class Matchers', () => {
    it('should support toHaveAttribute matcher', () => {
      const title = screen.getByRole('heading')
      expect(title).toHaveAttribute('id', 'main-title')
      expect(title).toHaveAttribute('class')
    })

    it('should support toHaveClass matcher', () => {
      const title = screen.getByRole('heading')
      expect(title).toHaveClass('title')
      expect(title).toHaveClass('title', 'main-heading')
    })
  })

  describe('Accessibility Matchers', () => {
    it('should support toHaveAccessibleName matcher', () => {
      const emailInput = screen.getByTestId('email-input')
      expect(emailInput).toHaveAccessibleName('Email address')
    })

    it('should support toHaveRole matcher', () => {
      const alertDiv = screen.getByTestId('alert-div')
      expect(alertDiv).toHaveRole('alert')
    })
  })

  describe('Additional DOM Testing Matchers', () => {
    it('should support toContainElement matcher', () => {
      const container = screen.getByTestId('container')
      const title = screen.getByRole('heading')
      expect(container).toContainElement(title)
    })

    it('should support toContainHTML matcher', () => {
      const container = screen.getByTestId('container')
      expect(container).toContainHTML('<h1')
    })
  })

  describe('Form Values Matcher', () => {
    it('should support toHaveFormValues matcher', () => {
      // Get form by tag name since it doesn't have explicit form role
      const form = screen.getByTestId('container').querySelector('form')
      expect(form).not.toBeNull()
      
      // Test the matcher exists and is properly typed (even if empty form)
      if (form) {
        expect(form).toHaveFormValues({})
      }
    })
  })
})

describe('Edge Cases and Type Safety', () => {
  it('should handle null values in matchers', () => {
    render(<div data-testid="test"></div>)
    const element = screen.getByTestId('test')
    
    // These should not cause TypeScript errors and test empty content
    expect(element).toHaveTextContent('')
    expect(element).not.toHaveTextContent('Content')
  })

  it('should handle different attribute value types', () => {
    render(
      <div 
        data-testid="multi-attr"
        data-number="42"
        data-boolean="true"
        data-string="hello"
      >
        Content
      </div>
    )
    
    const element = screen.getByTestId('multi-attr')
    
    // Should support different value types (strings, numbers, booleans)
    expect(element).toHaveAttribute('data-number', '42')
    expect(element).toHaveAttribute('data-boolean', 'true')
    expect(element).toHaveAttribute('data-string', 'hello')
    // Test attribute exists without specific value
    expect(element).toHaveAttribute('data-number')
  })

  it('should handle regex patterns in text matchers', () => {
    render(
      <div 
        data-testid="regex-test" 
        aria-label="Hello World 123"
      >
        Hello World 123
      </div>
    )
    const element = screen.getByTestId('regex-test')
    
    expect(element).toHaveTextContent(/Hello/)
    expect(element).toHaveTextContent(/\d+/)
    expect(element).toHaveAccessibleName(/Hello/)
  })
})