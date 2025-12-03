import { useState } from 'react';
import './App.css';
import HomeScreen from './components/HomeScreen';
import ProblemScreen from './components/ProblemScreen';
import QuizScreen from './components/QuizScreen';
import Header from './components/Header';
// import LoginScreen from './components/LoginScreen.tsx'
import { useAppState } from './hooks/useAppState';
import { useProblemLogic } from './hooks/useProblemLogic';
import { useQuizLogic } from './hooks/useQuizLogic';


export default function App() {
    const [mode, setMode] = useState<'home' | 'problem' | 'quiz' | 'login'>('login');
    const appState = useAppState();
    const problemLogic = useProblemLogic(setMode, appState);
    const quizLogic = useQuizLogic(appState.problem?.topic);
    // const loginScreen = LoginScreen(any);


    const backToHome = () => {
        setMode('home');
        appState.setUserQuestion('');
        appState.setProblem(null);
        appState.setQuiz(null);
        appState.setStepFeedback('');
    };

    return (
        <div className="app-root" role="main">
            <div className="container">
                <div className="card" aria-label="Interactive learning card">
                    <Header
                        mode={mode}
                        score={quizLogic.score}
                        totalQuestions={quizLogic.totalQuestions}
                        onReset={quizLogic.handleResetScore}
                        onBack={backToHome}
                    />

                    <div className="question-area">
                        {mode === 'home' && (
                            <HomeScreen
                                userQuestion={appState.userQuestion}
                                setUserQuestion={appState.setUserQuestion}
                                onGenerateSteps={() => problemLogic.generateSteps(appState.userQuestion)}
                                loading={appState.loading}
                            />
                        )}

                        {mode === 'problem' && appState.problem && (
                            <ProblemScreen
                                problem={appState.problem}
                                setProblem={appState.setProblem}
                                loading={appState.loading}
                                stepFeedback={appState.stepFeedback}
                                onVerifyStep={() => problemLogic.verifyStepAnswer(appState)}
                                onStartQuiz={() => {
                                    quizLogic.startQuiz();
                                    setMode('quiz');
                                }}
                                setStepFeedback={appState.setStepFeedback}
                                setLoading={appState.setLoading}
                            />
                        )}

                        {mode === 'quiz' && appState.quiz && (
                            <QuizScreen
                                quiz={appState.quiz}
                                problem={appState.problem}
                                selectedAnswer={quizLogic.selectedAnswer}
                                showResult={quizLogic.showResult}
                                loading={quizLogic.loading}
                                selectedLevel={quizLogic.selectedLevel}
                                onAnswerClick={quizLogic.handleAnswerClick}
                                onNextQuestion={() => quizLogic.handleNextQuestion()}
                                onLevelChange={quizLogic.setSelectedLevel}
                            />
                        )}
                        {/* {mode=="login"
                        <LoginScreen>
                        } */}
                    </div>
                </div>
            </div>

            <div className="scanlines" aria-hidden />
        </div>
    );
}
