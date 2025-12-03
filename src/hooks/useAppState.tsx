import { useState } from 'react';
import type { ProblemState, QuizData } from '../types';

export function useAppState() {
    const [userQuestion, setUserQuestion] = useState('');
    const [problem, setProblem] = useState<ProblemState | null>(null);
    const [loading, setLoading] = useState(false);
    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [stepFeedback, setStepFeedback] = useState('');

    return {
        userQuestion,
        setUserQuestion,
        problem,
        setProblem,
        loading,
        setLoading,
        quiz,
        setQuiz,
        stepFeedback,
        setStepFeedback,
    };
}
