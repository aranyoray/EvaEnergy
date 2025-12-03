import type { ProblemState } from '../types';

interface ProblemScreenProps {
    problem: ProblemState;
    setProblem: (p: ProblemState) => void;
    loading: boolean;
    stepFeedback: string;
    onVerifyStep: () => void;
    onStartQuiz: () => void;
    setStepFeedback: (f: string) => void;
    setLoading: (l: boolean) => void;
}

export default function ProblemScreen({
                                          problem,
                                          setProblem,
                                          loading,
                                          stepFeedback,
                                          onVerifyStep,
                                          onStartQuiz,
                                      }: ProblemScreenProps) {
    const currentStep = problem.steps[problem.currentStepIndex];

    if (problem.isCompleted) {
        return (
            <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 16, color: '#00ff88', marginBottom: 20 }}>
                    ✓ Problem Solved!
                </div>
                <div style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 14, color: 'rgba(200,255,240,0.8)', marginBottom: 8 }}>
                        You completed all steps successfully!
                    </div>
                </div>
                <button onClick={onStartQuiz} className="primary" style={{ marginRight: 10 }}>
                    Practice with Quiz
                </button>
            </div>
        );
    }

    return (
        <>
            <div className="topic-pill" style={{ marginBottom: 10 }}>{problem.topic}</div>
            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 14, color: 'rgba(200,255,240,0.8)', marginBottom: 8 }}>
                    Original Question:
                </div>
                <div className="question">{problem.originalQuestion}</div>
            </div>

            <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>
                    Step {problem.currentStepIndex + 1} of {problem.steps.length}
                </div>
                <div
                    style={{
                        background: 'rgba(200,255,240,0.1)',
                        border: '1px solid rgba(200,255,240,0.2)',
                        borderRadius: 8,
                        padding: 14,
                        marginBottom: 12,
                    }}
                >
                    <div style={{ fontSize: 15, color: '#c8fff0' }}>
                        {currentStep.instruction}
                    </div>
                </div>

                <input
                    type="text"
                    value={problem.currentUserInput}
                    onChange={e => {
                        setProblem({ ...problem, currentUserInput: e.target.value });
                    }}
                    placeholder="Enter your answer"
                    style={{
                        width: '100%',
                        padding: 12,
                        borderRadius: 8,
                        border: '1px solid rgba(200,255,240,0.3)',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        color: '#c8fff0',
                        fontSize: 14,
                        marginBottom: 12,
                    }}
                    onKeyPress={e => e.key === 'Enter' && onVerifyStep()}
                />

                {stepFeedback && (
                    <div
                        style={{
                            color: stepFeedback.includes('✓') ? '#00ff88' : '#ff4466',
                            fontSize: 14,
                            marginBottom: 12,
                        }}
                    >
                        {stepFeedback}
                    </div>
                )}

                <button
                    onClick={onVerifyStep}
                    disabled={!problem.currentUserInput.trim() || loading}
                    className="primary"
                >
                    {loading ? 'Checking...' : 'Submit Answer'}
                </button>
            </div>
        </>
    );
}
