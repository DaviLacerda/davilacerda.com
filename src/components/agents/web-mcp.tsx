/**
 * WebMCP (experimental, https://webmachinelearning.github.io/webmcp/): exposes
 * read-only tools to an AI agent running in the visitor's browser.
 *
 * Shipped as a tiny inline script rather than a client component: it needs no
 * React, no hydration and no extra chunk, runs once per page load, and does
 * nothing at all unless the browser implements `modelContext`. Tools fetch the
 * same-origin JSON/Markdown renditions lazily, only when an agent calls them.
 * The page language is read at call time, so it stays right after client-side
 * locale switches.
 */
function script(): string {
  const tools = {
    profileJson: "/api/{lang}/profile.json",
    postsJson: "/api/{lang}/posts.json",
    md: "/{lang}.md",
    post: "/{lang}/personal/blog/{slug}.md",
  };
  // Keep the literal `document.modelContext.registerTool(` / `navigator.modelContext.registerTool(`
  // calls: scanners look for them.
  return `(function(){
var mc=(typeof document!=="undefined"&&document.modelContext)||(typeof navigator!=="undefined"&&navigator.modelContext);
if(!mc||typeof mc.registerTool!=="function")return;
var T=${JSON.stringify(tools)};
function lang(a){var l=a&&a.lang;if(l!=="en"&&l!=="pt-br"){l=(document.documentElement.lang||"en").toLowerCase()==="pt-br"?"pt-br":"en";}return l;}
function url(t,a,extra){var u=t.replace("{lang}",lang(a));if(extra)u=u.replace("{slug}",encodeURIComponent(extra));return u;}
function get(u,type){return fetch(u,{headers:{Accept:type}}).then(function(r){if(!r.ok)throw new Error("HTTP "+r.status+" for "+u);return r.text();}).then(function(text){return{content:[{type:"text",text:text}]};});}
var L={type:"string",enum:["en","pt-br"],description:"Content language (defaults to the page language)."};
var ro={readOnlyHint:true};
var defs=[
{name:"get_profile",description:"Davi Lacerda's verified profile (experience, projects, skills, certifications, education, awards, contact). Markdown by default, or JSON.",inputSchema:{type:"object",properties:{lang:L,format:{type:"string",enum:["markdown","json"]}}},annotations:ro,execute:function(a){return a&&a.format==="json"?get(url(T.profileJson,a),"application/json"):get(url(T.md,a),"text/markdown");}},
{name:"list_posts",description:"Davi Lacerda's blog posts (title, description, date, tags, URLs).",inputSchema:{type:"object",properties:{lang:L}},annotations:ro,execute:function(a){return get(url(T.postsJson,a),"application/json");}},
{name:"get_post",description:"One blog post as Markdown, by slug (from list_posts).",inputSchema:{type:"object",properties:{slug:{type:"string"},lang:L},required:["slug"]},annotations:ro,execute:function(a){return get(url(T.post,a,a.slug),"text/markdown");}}
];
function register(tool){
if(document.modelContext&&typeof document.modelContext.registerTool==="function")return document.modelContext.registerTool(tool);
if(navigator.modelContext&&typeof navigator.modelContext.registerTool==="function")return navigator.modelContext.registerTool(tool);
}
for(var i=0;i<defs.length;i++){try{register(defs[i]);}catch(e){}}
})();`;
}

/** Inline WebMCP registration (see module comment). Mount once, in the root layout. */
export function WebMcp() {
  return (
    <script
      id="webmcp"
      // Static, first-party code; no user input is interpolated.
      dangerouslySetInnerHTML={{ __html: script() }}
    />
  );
}
