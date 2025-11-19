import React, { useState } from 'react';
import { GoogleGenAI } from "@google/genai";
import { Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { ModelStats, Axis } from '../types';

interface AIAssistantProps { modelStats: ModelStats | null; onSuggestParams: (axis: Axis, count: number) => void; }
export const AIAssistant: React.FC<AIAssistantProps> = ({ modelStats, onSuggestParams }) => {
    const [loading, setLoading] = useState(false);
    const [advice, setAdvice] = useState<string | null>(null);
    const handleAnalyze = async () => {
        if (!modelStats || !process.env.API_KEY) return;
        setLoading(true);
        try {
            const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            const resp = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: `Analyze stats: X=${modelStats.dimensions.x}, Y=${modelStats.dimensions.y}, Z=${modelStats.dimensions.z}, Tris=${modelStats.triangleCount}. Recommend slicing axis (x/y/z) and count (5-50). JSON format: {recommendedAxis, recommendedCount, explanation}.`, config: { responseMimeType: "application/json" } });
            const res = JSON.parse(resp.text || "{}");
            setAdvice(res.explanation); onSuggestParams(res.recommendedAxis, res.recommendedCount);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };
    return (<div className="p-4 bg-slate-800 rounded-lg border border-indigo-500/30 mt-4"><h3 className="text-md font-semibold text-indigo-100 flex"><Sparkles className="w-5 h-5 mr-2" />AI Advisor</h3>{advice && <div className="my-2 text-sm text-indigo-200">{advice}</div>}<button onClick={handleAnalyze} disabled={loading || !modelStats} className="w-full bg-indigo-600 text-white py-2 rounded text-sm">{loading ? "Thinking..." : "Optimize"}</button></div>);
};