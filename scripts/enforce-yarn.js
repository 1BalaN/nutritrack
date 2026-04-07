const ua = process.env.npm_config_user_agent || ''

if (!ua.includes('yarn')) {
  console.error('Use Yarn only: run "yarn install" instead of npm/pnpm.')
  process.exit(1)
}
