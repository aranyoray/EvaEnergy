import { useState } from 'react';
import type { QuizData } from '../types';
import { callOllamaModel } from '../connection';

export function useQuizLogic(topic?: string) {
    const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
    const [showResult, setShowResult] = useState(false);
    const [score, setScore] = useState(0);
    const [totalQuestions, setTotalQuestions] = useState(0);
    const [selectedLevel, setSelectedLevel] = useState('Intermediate');
    const [prevQ, setPrevQ] = useState<string[]>([]);
    const [quiz, setQuiz] = useState<QuizData | null>(null);
    const [loading, setLoading] = useState(false);

    const generateQuizQuestion = async () => {
        setLoading(true);
        setSelectedAnswer(null);
        setShowResult(false);

        try {
            const topicLabel = topic || 'general';
            const avoidanceText =
                prevQ.length > 0
                    ? `Generate a question about a DIFFERENT aspect of this topic than these recent questions. Do not repeat similar concepts.`
                    : '';
            const prompt = `Generate a ${topicLabel} trivia question with 4 multiple choice answers at a ${selectedLevel} level. ${avoidanceText} Format your response EXACTLY as follows:
QUESTION: [your question here]
CORRECT: [the correct answer]
WRONG1: [first wrong answer]
WRONG2: [second wrong answer]
WRONG3: [third wrong answer]

Make it educational and appropriate for students. Only respond with the format above, nothing else.`;

            const response = await callOllamaModel(prompt);
            const lines = response.split('\n').filter(line => line.trim());
            const questionLine = lines.find(line => line.startsWith('QUESTION:'));
            const correctLine = lines.find(line => line.startsWith('CORRECT:'));
            const wrong1Line = lines.find(line => line.startsWith('WRONG1:'));
            const wrong2Line = lines.find(line => line.startsWith('WRONG2:'));
            const wrong3Line = lines.find(line => line.startsWith('WRONG3:'));

            if (!questionLine || !correctLine || !wrong1Line || !wrong2Line || !wrong3Line) {
                throw new Error('Failed to parse quiz format');
            }

            const question = questionLine.replace('QUESTION:', '').trim();
            const correctAnswer = correctLine.replace('CORRECT:', '').trim();
            const wrong1 = wrong1Line.replace('WRONG1:', '').trim();
            const wrong2 = wrong2Line.replace('WRONG2:', '').trim();
            const wrong3 = wrong3Line.replace('WRONG3:', '').trim();

            setPrevQ(prev => [...prev, question].slice(-10));

            const answers = [correctAnswer, wrong1, wrong2, wrong3];
            for (let i = answers.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [answers[i], answers[j]] = [answers[j], answers[i]];
            }
            const newCorrectIndex = answers.indexOf(correctAnswer);

            setQuiz({
                question,
                answers,
                correctIndex: newCorrectIndex,
            });
        } catch (error) {
            console.error('Error generating quiz:', error);
            alert('Failed to generate quiz question.');
        } finally {
            setLoading(false);
        }
    };

    const handleAnswerClick = (index: number) => {
        if (showResult || loading) return;

        setSelectedAnswer(index);
        setShowResult(true);
        setTotalQuestions(prev => prev + 1);

        if (index === quiz?.correctIndex) {
            setScore(prev => prev + 1);
        }
    };

    const handleNextQuestion = (topic?: string) => {
        generateQuizQuestion();
        console.log(topic)
    };

    const handleResetScore = () => {
        setScore(0);
        setTotalQuestions(0);
        setQuiz(null);
        setSelectedAnswer(null);
        setShowResult(false);
    };

    const startQuiz = () => {
        setScore(0);
        setTotalQuestions(0);
        setSelectedAnswer(null);
        setShowResult(false);
        generateQuizQuestion();
    };

    return {
        selectedAnswer,
        showResult,
        score,
        totalQuestions,
        selectedLevel,
        setSelectedLevel,
        quiz,
        loading,
        setLoading,
        setQuiz,
        generateQuizQuestion,
        handleAnswerClick,
        handleNextQuestion,
        handleResetScore,
        startQuiz,
    };
}