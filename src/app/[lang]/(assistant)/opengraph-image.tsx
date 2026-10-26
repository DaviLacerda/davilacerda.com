/*
 * The Work home's social card. The page sits in the (assistant) route group,
 * a child segment of [lang], so its own `openGraph` metadata would replace
 * the card inherited from [lang]/opengraph-image; declaring it here, beside
 * the page, keeps it on /en and /pt-br.
 */
export {
  alt,
  contentType,
  default,
  generateStaticParams,
  size,
} from "../opengraph-image";
