import React from 'react';
import { Page } from '../types.ts';
import Button from './common/Button.tsx';
import Card from './common/Card.tsx';
import Logo from './common/Logo.tsx';
import { useSettings } from '../hooks/useSettings.tsx';

interface MorePageProps {
  setPage: (page: Page) => void;
}

const MorePage: React.FC<MorePageProps> = ({ setPage }) => {
  const { t } = useSettings();

  return (
    <div className="container mx-auto p-4 flex flex-col items-center min-h-screen justify-center animate-fade-in">
      <Logo className="mb-8" setPage={setPage} />
      <Card className="w-full max-w-lg text-center">
        <h2 className="text-3xl font-bold mb-4 text-violet-700 dark:text-violet-300">
          {t('aboutAppTitle')}
        </h2>
        <p className="text-lg text-slate-700 dark:text-slate-300/80 leading-relaxed">
          {t('aboutAppBody')}
        </p>
        <div className="mt-8">
            <h3 className="text-2xl font-semibold text-violet-600 dark:text-violet-300">{t('contactUs')}</h3>
            <p className="mt-2 text-lg text-slate-700 dark:text-slate-300/80">{t('contactEmail')}</p>
        </div>
      </Card>
      <Button onClick={() => setPage(Page.HOME)} variant="secondary" className="mt-12">
        {t('goHome')}
      </Button>
    </div>
  );
};

export default MorePage;