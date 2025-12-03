# AI Study Buddy

An interactive learning application that provides step-by-step problem solving with AI assistance and practice quizzes.

## Features

- 📚 **Step-by-Step Learning**: Break down complex problems into manageable steps
- ✅ **Real-time Verification**: Get instant feedback on your answers
- 🎯 **Practice Quizzes**: Reinforce learning with topic-based quizzes
- 🎓 **Adaptive Difficulty**: Choose from Beginner, Intermediate, or Expert levels
- 🤖 **AI-Powered**: Uses Ollama for intelligent problem solving and question generation

## Project Structure

```
src/
├── App.tsx                 # Main application component
├── App.css                 # Styles
├── types.ts                # TypeScript type definitions
├── connection.ts           # Ollama API connection
├── components/
│   ├── Header.tsx          # App header with navigation and score
│   ├── HomeScreen.tsx      # Initial question input screen
│   ├── ProblemScreen.tsx   # Step-by-step problem solving interface
│   └── QuizScreen.tsx      # Quiz practice interface
└── hooks/
    ├── useAppState.ts      # Global app state management
    ├── useProblemLogic.ts  # Problem generation and verification logic
    └── useQuizLogic.ts     # Quiz generation and scoring logic
```

## File Descriptions

### Core Files

**`App.tsx`**
- Main application orchestrator
- Manages routing between home, problem, and quiz modes
- Connects hooks and components together

**`types.ts`**
- TypeScript interfaces for QuizData, Step, and ProblemState
- Type definitions for app modes and quiz levels

**`connection.ts`** (not included, must be created)
- `callOllamaModel(prompt: string)` - Connects to Ollama API
- Returns AI-generated responses as strings

### Components

**`Header.tsx`**
- Displays app branding and navigation
- Shows quiz score when in quiz mode
- Back button for navigation

**`HomeScreen.tsx`**
- Initial landing screen
- Text area for user to input questions
- Triggers step-by-step problem generation

**`ProblemScreen.tsx`**
- Displays original question and current step
- Input field for user answers
- Real-time feedback on answer correctness
- Progress indicator (Step X of Y)

**`QuizScreen.tsx`**
- Multiple choice quiz interface
- Shows correct/incorrect answers with visual feedback
- Difficulty level selector
- Next question and skip buttons

### Hooks

**`useAppState.ts`**
- Manages all global state (questions, problems, quiz data)
- Returns state and setter functions for components

**`useProblemLogic.ts`**
- `generateSteps(userQuestion)` - Generates step-by-step solution
- `verifyStepAnswer(appState)` - Verifies user's answer for current step
- `parseSteps(response)` - Parses AI response into step objects

**`useQuizLogic.ts`**
- `generateQuizQuestion()` - Creates new quiz questions
- `handleAnswerClick(index)` - Processes answer selection
- `handleNextQuestion()` - Loads next question
- `startQuiz()` - Initializes quiz session
- Manages scoring and question history

## Setup

### Prerequisites

- Node.js and npm/yarn installed
- [Ollama](https://ollama.ai) installed and running locally
- An Ollama model pulled ( I reccomend a small model like `gemma3:1-4b`)

### Installation

1. Clone the repository
```bash
git clone https://github.com/henrytunguz/StudyBuddy
cd ai-study-buddy
```

2. Install dependencies
```bash
npm install
```

3. Create `src/connection.ts`:
(Edit to configure to your computer)
```typescript
export async function callOllamaModel(prompt: string): Promise<string> {
    const response = await fetch('http://localhost:11434/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            model: 'gemma3:1b', // or your preferred model
            prompt: prompt,
            stream: false
        })
    });
    
    const data = await response.json();
    return data.response;
}
```

4. Start the development server
```bash
npm run dev
```

5. Ensure Ollama is running
```bash
ollama serve
```

## Usage

1. Go to your preferred web browser: eg: `Google Chrome`

2. open `localhost:5173`

### Step-by-Step Learning

1. Enter a question (e.g., "How do I solve 2x + 5 = 15?")
2. Click "Get Step-by-Step Help"
3. Complete each step by entering your answer
4. Get instant feedback on correctness
5. Move through steps until problem is solved

### Practice Quiz

1. After completing a problem, click "Practice with Quiz"
2. Answer multiple choice questions on the same topic
3. Select difficulty level (Beginner/Intermediate/Expert)
4. Track your score
5. Click "Next Question" to continue practicing

## AI Response Format

The app expects specific formats from the AI:

### Problem Steps Format
```
TOPIC: [subject area]
STEP1: [instruction for step 1]
STEP2: [instruction for step 2]
STEP3: [instruction for step 3]
FINAL_ANSWER: [complete solution]
```

### Step Verification Format
```
CORRECT: [yes or no]
EXPLANATION: [brief explanation]
```

### Quiz Question Format
```
QUESTION: [question text]
CORRECT: [correct answer]
WRONG1: [wrong answer 1]
WRONG2: [wrong answer 2]
WRONG3: [wrong answer 3]
```

## Development Notes

### Parsing Logic

The `parseSteps` function in `useProblemLogic.ts` extracts steps from AI responses:
- Looks for `STEP#:` markers
- Extracts text between each step marker
- Handles flexible AI output format
- Stops at `FINAL_ANSWER:` marker

### State Management

- `useAppState` - Centralized state for all screens
- `useProblemLogic` - Problem-specific logic and AI calls
- `useQuizLogic` - Quiz-specific logic and scoring
- Hooks passed to components via props for separation of concerns

### Component Communication

```
App.tsx (orchestrator)
  ├─> Header (navigation/score)
  ├─> HomeScreen (question input)
  ├─> ProblemScreen (step solving)
  └─> QuizScreen (practice)
       ↑
       │
    Hooks provide state + logic
       │
       ↓
  useAppState, useProblemLogic, useQuizLogic
```

## Troubleshooting

**"Failed to generate problem steps"**
- Ensure Ollama is running (`ollama serve`)
- Check that a model is pulled (`ollama pull gemma3:1b`)
- Verify connection.ts is configured correctly

**Steps not parsing correctly**
- Check console for "Raw response:" output
- Verify AI is following expected format
- Adjust prompts in hooks if needed

**Quiz not generating**
- Same as problem steps troubleshooting
- Check network tab for API errors

## Future Enhancements

- [ ] Save progress locally
- [ ] Multiple AI model support
- [ ] Custom difficulty levels
- [ ] Problem history
- [ ] Export solved problems as notes
- [ ] Collaborative learning mode

## License

MIT

## Install Ollama

1. With Brew
``` bash
brew install ollama
```
 2. With cURL
 ``` bash
     curl -fsSL https://ollama.com/install.sh | sh
```

## Contributing

Pull requests welcome! Please ensure code follows the existing structure and includes TypeScript types.