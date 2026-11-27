// ESLint (directive §10 CI checks): Next.js core-web-vitals and TypeScript rules. Free, development only (DEC-070).
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const config = [
  ...nextVitals,
  ...nextTs,
  {
    // Server Components render once per request on the server, so reading the clock there is correct;
    // react-hooks/purity targets client components that may re-render. Client components keep the rule.
    files: ["src/app/app/**/page.tsx", "src/app/app/role-panels.tsx", "src/app/app/dashboards.tsx", "src/app/app/overview.tsx"],
    rules: { "react-hooks/purity": "off" },
  },
  {
    ignores: [".next/**", ".next-*/**", "node_modules/**", "docs/**", "backups/**", "test-results/**", "playwright-report/**", "next-env.d.ts"],
  },
];

export default config;
