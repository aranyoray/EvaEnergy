import type { AppMode } from '../types';

interface HeaderProps {
    mode: AppMode;
    score: number;
    totalQuestions: number;
    onReset: () => void;
    onBack: () => void;
}

export default function Header({ mode, score, totalQuestions, onReset, onBack }: HeaderProps) {
    return (
        <div className="header">
            <div className="brand">
                <div className="logo">AI</div>
                <div>
                    <div className="title">Learn & Quiz</div>
                    <div style={{ fontSize: 12, color: 'rgba(200,255,240,0.7)' }}>
                        Step-by-step learning with practice
                    </div>
                </div>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                {mode === 'quiz' && (
                    <div className="score" aria-hidden>
                        <div className="big">{score} / {totalQuestions}</div>
                        <div style={{ fontSize: 11, opacity: 0.8 }}>Score</div>
                        {totalQuestions > 0 && (
                            <button onClick={onReset} className="btn" style={{ marginTop: 6, fontSize: 12 }}>
                                Reset
                            </button>
                        )}
                    </div>
                )}
                {mode !== 'home' && (
                    <button onClick={onBack} className="btn">Back</button>
                )}
            </div>
        </div>
    );
}
