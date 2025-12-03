import type { ProblemState, Step } from '../types';
import { callOllamaModel } from '../connection';

export function useProblemLogic(
    setMode: (m: 'home' | 'problem' | 'quiz') => void,
    _appState: any
) {
    const generateSteps = async (
        userQuestion: string,
        setLoading?: (l: boolean) => void,
        setProblem?: (p: ProblemState) => void
    ) => {
        const safeSetLoading = typeof setLoading === 'function' ? setLoading : () => {};
        const safeSetProblem = typeof setProblem === 'function' ? setProblem : () => {};

        safeSetLoading(true);
        try {
            const prompt = `You are a step-by-step problem solver. For the following question, break it down into clear, logical steps.

Question: ${userQuestion}

Respond EXACTLY in this format:
TOPIC: [what topic/subject this is]
STEP1: [First step instruction]
STEP1_ANSWER: [The correct answer/result for step 1]
STEP2: [Second step instruction]
STEP2_ANSWER: [The correct answer/result for step 2]
STEP3: [Third step instruction]
STEP3_ANSWER: [The correct answer/result for step 3]
STEP4: [Fourth step instruction (if needed)]
STEP4_ANSWER: [The correct answer/result for step 4 (if needed)]
STEP5: [Fifth step instruction (if needed)]
STEP5_ANSWER: [The correct answer/result for step 5 (if needed)]
FINAL_ANSWER: [The final answer to the original question]

Include 3-5 steps. Be specific about what the student should calculate or determine at each step. Only respond with this format, nothing else. Make sure you provide context from the question, for example if the question was converting between two different formats, provide the numbers that would be used in the conversion.`;

            const response = await callOllamaModel(prompt);
            console.log('Raw response:', response);

            // Use AI to parse the response into structured format
            const parsePrompt = `Extract the topic and steps from this response. Return ONLY valid JSON in this exact format:
{
  "topic": "topic name",
  "steps": [
    {"instruction": "step 1 instruction", "answer": "step 1 answer"},
    {"instruction": "step 2 instruction", "answer": "step 2 answer"}
  ]
}

Response to parse:
${response}

Return ONLY the JSON, nothing else. Make sure it's valid JSON.`;

            const parsedResponse = await callOllamaModel(parsePrompt);
            console.log('AI parsed response:', parsedResponse);

            // Extract JSON from the response (handle cases where AI adds text around it)
            let jsonData;
            try {
                // Try to find JSON in the response
                const jsonMatch = parsedResponse.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    jsonData = JSON.parse(jsonMatch[0]);
                } else {
                    jsonData = JSON.parse(parsedResponse);
                }
            } catch (e) {
                console.error('Failed to parse JSON, falling back to manual parsing:', e);
                // Fallback to manual parsing
                jsonData = manualParse(response);
            }

            if (!jsonData.steps || jsonData.steps.length === 0) {
                throw new Error('No steps found in parsed response');
            }

            // Convert to Step[] format
            const steps: Step[] = jsonData.steps.map((step: any, idx: number) => ({
                number: idx + 1,
                instruction: step.instruction || '',
                userAnswer: '',
                isCorrect: null,
                correctAnswer: step.answer || '',
            }));

            console.log('Final steps:', steps);

            safeSetProblem({
                originalQuestion: userQuestion,
                steps,
                currentStepIndex: 0,
                currentUserInput: '',
                isCompleted: false,
                topic: jsonData.topic || 'General',
            });

            setMode('problem');
        } catch (error) {
            console.error('Error generating steps:', error);
            alert('Failed to generate problem steps. Make sure Ollama is running.');
        } finally {
            safeSetLoading(false);
        }
    };

    const verifyStepAnswer = async (appState: any) => {
        if (!appState.problem || appState.problem.currentStepIndex >= appState.problem.steps.length) return;

        appState.setLoading(true);
        try {
            const currentStep = appState.problem.steps[appState.problem.currentStepIndex];
            let contextText = `Original Question: ${appState.problem.originalQuestion}\n\n`;

            for (let i = 0; i < appState.problem.currentStepIndex; i++) {
                const prevStep = appState.problem.steps[i];
                contextText += `Step ${i + 1}: ${prevStep.instruction}\nStudent's Answer: ${prevStep.userAnswer}\n\n`;
            }

            contextText += `Current Step ${appState.problem.currentStepIndex + 1} of ${appState.problem.steps.length}: ${currentStep.instruction}\nStudent's Answer: ${appState.problem.currentUserInput}\nExpected Answer: ${currentStep.correctAnswer}`;

            const verifyPrompt = `You are verifying a student's answer. Compare the student's answer to the expected answer. Be lenient with formatting differences, accept equivalent answers.

${contextText}

Respond in EXACTLY this format:
CORRECT: [yes or no]
EXPLANATION: [brief explanation - if correct say "Well done!" if wrong explain what the correct answer is]

Only respond with these two lines, nothing else.`;

            const response = await callOllamaModel(verifyPrompt);
            console.log('Verification response:', response);

            // Use AI to parse verification response for robustness
            const parseVerifyPrompt = `Extract whether the answer is correct and the explanation from this response. Return ONLY valid JSON:
{"correct": true or false, "explanation": "explanation text"}

Response to parse:
${response}

Return ONLY the JSON.`;

            const parsedVerify = await callOllamaModel(parseVerifyPrompt);
            console.log('Parsed verification:', parsedVerify);

            let verifyData;
            try {
                const jsonMatch = parsedVerify.match(/\{[\s\S]*\}/);
                if (jsonMatch) {
                    verifyData = JSON.parse(jsonMatch[0]);
                } else {
                    verifyData = JSON.parse(parsedVerify);
                }
            } catch (e) {
                console.error('Failed to parse verification JSON, using fallback:', e);
                // Fallback to simple string matching
                const isCorrect = response.toLowerCase().includes('correct: yes') || 
                                 response.toLowerCase().includes('"correct": true') ||
                                 response.toLowerCase().includes('correct:yes');
                const explanationMatch = response.match(/EXPLANATION:\s*(.+?)(?=\n|$)/i);
                verifyData = {
                    correct: isCorrect,
                    explanation: explanationMatch ? explanationMatch[1].trim() : 'Try again!'
                };
            }

            const isCorrect = verifyData.correct === true || verifyData.correct === 'true';
            const explanation = verifyData.explanation || '';

            const updatedSteps = [...appState.problem.steps];
            updatedSteps[appState.problem.currentStepIndex] = {
                ...currentStep,
                userAnswer: appState.problem.currentUserInput,
                isCorrect: isCorrect,
                correctAnswer: currentStep.correctAnswer,
            };

            if (isCorrect) {
                appState.setStepFeedback('✓ Correct! Moving to next step...');
                setTimeout(() => {
                    if (appState.problem!.currentStepIndex + 1 >= appState.problem!.steps.length) {
                        appState.setProblem({ ...appState.problem!, steps: updatedSteps, isCompleted: true });
                    } else {
                        appState.setProblem({
                            ...appState.problem!,
                            steps: updatedSteps,
                            currentStepIndex: appState.problem!.currentStepIndex + 1,
                            currentUserInput: '',
                        });
                        appState.setStepFeedback('');
                    }
                }, 1500);
            } else {
                appState.setStepFeedback(`✗ Not quite right. ${explanation}`);
                appState.setProblem({ ...appState.problem, steps: updatedSteps });
            }
        } catch (error) {
            console.error('Error verifying step:', error);
            appState.setStepFeedback('Error verifying answer. Try again.');
        } finally {
            appState.setLoading(false);
        }
    };

    return { generateSteps, verifyStepAnswer };
}

// Fallback manual parsing function
function manualParse(response: string): { topic: string; steps: Array<{ instruction: string; answer: string }> } {
    const topicMatch = response.match(/TOPIC:\s*(.+?)(?=\n|$)/i);
    const topic = topicMatch ? topicMatch[1].trim() : 'General';
    
    const steps: Array<{ instruction: string; answer: string }> = [];
    let stepNum = 1;

    while (true) {
        const stepPattern = new RegExp(`STEP${stepNum}:\\s*(.+?)(?=STEP${stepNum}_ANSWER:|$)`, 'is');
        const answerPattern = new RegExp(`STEP${stepNum}_ANSWER:\\s*(.+?)(?=STEP${stepNum + 1}:|FINAL_ANSWER:|$)`, 'is');

        const stepMatch = response.match(stepPattern);
        const answerMatch = response.match(answerPattern);

        if (!stepMatch || !answerMatch) break;

        const instruction = stepMatch[1].trim();
        const answer = answerMatch[1].trim();

        if (instruction && answer) {
            steps.push({ instruction, answer });
        }

        stepNum++;
        if (stepNum > 10) break; // Safety limit
    }

    return { topic, steps };
}