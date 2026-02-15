import { useTranslation } from 'react-i18next';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Languages } from 'lucide-react';

export function LanguageSelector() {
  const { i18n, t } = useTranslation();

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  return (
    <div className="flex items-center gap-2">
      <Languages className="h-4 w-4 text-muted-foreground" />
      <Select value={i18n.language} onValueChange={changeLanguage}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder={t('language.select')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="es">{t('language.spanish')}</SelectItem>
          <SelectItem value="en">{t('language.english')}</SelectItem>
          <SelectItem value="fr">{t('language.french')}</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
