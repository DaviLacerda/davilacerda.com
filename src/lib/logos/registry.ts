/*
 * Brand and technology logos the site shows, by id. Each entry names an icon
 * from an Iconify set:
 * - `logos:*` (@iconify-json/logos): the brand's own colours.
 * - `simple-icons:*` (@iconify-json/simple-icons): one path in `currentColor`.
 *
 * The rule, applied everywhere: a logo keeps its brand colours, except marks
 * whose brand colour is black or white (GitHub, Next.js, Vercel, Instagram's
 * glyph, MCP), which take the ink colour so they flip with the theme.
 *
 * `names` are the strings used in `src/content/profile.ts` (stacks and skill
 * lists) that should show this logo; matching ignores case.
 *
 * Plain data, no imports: `scripts/logos.mjs` reads this file (Node strips
 * the types) to copy only these icons into `icons.json`. After adding or
 * changing an entry, run `yarn logos` and commit the regenerated file.
 */

export type LogoSpec = {
  /** Iconify id, `prefix:name`. */
  icon: string;
  /** Accessible name. */
  label: string;
  /** Profile strings that map to this logo. */
  names?: readonly string[];
};

export const logoRegistry = {
  azure: {
    icon: "logos:microsoft-azure",
    label: "Microsoft Azure",
    names: ["Azure", "Microsoft Azure"],
  },
  microsoft: { icon: "logos:microsoft-icon", label: "Microsoft" },
  vercel: { icon: "simple-icons:vercel", label: "Vercel", names: ["Vercel"] },
  python: { icon: "logos:python", label: "Python", names: ["Python"] },
  typescript: {
    icon: "logos:typescript-icon",
    label: "TypeScript",
    names: ["TypeScript"],
  },
  react: { icon: "logos:react", label: "React", names: ["React"] },
  nextjs: {
    icon: "simple-icons:nextdotjs",
    label: "Next.js",
    names: ["Next.js"],
  },
  nodejs: { icon: "logos:nodejs-icon", label: "Node.js", names: ["Node.js"] },
  postgresql: {
    icon: "logos:postgresql",
    label: "PostgreSQL",
    names: ["PostgreSQL"],
  },
  supabase: {
    icon: "logos:supabase-icon",
    label: "Supabase",
    names: ["Supabase"],
  },
  tailwind: {
    icon: "logos:tailwindcss-icon",
    label: "Tailwind CSS",
    names: ["Tailwind CSS"],
  },
  figma: { icon: "logos:figma", label: "Figma", names: ["Figma"] },
  java: { icon: "logos:java", label: "Java", names: ["Java"] },
  spring: { icon: "logos:spring-icon", label: "Spring", names: ["Spring"] },
  mcp: {
    icon: "simple-icons:modelcontextprotocol",
    label: "Model Context Protocol",
    names: ["Model Context Protocol (MCP)", "MCP"],
  },
  vscode: {
    icon: "logos:visual-studio-code",
    label: "Visual Studio Code",
    names: ["VS Code"],
  },
  t3: { icon: "logos:t3", label: "T3 stack", names: ["T3 stack"] },
  github: {
    icon: "simple-icons:github",
    label: "GitHub",
    names: ["Git & GitHub", "GitHub"],
  },
  linkedin: { icon: "logos:linkedin-icon", label: "LinkedIn" },
  instagram: { icon: "simple-icons:instagram", label: "Instagram" },
  discord: { icon: "logos:discord-icon", label: "Discord" },
} as const satisfies Record<string, LogoSpec>;

export type LogoId = keyof typeof logoRegistry;
