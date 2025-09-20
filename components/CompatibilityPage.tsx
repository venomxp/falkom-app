import React, { useState, useEffect } from 'react';
import { Page, ZodiacSign } from '../types.ts';
import { ZODIAC_SIGNS } from '../constants.ts';
import { getZodiacCompatibilityAnalysis, getLoveCompatibilityAnalysis } from '../services/geminiService.ts';
import Button from './common/Button.tsx';
import Spinner from './common/Spinner.tsx';
import Card from './common/Card.tsx';
import { useSettings } from '../hooks/useSettings.tsx';

interface CompatibilityPageProps {
  page: Page;
  setPage: (page: Page) => void;
}

type Mode = 'zodiac' | 'names';

const CompatibilityPage: React.FC<CompatibilityPageProps> = ({ page, setPage }) => {
  const { language, t, userName, addReadingToHistory, readingHistory } = useSettings();
  const [mode, setMode] = useState<Mode>('zodiac');
  const [analysis, setAnalysis] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isCached, setIsCached] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // State for Zodiac mode
  const [sign1, setSign1] = useState<ZodiacSign | null>(null);
  const [sign2, setSign2] = useState<ZodiacSign | null>(null);

  // State for Names mode
  const [name1, setName1] = useState<string>('');
  const [name2, setName2] = useState<string>('');
  const [percentage, setPercentage] = useState<number | null>(null);

  useEffect(() => {
    if (userName) {
      setName1(userName);
    }
  }, [userName]);

  const calculateNameCompatibility = (n1: string, n2: string): number => {
    const combined = [n1.trim(), n2.trim()].sort().join('-');
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
        hash = ((hash << 5) - hash) + combined.charCodeAt(i);
        hash |= 0;
    }
    return 60 + (Math.abs(hash) % 41); // Believable percentage between 60% and 100%
  };

  const handleAnalyze = async () => {
    setError('');
    setIsCached(false);
    
    // Input Validation
    if (mode === 'zodiac' && (!sign1 || !sign2)) {
        setError(t('errorSelectTwoSigns'));
        return;
    }
    if (mode === 'names' && (!name1.trim() || !name2.trim())) {
        setError(t('errorEnterBothNames'));
        return;
    }

    setIsLoading(true);
    setAnalysis('');
    setPercentage(null);
    setIsStreaming(false);

    // Check history for a reading from today
    const todayStr = new Date().toISOString().split('T')[0];
    let expectedTitle = '';
    if (mode === 'zodiac') {
        expectedTitle = t('compatibilityResultTitleZodiac', { sign1: t(sign1!.translationKey), sign2: t(sign2!.translationKey) });
    } else {
        expectedTitle = t('compatibilityResultTitleNames', { name1, name2 });
    }
    
    const todaysReading = readingHistory.find(item =>
        item.type === 'Compatibility' &&
        item.title === expectedTitle &&
        item.date.startsWith(todayStr)
    );

    if (todaysReading) {
        setTimeout(() => {
            if (mode === 'names') {
                setPercentage(calculateNameCompatibility(name1, name2));
            }
            setAnalysis(todaysReading.content);
            setIsCached(true);
            setIsLoading(false);
        }, 500);
        return;
    }
    
    // If not cached, fetch new analysis
    let fullAnalysis = '';
    let stream;
    try {
      if (mode === 'zodiac') {
        stream = await getZodiacCompatibilityAnalysis(t(sign1!.translationKey), t(sign2!.translationKey), language);
      } else {
        const compatPercentage = calculateNameCompatibility(name1, name2);
        setPercentage(compatPercentage);
        stream = await getLoveCompatibilityAnalysis(name1, name2, compatPercentage, language);
      }
      setIsLoading(false);
      setIsStreaming(true);
      
      for await (const chunk of stream) {
        fullAnalysis += chunk.text;
        setAnalysis(prev => prev + chunk.text);
      }
    } catch (err) {
      setError(t('errorCompatibility'));
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
      if (fullAnalysis) {
        addReadingToHistory({ type: 'Compatibility', title: expectedTitle, content: fullAnalysis });
      }
    }
  };

  const reset = () => {
      setAnalysis('');
      setError('');
      setSign1(null);
      setSign2(null);
      setName1(userName || ''); // Reset to profile name if available
      setName2('');
      setPercentage(null);
      setIsCached(false);
  }

  return (
    <div className="container mx-auto p-4 flex flex-col items-center flex-grow animate-fade-in box-border pb-24">
      <div className="w-full flex flex-col items-center">
        <h2 className="text-4xl font-logo-en font-bold my-8 text-center text-brand-accent tracking-wider">
          {t('compatibility')}
        </h2>

        {!analysis && !isStreaming && (
          <>
            <Card className="w-full max-w-lg mb-8">
                <div className="flex justify-center border border-brand-light-border dark:border-brand-border rounded-full p-1 mb-6 bg-brand-light dark:bg-brand-dark">
                  <button onClick={() => setMode('zodiac')} className={`w-1/2 p-2 rounded-full font-semibold transition-colors ${mode === 'zodiac' ? 'bg-brand-accent text-brand-button-text' : 'text-brand-light-text/70 dark:text-brand-text-light/70'}`}>{t('byZodiac')}</button>
                  <button onClick={() => setMode('names')} className={`w-1/2 p-2 rounded-full font-semibold transition-colors ${mode === 'names' ? 'bg-brand-accent text-brand-button-text' : 'text-brand-light-text/70 dark:text-brand-text-light/70'}`}>{t('byNames')}</button>
                </div>
                
                {mode === 'zodiac' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <select onChange={(e) => setSign1(ZODIAC_SIGNS.find(s => s.value === e.target.value) || null)} className="w-full p-3 bg-brand-light dark:bg-brand-dark text-brand-light-text dark:text-brand-text-light border border-brand-light-border dark:border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent" defaultValue="">
                            <option value="" disabled>{t('selectFirstSign')}</option>
                            {ZODIAC_SIGNS.map(s => <option key={s.value} value={s.value}>{t(s.translationKey)}</option>)}
                        </select>
                        <select onChange={(e) => setSign2(ZODIAC_SIGNS.find(s => s.value === e.target.value) || null)} className="w-full p-3 bg-brand-light dark:bg-brand-dark text-brand-light-text dark:text-brand-text-light border border-brand-light-border dark:border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent" defaultValue="">
                            <option value="" disabled>{t('selectSecondSign')}</option>
                            {ZODIAC_SIGNS.map(s => <option key={s.value} value={s.value}>{t(s.translationKey)}</option>)}
                        </select>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input type="text" value={name1} onChange={(e) => setName1(e.target.value)} placeholder={t('yourName')} className="w-full p-3 bg-brand-light dark:bg-brand-dark text-brand-light-text dark:text-brand-text-light border border-brand-light-border dark:border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent" dir={language === 'ar' ? 'rtl' : 'ltr'} />
                        <input type="text" value={name2} onChange={(e) => setName2(e.target.value)} placeholder={t('secondName')} className="w-full p-3 bg-brand-light dark:bg-brand-dark text-brand-light-text dark:text-brand-text-light border border-brand-light-border dark:border-brand-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-accent" dir={language === 'ar' ? 'rtl' : 'ltr'} />
                    </div>
                )}
                <Button onClick={handleAnalyze} disabled={isLoading} className="w-full mt-6" variant="primary">
                    {isLoading ? t('analyzing') : t('analyzeCompatibility')}
                </Button>
            </Card>
            <Button onClick={() => setPage(Page.HOME)} variant="secondary">{t('goHome')}</Button>
          </>
        )}

        {isLoading && <Spinner />}
        {error && !isLoading && <p className="text-red-400 mt-4 text-center">{error}</p>}

        {(analysis || isStreaming) && !isLoading && (
          <div className="w-full max-w-2xl animate-fade-in">
            <Card>
              {mode === 'names' && percentage && (
                  <div className="text-center mb-4">
                      <p className="text-xl font-bold text-brand-accent">{t('compatibilityResultTitleNames', { name1, name2 })}</p>
                      <p className="text-6xl font-black text-brand-accent my-2 animate-pulse">{percentage}%</p>
                  </div>
              )}
              {mode === 'zodiac' && sign1 && sign2 && (
                  <h3 className="text-2xl font-bold text-center text-brand-accent mb-4">{t('compatibilityResultTitleZodiac', { sign1: t(sign1.translationKey), sign2: t(sign2.translationKey) })}</h3>
              )}
              {isCached && <p className="text-center text-sm text-brand-accent italic mb-4">{t('cachedReadingMessage')}</p>}
              <p className={`text-lg whitespace-pre-wrap leading-relaxed text-brand-light-text dark:text-brand-text-light ${language === 'ar' ? 'text-right' : 'text-left'}`}>
                {analysis}
                {isStreaming && <span className="inline-block w-1 h-5 bg-brand-accent animate-pulse ml-1 align-bottom"></span>}
              </p>
            </Card>
            <div className="text-center mt-6 flex flex-col sm:flex-row gap-4 justify-center">
                <Button onClick={reset} disabled={isStreaming} variant="primary">{t('newAnalysis')}</Button>
                <Button onClick={() => setPage(Page.HOME)} variant="secondary">{t('goHome')}</Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompatibilityPage;