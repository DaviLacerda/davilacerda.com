import { MetadataRoute } from 'next'
 
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
    },
    sitemap: 'https://davilacerda.com/sitemap.xml',
    host: 'https://davilacerda.com',
  }
}