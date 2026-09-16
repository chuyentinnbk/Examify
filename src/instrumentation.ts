export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const port = process.env.PORT || '3000';
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${port}`;
    const aiProvider = (process.env.DEFAULT_AI_PROVIDER || 'gemini').toUpperCase();
    const isDebug = process.env.DEBUG === 'true' || process.env.APP_DEBUG === 'true';

    // ANSI Color formatting
    const cyan = '\x1b[36m';
    const green = '\x1b[32m';
    const yellow = '\x1b[33m';
    const magenta = '\x1b[35m';
    const bold = '\x1b[1m';
    const reset = '\x1b[0m';
    const dim = '\x1b[2m';

    console.log(`
${cyan}${bold}========================================================================${reset}
${cyan}${bold}  🎓 EXAMIFY AI ASSESSMENT ENGINE — FULL-STACK SKELETON READY${reset}
${cyan}${bold}========================================================================${reset}

  ${green}${bold}● Quick Navigation & Live Endpoints:${reset}
  ${dim}------------------------------------------------------------------------${reset}
  🌐  ${bold}App Home / Portal:${reset}       ${cyan}${baseUrl}${reset}
  📊  ${bold}Teacher Dashboard:${reset}       ${cyan}${baseUrl}/dashboard${reset}
  📖  ${bold}Scalar API Reference:${reset}    ${magenta}${bold}${baseUrl}/docs${reset}
  ⚙️   ${bold}Master Setup Wizard:${reset}     ${yellow}${baseUrl}/setup${reset}

  ${green}${bold}● API Specifications & Schema Exports:${reset}
  ${dim}------------------------------------------------------------------------${reset}
  📄  ${bold}OpenAPI 3.0.3 (JSON):${reset}     ${baseUrl}/api/v1/docs/openapi.json
  📑  ${bold}OpenAPI 3.0.3 (YAML):${reset}     ${baseUrl}/api/v1/docs/openapi.yaml
  🎯  ${bold}Curriculum Tree API:${reset}     ${baseUrl}/api/v1/curriculum
  🧠  ${bold}AI Exam Generator API:${reset}   ${baseUrl}/api/v1/exams/generate

  ${green}${bold}● System Engine Status:${reset}
  ${dim}------------------------------------------------------------------------${reset}
  🤖  ${bold}Primary AI Provider:${reset}     ${yellow}${aiProvider}${reset} ${dim}(Multi-Token & Multi-Model Auto-Fallback)${reset}
  🛡️   ${bold}Security Engine:${reset}         PromptGuard + Sliding Window Rate Limiter
  🔧  ${bold}Debug Mode:${reset}              ${isDebug ? `${green}ENABLED (Verbose Query Logging)${reset}` : `${dim}DISABLED (Clean Console)${reset}`}
  💾  ${bold}Local Storage:${reset}           /storage/exams/ & /storage/logs/
${cyan}========================================================================${reset}
`);
  }
}
