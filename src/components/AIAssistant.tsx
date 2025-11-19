import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { ModelStats, Axis } from '../types';

interface AIAssistantProps {
    modelStats: ModelStats | null;
    onSuggestParams: (axis: Axis, layerHeight: number) => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({ modelStats, onSuggestParams }) => {
    const [loading, setLoading] = useState(false);
    const [advice, setAdvice] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleAnalyze = async () => {
        if (!modelStats) return;
        if (!process.env.API_KEY) {
            setError("API Key not found. Please configure process.env.API_KEY.");
            return;
        }

        setLoading(true);
        setError(null);
        
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const prompt = `
                I have a 3D model with the following statistics:
                Dimensions: X=${modelStats.dimensions.x.toFixed(2)}, Y=${modelStats.dimensions.y.toFixed(2)}, Z=${modelStats.dimensions.z.toFixed(2)} units.
                Volume: ${modelStats.volume.toFixed(2)} cubic units.
                
                I need to slice this model into flat layers.
                Please recommend:
                1. The best slicing axis (X, Y, or Z).
                2. An optimal layer height (e.g. 2.0, 5.0, 10.0) based on the feature size.
                
                Return JSON: { "recommendedAxis": "y", "recommendedLayerHeight": 5.0, "explanation": "..." }
            `;

            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash',
                contents: prompt,
                config: { responseMimeType: "application/json" }
            });
            
            const text = response.text;
            if (text) {
                const result = JSON.parse(text);
                setAdvice(result.explanation);
                onSuggestParams(result.recommendedAxis as Axis, result.recommendedLayerHeight);
            }

        } catch (e) {
            console.error(e);
            setError("Failed to analyze model. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-4 bg-slate-800 rounded-lg border border-indigo-500/30 mt-4">
            <div className="flex items-center space-x-2 mb-3">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="text-md font-semibold text-indigo-100">AI Slice Advisor</h3>
            </div>
            {!modelStats ? (
                <p className="text-sm text-slate-400">Load a model to enable AI analysis.</p>
            ) : (
                <>
                    <p className="text-xs text-slate-400 mb-3">Get optimized slicing parameters powered by Gemini.</p>
                    {advice && <div className="mb-3 p-3 bg-indigo-900/20 border border-indigo-500/20 rounded text-sm text-indigo-200">{advice}</div>}
                    {error && <div className="mb-3 p-3 bg-red-900/20 border border-red-500/20 rounded text-sm text-red-200 flex items-center"><AlertCircle className="w-4 h-4 mr-2" />{error}</div>}
                    <button onClick={handleAnalyze} disabled={loading} className="w-full flex items-center justify-center py-2 px-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                        {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</> : "Analyze & Recommend"}
                    </button>
                </>
            )}
        </div>
    );
};
