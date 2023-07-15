import { MetadataRoute } from 'next'
 
export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://davilacerda.com/',
            lastModified: new Date(),
        },
        {
            url: 'https://davilacerda.com/en',
            lastModified: new Date(),
        },
        {
            url: 'https://davilacerda.com/pt-br',
            lastModified: new Date(),
        }
    ]
}