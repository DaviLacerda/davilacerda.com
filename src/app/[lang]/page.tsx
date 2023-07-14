import { getDictionary } from '@/i18n/get-dictionary';
import { Locale } from '@/i18n/i18n-config';

export default async function Home({
  params: { lang },
}: {
  params: { lang: Locale };
}) {
  const dictionary = await getDictionary(lang);

  return (
    <span>
      {dictionary['home'].hello}
    </span>
  )
}
