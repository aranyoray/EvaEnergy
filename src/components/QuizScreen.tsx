import type { QuizData, ProblemState } from '../types';

const QUIZ_LEVELS = [
    { value: 'Beginner', label: 'Beginner' },
    { value: 'Intermediate', label: 'Intermediate' },
    { value: 'Expert', label: 'Expert' },
];

interface QuizScreenProps {
    quiz: QuizData;
    problem: ProblemState | null;
    selectedAnswer: number | null;
    showResult: boolean;
    loading: boolean;
    selectedLevel: string;
    onAnswerClick: (index: number) => void;
    onNextQuestion: () => void;
    onLevelChange: (level: string) => void;
}

export default function QuizScreen({
                                       quiz,
                                       problem,
                                       selectedAnswer,
                                       showResult,
                                       loading,
                                       selectedLevel,
                                       onAnswerClick,
                                       onNextQuestion,
                                       onLevelChange,
                                   }: QuizScreenProps) {
    return (
        <>
            <div className="topic-pill" style={{ marginBottom: 10 }}>
                {problem?.topic}
            </div>
            <div style={{ fontSize: 13, color: 'rgba(200,255,240,0.7)', marginBottom: 12 }}>
                Practice Quiz to reinforce learning
            </div>
            <div className="question">{quiz.question}</div>

            <div className="answers" aria-live="polite">
                {quiz.answers.map((answer, idx) => {
                    const isCorrect = showResult && idx === quiz.correctIndex;
                    const isSelectedWrong = showResult && idx === selectedAnswer && idx !== quiz.correctIndex;
                    const classes = ['answer'];
                    if (showResult) classes.push('disabled');
                    if (isCorrect) classes.push('correct');
                    if (isSelectedWrong) classes.push('wrong');

                    return (
                        <button
                            key={idx}
                            className={classes.join(' ')}
                            onClick={() => onAnswerClick(idx)}
                            disabled={showResult || loading}
                        >
                            <span style={{ marginRight: 10, opacity: 0.9 }}>
                                {String.fromCharCode(65 + idx)}.
                            </span>
                            {answer}
                            {showResult &&
                                (isCorrect ? (
                                    <span style={{ float: 'right' }}>✓</span>
                                ) : isSelectedWrong ? (
                                    <span style={{ float: 'right' }}>✗</span>
                                ) : null)}
                        </button>
                    );
                })}
            </div>

            <div className="footer">
                <select
                    className="select"
                    value={selectedLevel}
                    onChange={e => onLevelChange(e.target.value)}
                    disabled={loading}
                    style={{ marginRight: 10 }}
                >
                    {QUIZ_LEVELS.map(l => (
                        <option key={l.value} value={l.value}>
                            {l.label}
                        </option>
                    ))}
                </select>
                {showResult ? (
                    <button className="primary" onClick={onNextQuestion} disabled={loading}>
                        {loading ? 'Loading...' : 'Next Question'}
                    </button>
                ) : (
                    <button className="primary" onClick={onNextQuestion} disabled={loading}>
                        {loading ? 'Loading...' : 'Skip / New'}
                    </button>
                )}
            </div>
        </>
    );
}