// AI Readiness Assessment - Survey Questions Data Structure
// Based on Jobs-to-be-Done Framework for AI Adoption

export interface SurveyQuestion {
  id: string
  number: number
  text: string
  description: string
  category: 'pain_of_old' | 'pull_of_new' | 'anchors_to_old' | 'anxiety_of_new'
  categoryLabel: string
  estimatedTime: number // in minutes
  required: boolean
  maxLength: number
  placeholder: string
  helpText?: string
}

export interface SurveyCategory {
  id: string
  label: string
  description: string
  color: string
  icon: string
}

export const surveyCategories: SurveyCategory[] = [
  {
    id: 'pain_of_old',
    label: 'Pain of Old',
    description: 'Current challenges and frustrations with existing processes',
    color: 'text-red-400',
    icon: '⚠️'
  },
  {
    id: 'pull_of_new',
    label: 'Pull of New',
    description: 'Attractive benefits and opportunities with AI adoption',
    color: 'text-green-400',
    icon: '🚀'
  },
  {
    id: 'anchors_to_old',
    label: 'Anchors to Old',
    description: 'Factors that keep you tied to current methods',
    color: 'text-amber-400',
    icon: '⚓'
  },
  {
    id: 'anxiety_of_new',
    label: 'Anxiety of New',
    description: 'Concerns and worries about implementing AI solutions',
    color: 'text-purple-400',
    icon: '😰'
  }
]

export const surveyQuestions: SurveyQuestion[] = [
  // Initial AI Usage Assessment
  {
    id: 'ai_usage_current',
    number: 1,
    text: 'What AI tools are you already using - both at work and at home? Which are you using most frequently (e.g. several times a week)?',
    description: 'Tell us about your current experience with AI tools across all areas of your life.',
    category: 'pull_of_new',
    categoryLabel: 'Current AI Experience',
    estimatedTime: 2,
    required: true,
    maxLength: 1000,
    placeholder: 'List the AI tools you use regularly and how often...',
    helpText: 'Include ChatGPT, Copilot, Midjourney, voice assistants, or any AI-powered features in apps you use.'
  },
  {
    id: 'ai_confidence_competence',
    number: 2,
    text: 'How competent and confident do you feel using AI to augment your work?',
    description: 'Reflect on your current skill level and comfort with AI-powered tools.',
    category: 'pull_of_new',
    categoryLabel: 'AI Confidence',
    estimatedTime: 2,
    required: true,
    maxLength: 1000,
    placeholder: 'Describe your confidence level and any skills you feel you need to develop...',
    helpText: 'Consider your ability to write prompts, integrate AI into workflows, or evaluate AI outputs.'
  },
  {
    id: 'business_purpose_clarity',
    number: 3,
    text: 'How clear do you feel on our business purpose and how AI can help us achieve it or get us there faster?',
    description: 'Assess your understanding of how AI aligns with organizational goals.',
    category: 'pull_of_new',
    categoryLabel: 'Strategic Clarity',
    estimatedTime: 2,
    required: true,
    maxLength: 1000,
    placeholder: 'Explain your understanding of how AI fits our business strategy...',
    helpText: 'Think about specific business objectives and how AI could accelerate achieving them.'
  },
  {
    id: 'transformation_success',
    number: 4,
    text: 'What do you hope to gain from this AI transformation programme? What does success look like for you and the team?',
    description: 'Define your vision for successful AI adoption outcomes.',
    category: 'pull_of_new',
    categoryLabel: 'Success Vision',
    estimatedTime: 3,
    required: true,
    maxLength: 1500,
    placeholder: 'Describe your hopes and definition of success...',
    helpText: 'Consider personal development, team efficiency, business impact, and measurable outcomes.'
  },
  
  // Force 1: Pain of the Old
  {
    id: 'pain_friction_moment',
    number: 5,
    text: 'Tell us about a moment recently when your current tools, processes or ways of working got in the way of doing great work. What happened?',
    description: 'Share a specific example of when existing solutions created friction or prevented optimal performance.',
    category: 'pain_of_old',
    categoryLabel: 'Pain of Old',
    estimatedTime: 3,
    required: true,
    maxLength: 1500,
    placeholder: 'Describe a specific situation where your tools or processes hindered your work...',
    helpText: 'Focus on a concrete example with details about what went wrong and how it affected your output.'
  },
  {
    id: 'pain_time_consuming',
    number: 6,
    text: 'What parts of your work feel disproportionately time-consuming or effortful — especially compared to the value they deliver?',
    description: 'Identify tasks where the effort-to-value ratio feels misaligned.',
    category: 'pain_of_old',
    categoryLabel: 'Pain of Old',
    estimatedTime: 3,
    required: true,
    maxLength: 1500,
    placeholder: 'List tasks that take too much time for the value they create...',
    helpText: 'Consider administrative work, repetitive tasks, or complex processes that yield minimal impact.'
  },
  
  // Force 2: Pull of the New
  {
    id: 'pull_ai_unlocks',
    number: 7,
    text: 'If AI could work exactly how you needed it to, what would it unlock for you, your team, or your clients?',
    description: 'Envision the ideal scenario where AI perfectly meets your needs.',
    category: 'pull_of_new',
    categoryLabel: 'Pull of New',
    estimatedTime: 3,
    required: true,
    maxLength: 1500,
    placeholder: 'Describe what would be possible with perfect AI assistance...',
    helpText: 'Think big - what new capabilities, efficiency gains, or value creation would be possible?'
  },
  {
    id: 'pull_easier_faster',
    number: 8,
    text: "What's one part of your work you'd love to make easier, faster, or more impactful — even if you're not sure how AI could help yet?",
    description: 'Identify areas for improvement without worrying about technical feasibility.',
    category: 'pull_of_new',
    categoryLabel: 'Pull of New',
    estimatedTime: 3,
    required: true,
    maxLength: 1500,
    placeholder: 'Choose one aspect of your work that could be transformed...',
    helpText: 'Focus on the outcome you want rather than how AI might achieve it.'
  },
  {
    id: 'pull_hand_over',
    number: 9,
    text: 'If an AI assistant could take care of one thing for you brilliantly — no limitations — what would you hand over?',
    description: 'Imagine perfect delegation to an AI system with unlimited capability.',
    category: 'pull_of_new',
    categoryLabel: 'Pull of New',
    estimatedTime: 3,
    required: true,
    maxLength: 1500,
    placeholder: 'What would you most want to delegate to a perfect AI assistant...',
    helpText: 'Consider both simple tasks and complex responsibilities you would trust to AI.'
  },
  
  // Force 3: Anchors to the Old
  {
    id: 'anchors_business_usual',
    number: 10,
    text: "Even when better tools or ideas are available, what tends to keep things 'business as usual' in your team or organisation?",
    description: 'Identify the forces that maintain the status quo despite available improvements.',
    category: 'anchors_to_old',
    categoryLabel: 'Anchors to Old',
    estimatedTime: 3,
    required: true,
    maxLength: 1500,
    placeholder: 'Describe what prevents change in your organization...',
    helpText: 'Think about cultural, procedural, technical, or political barriers to adopting new approaches.'
  },
  {
    id: 'anchors_stopping_adoption',
    number: 11,
    text: 'What would realistically stop someone in your team from trying a new AI tool tomorrow?',
    description: 'Consider practical barriers to immediate AI tool adoption.',
    category: 'anchors_to_old',
    categoryLabel: 'Anchors to Old',
    estimatedTime: 3,
    required: true,
    maxLength: 1500,
    placeholder: 'List the realistic barriers to AI tool adoption...',
    helpText: 'Consider time constraints, approval processes, technical barriers, or skill gaps.'
  },
  {
    id: 'anchors_permission',
    number: 12,
    text: 'Who needs to say yes (or stay quiet) for experimentation to happen?',
    description: 'Map the decision-making and approval landscape for new initiatives.',
    category: 'anchors_to_old',
    categoryLabel: 'Anchors to Old',
    estimatedTime: 2,
    required: true,
    maxLength: 1000,
    placeholder: 'Identify key stakeholders and their roles in enabling experimentation...',
    helpText: 'Think about formal approvers, informal influencers, and potential blockers.'
  },
  
  // Force 4: Anxiety of the New
  {
    id: 'anxiety_concerns',
    number: 13,
    text: 'When it comes to adopting new AI tools or ways of working, what concerns come up for you — emotionally, practically, or professionally?',
    description: 'Share your honest concerns about AI adoption across different dimensions.',
    category: 'anxiety_of_new',
    categoryLabel: 'Anxiety of New',
    estimatedTime: 3,
    required: true,
    maxLength: 1500,
    placeholder: 'Describe your concerns about adopting AI tools...',
    helpText: 'Consider job security, learning curves, reliability, ethical concerns, or personal discomfort.'
  },
  {
    id: 'anxiety_bad_experience',
    number: 14,
    text: 'Have you ever tried an AI tool that left you feeling unsure, disappointed, or exposed? What happened?',
    description: 'Reflect on any negative experiences with AI that inform your current concerns.',
    category: 'anxiety_of_new',
    categoryLabel: 'Anxiety of New',
    estimatedTime: 3,
    required: true,
    maxLength: 1500,
    placeholder: 'Share any disappointing or concerning AI experiences...',
    helpText: 'Include technical failures, unexpected results, privacy concerns, or feeling overwhelmed.'
  },
  
  // Attitude to Experimentation
  {
    id: 'experimentation_role',
    number: 15,
    text: 'What role do you tend to play when your team is exploring something new? (Observer / Cautious Tester / Curious Explorer / Experimentation Lead)',
    description: 'Reflect on your typical approach to new initiatives and change.',
    category: 'pull_of_new',
    categoryLabel: 'Experimentation Style',
    estimatedTime: 2,
    required: true,
    maxLength: 1000,
    placeholder: 'Describe your usual role in team exploration and why...',
    helpText: 'Consider whether you wait and see, test carefully, dive in enthusiastically, or lead the charge.'
  },
  {
    id: 'experimentation_feeling',
    number: 16,
    text: 'How does experimenting with something new make you feel?',
    description: 'Explore your emotional response to trying new tools and approaches.',
    category: 'pull_of_new',
    categoryLabel: 'Experimentation Mindset',
    estimatedTime: 2,
    required: true,
    maxLength: 1000,
    placeholder: 'Describe how you feel about experimentation...',
    helpText: 'Consider excitement, anxiety, curiosity, resistance, or other emotions that arise.'
  }
]

export const getTotalEstimatedTime = (): number => {
  return surveyQuestions.reduce((total, question) => total + question.estimatedTime, 0)
}

export const getQuestionsByCategory = (category: string): SurveyQuestion[] => {
  return surveyQuestions.filter(q => q.category === category)
}

export const getCategoryProgress = (answers: Record<string, string>, category: string): number => {
  const categoryQuestions = getQuestionsByCategory(category)
  const answeredQuestions = categoryQuestions.filter(q => answers[q.id]?.trim())
  return categoryQuestions.length > 0 ? (answeredQuestions.length / categoryQuestions.length) * 100 : 0
}

export const getTotalProgress = (answers: Record<string, string>): number => {
  const answeredQuestions = surveyQuestions.filter(q => answers[q.id]?.trim())
  return (answeredQuestions.length / surveyQuestions.length) * 100
}