interface HomeScreenProps {
    userQuestion: string;
    setUserQuestion: (q: string) => void;
    onGenerateSteps: () => void;
    loading: boolean;
}

export default function HomeScreen({ userQuestion, setUserQuestion, onGenerateSteps, loading }: HomeScreenProps) {
    return (
        <div style={{ padding: 20, textAlign: 'center' }}>
            <div style={{ fontSize: 18, marginBottom: 20, color: '#c8fff0' }}>
                What would you like to learn?
            </div>
            <textarea
                value={userQuestion}
                onChange={e => setUserQuestion(e.target.value)}
                placeholder="Ask a question (e.g., 'How do I solve 2x + 5 = 15?' or 'Explain photosynthesis')"
                style={{
                    width: '100%',
                    minHeight: 100,
                    padding: 12,
                    borderRadius: 8,
                    border: '1px solid rgba(200,255,240,0.3)',
                    backgroundColor: 'rgba(0,0,0,0.3)',
                    color: '#c8fff0',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    marginBottom: 16,
                }}
            />
            <button
                onClick={onGenerateSteps}
                disabled={!userQuestion.trim() || loading}
                className="primary"
                style={{ marginRight: 10 }}
            >
                {loading ? 'Generating...' : 'Get Step-by-Step Help'}
            </button>
        </div>
    );
}