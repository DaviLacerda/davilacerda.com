import { siteConfig } from "@/config/site";
import { getDictionary } from "@/i18n/get-dictionary";
import { Locale } from "@/i18n/i18n-config";

type Props = {
    params: {
        lang: Locale;
    };
};

export default async function Home({ params }: Props) {
    const { lang } = params;
    const dictionary = await getDictionary(lang);

    return <span>{dictionary["home"].hello}</span>;
}
