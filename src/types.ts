/* File: src/types.ts */
export interface QuizData {
    question: string;
    answers: string[];
    correctIndex: number;
}

export interface Step {
    number: number;
    instruction: string;
    userAnswer: string;
    isCorrect: boolean | null;
    correctAnswer: string;
}

export interface ProblemState {
    originalQuestion: string;
    steps: Step[];
    currentStepIndex: number;
    currentUserInput: string;
    isCompleted: boolean;
    topic: string;
}
export type AppMode = 'home' | 'problem' | 'quiz' | 'login';
export type QuizLevel = 'Beginner' | 'Intermediate' | 'Expert';